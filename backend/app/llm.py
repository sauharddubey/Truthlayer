"""Provider-agnostic LLM + embeddings access layer (OpenRouter by default).

Supports a per-user API key: a request/pipeline sets a runtime key via a
contextvar, and all chat/embeddings/transcription calls use it. If unset, the
platform default (``settings.LLM_API_KEY``) is used.

Every successful API call records a UsageRecord row so users can see their
token and cost consumption in the settings dashboard.
"""

from __future__ import annotations

import contextvars
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from openai import OpenAI

from app.config import settings

logger = logging.getLogger("truthlayer.llm")

# Runtime per-user OpenRouter key (set by the pipeline / request).
_runtime_api_key: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "runtime_api_key", default=None
)
# Runtime user_id so usage records are scoped to the triggering user.
_runtime_user_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "runtime_user_id", default=None
)
_runtime_llm_model: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "runtime_llm_model", default=None
)
_runtime_embeddings_model: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "runtime_embeddings_model", default=None
)
_runtime_transcription_model: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "runtime_transcription_model", default=None
)


def set_runtime_api_key(key: Optional[str]) -> None:
    _runtime_api_key.set(key or None)


def set_runtime_user_id(user_id: Optional[str]) -> None:
    _runtime_user_id.set(user_id or None)


def set_runtime_llm_model(model: Optional[str]) -> None:
    _runtime_llm_model.set(model or None)


def set_runtime_embeddings_model(model: Optional[str]) -> None:
    _runtime_embeddings_model.set(model or None)


def set_runtime_transcription_model(model: Optional[str]) -> None:
    _runtime_transcription_model.set(model or None)


def effective_chat_key() -> str:
    return _runtime_api_key.get() or settings.LLM_API_KEY


def effective_embeddings_key() -> str:
    # OpenRouter serves both; prefer the runtime key, then the embeddings key,
    # then the chat key.
    return _runtime_api_key.get() or settings.EMBEDDINGS_API_KEY or settings.LLM_API_KEY


def effective_llm_model() -> str:
    return _runtime_llm_model.get() or settings.LLM_MODEL


def effective_embeddings_model() -> str:
    return _runtime_embeddings_model.get() or settings.EMBEDDINGS_MODEL


def effective_transcription_model() -> str:
    return _runtime_transcription_model.get() or settings.TRANSCRIPTION_MODEL


_DEFAULT_HEADERS = {
    "HTTP-Referer": settings.LLM_HTTP_REFERER,
    "X-Title": settings.LLM_APP_TITLE,
}

# Cache OpenAI clients by (api_key, base_url) so we don't rebuild per call.
_client_cache: dict = {}


def _client(api_key: str, base_url: str) -> Optional[OpenAI]:
    if not api_key:
        return None
    cache_key = (api_key, base_url)
    if cache_key not in _client_cache:
        _client_cache[cache_key] = OpenAI(
            api_key=api_key, base_url=base_url, default_headers=_DEFAULT_HEADERS
        )
    return _client_cache[cache_key]


# ── OpenRouter published pricing (USD per 1M tokens) ────────────────────────
# Only models explicitly used by TruthLayer are listed; everything else falls
# back to the free-model rate (0.0). Values from openrouter.ai/models.
_MODEL_PRICE: dict[str, tuple[float, float]] = {
    # model_id: (prompt_per_1M, completion_per_1M)
    "openai/gpt-4o":                    (5.00,   15.00),
    "openai/gpt-4o-mini":               (0.15,    0.60),
    "openai/gpt-4-turbo":               (10.00,  30.00),
    "openai/gpt-3.5-turbo":             (0.50,   1.50),
    "openai/gpt-oss-120b:free":         (0.0,     0.0),
    "anthropic/claude-3.5-sonnet":      (3.00,   15.00),
    "anthropic/claude-3-haiku":         (0.25,   1.25),
    "google/gemini-2.5-flash-lite":     (0.075,  0.30),
    "google/gemini-2.0-flash-001":      (0.10,   0.40),
    "meta-llama/llama-3.1-8b-instruct:free": (0.0, 0.0),
    "openai/text-embedding-3-small":    (0.02,   0.0),
}

def _estimate_cost_microdollars(model: str, prompt_tokens: int, completion_tokens: int) -> int:
    prompt_price, completion_price = _MODEL_PRICE.get(model, (0.0, 0.0))
    cost_usd = (prompt_tokens * prompt_price + completion_tokens * completion_price) / 1_000_000
    return int(cost_usd * 1_000_000)  # store as microdollars


def _record_usage(call_type: str, model: str, prompt_tokens: int, completion_tokens: int) -> None:
    """Persist a UsageRecord row. Runs in a short-lived DB session; never raises."""
    try:
        from app.database import SessionLocal
        from app.models import UsageRecord

        user_id = _runtime_user_id.get()
        cost = _estimate_cost_microdollars(model, prompt_tokens, completion_tokens)
        record = UsageRecord(
            id=str(uuid.uuid4()),
            user_id=user_id,
            call_type=call_type,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cost_microdollars=cost,
            created_at=datetime.now(timezone.utc),
        )
        db = SessionLocal()
        try:
            db.add(record)
            db.commit()
        finally:
            db.close()
    except Exception as exc:  # pragma: no cover
        logger.warning("Usage record failed (non-fatal): %s", exc)


# ── Chat completions ──────────────────────────────────────────────────────────


def chat_json(system: str, user: str, *, schema_hint: str = "") -> dict:
    client = _client(effective_chat_key(), settings.LLM_BASE_URL)
    if client is None:
        return {}

    sys_prompt = system
    if schema_hint:
        sys_prompt += (
            "\n\nRespond with ONLY a valid JSON object matching this shape:\n"
            f"{schema_hint}\nDo not include markdown fences or commentary."
        )
    try:
        llm_model = effective_llm_model()
        resp = client.chat.completions.create(
            model=llm_model,
            temperature=settings.LLM_TEMPERATURE,
            messages=[
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user},
            ],
        )
        # Record usage
        if resp.usage:
            _record_usage(
                "chat", llm_model,
                resp.usage.prompt_tokens, resp.usage.completion_tokens,
            )
        return _extract_json(resp.choices[0].message.content or "")
    except Exception as exc:  # pragma: no cover
        logger.exception("LLM chat_json failed: %s", exc)
        return {}


def chat_text(system: str, user: str) -> str:
    client = _client(effective_chat_key(), settings.LLM_BASE_URL)
    if client is None:
        return ""
    try:
        llm_model = effective_llm_model()
        resp = client.chat.completions.create(
            model=llm_model,
            temperature=settings.LLM_TEMPERATURE,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        if resp.usage:
            _record_usage(
                "chat", llm_model,
                resp.usage.prompt_tokens, resp.usage.completion_tokens,
            )
        return resp.choices[0].message.content or ""
    except Exception as exc:  # pragma: no cover
        logger.exception("LLM chat_text failed: %s", exc)
        return ""


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if "```" in text else text
        text = text.replace("json", "", 1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return {}
        return {}


# ── Embeddings ────────────────────────────────────────────────────────────────


def _local_embedder():
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "EMBEDDINGS_PROVIDER=local requires sentence-transformers; or use "
            "EMBEDDINGS_PROVIDER=openai (OpenRouter)."
        ) from exc
    return SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


_local_model = None


def embed_texts(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    if settings.EMBEDDINGS_PROVIDER == "openai":
        client = _client(effective_embeddings_key(), settings.EMBEDDINGS_BASE_URL)
        if client is not None:
            try:
                emb_model = effective_embeddings_model()
                resp = client.embeddings.create(model=emb_model, input=texts)
                # Record embedding usage (completion_tokens = 0 for embeddings)
                if hasattr(resp, "usage") and resp.usage:
                    _record_usage(
                        "embed", emb_model,
                        getattr(resp.usage, "prompt_tokens", len(texts) * 8), 0,
                    )
                return [d.embedding for d in resp.data]
            except Exception as exc:  # pragma: no cover
                logger.exception("Embeddings failed, falling back to local: %s", exc)
    global _local_model
    if _local_model is None:
        _local_model = _local_embedder()
    return [vec.tolist() for vec in _local_model.encode(texts, normalize_embeddings=True)]


def embed_one(text: str) -> List[float]:
    return embed_texts([text])[0]

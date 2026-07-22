"""Central configuration loaded from environment variables.

Every external dependency (DB, Redis, LLM, embeddings, transcription, evidence
retrieval, media-integrity) is configured here so the rest of the codebase never
reads ``os.environ`` directly. This is what makes TruthLayer provider-agnostic and
free-tier friendly: swap a base URL / key and nothing else changes.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ── Core ──────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    # Comma-separated list of allowed origins (kept as a plain string so env
    # parsing never tries to JSON-decode it). Use `.cors_origins` for the list.
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    # Fernet key (urlsafe base64, 32 bytes) used to encrypt secrets at rest
    # (per-user OpenRouter keys) and to sign short-lived media URLs. Generate with
    # `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
    ENCRYPTION_KEY: str = ""

    # ── Supabase Auth ─────────────────────────────────────────────────────
    # Auth is delegated to Supabase (GoTrue). The frontend signs users in and
    # receives a Supabase JWT; the backend verifies it against the project's
    # published JWKS (asymmetric ES256/RS256) and JIT-provisions a local profile
    # row keyed by the Supabase user id.
    SUPABASE_URL: str = ""           # e.g. https://<ref>.supabase.co
    SUPABASE_JWT_AUDIENCE: str = "authenticated"
    # OPTIONAL server-side admin key, used ONLY to delete the Supabase auth
    # identity during account erasure (GDPR). Leave empty to erase local data only
    # and remove the auth user via the Supabase dashboard. This is a privileged
    # secret — scope it tightly and never expose it to clients.
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    # Verify the JWT `iss` claim equals "<SUPABASE_URL>/auth/v1" (defense-in-depth
    # on top of the pinned-JWKS + audience check). Disable only if your project's
    # issuer differs from the standard GoTrue format.
    SUPABASE_VERIFY_ISS: bool = True

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/truthlayer"

    # ── Redis / Celery ────────────────────────────────────────────────────
    REDIS_URL: str = ""
    USE_CELERY: bool = False

    # NOTE: external-service API keys are NOT configured here. Every key
    # (OpenRouter, Tavily, media-integrity) is supplied per-user in the
    # app's Settings, stored encrypted, and applied per-request. Only non-secret
    # config (base URLs, model names, dimensions) lives in the environment.

    # ── LLM (OpenRouter — OpenAI-compatible) ──────────────────────────────
    LLM_BASE_URL: str = "https://openrouter.ai/api/v1"
    LLM_MODEL: str = "openai/gpt-oss-120b:free"
    LLM_TEMPERATURE: float = 0.1
    # Optional OpenRouter attribution headers (shown on your OpenRouter dashboard).
    LLM_HTTP_REFERER: str = "https://truthlayer.app"
    LLM_APP_TITLE: str = "TruthLayer"

    # ── Embeddings ────────────────────────────────────────────────────────
    # Served by OpenRouter using the user's OpenRouter key (provider="openai").
    EMBEDDINGS_PROVIDER: str = "openai"  # local | openai
    EMBEDDINGS_BASE_URL: str = "https://openrouter.ai/api/v1"
    EMBEDDINGS_MODEL: str = "openai/text-embedding-3-small"
    EMBEDDINGS_DIM: int = 1536

    # ── Transcription ─────────────────────────────────────────────────────
    # "openrouter": transcribe via an audio-input chat model (user's OpenRouter key).
    # "stub":       deterministic placeholder transcript (no key needed).
    TRANSCRIPTION_PROVIDER: str = "openrouter"
    TRANSCRIPTION_MODEL: str = "google/gemini-2.5-flash-lite"

    # ── Vision / OCR ──────────────────────────────────────────────────────
    # OCR reads video keyframes (image input), so this MUST be a vision-capable
    # model — kept separate from TRANSCRIPTION_MODEL, which only needs audio
    # input. Using an audio-only transcription model here (e.g. gpt-audio-mini)
    # makes OpenRouter reject the request with "No endpoints found that support
    # image input". Not "-lite": the lite tier degenerates into repetition loops
    # (finish_reason=error) on dense multi-frame OCR; the full Flash model returns
    # clean JSON. gpt-4o-mini is an equally reliable alternative.
    VISION_MODEL: str = "google/gemini-2.5-flash"

    # ── Media integrity ───────────────────────────────────────────────────
    # Provider adapter: "hive" enables Hive deepfake detection (business tier).
    # The API key is per-user in Settings; only non-secret config lives here.
    MEDIA_INTEGRITY_PROVIDER: str = ""
    MEDIA_INTEGRITY_URL: str = "https://api.thehive.ai/api/v3/hive/ai-generated-and-deepfake-content-detection"
    # Public base URL of this API (required so Hive can fetch signed /media/... links).
    BACKEND_PUBLIC_URL: str = ""

    # ── Storage ───────────────────────────────────────────────────────────
    MEDIA_STORAGE_DIR: str = "/tmp/truthlayer/media"
    MAX_UPLOAD_MB: int = 200          # streamed video-upload cap
    MAX_DOCUMENT_MB: int = 25         # RAG document / product-image upload cap

    # ── Ingestion safety (SSRF + resource limits) ─────────────────────────
    # yt-dlp fetches user-supplied URLs server-side. Only the platforms the
    # product actually supports are allowed, and (by default) URLs that resolve
    # to private / loopback / link-local / cloud-metadata addresses are rejected
    # so a submitted URL can't reach internal services. Comma-separated list of
    # registrable domains (sub-domains are matched by suffix). See app.urlguard.
    INGEST_ALLOWED_HOSTS: str = (
        "youtube.com,youtu.be,m.youtube.com,tiktok.com,vm.tiktok.com,"
        "instagram.com,instagr.am"
    )
    INGEST_BLOCK_PRIVATE_IPS: bool = True
    # Download DoS caps (a 10-hour or multi-GB URL is rejected up front).
    MAX_VIDEO_DURATION_SECONDS: int = 3600
    MAX_DOWNLOAD_MB: int = 500
    # Hang guard for the OCR keyframe-extraction ffmpeg call.
    FFMPEG_TIMEOUT_SECONDS: int = 600

    # ── LLM guardrails (cost / DoS / latency) ─────────────────────────────
    # Generous default so normal structured outputs (claim lists, contradiction
    # reports, summaries) are never truncated, while still bounding a runaway
    # generation to a fraction of the model's context window. Callers that need
    # more can pass an explicit max_tokens.
    LLM_MAX_TOKENS: int = 4096              # per-call completion cap
    LLM_REQUEST_TIMEOUT_SECONDS: float = 60.0
    AGENT_FANOUT_TIMEOUT_SECONDS: float = 180.0
    MAX_CLAIMS_FOR_EVIDENCE: int = 40       # cap external evidence fan-out per video

    # ── Rate limiting (slowapi) ───────────────────────────────────────────
    # In-memory by default; uses REDIS_URL automatically when set. Empty string
    # disables limiting entirely (useful for tests / single-user local runs).
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT: str = "120/minute"
    RATE_LIMIT_EXPENSIVE: str = "10/minute"  # upload / url-submit / analysis / recompute

    # ── Response security headers ─────────────────────────────────────────
    # HSTS is only meaningful over HTTPS; disable for plain-http local dev.
    SECURITY_HEADERS_ENABLED: bool = True
    SECURITY_HEADERS_HSTS: bool = True

    # ── Data retention (compliance) ───────────────────────────────────────
    # Age (days) after which videos + derived data and media files are purged by
    # the retention job. 0 disables purging (opt-in; default keeps everything).
    DATA_RETENTION_DAYS: int = 0

    @property
    def cors_origins(self) -> List[str]:
        origins = [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]
        # Never combine a wildcard with credentialed CORS: it would reflect any
        # origin. Drop "*" so a mis-set env fails closed to the safe default.
        return [o for o in origins if o != "*"]

    @property
    def ingest_allowed_hosts(self) -> List[str]:
        return [h.strip().lower() for h in self.INGEST_ALLOWED_HOSTS.split(",") if h.strip()]

    @property
    def celery_enabled(self) -> bool:
        return self.USE_CELERY and bool(self.REDIS_URL)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

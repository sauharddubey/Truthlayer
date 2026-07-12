"""Speech recognition with timestamps (FR-SP-001..005).

Produces a full, segmented transcript with per-segment timestamps. Backends
(selected by ``TRANSCRIPTION_PROVIDER``):

* ``openrouter`` — an audio-input chat model returns timestamped JSON segments
  using the LLM key (one key for all AI; audio needs a small credit balance).
* ``stub``       — deterministic placeholder.

Any failure degrades to a duration-proportional fallback so the pipeline always
has a segmented transcript to work with.
"""

from __future__ import annotations

import base64
import logging
import os
import re
from dataclasses import dataclass, field
from typing import List, Optional

from openai import OpenAI

from app.config import settings
from app.llm import _extract_json, effective_chat_key, effective_transcription_model, record_usage

logger = logging.getLogger("truthlayer.transcription")

_AUDIO_FORMATS = {
    ".mp3": "mp3", ".wav": "wav", ".m4a": "m4a", ".mp4": "mp4",
    ".webm": "webm", ".ogg": "ogg", ".flac": "flac", ".aac": "aac",
}


@dataclass
class TranscriptionResult:
    text: str
    language: Optional[str] = None
    segments: List[dict] = field(default_factory=list)


def transcribe(
    audio_path: Optional[str], fallback_text: str = "", duration: Optional[float] = None
) -> TranscriptionResult:
    provider = settings.TRANSCRIPTION_PROVIDER.lower()

    if provider == "stub":
        logger.info("Transcription running in stub mode (provider=stub).")
        return _stub(fallback_text)

    if not audio_path or not os.path.exists(audio_path):
        raise RuntimeError("Ingestion failed: No audio file was downloaded/found for transcription. Please check the video URL and try again.")

    if provider == "openrouter":
        result = _transcribe_openrouter(audio_path, duration)
    else:
        raise ValueError(f"Unknown transcription provider: {provider}")

    if not result or not result.text.strip():
        raise RuntimeError(f"Transcription failed: Provider '{provider}' returned an empty or invalid transcript. Please try again.")

    return result


# ── OpenRouter audio-input chat backend (timestamped) ────────────────────────


def _transcribe_openrouter(audio_path: str, duration: Optional[float]) -> Optional[TranscriptionResult]:
    api_key = effective_chat_key()
    if not api_key:
        return None

    ext = os.path.splitext(audio_path)[1].lower()
    audio_format = _AUDIO_FORMATS.get(ext, "mp3")
    with open(audio_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    client = OpenAI(
        api_key=api_key,
        base_url=settings.LLM_BASE_URL,
        default_headers={
            "HTTP-Referer": settings.LLM_HTTP_REFERER,
            "X-Title": settings.LLM_APP_TITLE,
        },
    )
    resp = client.chat.completions.create(
        model=effective_transcription_model(),
        temperature=0,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Transcribe this audio in full. Break it into short "
                            "segments (one sentence or utterance each) and give the "
                            "start and end time of each segment in SECONDS. "
                            'Return ONLY JSON of the form: {"language":"en",'
                            '"segments":[{"start":0.0,"end":4.2,"text":"..."}]} '
                            "Cover the entire audio; do not summarize or omit."
                        ),
                    },
                    {"type": "input_audio", "input_audio": {"data": b64, "format": audio_format}},
                ],
            }
        ],
    )
    if resp and getattr(resp, "usage", None):
        record_usage(
            "transcription",
            effective_transcription_model() or settings.TRANSCRIPTION_MODEL,
            resp.usage.prompt_tokens,
            resp.usage.completion_tokens,
        )
    content = (resp.choices[0].message.content or "").strip()
    if not content:
        return None

    data = _extract_json(content)
    segments = data.get("segments") if isinstance(data, dict) else None
    if segments:
        norm = []
        for s in segments:
            text = (s.get("text") or "").strip()
            if not text:
                continue
            text = clean_transcription_text(text)
            if not text:
                continue
            norm.append(
                {
                    "start": _to_seconds(s.get("start")),
                    "end": _to_seconds(s.get("end")),
                    "text": text,
                    "confidence": 0.85,
                }
            )
        if norm:
            return TranscriptionResult(
                text=" ".join(s["text"] for s in norm),
                language=(data.get("language") if isinstance(data, dict) else None),
                segments=norm,
            )

    # Model returned prose instead of JSON → split into proportional segments.
    return _segment_plain_text(content, duration)





# ── Helpers ──────────────────────────────────────────────────────────────────


def _to_seconds(v) -> float:
    """Accept seconds (float) or 'MM:SS' / 'HH:MM:SS' strings."""
    if v is None:
        return 0.0
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        parts = v.strip().split(":")
        try:
            parts = [float(p) for p in parts]
        except ValueError:
            return 0.0
        sec = 0.0
        for p in parts:
            sec = sec * 60 + p
        return sec
    return 0.0


def _segment_plain_text(text: str, duration: Optional[float]) -> TranscriptionResult:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if not sentences:
        sentences = [text.strip()]
    total = duration or (len(sentences) * 4.0)
    per = total / max(1, len(sentences))
    segments = [
        {
            "start": round(i * per, 1),
            "end": round((i + 1) * per, 1),
            "text": s,
            "confidence": 0.6,
        }
        for i, s in enumerate(sentences)
    ]
    return TranscriptionResult(text=" ".join(sentences), language=None, segments=segments)


def _seg_confidence(seg: dict) -> float:
    import math

    logprob = seg.get("avg_logprob")
    if logprob is None:
        return 0.8
    return round(max(0.0, min(1.0, math.exp(logprob))), 3)


def _stub(fallback_text: str) -> TranscriptionResult:
    text = fallback_text or (
        "Welcome back to the channel. Today we are talking about the new economy. "
        "Some people say inflation is permanent. I disagree completely. "
        "Honestly, anyone who thinks otherwise just is not paying attention."
    )
    return _segment_plain_text(text, duration=30.0)


def clean_transcription_text(text: str) -> str:
    """Detect and clean up repetitive music-related hallucinations (like oh oh oh / ooh ooh / *[Music starts]*) in Whisper/Gemini audio transcripts."""
    # 1. Strip out bracketed sound effects like *[Music starts]*, [music], (singing)
    cleaned = re.sub(r'\*?\[[^\]]+\]\*?', '', text)
    cleaned = re.sub(r'\(.*?\)', '', cleaned)
    cleaned = cleaned.strip()

    if not cleaned:
        return "[Music]"

    # 2. Split text into words to check frequency
    words = [w.strip(",.!?").lower() for w in cleaned.split() if w.strip(",.!?")]
    if not words:
        return "[Music]"

    # 3. Check for repetitive non-word phrases
    repetitive_words = {"oh", "ah", "ooh", "uh", "la", "um", "hmm", "music", "song", "yeah", "eh", "hey", "ho"}
    rep_count = sum(1 for w in words if w in repetitive_words)

    # 4. Check for consecutive repeat spams
    has_consec = False
    consec_count = 1
    for i in range(1, len(words)):
        if words[i] == words[i-1]:
            consec_count += 1
            if consec_count >= 3:
                has_consec = True
                break
        else:
            consec_count = 1

    # If the segment consists mostly of filler words or has consecutive repetitions, mark it as [Music]
    if (len(words) >= 3 and rep_count / len(words) >= 0.5) or has_consec:
        return "[Music]"

    return text

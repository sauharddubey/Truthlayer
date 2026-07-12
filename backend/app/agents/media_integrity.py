"""Media Integrity: Deepfake, Celebrity & Manipulation detection.

Covers FR-CELEB-*, FR-DEEP-*, FR-VM-*. Real face-recognition and deepfake models
require GPU and are not free-tier friendly, so this agent delegates to an external
provider (Hive v1) when configured, and otherwise returns transparent heuristic
stub scores. The interface (inputs/outputs) is stable so providers can be swapped
without touching the pipeline.
"""

from __future__ import annotations

import hashlib
import logging

from app.agents.base import AgentContext
from app.config import settings
from app.llm import effective_media_integrity_key
from app.services.media_integrity.base import build_media_integrity_request, resolve_video_path
from app.services.media_integrity.hive import analyze_with_hive

logger = logging.getLogger("truthlayer.media_integrity")

NAME = "media_integrity"


def run(ctx: AgentContext) -> dict:
    if ctx.tier != "business":
        return _stub(ctx, reason="business_tier_only")

    provider = (settings.MEDIA_INTEGRITY_PROVIDER or "").strip().lower()
    if provider == "hive":
        external = analyze_with_hive(ctx)
        if external is not None:
            return external
        return _stub(ctx, reason=_hive_fallback_reason(ctx))

    return _stub(ctx, reason="provider_not_configured")


def _hive_fallback_reason(ctx: AgentContext) -> str:
    if not effective_media_integrity_key():
        return "missing_hive_api_key"
    if not resolve_video_path(ctx):
        return "missing_video_file"
    req = build_media_integrity_request(ctx)
    if not req.media_url:
        if not (settings.BACKEND_PUBLIC_URL or "").strip():
            return "missing_backend_public_url"
        return "unsigned_media_url_failed"
    return "hive_request_failed"


def _stub(ctx: AgentContext, *, reason: str = "") -> dict:
    """Deterministic placeholder so the pipeline + schema stay populated.

    Derives a stable pseudo-score from the video id so results are reproducible.
    Clearly labels itself as a heuristic stub (method='stub') for explainability.
    """
    seed = int(hashlib.sha256(ctx.video_id.encode()).hexdigest(), 16)
    deepfake_prob = round((seed % 25) / 100.0, 3)  # low baseline 0.0–0.24
    authenticity = round(1.0 - deepfake_prob, 3)

    notes = (
        "Heuristic stub. Set MEDIA_INTEGRITY_PROVIDER=hive, BACKEND_PUBLIC_URL, "
        "and add a Hive API token in Settings for real deepfake detection."
    )
    if reason:
        notes = f"{notes} Fallback reason: {reason}."

    return {
        "method": "stub",
        "provider": "stub",
        "stub_reason": reason or None,
        "deepfake": {
            "probability_score": deepfake_prob,
            "authenticity_score": authenticity,
            "confidence": 0.3,
            "manipulation_evidence": [],
            "notes": notes,
        },
        "celebrities": [],
        "manipulation": {
            "edited_audio": False,
            "synthetic_speech": False,
            "temporal_inconsistencies": False,
            "authenticity_score": authenticity,
        },
        "evidence": [],
        "confidence": 0.3,
    }

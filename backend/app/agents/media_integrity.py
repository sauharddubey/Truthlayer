"""Media Integrity: Deepfake, Celebrity & Manipulation detection.

Covers FR-CELEB-*, FR-DEEP-*, FR-VM-*. Real face-recognition (DeepFace/InsightFace)
and deepfake (FaceForensics++/XceptionNet) models require GPU and are not free-tier
friendly, so this agent delegates to an external inference endpoint when
``MEDIA_INTEGRITY_URL`` is configured, and otherwise returns transparent heuristic
stub scores. The interface (inputs/outputs) is stable so the GPU service can be
swapped in without touching the pipeline.
"""

from __future__ import annotations

import hashlib
import logging

import httpx

from app.agents.base import AgentContext
from app.config import settings

logger = logging.getLogger("truthlayer.media_integrity")

NAME = "media_integrity"


def run(ctx: AgentContext) -> dict:
    if settings.MEDIA_INTEGRITY_URL:
        external = _call_external(ctx)
        if external is not None:
            return external
    return _stub(ctx)


def _call_external(ctx: AgentContext) -> dict | None:
    try:
        headers = {}
        if settings.MEDIA_INTEGRITY_API_KEY:
            headers["Authorization"] = f"Bearer {settings.MEDIA_INTEGRITY_API_KEY}"
        resp = httpx.post(
            settings.MEDIA_INTEGRITY_URL.rstrip("/") + "/analyze",
            json={"video_id": ctx.video_id, "metadata": ctx.metadata},
            headers=headers,
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:  # pragma: no cover
        logger.warning("External media-integrity service failed, using stub: %s", exc)
        return None


def _stub(ctx: AgentContext) -> dict:
    """Deterministic placeholder so the pipeline + schema stay populated.

    Derives a stable pseudo-score from the video id so results are reproducible.
    Clearly labels itself as a heuristic stub (method='stub') for explainability.
    """
    seed = int(hashlib.sha256(ctx.video_id.encode()).hexdigest(), 16)
    deepfake_prob = round((seed % 25) / 100.0, 3)  # low baseline 0.0–0.24
    authenticity = round(1.0 - deepfake_prob, 3)

    return {
        "method": "stub",
        "deepfake": {
            "probability_score": deepfake_prob,
            "authenticity_score": authenticity,
            "confidence": 0.3,
            "manipulation_evidence": [],
            "notes": "Heuristic stub. Configure MEDIA_INTEGRITY_URL for real GPU inference.",
        },
        "celebrities": [],  # populated by real face-recognition service
        "manipulation": {
            "edited_audio": False,
            "synthetic_speech": False,
            "temporal_inconsistencies": False,
            "authenticity_score": authenticity,
        },
        "evidence": [],
        "confidence": 0.3,
    }

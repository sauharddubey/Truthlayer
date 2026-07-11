"""Hive AI deepfake detection adapter."""

from __future__ import annotations

import logging
import mimetypes
from pathlib import Path
from typing import Any, Iterator, Optional

import httpx

from app.agents.base import AgentContext
from app.config import settings
from app.llm import effective_media_integrity_key
from app.services.media_integrity.base import build_media_integrity_request, resolve_video_path

logger = logging.getLogger("truthlayer.media_integrity.hive")

HIVE_V3_URL = "https://api.thehive.ai/api/v3/hive/ai-generated-and-deepfake-content-detection"
SIGNAL_CLASSES = {
    "ai_generated": "AI-generated visual content confidence",
    "deepfake": "Visual deepfake confidence",
    "ai_generated_audio": "AI-generated audio confidence",
}
EVIDENCE_THRESHOLD = 0.5
MAX_TIMELINE_FRAMES = 50
MAX_EVIDENCE_ITEMS = 10


def analyze_with_hive(ctx: AgentContext) -> Optional[dict]:
    """Call Hive V3 and normalize to the TruthLayer media-integrity contract."""
    api_key = effective_media_integrity_key()
    if not api_key:
        return None

    req = build_media_integrity_request(ctx)
    if not req.media_url:
        return None

    endpoint = (settings.MEDIA_INTEGRITY_URL or HIVE_V3_URL).rstrip("/")
    try:
        payload = _submit_media_url(endpoint, api_key, req.media_url)
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "Hive media URL request failed: %s response=%s",
            exc,
            _response_excerpt(exc.response),
        )
        if exc.response.status_code != 400:
            return None

        video_path = resolve_video_path(ctx)
        if not video_path:
            return None
        try:
            payload = _submit_media_file(endpoint, api_key, video_path)
        except Exception as upload_exc:
            logger.warning("Hive media upload request failed: %s", upload_exc)
            return None
    except Exception as exc:
        logger.warning("Hive media-integrity request failed: %s", exc)
        return None

    return map_hive_response(payload, duration_seconds=req.duration_seconds)


def _submit_media_url(endpoint: str, api_key: str, media_url: str) -> dict:
    resp = httpx.post(
        endpoint,
        json={
            "media_metadata": True,
            "input": [{"media_url": media_url}],
        },
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def _submit_media_file(endpoint: str, api_key: str, file_path: str) -> dict:
    path = Path(file_path)
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    with path.open("rb") as media:
        resp = httpx.post(
            endpoint,
            files={"media": (path.name, media, mime_type)},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def _response_excerpt(response: httpx.Response) -> str:
    text = response.text.strip()
    return text[:500] if text else "<empty>"


def map_hive_response(payload: dict, *, duration_seconds: Optional[float] = None) -> dict:
    """Map Hive task output to the canonical media-integrity response shape."""
    parsed = _parse_hive_payload(payload)
    max_score = max(0.0, min(1.0, parsed["max_score"]))
    authenticity = round(1.0 - max_score, 3)
    confidence = round(min(1.0, 0.55 + max_score * 0.45), 3)
    evidence = parsed["evidence"]

    notes = "Analyzed via Hive AI-Generated & Deepfake Content Detection."
    if duration_seconds and duration_seconds > 180:
        notes += " Hive V3 URL/base64 video inputs are limited to 180 seconds."

    return {
        "method": "hive",
        "provider": "hive",
        "dominant_signal": parsed["dominant_signal"],
        "signals": parsed["signals"],
        "timeline": parsed["timeline"],
        "deepfake": {
            "probability_score": round(max_score, 3),
            "authenticity_score": authenticity,
            "confidence": confidence,
            "manipulation_evidence": evidence,
            "notes": notes,
        },
        "celebrities": [],
        "manipulation": {
            "edited_audio": False,
            "synthetic_speech": False,
            "temporal_inconsistencies": False,
            "authenticity_score": authenticity,
        },
        "evidence": evidence,
        "confidence": confidence,
        "provider_raw": {
            "task_id": payload.get("task_id"),
            "model": payload.get("model"),
            "id": payload.get("id"),
            "code": payload.get("code"),
        },
    }


def _parse_hive_payload(payload: dict) -> dict:
    frames = _collect_frame_signals(payload)
    if not frames and _frame_count(payload) == 0:
        max_score, evidence = _walk_deepfake_scores(payload)
        frames = _evidence_to_frames(evidence)

    timeline = _build_timeline(frames)
    signals = _compute_signal_stats(timeline)
    dominant_signal = _dominant_signal(signals)
    evidence = _build_evidence(timeline)
    max_score = max(
        (signals.get(name, {}).get("max", 0.0) for name in SIGNAL_CLASSES),
        default=0.0,
    )
    return {
        "max_score": max_score,
        "evidence": evidence,
        "signals": signals,
        "timeline": timeline,
        "dominant_signal": dominant_signal,
    }


def _collect_frame_signals(payload: dict) -> dict[float, dict[str, float]]:
    frames: dict[float, dict[str, float]] = {}
    for frame in _iter_hive_frames(payload):
        timestamp = _frame_timestamp(frame)
        classes = frame.get("classes") or []
        if not isinstance(classes, list):
            classes = [classes]
        bucket = frames.setdefault(timestamp, {name: 0.0 for name in SIGNAL_CLASSES})
        for cls in classes:
            if not isinstance(cls, dict):
                continue
            name = (cls.get("class") or cls.get("label") or "").lower()
            if name not in SIGNAL_CLASSES:
                continue
            score = _safe_float(cls.get("value", cls.get("score")))
            bucket[name] = max(bucket.get(name, 0.0), score)
    return frames


def _iter_hive_frames(payload: dict) -> Iterator[dict]:
    outputs = payload.get("output") or []
    if not isinstance(outputs, list):
        outputs = [outputs]
    for frame in outputs:
        if isinstance(frame, dict):
            yield frame

    for status in payload.get("status") or []:
        if not isinstance(status, dict):
            continue
        response = status.get("response") or {}
        nested = response.get("output") or []
        if not isinstance(nested, list):
            nested = [nested]
        for frame in nested:
            if isinstance(frame, dict):
                yield frame


def _frame_count(payload: dict) -> int:
    return sum(1 for _ in _iter_hive_frames(payload))


def _build_timeline(frames: dict[float, dict[str, float]]) -> list[dict]:
    timeline: list[dict] = []
    for timestamp in sorted(frames.keys()):
        values = frames[timestamp]
        timeline.append(
            {
                "timestamp_sec": round(timestamp, 3),
                **{name: round(values.get(name, 0.0), 3) for name in SIGNAL_CLASSES},
            }
        )
    if len(timeline) > MAX_TIMELINE_FRAMES:
        timeline.sort(
            key=lambda item: max(item.get(name, 0.0) for name in SIGNAL_CLASSES),
            reverse=True,
        )
        timeline = timeline[:MAX_TIMELINE_FRAMES]
        timeline.sort(key=lambda item: item["timestamp_sec"])
    return timeline


def _compute_signal_stats(timeline: list[dict]) -> dict[str, dict[str, float | int]]:
    stats: dict[str, dict[str, float | int]] = {}
    for name in SIGNAL_CLASSES:
        values = [_safe_float(item.get(name)) for item in timeline]
        if values:
            stats[name] = {
                "max": round(max(values), 3),
                "avg": round(sum(values) / len(values), 3),
                "count": len(values),
            }
        else:
            stats[name] = {"max": 0.0, "avg": 0.0, "count": 0}
    return stats


def _dominant_signal(signals: dict[str, dict[str, float | int]]) -> str:
    return max(
        SIGNAL_CLASSES.keys(),
        key=lambda name: _safe_float(signals.get(name, {}).get("max")),
    )


def _build_evidence(timeline: list[dict]) -> list[dict]:
    ranked: list[dict] = []
    for item in timeline:
        timestamp = _safe_float(item.get("timestamp_sec"))
        best_name = max(SIGNAL_CLASSES.keys(), key=lambda name: _safe_float(item.get(name)))
        best_score = _safe_float(item.get(best_name))
        if best_score < EVIDENCE_THRESHOLD:
            continue
        ranked.append(
            {
                "type": "frame",
                "timestamp_sec": timestamp,
                "score": round(best_score, 3),
                "class": best_name,
                "note": SIGNAL_CLASSES[best_name],
            }
        )
    ranked.sort(key=lambda entry: entry.get("score", 0), reverse=True)
    return ranked[:MAX_EVIDENCE_ITEMS]


def _evidence_to_frames(evidence: list[dict]) -> dict[float, dict[str, float]]:
    frames: dict[float, dict[str, float]] = {}
    for item in evidence:
        timestamp = _safe_float(item.get("timestamp_sec"))
        cls_name = (item.get("class") or "").lower()
        if cls_name not in SIGNAL_CLASSES:
            continue
        bucket = frames.setdefault(timestamp, {name: 0.0 for name in SIGNAL_CLASSES})
        bucket[cls_name] = max(bucket.get(cls_name, 0.0), _safe_float(item.get("score")))
    return frames


def _frame_timestamp(frame: dict) -> float:
    for extra in frame.get("extra") or []:
        if not isinstance(extra, dict):
            continue
        if extra.get("name") == "timestamp":
            return _safe_float(extra.get("value"))
    return _safe_float(frame.get("time"))


def _safe_float(value: Any) -> float:
    try:
        return float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0


def _walk_deepfake_scores(obj: Any) -> tuple[float, list[dict]]:
    max_score = 0.0
    evidence: list[dict] = []

    def walk(node: Any, timestamp: float = 0.0) -> None:
        nonlocal max_score
        if isinstance(node, dict):
            if "time" in node and isinstance(node["time"], (int, float)):
                timestamp = float(node["time"])
            cls_name = (node.get("class") or node.get("label") or "").lower()
            if cls_name in SIGNAL_CLASSES and ("score" in node or "value" in node):
                score = _safe_float(node.get("score", node.get("value")))
                max_score = max(max_score, score)
                if score >= EVIDENCE_THRESHOLD:
                    evidence.append(
                        {
                            "type": "frame",
                            "timestamp_sec": timestamp,
                            "score": round(score, 3),
                            "class": cls_name,
                            "note": SIGNAL_CLASSES[cls_name],
                        }
                    )
            for value in node.values():
                walk(value, timestamp)
        elif isinstance(node, list):
            for item in node:
                walk(item, timestamp)

    walk(obj)
    evidence.sort(key=lambda e: e.get("score", 0), reverse=True)
    return max_score, evidence[:MAX_EVIDENCE_ITEMS]

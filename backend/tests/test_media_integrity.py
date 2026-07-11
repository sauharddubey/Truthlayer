"""Media integrity adapter and signed media URL tests."""

from __future__ import annotations

import pytest

from app.agents.base import AgentContext
from app.agents.media_integrity import _stub, run
from app.services.media_integrity.base import absolute_signed_media_url, build_media_integrity_request
from app.services.media_integrity.hive import analyze_with_hive, map_hive_response


@pytest.fixture
def media_env(tmp_path, monkeypatch):
    from cryptography.fernet import Fernet

    from app.config import settings

    key = Fernet.generate_key().decode()
    storage = tmp_path / "media"
    storage.mkdir()
    monkeypatch.setattr(settings, "ENCRYPTION_KEY", key)
    monkeypatch.setattr(settings, "MEDIA_STORAGE_DIR", str(storage))
    monkeypatch.setattr(settings, "BACKEND_PUBLIC_URL", "https://api.example.com")
    return storage


def test_media_integrity_stub_is_deterministic():
    ctx = AgentContext(video_id="abc-123", transcript_text="")
    a = _stub(ctx)
    b = _stub(ctx)
    assert a == b
    assert 0.0 <= a["deepfake"]["probability_score"] <= 1.0
    assert a["method"] == "stub"


def test_build_signed_media_url_requires_public_base(media_env, monkeypatch):
    from app.config import settings

    video_file = media_env / "clip.mp4"
    video_file.write_bytes(b"video")

    signed = absolute_signed_media_url(str(video_file))
    assert signed is not None
    assert signed.startswith("https://api.example.com/media/clip.mp4?exp=")
    assert "sig=" in signed

    monkeypatch.setattr(settings, "BACKEND_PUBLIC_URL", "")
    assert absolute_signed_media_url(str(video_file)) is None


def test_build_media_integrity_request_uses_video_path(media_env):
    video_file = media_env / "upload.mp4"
    video_file.write_bytes(b"video")
    ctx = AgentContext(
        video_id="v1",
        transcript_text="",
        tier="business",
        metadata={"video_path": str(video_file)},
    )
    req = build_media_integrity_request(ctx)
    assert req.media_url is not None
    assert "/media/upload.mp4" in req.media_url


def test_hive_maps_response():
    payload = {
        "task_id": "task_123",
        "model": "hive/ai-generated-and-deepfake-content-detection",
        "output": [
            {
                "extra": [{"name": "timestamp", "value": 2.0}],
                "classes": [
                    {"class": "ai_generated", "value": 0.82},
                    {"class": "deepfake", "value": 0.13},
                    {"class": "ai_generated_audio", "value": 0.0},
                ],
            },
            {
                "extra": [{"name": "timestamp", "value": 5.0}],
                "classes": [{"class": "deepfake", "value": 0.61}],
            }
        ]
    }
    out = map_hive_response(payload, duration_seconds=185.0)
    assert out["method"] == "hive"
    assert out["dominant_signal"] == "ai_generated"
    assert out["signals"]["ai_generated"]["max"] == 0.82
    assert out["signals"]["deepfake"]["max"] == 0.61
    assert out["signals"]["ai_generated_audio"]["max"] == 0.0
    assert len(out["timeline"]) == 2
    assert out["timeline"][0]["timestamp_sec"] == 2.0
    assert out["deepfake"]["probability_score"] == 0.82
    assert out["deepfake"]["authenticity_score"] == pytest.approx(0.18)
    assert len(out["deepfake"]["manipulation_evidence"]) >= 1
    assert out["provider_raw"]["task_id"] == "task_123"
    assert "180 seconds" in out["deepfake"]["notes"]


def test_hive_dominant_signal_prefers_deepfake():
    payload = {
        "output": [
            {
                "extra": [{"name": "timestamp", "value": 1.0}],
                "classes": [
                    {"class": "ai_generated", "value": 0.2},
                    {"class": "deepfake", "value": 0.91},
                ],
            }
        ]
    }
    out = map_hive_response(payload)
    assert out["dominant_signal"] == "deepfake"
    assert out["signals"]["deepfake"]["max"] == 0.91
    assert out["timeline"][0]["deepfake"] == 0.91


def test_hive_timeline_keeps_suspicious_timestamps():
    payload = {
        "output": [
            {
                "extra": [{"name": "timestamp", "value": 4.0}],
                "classes": [{"class": "ai_generated", "value": 0.91}],
            },
            {
                "extra": [{"name": "timestamp", "value": 18.0}],
                "classes": [{"class": "ai_generated", "value": 0.72}],
            },
        ]
    }
    out = map_hive_response(payload)
    timestamps = [item["timestamp_sec"] for item in out["timeline"]]
    assert timestamps == [4.0, 18.0]
    assert out["deepfake"]["manipulation_evidence"][0]["timestamp_sec"] == 4.0


def test_hive_v3_request_shape(monkeypatch, media_env):
    from app.config import settings
    from app.llm import set_runtime_media_integrity_key

    video_file = media_env / "clip.mp4"
    video_file.write_bytes(b"video")
    monkeypatch.setattr(
        settings,
        "MEDIA_INTEGRITY_URL",
        "https://api.thehive.ai/api/v3/hive/ai-generated-and-deepfake-content-detection",
    )
    captured = {}

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "task_id": "task_123",
                "output": [{"classes": [{"class": "deepfake", "value": 0.2}]}],
            }

    def fake_post(endpoint, *, json, headers, timeout):
        captured.update(endpoint=endpoint, json=json, headers=headers, timeout=timeout)
        return Response()

    monkeypatch.setattr("app.services.media_integrity.hive.httpx.post", fake_post)
    set_runtime_media_integrity_key("hive-secret")
    try:
        ctx = AgentContext(
            video_id="v1",
            transcript_text="",
            tier="business",
            metadata={"video_path": str(video_file)},
        )
        out = analyze_with_hive(ctx)
    finally:
        set_runtime_media_integrity_key(None)

    assert out is not None
    assert captured["headers"]["Authorization"] == "Bearer hive-secret"
    assert captured["json"]["media_metadata"] is True
    assert captured["json"]["input"][0]["media_url"].startswith("https://api.example.com/media/clip.mp4")


def test_media_integrity_falls_back_to_stub_without_hive_key(monkeypatch, media_env):
    from app.config import settings

    video_file = media_env / "clip.mp4"
    video_file.write_bytes(b"video")
    monkeypatch.setattr(settings, "MEDIA_INTEGRITY_PROVIDER", "hive")

    ctx = AgentContext(
        video_id="biz-1",
        transcript_text="",
        tier="business",
        metadata={"video_path": str(video_file)},
    )
    out = run(ctx)
    assert out["method"] == "stub"
    assert out["stub_reason"] == "missing_hive_api_key"

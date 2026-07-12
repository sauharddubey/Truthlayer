"""Ingestion helpers for Hive-compatible video normalization."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.services import ingestion


@pytest.fixture
def media_env(tmp_path, monkeypatch):
    from app.config import settings

    storage = tmp_path / "media"
    storage.mkdir()
    monkeypatch.setattr(settings, "MEDIA_STORAGE_DIR", str(storage))
    return storage


def test_normalize_video_for_hive_success(media_env, monkeypatch):
    raw = media_env / "abc123_video.webm"
    raw.write_bytes(b"raw-video")
    hive_out = media_env / "abc123_hive.mp4"

    def fake_run(cmd, **kwargs):
        hive_out.write_bytes(b"normalized-mp4")
        return type("Result", (), {"returncode": 0, "stdout": "", "stderr": ""})()

    monkeypatch.setattr(ingestion.subprocess, "run", fake_run)

    out = ingestion._normalize_video_for_hive(str(raw), media_env, "abc123")
    assert out == str(hive_out)


def test_normalize_video_for_hive_uses_expected_ffmpeg_args(media_env, monkeypatch):
    raw = media_env / "abc123_video.webm"
    raw.write_bytes(b"raw-video")
    hive_out = media_env / "abc123_hive.mp4"
    captured = {}

    def fake_run(cmd, **kwargs):
        captured["cmd"] = cmd
        hive_out.write_bytes(b"normalized-mp4")
        return type("Result", (), {"returncode": 0, "stdout": "", "stderr": ""})()

    monkeypatch.setattr(ingestion.subprocess, "run", fake_run)

    ingestion._normalize_video_for_hive(str(raw), media_env, "abc123")

    cmd = captured["cmd"]
    assert cmd[0] == "ffmpeg"
    assert "-t" in cmd
    assert str(ingestion.HIVE_MAX_VIDEO_SECONDS) in cmd
    assert "libx264" in cmd
    assert "aac" in cmd
    assert "+faststart" in cmd
    assert str(hive_out) in cmd


def test_download_url_video_prefers_normalized_path(media_env, monkeypatch):
    raw = media_env / "yt123_video.webm"
    raw.write_bytes(b"raw-video")
    hive_out = media_env / "yt123_hive.mp4"

    class FakeYDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def extract_info(self, url, download=True):
            raw.touch()
            return {"id": "yt123"}

    import sys

    fake_yt_dlp = type(
        "yt_dlp",
        (),
        {"YoutubeDL": FakeYDL},
    )()
    monkeypatch.setitem(sys.modules, "yt_dlp", fake_yt_dlp)

    def fake_normalize(input_path, out_dir, vid_id):
        hive_out.write_bytes(b"normalized-mp4")
        return str(hive_out)

    monkeypatch.setattr(ingestion, "_normalize_video_for_hive", fake_normalize)

    out = ingestion._download_url_video("https://youtu.be/example", media_env, "yt123")
    assert out == str(hive_out)


def test_download_url_video_falls_back_to_raw_when_normalization_fails(media_env, monkeypatch):
    raw = media_env / "yt123_video.webm"
    raw.write_bytes(b"raw-video")

    class FakeYDL:
        def __init__(self, opts):
            self.opts = opts

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def extract_info(self, url, download=True):
            return {"id": "yt123"}

    import sys

    fake_yt_dlp = type(
        "yt_dlp",
        (),
        {"YoutubeDL": FakeYDL},
    )()
    monkeypatch.setitem(sys.modules, "yt_dlp", fake_yt_dlp)

    monkeypatch.setattr(ingestion, "_normalize_video_for_hive", lambda *args, **kwargs: None)

    out = ingestion._download_url_video("https://youtu.be/example", media_env, "yt123")
    assert out == str(raw)

"""Tests for video delete helpers."""

import os
from pathlib import Path

from app.services.video_cleanup import (
    cleanup_video_media,
    collect_media_paths,
    is_video_submitter,
    related_hive_paths,
)


def test_is_video_submitter_requires_exact_match():
    assert is_video_submitter("user-1", "user-1")
    assert not is_video_submitter("user-1", "user-2")
    assert not is_video_submitter(None, "user-1")


def test_collect_media_paths_deduplicates_known_keys(tmp_path):
    shared = str(tmp_path / "clip.mp4")
    metadata = {
        "upload_path": shared,
        "video_path": shared,
        "audio_path": str(tmp_path / "clip.mp3"),
    }
    assert collect_media_paths(metadata) == [shared, str(tmp_path / "clip.mp3")]


def test_related_hive_paths_finds_normalized_file():
    raw = "/media/abc123_video.mp4"
    hive = related_hive_paths([raw])[0]
    assert hive.replace("\\", "/").endswith("abc123_hive.mp4")


def test_cleanup_video_media_removes_existing_files(tmp_path):
    upload = tmp_path / "upload.mp4"
    video = tmp_path / "vid123_video.mp4"
    hive = tmp_path / "vid123_hive.mp4"
    upload.write_bytes(b"upload")
    video.write_bytes(b"video")
    hive.write_bytes(b"hive")

    removed = cleanup_video_media(
        {
            "upload_path": str(upload),
            "video_path": str(video),
        }
    )

    assert str(upload) in removed
    assert str(video) in removed
    assert str(hive) in removed
    assert not upload.exists()
    assert not video.exists()
    assert not hive.exists()


def test_cleanup_video_media_ignores_missing_files(tmp_path):
    missing = str(tmp_path / "missing.mp4")
    assert cleanup_video_media({"upload_path": missing}) == []
    assert not Path(missing).exists()

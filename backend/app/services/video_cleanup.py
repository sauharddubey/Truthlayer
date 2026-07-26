"""Best-effort cleanup helpers for deleted videos."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable


def is_video_submitter(submitted_by: str | None, user_id: str | None) -> bool:
    return bool(submitted_by and user_id and submitted_by == user_id)


def collect_media_paths(extra_metadata: dict | None) -> list[str]:
    """Collect local media paths stored during ingestion.

    The same file can appear under multiple metadata keys for uploads, so paths
    are de-duplicated while preserving order.
    """
    metadata = extra_metadata or {}
    keys = ("upload_path", "video_path", "audio_path")
    seen: set[str] = set()
    paths: list[str] = []

    def _add(value: object) -> None:
        if not isinstance(value, str) or not value.strip():
            return
        if value in seen:
            return
        seen.add(value)
        paths.append(value)

    for key in keys:
        _add(metadata.get(key))
    # `media_paths` is a list recorded by URL ingestion so every downloaded file
    # (mp3 + 360p mp4 + any hive mp4) is cleaned up, not just the single-key ones.
    media_list = metadata.get("media_paths")
    if isinstance(media_list, (list, tuple)):
        for value in media_list:
            _add(value)
    return paths


def related_hive_paths(paths: Iterable[str]) -> list[str]:
    """Find normalized Hive files next to known downloaded videos."""
    related: list[str] = []
    for item in paths:
        path = Path(item)
        if not path.name.endswith("_video.mp4"):
            continue
        hive = path.with_name(path.name.replace("_video.mp4", "_hive.mp4"))
        related.append(str(hive))
    return related


def cleanup_video_media(extra_metadata: dict | None) -> list[str]:
    """Delete local media files if they still exist.

    Missing files or OS-level removal failures are ignored because database
    deletion should not be blocked by stale local media metadata.
    """
    candidates = collect_media_paths(extra_metadata)
    candidates.extend(related_hive_paths(candidates))

    removed: list[str] = []
    for path in dict.fromkeys(candidates):
        try:
            if os.path.isfile(path):
                os.remove(path)
                removed.append(path)
        except OSError:
            continue
    return removed

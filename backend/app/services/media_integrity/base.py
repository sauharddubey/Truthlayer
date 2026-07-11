"""Shared media-integrity request building and signed media URL helpers."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from app.agents.base import AgentContext
from app.config import settings
from app.crypto import sign_media_url


@dataclass
class MediaIntegrityRequest:
    video_id: str
    media_url: Optional[str] = None
    source_url: Optional[str] = None
    platform: Optional[str] = None
    duration_seconds: Optional[float] = None
    tier: str = "verifier"
    metadata: dict = field(default_factory=dict)


def resolve_video_path(ctx: AgentContext) -> Optional[str]:
    meta = ctx.metadata or {}
    for key in ("video_path", "upload_path"):
        path = meta.get(key)
        if path and os.path.isfile(path):
            return path
    return None


def media_path_from_storage(file_path: str) -> Optional[str]:
    """Map an on-disk path under MEDIA_STORAGE_DIR to ``/media/<filename>``."""
    if not file_path:
        return None
    storage = Path(settings.MEDIA_STORAGE_DIR).resolve()
    path = Path(file_path).resolve()
    try:
        path.relative_to(storage)
    except ValueError:
        return None
    return f"/media/{path.name}"


def absolute_signed_media_url(file_path: str, ttl_seconds: int = 7200) -> Optional[str]:
    """Return a publicly fetchable signed URL for a file in media storage."""
    rel = media_path_from_storage(file_path)
    if not rel:
        return None
    signed = sign_media_url(rel, ttl_seconds=ttl_seconds)
    if not signed:
        return None
    base = (settings.BACKEND_PUBLIC_URL or "").rstrip("/")
    if not base:
        return None
    return f"{base}{signed}"


def build_media_integrity_request(ctx: AgentContext) -> MediaIntegrityRequest:
    video_path = resolve_video_path(ctx)
    return MediaIntegrityRequest(
        video_id=ctx.video_id,
        media_url=absolute_signed_media_url(video_path) if video_path else None,
        source_url=ctx.source_url,
        platform=ctx.platform,
        duration_seconds=ctx.duration_seconds,
        tier=ctx.tier,
        metadata=dict(ctx.metadata or {}),
    )

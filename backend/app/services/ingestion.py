"""Media ingestion (FR-ING-001..007).

Downloads audio + metadata from public video URLs (YouTube / TikTok / Instagram)
via yt-dlp, or accepts a local uploaded file. Produces a normalized ``IngestResult``
that the rest of the pipeline consumes. A content hash supports deduplication.
"""

from __future__ import annotations

import hashlib
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger("truthlayer.ingestion")

SUPPORTED_PLATFORMS = {
    "youtube.com": "youtube",
    "youtu.be": "youtube",
    "tiktok.com": "tiktok",
    "instagram.com": "instagram",
}


@dataclass
class IngestResult:
    audio_path: Optional[str]
    platform: str
    title: Optional[str] = None
    creator_handle: Optional[str] = None
    duration_seconds: Optional[float] = None
    captions: Optional[str] = None
    content_hash: Optional[str] = None
    metadata: dict = field(default_factory=dict)


def detect_platform(url: str) -> str:
    for domain, name in SUPPORTED_PLATFORMS.items():
        if domain in url:
            return name
    return "unknown"


def _storage_dir() -> Path:
    p = Path(settings.MEDIA_STORAGE_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _hash_file(path: str) -> Optional[str]:
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except OSError:
        return None


def ingest_url(url: str) -> IngestResult:
    """Download audio + metadata from a public video URL."""
    platform = detect_platform(url)
    out_dir = _storage_dir()
    audio_path: Optional[str] = None
    meta: dict = {}

    try:
        import yt_dlp  # imported lazily so the module loads without the binary

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": str(out_dir / "%(id)s.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "postprocessors": [
                {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "128"}
            ],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            vid_id = info.get("id")
            audio_path = str(out_dir / f"{vid_id}.mp3")
            meta = {
                "title": info.get("title"),
                "creator_handle": info.get("uploader") or info.get("channel"),
                "duration_seconds": info.get("duration"),
                "view_count": info.get("view_count"),
                "like_count": info.get("like_count"),
                "upload_date": info.get("upload_date"),
                "description": info.get("description"),
            }
    except Exception as exc:
        logger.warning("yt-dlp ingestion failed for %s: %s", url, exc)
        meta = {"title": f"Video from {platform}", "ingest_error": str(exc)}

    return IngestResult(
        audio_path=audio_path if audio_path and os.path.exists(audio_path) else None,
        platform=platform,
        title=meta.get("title"),
        creator_handle=meta.get("creator_handle"),
        duration_seconds=meta.get("duration_seconds"),
        captions=meta.get("description"),
        content_hash=_hash_file(audio_path) if audio_path else None,
        metadata=meta,
    )


def ingest_upload(file_path: str, platform: str = "upload") -> IngestResult:
    """Wrap an already-saved uploaded media file as an IngestResult."""
    return IngestResult(
        audio_path=file_path if os.path.exists(file_path) else None,
        platform=platform,
        title=Path(file_path).stem,
        content_hash=_hash_file(file_path),
    )

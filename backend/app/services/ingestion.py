"""Media ingestion (FR-ING-001..007).

Downloads audio + metadata from public video URLs (YouTube / TikTok / Instagram)
via yt-dlp, or accepts a local uploaded file. Produces a normalized ``IngestResult``
that the rest of the pipeline consumes. A content hash supports deduplication.
"""

from __future__ import annotations

import hashlib
import logging
import os
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from app.config import settings
from app.services.ffmpeg_utils import ffmpeg_exe

logger = logging.getLogger("truthlayer.ingestion")

# Hive V3 URL/base64 video inputs are limited to 180 seconds.
HIVE_MAX_VIDEO_SECONDS = 180

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
    video_path: Optional[str] = None
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


def _normalize_video_for_hive(input_path: str, out_dir: Path, vid_id: str) -> Optional[str]:
    """Transcode to a Hive-friendly MP4 (H.264/AAC, max 720p, faststart)."""
    output_path = str(out_dir / f"{vid_id}_hive.mp4")
    cmd = [
        ffmpeg_exe(),
        "-y",
        "-i",
        input_path,
        "-t",
        str(HIVE_MAX_VIDEO_SECONDS),
        "-vf",
        "scale='min(1280,iw)':-2",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        output_path,
    ]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
        )
        if result.returncode != 0:
            logger.warning(
                "ffmpeg Hive normalization failed for %s: %s",
                input_path,
                (result.stderr or result.stdout or "")[:500],
            )
            return None
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return output_path
    except Exception as exc:
        logger.warning("ffmpeg Hive normalization failed for %s: %s", input_path, exc)
    return None


def _download_url_video(url: str, out_dir: Path, vid_id: str) -> Optional[str]:
    """Download a compact mp4 for deepfake analysis (business tier)."""
    raw_path: Optional[str] = None
    try:
        import yt_dlp

        video_path = str(out_dir / f"{vid_id}_video.mp4")
        ydl_opts = {
            "format": "best[height<=720][ext=mp4]/best[ext=mp4]/best",
            "outtmpl": str(out_dir / f"{vid_id}_video.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "ffmpeg_location": ffmpeg_exe(),
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.extract_info(url, download=True)
        if os.path.exists(video_path):
            raw_path = video_path
        else:
            # yt-dlp may use a different container extension.
            for candidate in out_dir.glob(f"{vid_id}_video.*"):
                if candidate.is_file():
                    raw_path = str(candidate)
                    break
    except Exception as exc:
        logger.warning("yt-dlp video download failed for %s: %s", url, exc)
        return None

    if not raw_path:
        return None

    normalized = _normalize_video_for_hive(raw_path, out_dir, vid_id)
    if normalized:
        return normalized

    logger.warning(
        "Using raw downloaded video for Hive analysis after normalization failed: %s",
        raw_path,
    )
    return raw_path


def ingest_url(url: str, *, include_video: bool = False) -> IngestResult:
    """Download audio + metadata from a public video URL.

    When ``include_video`` is True (business tier), also persist a local mp4
    for media-integrity / deepfake analysis.
    """
    platform = detect_platform(url)
    out_dir = _storage_dir()
    audio_path: Optional[str] = None
    video_path: Optional[str] = None
    meta: dict = {}
    vid_id: Optional[str] = None

    try:
        import yt_dlp  # imported lazily so the module loads without the binary

        ydl_opts = {
            # Download low-res video (max 360p height) to keep it fast & deployable on free tiers
            "format": "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]/worst",
            "outtmpl": str(out_dir / "%(id)s.%(ext)s"),
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "ffmpeg_location": ffmpeg_exe(),
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "128",
                    "nopostoverwrites": False,
                }
            ],
            "keepvideo": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            vid_id = info.get("id")
            audio_path = str(out_dir / f"{vid_id}.mp3")
            
            # Find the preserved video file among candidate video extensions
            for ext in [".mp4", ".webm", ".mkv", ".avi", ".mov", ".m4v"]:
                candidate = str(out_dir / f"{vid_id}{ext}")
                if os.path.exists(candidate):
                    video_path = candidate
                    break

            meta = {
                "title": info.get("title"),
                "creator_handle": info.get("uploader") or info.get("channel"),
                "duration_seconds": info.get("duration"),
                "view_count": info.get("view_count"),
                "like_count": info.get("like_count"),
                "upload_date": info.get("upload_date"),
                "description": info.get("description"),
            }
        if include_video and vid_id:
            video_path = _download_url_video(url, out_dir, vid_id)
            if video_path:
                meta["video_path"] = video_path
    except Exception as exc:
        logger.warning("yt-dlp ingestion failed for %s: %s", url, exc)
        meta = {"title": f"Video from {platform}", "ingest_error": str(exc)}

    return IngestResult(
        audio_path=audio_path if audio_path and os.path.exists(audio_path) else None,
        platform=platform,
        video_path=video_path,
        title=meta.get("title"),
        creator_handle=meta.get("creator_handle"),
        duration_seconds=meta.get("duration_seconds"),
        captions=meta.get("description"),
        content_hash=_hash_file(audio_path) if audio_path else None,
        metadata=meta,
    )


def ingest_upload(file_path: str, platform: str = "upload") -> IngestResult:
    """Wrap an already-saved uploaded media file as an IngestResult."""
    exists = os.path.exists(file_path)
    ext = os.path.splitext(file_path)[1].lower()
    is_video = ext in {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"}
    video_path = file_path if is_video and exists else None
    return IngestResult(
        audio_path=file_path if exists else None,
        platform=platform,
        video_path=video_path,
        title=Path(file_path).stem,
        content_hash=_hash_file(file_path) if exists else None,
        metadata={"video_path": file_path, "upload_path": file_path} if exists else {},
    )

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
from app.urlguard import guarded_resolution, validate_ingest_url

logger = logging.getLogger("truthlayer.ingestion")

# Hive V3 URL/base64 video inputs are limited to 180 seconds.
HIVE_MAX_VIDEO_SECONDS = 180

# Signatures that mean the platform blocked us for looking like a bot / a
# datacenter IP — as opposed to a genuinely bad or private video. When we see
# one, we log an unmistakable, actionable hint (set cookies or a proxy) so the
# cause is obvious in the Render logs instead of a generic "download failed".
_BOT_BLOCK_SIGNATURES = (
    "sign in to confirm",
    "confirm you're not a bot",
    "confirm you are not a bot",
    "not a bot",
    "http error 403",
    "403 forbidden",
    "unable to download webpage",
    "failed to extract any player response",
    "this content isn't available",
    "login required",
    "requires authentication",
    "rate-limit",
    "too many requests",
)


def _log_ingest_failure(url: str, exc: Exception) -> None:
    """Log a yt-dlp failure, upgrading likely bot-blocks to a clear, fix-oriented
    message so the root cause is obvious in production logs."""
    msg = str(exc).lower()
    if any(sig in msg for sig in _BOT_BLOCK_SIGNATURES):
        logger.error(
            "yt-dlp appears BLOCKED as a bot/datacenter IP for %s (%s). "
            "This is expected on cloud hosts like Render. FIX: set YTDLP_COOKIES_FILE "
            "(a logged-in cookies.txt) and/or YTDLP_PROXY (a residential proxy). "
            "See .env.example.",
            url,
            exc,
        )
    else:
        logger.warning("yt-dlp ingestion failed completely for %s: %s", url, exc)

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


def _safety_ydl_opts() -> dict:
    """yt-dlp options that bound resource use and block non-web URLs.

    Applied to every download so a very long / very large / ``file://`` URL is
    rejected before it can exhaust disk or reach the local filesystem. These are
    safety limits only — normal short social videos are well within them.
    """
    opts: dict = {
        "enable_file_urls": False,
        "max_filesize": settings.MAX_DOWNLOAD_MB * 1024 * 1024,
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android", "mweb", "tv_embedded"]
            }
        },
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
            "Accept-Language": "en-US,en;q=0.9",
        },
    }
    max_dur = settings.MAX_VIDEO_DURATION_SECONDS
    if max_dur:
        def _reject_too_long(info, *, incomplete=False):
            duration = info.get("duration")
            if duration and duration > max_dur:
                return f"video exceeds the {max_dur}s duration limit"
            return None

        opts["match_filter"] = _reject_too_long

    # Anti-bot identity for datacenter IPs (YouTube/TikTok/IG bot-detection).
    # Client spoofing above is not enough on cloud hosts; a real cookies file
    # and/or a (residential) proxy is what actually gets past the block. Both
    # are opt-in via env — absent config leaves behavior unchanged.
    cookies_file = (settings.YTDLP_COOKIES_FILE or "").strip()
    if cookies_file:
        if os.path.exists(cookies_file):
            opts["cookiefile"] = cookies_file
        else:
            logger.warning(
                "YTDLP_COOKIES_FILE is set but the file does not exist: %s",
                cookies_file,
            )
    proxy = (settings.YTDLP_PROXY or "").strip()
    if proxy:
        opts["proxy"] = proxy
    return opts


def _hash_file(path: str) -> Optional[str]:
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except OSError:
        return None


def _has_video_stream(path: str) -> bool:
    """True only if ``path`` contains a real (frame-bearing) video stream.

    The primary download prioritizes ``bestaudio`` and keeps the file, so the
    "video" candidate is usually an audio-only container (e.g. an Opus .webm).
    Handing that to OCR just burns an ffmpeg call that extracts zero frames and
    produces an empty OCR result. We probe with ffmpeg (always available via
    ffmpeg_utils) and ignore cover-art / "attached pic" streams, which are not
    real video. Fail-open only on probe error so genuine videos are never lost.
    """
    try:
        result = subprocess.run(
            [ffmpeg_exe(), "-hide_banner", "-i", path],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        # ffmpeg prints stream info to stderr (and exits non-zero with only -i).
        for line in (result.stderr or "").splitlines():
            if "Video:" in line and "attached pic" not in line:
                return True
        return False
    except Exception as exc:
        logger.warning("Could not probe %s for a video stream: %s", path, exc)
        return False


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
            **_safety_ydl_opts(),
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl, guarded_resolution():
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

    Raises :class:`app.urlguard.UrlValidationError` if the URL is not a supported
    public platform or resolves to a private/internal address (SSRF guard).
    """
    url = validate_ingest_url(url)
    platform = detect_platform(url)
    out_dir = _storage_dir()
    audio_path: Optional[str] = None
    video_path: Optional[str] = None
    meta: dict = {}
    vid_id: Optional[str] = None

    try:
        import yt_dlp  # imported lazily so the module loads without the binary

        base_opts = {
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
            **_safety_ydl_opts(),
        }

        # Primary attempt: try audio/video bundle first
        ydl_opts = {
            **base_opts,
            "format": "bestaudio/best/bestvideo[height<=360]+bestaudio/worst",
            "keepvideo": True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl, guarded_resolution():
                info = ydl.extract_info(url, download=True)
        except Exception as primary_exc:
            logger.warning("Primary yt-dlp download failed for %s: %s. Attempting audio-only fallback.", url, primary_exc)
            fallback_opts = {
                **base_opts,
                "format": "bestaudio/best",
                "keepvideo": True,
            }
            with yt_dlp.YoutubeDL(fallback_opts) as ydl, guarded_resolution():
                info = ydl.extract_info(url, download=True)

        vid_id = info.get("id")
        audio_path = str(out_dir / f"{vid_id}.mp3")
        
        # Find the preserved video file among candidate video extensions. The
        # primary format prioritizes bestaudio, so the kept file is often an
        # audio-only container (e.g. Opus .webm) with NO frames — only accept it
        # as a video (for OCR) if it actually has a video stream. Business-tier
        # runs get a proper video via _download_url_video below regardless.
        for ext in [".mp4", ".webm", ".mkv", ".avi", ".mov", ".m4v"]:
            candidate = str(out_dir / f"{vid_id}{ext}")
            if os.path.exists(candidate):
                if _has_video_stream(candidate):
                    video_path = candidate
                else:
                    logger.info(
                        "Ingest kept an audio-only file (%s); OCR/image analysis "
                        "skipped for this run (expected on non-business tiers).",
                        os.path.basename(candidate),
                    )
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
        media_paths = [
            p for p in (audio_path, video_path)
            if p and os.path.exists(p)
        ]
        if audio_path and os.path.exists(audio_path):
            meta["audio_path"] = audio_path
        if video_path and os.path.exists(video_path):
            meta["video_path"] = video_path

        if include_video and vid_id:
            hive_video_path = _download_url_video(url, out_dir, vid_id)
            if hive_video_path:
                meta["video_path"] = hive_video_path
                video_path = hive_video_path
                if hive_video_path not in media_paths:
                    media_paths.append(hive_video_path)
        if media_paths:
            meta["media_paths"] = list(dict.fromkeys(media_paths))
    except Exception as exc:
        _log_ingest_failure(url, exc)
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

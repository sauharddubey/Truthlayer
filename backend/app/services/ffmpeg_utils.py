"""Resolve the ffmpeg binary so the app runs with or without Docker.

Resolution order:
1. System ffmpeg on PATH (the Docker image installs it via apt — unchanged).
2. Static binary bundled by the ``imageio-ffmpeg`` pip package, so local
   (non-Docker) developers don't need ``brew install ffmpeg`` / apt.
3. Fall back to the bare name "ffmpeg" (previous behavior) with an actionable
   log message, so failures explain themselves.
"""

from __future__ import annotations

import logging
import shutil
from functools import lru_cache

logger = logging.getLogger("truthlayer.ffmpeg")


@lru_cache(maxsize=1)
def ffmpeg_exe() -> str:
    """Absolute path to an ffmpeg binary (cached after first resolution)."""
    path = shutil.which("ffmpeg")
    if path:
        return path

    try:
        import imageio_ffmpeg

        path = imageio_ffmpeg.get_ffmpeg_exe()
        logger.info("System ffmpeg not found; using bundled binary: %s", path)
        return path
    except Exception:
        logger.warning(
            "ffmpeg not found on PATH and the imageio-ffmpeg fallback is "
            "unavailable. Install ffmpeg (apt/brew) or `pip install "
            "imageio-ffmpeg` — audio extraction and OCR will fail without it."
        )
        return "ffmpeg"

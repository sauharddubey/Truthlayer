"""Data-retention purge (compliance).

Deletes videos older than ``DATA_RETENTION_DAYS`` and — via ORM cascade + media
cleanup — their transcripts, claims, compliance issues, deepfake/celebrity
results, reports, and on-disk media files. Disabled by default
(``DATA_RETENTION_DAYS=0``); it is opt-in so nothing is ever purged unless an
operator sets a window.

Run manually / from cron::

    python -m app.tasks.retention

or schedule it via Celery beat (see app.tasks.celery_app).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select

from app.config import settings
from app.database import session_scope
from app.models import Video
from app.services.video_cleanup import cleanup_video_media

logger = logging.getLogger("truthlayer.retention")


def purge_expired(retention_days: Optional[int] = None) -> int:
    """Delete videos older than the retention window. Returns the count removed."""
    days = settings.DATA_RETENTION_DAYS if retention_days is None else retention_days
    if not days or days <= 0:
        logger.info("Retention purge disabled (DATA_RETENTION_DAYS=%s)", days)
        return 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    removed = 0
    with session_scope() as db:
        expired = db.execute(select(Video).where(Video.created_at < cutoff)).scalars().all()
        for video in expired:
            cleanup_video_media(video.extra_metadata)
            db.delete(video)
            removed += 1
    logger.info("Retention purge removed %d videos older than %d days", removed, days)
    return removed


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    purge_expired()

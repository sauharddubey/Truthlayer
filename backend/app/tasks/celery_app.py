"""Celery application + tasks (NFR-PERF-002, NFR-SCALE-001).

Used only when USE_CELERY=true and REDIS_URL is set. Provides distributed,
horizontally-scalable async processing. Also defines a beat task for continuous
keyword monitoring (FR-ING-006).
"""

from __future__ import annotations

from celery import Celery

from app.config import settings

celery = Celery(
    "truthlayer",
    broker=settings.REDIS_URL or "memory://",
    backend=settings.REDIS_URL or "cache+memory://",
)
celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    worker_prefetch_multiplier=1,
)


@celery.task(name="truthlayer.process_video", bind=True, max_retries=2)
def process_video_task(self, video_id: str):
    from app.tasks.pipeline import process_video

    process_video(video_id)


@celery.task(name="truthlayer.monitor_keywords")
def monitor_keywords_task():
    """Continuous monitoring stub (FR-ING-006): discover new videos for active
    keywords and enqueue them. Hook a platform search API here in production."""
    from app.monitoring import scan_keywords

    scan_keywords()

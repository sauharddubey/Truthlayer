"""Continuous keyword monitoring (FR-ING-004/006).

Scans active monitored keywords and would enqueue newly-discovered public videos.
Platform discovery APIs (TikTok/Instagram/YouTube) require credentials and are
rate-limited, so the discovery call is left as a clearly-marked integration point;
the scheduling, dedup, and enqueue plumbing around it is real.
"""

from __future__ import annotations

import logging

from sqlalchemy import select

from app.database import session_scope
from app.models import MonitoredKeyword, Video

logger = logging.getLogger("truthlayer.monitoring")


def discover_videos_for_keyword(keyword: str) -> list[dict]:
    """Return [{source_url, platform, title}] for a keyword.

    Integration point: plug in a platform search API (e.g. YouTube Data API,
    Apify TikTok/Instagram scrapers). Returns empty until configured.
    """
    return []


def scan_keywords() -> int:
    """Discover + enqueue new videos for all active keywords. Returns enqueue count."""
    enqueued = 0
    with session_scope() as db:
        keywords = db.execute(
            select(MonitoredKeyword).where(MonitoredKeyword.active.is_(True))
        ).scalars().all()

        for kw in keywords:
            for found in discover_videos_for_keyword(kw.keyword):
                url = found.get("source_url")
                if not url:
                    continue
                # Dedup by source_url (FR-ING-007).
                exists = db.execute(
                    select(Video.id).where(Video.source_url == url)
                ).first()
                if exists:
                    continue
                video = Video(
                    organization_id=kw.organization_id,
                    source_url=url,
                    platform=found.get("platform"),
                    title=found.get("title"),
                )
                db.add(video)
                db.flush()
                enqueued += 1
                from app.tasks.pipeline import dispatch

                dispatch(video.id)
    logger.info("Keyword scan enqueued %d new videos", enqueued)
    return enqueued

"""Hashtag presence checking against platform video descriptions."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import MonitoredKeyword, Video


def normalize_keyword(keyword: str) -> str:
    """Strip whitespace and remove a single leading # for canonical matching."""
    value = (keyword or "").strip()
    if value.startswith("#"):
        value = value[1:]
    return value.lower()


def keyword_in_text(keyword: str, text: str) -> bool:
    """Case-insensitive hashtag match with word boundaries."""
    needle = normalize_keyword(keyword)
    if not needle or not text:
        return False
    pattern = rf"(?<!\w)#?{re.escape(needle)}(?!\w)"
    return re.search(pattern, text, flags=re.IGNORECASE) is not None


def get_description_text(video: Video) -> tuple[str | None, str]:
    """Return platform description text and its source label."""
    captions = (video.captions or "").strip()
    if captions:
        return captions, "description"
    meta = video.extra_metadata or {}
    description = meta.get("description")
    if isinstance(description, str) and description.strip():
        return description.strip(), "description"
    return None, "none"


def applicable_keywords(db: Session, video: Video) -> list[MonitoredKeyword]:
    """Return active monitored keywords that apply to this video."""
    if not video.organization_id:
        return []

    filters = [
        MonitoredKeyword.organization_id == video.organization_id,
        MonitoredKeyword.active.is_(True),
        MonitoredKeyword.keyword_type == "brand",
    ]
    if video.product_id:
        filters = [
            MonitoredKeyword.organization_id == video.organization_id,
            MonitoredKeyword.active.is_(True),
            or_(
                MonitoredKeyword.keyword_type == "brand",
                (
                    (MonitoredKeyword.keyword_type == "product_hashtag")
                    & (MonitoredKeyword.product_id == video.product_id)
                ),
            ),
        ]

    return list(
        db.execute(
            select(MonitoredKeyword).where(*filters).order_by(MonitoredKeyword.created_at.asc())
        ).scalars().all()
    )


def compliance_issues_for_missing(
    missing: list[dict[str, Any]],
    description_text: str | None,
) -> list[dict[str, Any]]:
    """Build deterministic compliance issues for missing monitored hashtags."""
    if not missing:
        return []

    snippet = (description_text or "")[:300]
    severity = "high" if len(missing) > 1 else "medium"
    issues: list[dict[str, Any]] = []
    for item in missing:
        tag = item.get("keyword", "")
        issues.append(
            {
                "issue_type": "missing_disclosure",
                "severity": severity,
                "description": f"Required hashtag '{tag}' not found in video description.",
                "rule_citation": (
                    "Brand hashtag policy: monitored tags must appear in the post description."
                ),
                "evidence": [{"text": snippet}],
            }
        )
    return issues


def check_video_hashtags(db: Session, video: Video) -> dict[str, Any]:
    """Check monitored hashtags against the video's platform description."""
    checked_at = datetime.now(timezone.utc).isoformat()
    keywords = applicable_keywords(db, video)
    description_text, source = get_description_text(video)

    if not description_text:
        return {
            "description_available": False,
            "checked_text_source": "none",
            "checked_at": checked_at,
            "matches": [],
            "present": [],
            "missing": [],
            "evidence": [
                {
                    "text": "",
                    "explanation": "No platform description available to check hashtags.",
                }
            ],
            "confidence": 1.0,
        }

    matches: list[dict[str, Any]] = []
    present: list[dict[str, Any]] = []
    missing: list[dict[str, Any]] = []
    for kw in keywords:
        item = {
            "keyword_id": kw.id,
            "keyword": kw.keyword,
            "keyword_type": kw.keyword_type,
            "present": keyword_in_text(kw.keyword, description_text),
        }
        matches.append(item)
        if item["present"]:
            present.append(item)
        else:
            missing.append(item)

    evidence = [
        {
            "text": description_text[:300],
            "explanation": (
                f"Checked {len(keywords)} monitored hashtag(s) against the platform description."
            ),
        }
    ]
    return {
        "description_available": True,
        "checked_text_source": source,
        "checked_at": checked_at,
        "matches": matches,
        "present": present,
        "missing": missing,
        "evidence": evidence,
        "confidence": 1.0,
    }


def summarize_video_hashtag_status(
    hashtag_check: dict[str, Any] | None,
) -> dict[str, Any]:
    """Normalize stored hashtag_check output for API responses."""
    if not hashtag_check:
        return {
            "present_keywords": [],
            "missing_keywords": [],
            "description_available": False,
        }
    return {
        "present_keywords": [m.get("keyword") for m in hashtag_check.get("present", []) if m.get("keyword")],
        "missing_keywords": [m.get("keyword") for m in hashtag_check.get("missing", []) if m.get("keyword")],
        "description_available": bool(hashtag_check.get("description_available")),
    }


def build_video_match_rows(videos: list[Video]) -> list[dict[str, Any]]:
    """Build per-video hashtag status rows from attached reports."""
    rows: list[dict[str, Any]] = []
    for video in videos:
        report = video.report
        hashtag_check = (report.agent_results or {}).get("hashtag_check") if report else None
        status = summarize_video_hashtag_status(hashtag_check)
        rows.append(
            {
                "video_id": video.id,
                "title": video.title or video.source_url or "Untitled",
                **status,
            }
        )
    return rows

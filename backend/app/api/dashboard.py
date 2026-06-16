"""Dashboards for the three user categories."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

import json
from redis import Redis
from app.config import settings
from app.database import get_db
from app.llm import chat_json
from app.models import MonitoredKeyword, NarrativeCluster, Product, User, UserRole, Video
from app.schemas import KeywordRequest
from app.security import get_current_user

# Setup Redis client for caching brand synthesis
_redis_client = None
if settings.REDIS_URL:
    try:
        _redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception:
        pass

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _cards_for_user(db: Session, user: User):
    vids = db.execute(
        select(Video).where(Video.submitted_by == user.id).order_by(Video.created_at.desc()).limit(60)
    ).scalars().all()
    out = []
    for v in vids:
        r = v.report
        out.append({
            "video_id": v.id,
            "title": v.title or v.source_url,
            "platform": v.platform,
            "status": v.processing_status.value,
            "created_at": v.created_at.isoformat(),
            "trust_score": r.trust_score if r else None,
            "risk_score": r.risk_score if r else None,
            "sentiment_score": r.sentiment_score if r else None,
            "bias_score": r.bias_score if r else None,
        })
    return out


@router.get("/creator")
def creator_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cards = _cards_for_user(db, user)
    avg_risk = round(sum(c["risk_score"] or 0 for c in cards) / len(cards), 1) if cards else 0
    return {"videos": cards, "average_risk": avg_risk}


@router.get("/verifier")
def verifier_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {"videos": _cards_for_user(db, user)}


# ── Brand (business) overview ────────────────────────────────────────────────


@router.get("/brand")
def brand_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != UserRole.BUSINESS or not user.organization_id:
        raise HTTPException(status_code=403, detail="Business accounts only")
    org_id = user.organization_id

    products = db.execute(
        select(Product).where(Product.organization_id == org_id)
    ).scalars().all()

    product_summaries = []
    for p in products:
        vids = db.execute(select(Video).where(Video.product_id == p.id)).scalars().all()
        reports = [v.report for v in vids if v.report]

        def avg(attr):
            vals = [getattr(r, attr) for r in reports if getattr(r, attr) is not None]
            return round(sum(vals) / len(vals), 1) if vals else None

        product_summaries.append({
            "id": p.id,
            "name": p.name,
            "image_url": p.image_url,
            "video_count": len(vids),
            "trust_score": avg("trust_score"),
            "sentiment_score": avg("sentiment_score"),
            "risk_score": avg("risk_score"),
        })

    # Best products by trust.
    ranked = sorted(
        [p for p in product_summaries if p["trust_score"] is not None],
        key=lambda x: x["trust_score"],
        reverse=True,
    )

    # Brand identity + strengths/weaknesses synthesis (cached in Redis to resolve dashboard delays).
    synthesis = None
    cache_key = f"brand_synthesis:{org_id}"
    if _redis_client:
        try:
            cached_data = _redis_client.get(cache_key)
            if cached_data:
                synthesis = json.loads(cached_data)
        except Exception:
            pass

    if not synthesis:
        synthesis = {}
        if product_summaries:
            synthesis = chat_json(
                system=(
                    "You are a brand analyst. Given per-product trust/sentiment/risk scores "
                    "for a company, summarize the brand identity in one sentence, and list "
                    "general strengths and weaknesses across the portfolio."
                ),
                user=str(product_summaries)[:3000],
                schema_hint='{"brand_identity":"string","strengths":["string"],"weaknesses":["string"]}',
            )
            if synthesis and _redis_client:
                try:
                    # Cache for 1 hour (3600 seconds) - invalidated on pipeline completions and product changes
                    _redis_client.set(cache_key, json.dumps(synthesis), ex=3600)
                except Exception:
                    pass

    # Brand perception from monitored brand hashtags + overall sentiment.
    all_reports = db.execute(
        select(Video).where(Video.organization_id == org_id)
    ).scalars().all()
    sents = [v.report.sentiment_score for v in all_reports if v.report and v.report.sentiment_score is not None]
    brand_perception = round(sum(sents) / len(sents), 2) if sents else None

    brand_keywords = db.execute(
        select(MonitoredKeyword).where(
            MonitoredKeyword.organization_id == org_id, MonitoredKeyword.keyword_type == "brand"
        )
    ).scalars().all()

    clusters = db.execute(
        select(NarrativeCluster).where(NarrativeCluster.organization_id == org_id)
        .order_by(NarrativeCluster.risk_score.desc())
    ).scalars().all()

    return {
        "products": product_summaries,
        "best_products": ranked[:3],
        "brand_identity": synthesis.get("brand_identity"),
        "strengths": synthesis.get("strengths", []),
        "weaknesses": synthesis.get("weaknesses", []),
        "brand_perception": brand_perception,
        "brand_keywords": [{"id": k.id, "keyword": k.keyword} for k in brand_keywords],
        "narrative_clusters": [
            {"id": c.id, "topic": c.topic, "summary": c.summary, "risk_score": c.risk_score,
             "product_id": c.product_id, "video_count": len(c.video_ids)}
            for c in clusters
        ],
    }


@router.post("/brand/keywords")
def add_brand_keyword(payload: KeywordRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != UserRole.BUSINESS or not user.organization_id:
        raise HTTPException(status_code=403, detail="Business accounts only")
    kw = MonitoredKeyword(
        organization_id=user.organization_id,
        product_id=None,
        keyword=payload.keyword,
        keyword_type="brand",
    )
    db.add(kw)
    db.commit()
    db.refresh(kw)
    return {"id": kw.id, "keyword": kw.keyword}

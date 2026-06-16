"""Business product workspaces.

Each product has its own videos, compliance knowledge base (product details +
marketing policies), hashtag monitoring, narrative intelligence, an overview, and
cross-transcript contradiction detection.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.narrative import cluster_narratives
from app.database import get_db
from app.llm import chat_json
from app.models import (
    BusinessDocument,
    Claim,
    MonitoredKeyword,
    Product,
    ProcessingStatus,
    User,
    UserRole,
    Video,
)
from app.rag.store import ingest_document
from app.schemas import (
    ClaimReviewRequest,
    DocumentOut,
    KeywordRequest,
    ProductCreate,
    ProductOut,
    VideoOut,
)
from app.security import require_roles

router = APIRouter(prefix="/products", tags=["products"])
business_only = require_roles(UserRole.BUSINESS)


def _org(user: User) -> str:
    if not user.organization_id:
        raise HTTPException(status_code=400, detail="No organization")
    return user.organization_id


def _get_product(db: Session, pid: str, user: User) -> Product:
    p = db.get(Product, pid)
    if not p or p.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


# ── CRUD ─────────────────────────────────────────────────────────────────────


@router.post("", response_model=ProductOut)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), user: User = Depends(business_only)):
    p = Product(
        organization_id=_org(user),
        name=payload.name,
        description=payload.description,
        image_url=payload.image_url,
        aliases=payload.aliases or [],
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.post("/{pid}/image", response_model=ProductOut)
async def upload_product_image(
    pid: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(business_only),
):
    import os
    import uuid as _uuid

    from app.config import settings

    p = _get_product(db, pid, user)
    os.makedirs(settings.MEDIA_STORAGE_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        raise HTTPException(status_code=400, detail="Image must be jpg/png/webp/gif")
    fname = f"product_{pid}_{_uuid.uuid4().hex[:8]}{ext}"
    with open(os.path.join(settings.MEDIA_STORAGE_DIR, fname), "wb") as f:
        f.write(await file.read())
    p.image_url = f"/media/{fname}"
    db.commit()
    db.refresh(p)
    return p


@router.get("", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db), user: User = Depends(business_only)):
    return db.execute(
        select(Product).where(Product.organization_id == _org(user)).order_by(Product.created_at.desc())
    ).scalars().all()


@router.get("/{pid}", response_model=ProductOut)
def get_product(pid: str, db: Session = Depends(get_db), user: User = Depends(business_only)):
    return _get_product(db, pid, user)


@router.delete("/{pid}")
def delete_product(pid: str, db: Session = Depends(get_db), user: User = Depends(business_only)):
    p = _get_product(db, pid, user)
    db.delete(p)
    db.commit()
    return {"deleted": pid}


# ── Knowledge base (product details + marketing policies) ────────────────────


@router.post("/{pid}/documents", response_model=DocumentOut)
async def upload_document(
    pid: str,
    file: UploadFile = File(...),
    document_type: str = Form("product_details"),
    db: Session = Depends(get_db),
    user: User = Depends(business_only),
):
    _get_product(db, pid, user)
    raw = await file.read()
    return ingest_document(
        db,
        organization_id=_org(user),
        product_id=pid,
        filename=file.filename or "document",
        document_type=document_type,
        raw=raw,
    )


@router.get("/{pid}/documents", response_model=list[DocumentOut])
def list_documents(pid: str, db: Session = Depends(get_db), user: User = Depends(business_only)):
    return db.execute(
        select(BusinessDocument).where(BusinessDocument.product_id == pid)
    ).scalars().all()


# ── Hashtag monitoring ────────────────────────────────────────────────────────


@router.post("/{pid}/keywords")
def add_keyword(pid: str, payload: KeywordRequest, db: Session = Depends(get_db), user: User = Depends(business_only)):
    _get_product(db, pid, user)
    kw = MonitoredKeyword(
        organization_id=_org(user),
        product_id=pid,
        keyword=payload.keyword,
        keyword_type=payload.keyword_type,
    )
    db.add(kw)
    db.commit()
    db.refresh(kw)
    return {"id": kw.id, "keyword": kw.keyword, "keyword_type": kw.keyword_type}


@router.get("/{pid}/keywords")
def list_keywords(pid: str, db: Session = Depends(get_db), user: User = Depends(business_only)):
    rows = db.execute(select(MonitoredKeyword).where(MonitoredKeyword.product_id == pid)).scalars().all()
    return [{"id": k.id, "keyword": k.keyword, "keyword_type": k.keyword_type} for k in rows]


# ── Videos & overview ─────────────────────────────────────────────────────────


def _video_card(v: Video) -> dict:
    r = v.report
    return {
        "video_id": v.id,
        "title": v.title or v.source_url,
        "platform": v.platform,
        "status": v.processing_status.value,
        "created_at": v.created_at.isoformat(),
        "trust_score": r.trust_score if r else None,
        "risk_score": r.risk_score if r else None,
        "sentiment_score": r.sentiment_score if r else None,
        "compliance_score": r.compliance_score if r else None,
    }


@router.get("/{pid}/videos")
def product_videos(pid: str, db: Session = Depends(get_db), user: User = Depends(business_only)):
    _get_product(db, pid, user)
    vids = db.execute(
        select(Video).where(Video.product_id == pid).order_by(Video.created_at.desc())
    ).scalars().all()
    return {"videos": [_video_card(v) for v in vids]}


@router.get("/{pid}/overview")
def product_overview(pid: str, db: Session = Depends(get_db), user: User = Depends(business_only)):
    p = _get_product(db, pid, user)
    vids = db.execute(select(Video).where(Video.product_id == pid)).scalars().all()
    reports = [v.report for v in vids if v.report]

    def avg(attr):
        vals = [getattr(r, attr) for r in reports if getattr(r, attr) is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    needs_review = db.execute(
        select(Claim)
        .join(Video, Video.id == Claim.video_id)
        .where(Video.product_id == pid, Claim.verification_status == "needs_review")
    ).scalars().all()

    return {
        "product": {"id": p.id, "name": p.name, "description": p.description},
        "video_count": len(vids),
        "trust_score": avg("trust_score"),
        "sentiment_score": avg("sentiment_score"),
        "compliance_score": avg("compliance_score"),
        "risk_score": avg("risk_score"),
        "claims_needing_review": [
            {"id": c.id, "video_id": c.video_id, "claim_text": c.claim_text, "note": c.verification_note}
            for c in needs_review
        ],
    }


@router.post("/{pid}/narratives/recompute")
def recompute_narratives(pid: str, db: Session = Depends(get_db), user: User = Depends(business_only)):
    _get_product(db, pid, user)
    clusters = cluster_narratives(db, _org(user), product_id=pid)
    return [
        {
            "id": c.id, "topic": c.topic, "summary": c.summary,
            "risk_score": c.risk_score, "propagation_risk": c.propagation_risk,
            "video_count": len(c.video_ids),
        }
        for c in clusters
    ]


@router.get("/{pid}/contradictions")
def contradictions(pid: str, db: Session = Depends(get_db), user: User = Depends(business_only)):
    """Cross-transcript reference: find claims that contradict across this
    product's videos."""
    _get_product(db, pid, user)
    rows = db.execute(
        select(Claim.claim_text, Claim.video_id, Video.title)
        .join(Video, Video.id == Claim.video_id)
        .where(Video.product_id == pid)
    ).all()
    if len(rows) < 2:
        return {"contradictions": []}

    listing = "\n".join(
        f"[{i}] (video {r[1][:8]} – {r[2] or ''}) {r[0]}" for i, r in enumerate(rows[:60])
    )
    result = chat_json(
        system=(
            "You are given claims made across multiple videos about the same product. "
            "Identify pairs of claims that CONTRADICT each other (different numbers, "
            "opposite statements, incompatible facts). Return only genuine contradictions."
        ),
        user=f"Claims:\n{listing}",
        schema_hint='{"contradictions":[{"claim_a":"string","claim_b":"string","explanation":"string"}]}',
    )
    return {"contradictions": result.get("contradictions", [])}


# ── Claim review (brand approves/rejects needs_review claims) ────────────────


@router.put("/claims/{claim_id}/review")
def review_claim(
    claim_id: str,
    payload: ClaimReviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(business_only),
):
    claim = db.get(Claim, claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    video = db.get(Video, claim.video_id)
    if not video or video.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be approved|rejected")
    claim.verification_status = payload.status
    db.commit()
    return {"id": claim.id, "verification_status": claim.verification_status}

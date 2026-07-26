"""Video ingestion + analysis endpoints (§9 Videos / Analysis)."""

import os
import uuid
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AnalysisMode, Claim, ProcessingStatus, Product, User, UserRole, Video
from app.ratelimit import EXPENSIVE, limiter
from app.rights import rights_for_role, tier_for_role
from app.schemas import AnalysisOut, AnalysisStartRequest, VideoOut, VideoUrlRequest
from app.security import get_current_user
from app.uploads import VIDEO_KINDS, enforce_content_type
from app.urlguard import UrlValidationError, validate_ingest_url
from app.services.video_cleanup import cleanup_video_media, is_video_submitter
from app.tasks.pipeline import dispatch

router = APIRouter(tags=["videos"])

_ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

_ROLE_MODE = {
    UserRole.BUSINESS: AnalysisMode.BUSINESS,
    UserRole.CREATOR: AnalysisMode.CREATOR,
    UserRole.VERIFIER: AnalysisMode.VERIFIER,
}


def _enqueue(video_id: str, background: BackgroundTasks):
    if settings.celery_enabled:
        dispatch(video_id)
    else:
        background.add_task(dispatch, video_id)


def _check_format(user: User, fmt: str):
    rights = rights_for_role(user.role)
    if fmt not in rights["formats"]:
        raise HTTPException(
            status_code=403,
            detail=f"{rights['label']} accounts cannot submit '{fmt}'. Allowed: {rights['formats']}",
        )


def _require_api_key(user: User):
    """Analysis requires the user's own OpenRouter key (FR-AUTH). No key, no work."""
    if not (user.openrouter_api_key and user.openrouter_api_key.strip()):
        raise HTTPException(
            status_code=403,
            detail="Add your OpenRouter API key in Settings before running any analysis.",
        )


def _validate_product(db: Session, product_id: str | None, user: User) -> str | None:
    """Reject a product_id that doesn't belong to the caller's org (integrity IDOR).

    Without this, a user could attach their video into another org's product
    views/analyses by guessing a product UUID.
    """
    if not product_id:
        return None
    product = db.get(Product, product_id)
    if not product or product.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_id


@router.post("/videos/url", response_model=VideoOut)
@limiter.limit(EXPENSIVE)
def submit_url(
    request: Request,
    payload: VideoUrlRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.services.ingestion import detect_platform

    _require_api_key(user)
    _check_format(user, "url")

    # SSRF guard: only supported public platforms, never internal/private hosts.
    try:
        url = validate_ingest_url(payload.url)
    except UrlValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    product_id = _validate_product(db, payload.product_id, user)

    # Dedup by source_url within tenant scope (FR-ING-007).
    existing = db.execute(
        select(Video).where(
            Video.source_url == url,
            Video.organization_id == user.organization_id,
            Video.submitted_by == user.id,
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    video = Video(
        organization_id=user.organization_id,
        product_id=product_id,
        submitted_by=user.id,
        source_url=url,
        platform=detect_platform(url),
        mode=_ROLE_MODE.get(user.role, AnalysisMode.VERIFIER),
        processing_status=ProcessingStatus.PENDING,
        rights_attested=bool(payload.rights_attested),
        rights_attested_at=_utcnow() if payload.rights_attested else None,
        extra_metadata={"tier": tier_for_role(user.role)},
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    _enqueue(video.id, background)
    return video


@router.post("/videos/upload", response_model=VideoOut)
@limiter.limit(EXPENSIVE)
def upload_video(
    request: Request,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    product_id: str = Form(None),
    rights_attested: bool = Form(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_api_key(user)
    _check_format(user, "upload")

    # Only accept known video containers — never trust the client to hand us an
    # arbitrary extension (defends against content-spoofing / served-back files).
    ext = os.path.splitext(file.filename or "")[1].lower() or ".mp4"
    if ext not in _ALLOWED_VIDEO_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {sorted(_ALLOWED_VIDEO_EXTS)}",
        )
    if file.content_type and not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    product_id = _validate_product(db, product_id or None, user)

    os.makedirs(settings.MEDIA_STORAGE_DIR, exist_ok=True)
    dest = os.path.join(settings.MEDIA_STORAGE_DIR, f"{uuid.uuid4()}{ext}")

    # Validate the real file signature on the first chunk before writing anything,
    # so a non-video payload with a .mp4 name never reaches disk / ffmpeg.
    first_chunk = file.file.read(1024 * 1024)
    if first_chunk:
        enforce_content_type(first_chunk, VIDEO_KINDS, label="video")

    size = 0
    with open(dest, "wb") as f:
        chunk = first_chunk
        while chunk:
            size += len(chunk)
            if size > settings.MAX_UPLOAD_MB * 1024 * 1024:
                f.close()
                os.remove(dest)
                raise HTTPException(status_code=413, detail="File too large")
            f.write(chunk)
            chunk = file.file.read(1024 * 1024)

    video = Video(
        organization_id=user.organization_id,
        product_id=product_id,
        submitted_by=user.id,
        platform="upload",
        title=file.filename,
        mode=_ROLE_MODE.get(user.role, AnalysisMode.VERIFIER),
        processing_status=ProcessingStatus.PENDING,
        rights_attested=bool(rights_attested),
        rights_attested_at=_utcnow() if rights_attested else None,
        extra_metadata={"upload_path": dest, "tier": tier_for_role(user.role)},
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    _enqueue(video.id, background)
    return video


@router.get("/videos/{video_id}", response_model=VideoOut)
def get_video(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    video = _get_scoped(db, video_id, user)
    return video


@router.delete("/videos/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    video = _get_scoped(db, video_id, user)
    if not is_video_submitter(video.submitted_by, user.id):
        raise HTTPException(status_code=403, detail="Only the submitting user can delete this video")

    cleanup_video_media(video.extra_metadata)
    db.delete(video)
    db.commit()
    return {"deleted": video_id}


@router.post("/analysis/start", response_model=VideoOut)
@limiter.limit(EXPENSIVE)
def start_analysis(
    request: Request,
    payload: AnalysisStartRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_api_key(user)
    video = _get_scoped(db, payload.video_id, user)
    video.processing_status = ProcessingStatus.PENDING
    video.error = None
    # Re-analysis reflects the submitter's CURRENT workspace role, so switching
    # role (e.g. Verifier -> Creator) and re-analyzing runs the new tier's lenses
    # instead of replaying the tier captured when the video was first submitted.
    # Both fields must stay in sync: the pipeline selects agents by the metadata
    # tier, while the API/frontend/PDF read video.mode.
    # Reassign the dict (not in-place mutate) so SQLAlchemy tracks the JSON change.
    meta = dict(video.extra_metadata or {})
    meta["tier"] = tier_for_role(user.role)
    video.extra_metadata = meta
    video.mode = _ROLE_MODE.get(user.role, AnalysisMode.VERIFIER)
    db.commit()
    _enqueue(video.id, background)
    return video


@router.get("/analysis/{video_id}", response_model=AnalysisOut)
def get_analysis(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    video = _get_scoped(db, video_id, user)
    claims = db.execute(select(Claim).where(Claim.video_id == video_id)).scalars().all()
    return AnalysisOut(video=video, report=video.report, claims=claims)


def _get_scoped(db: Session, video_id: str, user: User) -> Video:
    video = db.get(Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    # Tenant isolation (NFR-SEC-001): org videos only visible within the org;
    # personal (no-org) videos only visible to their submitter.
    if video.organization_id:
        if video.organization_id != user.organization_id:
            raise HTTPException(status_code=403, detail="Not authorized for this video")
    elif video.submitted_by != user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this video")
    return video

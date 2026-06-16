"""Video ingestion + analysis endpoints (§9 Videos / Analysis)."""

import os
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AnalysisMode, Claim, ProcessingStatus, User, UserRole, Video
from app.rights import rights_for_role, tier_for_role
from app.schemas import AnalysisOut, AnalysisStartRequest, VideoOut, VideoUrlRequest
from app.security import get_current_user
from app.tasks.pipeline import dispatch

router = APIRouter(tags=["videos"])

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


@router.post("/videos/url", response_model=VideoOut)
def submit_url(
    payload: VideoUrlRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.services.ingestion import detect_platform

    _check_format(user, "url")

    # Dedup by source_url within tenant scope (FR-ING-007).
    existing = db.execute(
        select(Video).where(
            Video.source_url == payload.url,
            Video.organization_id == user.organization_id,
            Video.submitted_by == user.id,
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    video = Video(
        organization_id=user.organization_id,
        product_id=payload.product_id,
        submitted_by=user.id,
        source_url=payload.url,
        platform=detect_platform(payload.url),
        mode=_ROLE_MODE.get(user.role, AnalysisMode.VERIFIER),
        processing_status=ProcessingStatus.PENDING,
        extra_metadata={"tier": tier_for_role(user.role)},
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    _enqueue(video.id, background)
    return video


@router.post("/videos/upload", response_model=VideoOut)
def upload_video(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    product_id: str = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _check_format(user, "upload")

    os.makedirs(settings.MEDIA_STORAGE_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".mp4"
    dest = os.path.join(settings.MEDIA_STORAGE_DIR, f"{uuid.uuid4()}{ext}")

    size = 0
    with open(dest, "wb") as f:
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > settings.MAX_UPLOAD_MB * 1024 * 1024:
                f.close()
                os.remove(dest)
                raise HTTPException(status_code=413, detail="File too large")
            f.write(chunk)

    video = Video(
        organization_id=user.organization_id,
        product_id=product_id or None,
        submitted_by=user.id,
        platform="upload",
        title=file.filename,
        mode=_ROLE_MODE.get(user.role, AnalysisMode.VERIFIER),
        processing_status=ProcessingStatus.PENDING,
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


@router.post("/analysis/start", response_model=VideoOut)
def start_analysis(
    payload: AnalysisStartRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = _get_scoped(db, payload.video_id, user)
    video.processing_status = ProcessingStatus.PENDING
    video.error = None
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

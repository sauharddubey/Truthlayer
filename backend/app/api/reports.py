"""Report export endpoints (§9 Reports, FR-DASH-004)."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.videos import _get_scoped
from app.database import get_db
from app.models import User
from app.schemas import AnalysisOut
from app.security import get_current_user
from app.services.reports import build_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/{video_id}/json", response_model=AnalysisOut)
def report_json(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    video = _get_scoped(db, video_id, user)
    return AnalysisOut(video=video, report=video.report, claims=video.claims)


@router.get("/{video_id}/pdf")
def report_pdf(video_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    video = _get_scoped(db, video_id, user)
    if not video.report:
        raise HTTPException(status_code=409, detail="Analysis not completed yet")
    pdf = build_pdf(video)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="truthlayer-{video_id}.pdf"'},
    )

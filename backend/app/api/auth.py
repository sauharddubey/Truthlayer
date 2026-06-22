"""Profile & settings for Supabase-authenticated users (FR-AUTH-001..004).

Sign-up / sign-in (email+password and Google) happen client-side via Supabase.
The backend verifies the Supabase JWT (see ``app.security``) and exposes the
local profile. ``/auth/bootstrap`` lets the frontend apply the role / org chosen
at sign-up onto the JIT-provisioned profile.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crypto import encrypt_secret
from app.database import get_db
from app.models import Organization, User, UserRole
from app.schemas import BootstrapRequest, SettingsRequest, UserOut
from app.security import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        has_api_key=bool(user.openrouter_api_key),
        has_tavily_key=bool(user.tavily_api_key),
        has_media_integrity_key=bool(user.media_integrity_api_key),
        llm_model=user.llm_model,
        embeddings_model=user.embeddings_model,
        transcription_model=user.transcription_model,
    )


@router.post("/bootstrap", response_model=UserOut)
def bootstrap(
    payload: BootstrapRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Apply the workspace role / org chosen at sign-up to the current profile.

    Called by the frontend right after a Supabase sign-up (and harmlessly after
    sign-in). The profile itself is created on first authenticated request.
    """
    if payload.full_name and not user.full_name:
        user.full_name = payload.full_name
    if payload.role is not None:
        user.role = payload.role
        # Business accounts need an organization; create one if missing.
        if payload.role == UserRole.BUSINESS and not user.organization_id:
            org = Organization(
                name=payload.organization_name or f"{user.email.split('@')[0]}'s workspace"
            )
            db.add(org)
            db.flush()
            user.organization_id = org.id
    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return _user_out(user)


@router.get("/rights")
def my_rights(user: User = Depends(get_current_user)):
    """Capabilities for the current user category (formats, capabilities)."""
    from app.rights import rights_for_role

    return rights_for_role(user.role)


@router.put("/settings", response_model=UserOut)
def update_settings(payload: SettingsRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Set the user's own service API keys (encrypted) and model configuration.

    Every key is encrypted at rest and only decrypted at point-of-use; keys are
    never read from environment variables.
    """
    if payload.openrouter_api_key is not None:
        user.openrouter_api_key = encrypt_secret(payload.openrouter_api_key.strip() or None)
    if payload.tavily_api_key is not None:
        user.tavily_api_key = encrypt_secret(payload.tavily_api_key.strip() or None)
    if payload.media_integrity_api_key is not None:
        user.media_integrity_api_key = encrypt_secret(payload.media_integrity_api_key.strip() or None)
    if payload.llm_model is not None:
        user.llm_model = payload.llm_model.strip() or None
    if payload.embeddings_model is not None:
        user.embeddings_model = payload.embeddings_model.strip() or None
    if payload.transcription_model is not None:
        user.transcription_model = payload.transcription_model.strip() or None
    db.commit()
    db.refresh(user)
    return _user_out(user)


@router.get("/usage")
def get_usage(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Return token & cost usage summary for the current user."""
    from app.models import UsageRecord
    from datetime import datetime, timezone, timedelta

    # All-time per-model breakdown
    rows = db.execute(
        select(
            UsageRecord.model,
            UsageRecord.call_type,
            func.sum(UsageRecord.prompt_tokens).label("prompt_tokens"),
            func.sum(UsageRecord.completion_tokens).label("completion_tokens"),
            func.sum(UsageRecord.total_tokens).label("total_tokens"),
            func.sum(UsageRecord.cost_microdollars).label("cost_microdollars"),
            func.count().label("calls"),
        )
        .where(UsageRecord.user_id == user.id)
        .group_by(UsageRecord.model, UsageRecord.call_type)
        .order_by(func.sum(UsageRecord.total_tokens).desc())
    ).all()

    by_model = [
        {
            "model": r.model,
            "call_type": r.call_type,
            "prompt_tokens": r.prompt_tokens or 0,
            "completion_tokens": r.completion_tokens or 0,
            "total_tokens": r.total_tokens or 0,
            "cost_usd": round((r.cost_microdollars or 0) / 1_000_000, 6),
            "calls": r.calls,
        }
        for r in rows
    ]

    # 30-day daily time series
    since = datetime.now(timezone.utc) - timedelta(days=30)
    from sqlalchemy import literal_column
    daily_rows = db.execute(
        select(
            func.date_trunc(literal_column("'day'"), UsageRecord.created_at).label("day"),
            func.sum(UsageRecord.total_tokens).label("total_tokens"),
            func.sum(UsageRecord.cost_microdollars).label("cost_microdollars"),
            func.count().label("calls"),
        )
        .where(UsageRecord.user_id == user.id, UsageRecord.created_at >= since)
        .group_by(func.date_trunc(literal_column("'day'"), UsageRecord.created_at))
        .order_by(func.date_trunc(literal_column("'day'"), UsageRecord.created_at))
    ).all()

    daily = [
        {
            "day": r.day.strftime("%Y-%m-%d"),
            "total_tokens": r.total_tokens or 0,
            "cost_usd": round((r.cost_microdollars or 0) / 1_000_000, 6),
            "calls": r.calls,
        }
        for r in daily_rows
    ]

    # Totals
    total_tokens   = sum(m["total_tokens"] for m in by_model)
    total_cost_usd = sum(m["cost_usd"] for m in by_model)
    total_calls    = sum(m["calls"] for m in by_model)

    return {
        "total_tokens":   total_tokens,
        "total_cost_usd": round(total_cost_usd, 6),
        "total_calls":    total_calls,
        "by_model":       by_model,
        "daily":          daily,
    }

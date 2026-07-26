"""Profile & settings for Supabase-authenticated users (FR-AUTH-001..004).

Sign-up / sign-in (email+password and Google) happen client-side via Supabase.
The backend verifies the Supabase JWT (see ``app.security``) and exposes the
local profile. ``/auth/bootstrap`` lets the frontend apply the role / org chosen
at sign-up onto the JIT-provisioned profile.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import delete as sa_delete, func, select
from sqlalchemy.orm import Session

from app.audit import record_audit
from app.config import settings
from app.crypto import encrypt_secret
from app.database import get_db
from app.models import Organization, Product, UsageRecord, User, UserRole, Video
from app.schemas import BootstrapRequest, SettingsRequest, UserOut
from app.security import get_current_claims, get_current_user, role_is_locked
from app.services.product_cleanup import delete_product_and_related
from app.services.video_cleanup import cleanup_video_media

logger = logging.getLogger("truthlayer.auth")

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
    claims: dict = Depends(get_current_claims),
):
    """Apply the workspace role / org chosen at sign-up to the current profile.

    Called by the frontend right after a Supabase sign-up (and harmlessly after
    sign-in). The profile itself is created on first authenticated request.

    A client-supplied role is honoured only while the account's role is *not*
    pinned in server-controlled ``app_metadata``. Once an admin pins a trusted
    role there (e.g. to gate the paid Business tier), it can no longer be
    overridden via this endpoint — closing the self-promotion path.
    """
    if payload.full_name and not user.full_name:
        user.full_name = payload.full_name
    # Compliance: record the policy version the user accepted at sign-up.
    if payload.consent_version and not user.consent_version:
        user.consent_version = payload.consent_version
        user.consent_at = datetime.now(timezone.utc)
    if payload.role is not None and not role_is_locked(claims):
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


def _delete_supabase_auth_user(user_id: str) -> bool:
    """Best-effort removal of the Supabase auth identity (GDPR erasure).

    Only attempted when a service-role key is configured; failures are logged and
    reported to the caller rather than raised, so local data is still erased.
    """
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    if not (key and settings.SUPABASE_URL):
        return False
    import urllib.request

    url = settings.SUPABASE_URL.rstrip("/") + f"/auth/v1/admin/users/{user_id}"
    req = urllib.request.Request(
        url, method="DELETE", headers={"Authorization": f"Bearer {key}", "apikey": key}
    )
    try:
        with urllib.request.urlopen(req, timeout=10):  # noqa: S310 (trusted https host)
            return True
    except Exception as exc:  # pragma: no cover
        logger.warning("Supabase auth user deletion failed (non-fatal): %s", exc)
        return False


@router.delete("/me")
def delete_account(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Right to erasure (GDPR Art.17): delete the user's account and all their data.

    Removes the user's products (and their videos/documents/media), personal
    videos (and transcripts/claims/reports/media via cascade + media cleanup),
    usage records, the organization if the user was its only member, and the
    profile row. The Supabase auth identity is removed too when a service-role key
    is configured (else remove it via the Supabase dashboard).
    """
    user_id = user.id
    org_id = user.organization_id

    # Record the erasure before deleting (actor_id is not a FK, so it persists).
    record_audit(db, actor_id=user_id, action="account.erasure", object_type="user", object_id=user_id)

    # 1. Business products cascade to their videos (+ media), docs, chunks, keywords, narratives.
    if org_id:
        for product in db.execute(
            select(Product).where(Product.organization_id == org_id)
        ).scalars().all():
            delete_product_and_related(db, product)
        db.flush()

    # 2. The user's remaining (personal, non-product) videos + their media files.
    for video in db.execute(select(Video).where(Video.submitted_by == user_id)).scalars().all():
        cleanup_video_media(video.extra_metadata)
        db.delete(video)

    # 3. Usage records.
    db.execute(sa_delete(UsageRecord).where(UsageRecord.user_id == user_id))
    db.flush()

    # 4. Organization, only if this user was its sole member.
    org_to_delete = None
    if org_id:
        others = db.execute(
            select(func.count()).select_from(User).where(
                User.organization_id == org_id, User.id != user_id
            )
        ).scalar()
        if not others:
            org_to_delete = db.get(Organization, org_id)

    # 5. The profile row (and organization).
    db.delete(user)
    if org_to_delete is not None:
        db.delete(org_to_delete)
    db.commit()

    supabase_removed = _delete_supabase_auth_user(user_id)
    return {"deleted": user_id, "supabase_auth_removed": supabase_removed}


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

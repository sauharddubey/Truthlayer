"""Authentication & registration (FR-AUTH-001..004)."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import secrets

from app.database import get_db
from app.models import Organization, User
from app.schemas import GoogleLoginRequest, RegisterRequest, SettingsRequest, Token, UserOut
from app.security import create_access_token, get_current_user, hash_password, verify_password
from app.services.google_oauth import GoogleAuthError, verify_google_credential

router = APIRouter(prefix="/auth", tags=["auth"])


def _org_for_role(db, role, org_name, email):
    """Business users always get an organization; others don't need one."""
    from app.models import UserRole

    if role == UserRole.BUSINESS:
        org = Organization(name=org_name or f"{email.split('@')[0]}'s workspace")
        db.add(org)
        db.flush()
        return org.id
    if org_name:
        org = Organization(name=org_name)
        db.add(org)
        db.flush()
        return org.id
    return None


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.execute(select(User).where(User.email == payload.email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    org_id = _org_for_role(db, payload.role, payload.organization_name, payload.email)

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        organization_id=org_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role.value, user.organization_id)
    return Token(access_token=token, role=user.role, organization_id=user.organization_id)


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == form.username)).scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(user.id, user.role.value, user.organization_id)
    return Token(access_token=token, role=user.role, organization_id=user.organization_id)


@router.post("/google", response_model=Token)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Verify a Google ID token, upsert the user, and issue a TruthLayer JWT."""
    try:
        profile = verify_google_credential(payload.credential)
    except GoogleAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    user = db.execute(select(User).where(User.email == profile["email"])).scalar_one_or_none()
    if user is None:
        org_id = _org_for_role(db, payload.role, payload.organization_name, profile["email"])
        # Google-authenticated users have no local password; store a random hash.
        user = User(
            email=profile["email"],
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            full_name=profile.get("name"),
            role=payload.role,
            organization_id=org_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, user.role.value, user.organization_id)
    return Token(access_token=token, role=user.role, organization_id=user.organization_id)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        organization_id=user.organization_id,
        has_api_key=bool(user.openrouter_api_key),
    )


@router.get("/rights")
def my_rights(user: User = Depends(get_current_user)):
    """Capabilities for the current user category (formats, capabilities)."""
    from app.rights import rights_for_role

    return rights_for_role(user.role)


@router.put("/settings", response_model=UserOut)
def update_settings(payload: SettingsRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Set the user's own OpenRouter key (blank reverts to the platform default)."""
    user.openrouter_api_key = (payload.openrouter_api_key or "").strip() or None
    db.commit()
    db.refresh(user)
    return UserOut(
        id=user.id, email=user.email, full_name=user.full_name, role=user.role,
        organization_id=user.organization_id, has_api_key=bool(user.openrouter_api_key),
    )


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

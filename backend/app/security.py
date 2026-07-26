"""Auth via Supabase (GoTrue) + RBAC dependencies (FR-AUTH-001..004, NFR-SEC-003).

Authentication is delegated to Supabase. The frontend signs the user in and
sends the resulting Supabase access token (a JWT) as a Bearer token. Here we:

  1. Verify the JWT against the project's published JWKS (asymmetric ES256/RS256),
     pinning the algorithm to the trusted key (no client-chosen alg).
  2. JIT-provision a local ``users`` profile row keyed by the Supabase user id
     (the JWT ``sub`` claim) so the rest of the app keeps using ``User`` exactly
     as before (role, organization, OpenRouter key, …).

The backend no longer stores passwords or issues its own tokens.
"""

import json
import time
import urllib.request
from typing import Iterable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Organization, User, UserRole

# We only read the Bearer token out of the Authorization header; Supabase mints it.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)

# JWKS public keys (for asymmetric ES256/RS256 tokens), cached with a short TTL.
_JWKS_TTL = 600
# Minimum spacing between *forced* (rotation) refetches. Without this, a flood of
# tokens carrying random unknown `kid`s would trigger a blocking upstream fetch on
# every request (cheap-for-attacker unauthenticated DoS + upstream rate-limiting).
_JWKS_FORCE_COOLDOWN = 30
_jwks_cache: dict = {"keys": None, "fetched": 0.0, "forced": 0.0}


def _fetch_jwks() -> list:
    if not settings.SUPABASE_URL:
        raise JWTError("SUPABASE_URL is not configured")
    url = settings.SUPABASE_URL.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    if not url.lower().startswith("https://"):
        raise JWTError("SUPABASE_URL must be https")
    with urllib.request.urlopen(url, timeout=10) as resp:  # noqa: S310 (trusted https host)
        return json.loads(resp.read()).get("keys", [])


def _jwks_keys(force: bool = False) -> list:
    now = time.time()
    if force:
        # Rate-limit forced refetches regardless of how many misses occur.
        if now - _jwks_cache["forced"] >= _JWKS_FORCE_COOLDOWN:
            _jwks_cache["forced"] = now
            _jwks_cache["keys"] = _fetch_jwks()
            _jwks_cache["fetched"] = now
    elif not _jwks_cache["keys"] or now - _jwks_cache["fetched"] > _JWKS_TTL:
        _jwks_cache["keys"] = _fetch_jwks()
        _jwks_cache["fetched"] = now
    return _jwks_cache["keys"] or []


def _signing_key_for(kid: Optional[str]) -> dict:
    """Return the JWKS entry matching ``kid``, refreshing once on a miss (rotation)."""
    for force in (False, True):
        for jwk in _jwks_keys(force=force):
            if jwk.get("kid") == kid:
                return jwk
    raise JWTError(f"No JWKS signing key for kid={kid}")


def _decode_supabase_jwt(token: str) -> dict:
    """Verify a Supabase access token (asymmetric ES256/RS256) and return claims.

    The verifying algorithm is taken from the trusted JWKS key entry — NOT from
    the token's own (attacker-controlled) header — which closes the JWT
    algorithm-confusion class. exp/sub/aud are required.
    """
    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth is not configured: SUPABASE_URL is missing.",
        )

    kid = jwt.get_unverified_header(token).get("kid")
    jwk = _signing_key_for(kid)
    alg = jwk.get("alg") or "ES256"
    if alg not in ("ES256", "RS256", "ES384", "RS384", "ES512", "RS512"):
        raise JWTError(f"Unsupported JWKS algorithm: {alg}")

    # python-jose enforces signature, exp (when require_exp), audience, and (when
    # configured) issuer. `sub` presence is enforced by the caller.
    issuer = None
    verify_iss = False
    if settings.SUPABASE_VERIFY_ISS:
        issuer = settings.SUPABASE_URL.rstrip("/") + "/auth/v1"
        verify_iss = True
    return jwt.decode(
        token,
        jwk,
        algorithms=[alg],
        audience=settings.SUPABASE_JWT_AUDIENCE,
        issuer=issuer,
        options={"require_exp": True, "verify_aud": True, "verify_iss": verify_iss},
    )


def _role_from_metadata(meta: dict) -> UserRole:
    raw = (meta or {}).get("role")
    try:
        return UserRole(raw)
    except (ValueError, TypeError):
        return UserRole.VERIFIER


def role_is_locked(claims: dict) -> bool:
    """True when a trusted role is pinned in server-controlled ``app_metadata``."""
    return "role" in (claims.get("app_metadata") or {})


def _authoritative_role(claims: dict) -> UserRole:
    """Resolve a user's role, trusting ``app_metadata`` over ``user_metadata``.

    ``app_metadata`` can only be set server-side (Supabase service role / admin
    API), so it is authoritative for entitlement tiers. ``user_metadata`` is
    editable by the account holder, so it is used only as the (self-service)
    fallback when no trusted role has been pinned — preserving today's sign-up
    role selection while giving a way to lock tiers down before launch.
    """
    if role_is_locked(claims):
        return _role_from_metadata(claims.get("app_metadata") or {})
    return _role_from_metadata(claims.get("user_metadata") or {})


def _provision_user(db: Session, claims: dict) -> User:
    """Create the local profile for a freshly-authenticated Supabase user.

    Role comes from ``app_metadata`` when pinned there (trusted), else from the
    sign-up ``user_metadata``; it can also be (re)applied via ``/auth/bootstrap``.
    """
    meta = claims.get("user_metadata") or {}
    role = _authoritative_role(claims)
    email = claims.get("email") or meta.get("email")

    org_id = None
    org_name = meta.get("organization_name")
    if role == UserRole.BUSINESS:
        org = Organization(name=org_name or f"{(email or 'user').split('@')[0]}'s workspace")
        db.add(org)
        db.flush()
        org_id = org.id

    user = User(
        id=claims["sub"],  # align our PK with the Supabase user id
        email=email,
        hashed_password=None,  # Supabase owns credentials now
        full_name=meta.get("full_name") or meta.get("name"),
        role=role,
        organization_id=org_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise cred_exc
    try:
        claims = _decode_supabase_jwt(token)
    except JWTError:
        raise cred_exc
    sub = claims.get("sub")
    if not sub:
        raise cred_exc

    user = db.get(User, sub)
    if user is None:
        # First request for this Supabase identity — provision a local profile.
        user = _provision_user(db, claims)
    if not user.is_active:
        raise cred_exc
    return user


def get_current_claims(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    """Return the verified JWT claims for endpoints that must inspect metadata
    (e.g. ``/auth/bootstrap`` enforcing the trusted-role lock)."""
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise cred_exc
    try:
        return _decode_supabase_jwt(token)
    except JWTError:
        raise cred_exc


def require_roles(*roles: UserRole):
    """Dependency factory enforcing role-based access control."""

    allowed: Iterable[UserRole] = roles

    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {[r.value for r in allowed]}",
            )
        return user

    return _checker

"""Google Sign-In verification (FR-AUTH-001 OAuth login).

The frontend uses Google Identity Services to obtain an ID-token "credential",
which it POSTs to ``/auth/google``. Here we verify that token's signature and
audience and return the trusted profile claims. Verification uses the official
``google-auth`` library, with an HTTP ``tokeninfo`` fallback so the flow still
works if that package is unavailable.
"""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger("truthlayer.google_oauth")


class GoogleAuthError(Exception):
    """Raised when a Google credential cannot be verified."""


def verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token and return {email, name, sub, picture}."""
    claims = _verify_with_library(credential) or _verify_with_tokeninfo(credential)
    if not claims:
        raise GoogleAuthError("Could not verify Google credential")

    if not claims.get("email"):
        raise GoogleAuthError("Google account has no email")
    if claims.get("email_verified") in (False, "false"):
        raise GoogleAuthError("Google email is not verified")

    # Audience check (defence in depth — the library already enforces it when a
    # client id is configured; tokeninfo path needs it explicitly).
    if settings.GOOGLE_CLIENT_ID and claims.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise GoogleAuthError("Google credential was issued for a different client")

    return {
        "email": claims["email"].lower(),
        "name": claims.get("name"),
        "sub": claims.get("sub"),
        "picture": claims.get("picture"),
    }


def _verify_with_library(credential: str) -> Optional[dict]:
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        return id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            audience=settings.GOOGLE_CLIENT_ID or None,
        )
    except ImportError:
        return None
    except Exception as exc:
        logger.warning("google-auth verification failed: %s", exc)
        return None


def _verify_with_tokeninfo(credential: str) -> Optional[dict]:
    try:
        resp = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        return resp.json()
    except Exception as exc:  # pragma: no cover
        logger.warning("tokeninfo verification failed: %s", exc)
        return None

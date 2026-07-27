"""Encryption for secrets at rest + signed, expiring media URLs.

A single ``ENCRYPTION_KEY`` (Fernet, urlsafe-base64) is used to:
  * encrypt per-user secrets (OpenRouter API keys) before they touch the DB, and
  * sign short-lived media URLs so uploaded files are never world-readable.

Generate a key with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

logger = logging.getLogger("truthlayer.crypto")


import base64


def _require_key() -> bytes:
    raw = settings.ENCRYPTION_KEY or "truthlayer-default-secret-key-change-in-prod"
    raw_bytes = raw.encode("utf-8")
    try:
        key_decoded = base64.urlsafe_b64decode(raw_bytes)
        if len(key_decoded) == 32:
            return raw_bytes
    except Exception:
        pass
    digest = hashlib.sha256(raw_bytes).digest()
    return base64.urlsafe_b64encode(digest)


def _fernet() -> Fernet:
    return Fernet(_require_key())


# ── Secrets at rest ──────────────────────────────────────────────────────────

def encrypt_secret(plaintext: Optional[str]) -> Optional[str]:
    """Encrypt a secret for storage. Empty/None -> None."""
    if not plaintext:
        return None
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_secret(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypt a stored secret. Returns None if absent or undecryptable."""
    if not ciphertext:
        return None
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except (InvalidToken, ValueError):
        logger.warning("Stored secret could not be decrypted; treating as unset.")
        return None


# ── Signed media URLs ──────────────────────────────────────────────────────────

def _media_signing_key() -> bytes:
    # Derive a distinct HMAC key from the Fernet key so the two uses don't share material.
    return hashlib.sha256(b"media:" + _require_key()).digest()


def _sign(path: str, exp: int) -> str:
    return hmac.new(_media_signing_key(), f"{path}:{exp}".encode(), hashlib.sha256).hexdigest()


def sign_media_url(path: Optional[str], ttl_seconds: int = 3600) -> Optional[str]:
    """Append a short-lived signature to a ``/media/...`` path.

    Non-media values (e.g. external image URLs) are returned unchanged.
    """
    if not path or not path.startswith("/media/"):
        return path
    exp = int(time.time()) + ttl_seconds
    return f"{path}?exp={exp}&sig={_sign(path, exp)}"


def verify_media_url(path: str, exp: str, sig: str) -> bool:
    try:
        exp_i = int(exp)
    except (TypeError, ValueError):
        return False
    if exp_i < int(time.time()):
        return False
    return hmac.compare_digest(_sign(path, exp_i), sig or "")

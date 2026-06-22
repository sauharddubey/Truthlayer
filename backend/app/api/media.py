"""Signed media delivery.

Uploaded files are NOT served from an open static mount (that would let anyone
who guesses a URL read another tenant's media). Instead, the API hands out
short-lived signed URLs (see ``app.crypto.sign_media_url``) inside authenticated
responses, and this route serves a file only when the signature is valid and
unexpired.
"""

import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import settings
from app.crypto import verify_media_url

router = APIRouter(tags=["media"])


@router.get("/media/{filename}")
def get_media(filename: str, exp: str = "", sig: str = ""):
    # Single path segment only; strip any traversal attempts defensively.
    safe = os.path.basename(filename)
    if not verify_media_url(f"/media/{safe}", exp, sig):
        raise HTTPException(status_code=403, detail="Invalid or expired media link")

    path = os.path.join(settings.MEDIA_STORAGE_DIR, safe)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)

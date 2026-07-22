"""Upload safety helpers: magic-byte validation + bounded reads.

Extension and client-supplied ``content_type`` are both trivially spoofable, so
these helpers add two defences used by the upload endpoints:

* :func:`enforce_content_type` sniffs the real file signature (via ``filetype``)
  and rejects a payload whose *identified* type isn't allowed — e.g. an HTML/PDF/
  executable renamed to ``.mp4``. Unidentifiable content (plain text has no magic
  bytes) is allowed through: the goal is to catch a definitively-wrong payload,
  not to require a signature for every legitimate file.
* :func:`read_upload_capped` streams an ``UploadFile`` into memory with a hard
  byte ceiling so a huge upload can't exhaust memory (the streamed video path in
  ``api/videos.py`` already does this; this is the async equivalent for the
  document/image endpoints).
"""

from __future__ import annotations

from typing import Optional

import filetype
from fastapi import HTTPException, UploadFile

# `filetype` extension tokens, grouped by what each endpoint accepts.
VIDEO_KINDS = {"mp4", "mov", "m4v", "webm", "mkv", "avi", "flv", "3gp"}
IMAGE_KINDS = {"jpg", "jpeg", "png", "webp", "gif"}
# DOCX is a zip container; `filetype` reports either "docx" or "zip".
DOCUMENT_KINDS = {"pdf", "docx", "doc", "zip"}


def sniff_extension(head: bytes) -> Optional[str]:
    kind = filetype.guess(head)
    return kind.extension if kind else None


def enforce_content_type(data: bytes, allowed: set[str], *, label: str) -> None:
    """Reject when magic bytes identify a type that isn't in ``allowed``."""
    ext = sniff_extension(data[:1024])
    if ext is not None and ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File content ('{ext}') does not match an allowed {label} type.",
        )


async def read_upload_capped(file: UploadFile, max_mb: int) -> bytes:
    """Read an UploadFile fully but abort past ``max_mb`` megabytes."""
    max_bytes = max_mb * 1024 * 1024
    buf = bytearray()
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        buf.extend(chunk)
        if len(buf) > max_bytes:
            raise HTTPException(status_code=413, detail=f"File too large (max {max_mb} MB).")
    return bytes(buf)

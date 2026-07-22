"""Public legal/compliance endpoints (sub-processor disclosure)."""

import json
import pathlib

from fastapi import APIRouter

router = APIRouter(prefix="/legal", tags=["legal"])

_SUBPROCESSORS_FILE = (
    pathlib.Path(__file__).resolve().parent.parent / "compliance" / "subprocessors.json"
)


@router.get("/subprocessors")
def subprocessors():
    """Return the machine-readable third-party sub-processor list (public)."""
    try:
        return json.loads(_SUBPROCESSORS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"subprocessors": [], "note": "Sub-processor list unavailable."}

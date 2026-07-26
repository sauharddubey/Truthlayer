"""Append-only audit logging for security/privacy-relevant actions.

Used to record data exports and account/data erasure so there is an
accountability trail of who accessed or removed personal data. Best-effort:
failures are logged but never break the request being audited.
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.models import AuditLog

logger = logging.getLogger("truthlayer.audit")


def record_audit(
    db: Session,
    *,
    actor_id: Optional[str],
    action: str,
    object_type: Optional[str] = None,
    object_id: Optional[str] = None,
    detail: Optional[dict] = None,
) -> None:
    """Append one audit entry. Commits its own row; never raises to the caller."""
    try:
        db.add(
            AuditLog(
                actor_id=actor_id,
                action=action,
                object_type=object_type,
                object_id=object_id,
                detail=detail or {},
            )
        )
        db.commit()
    except Exception as exc:  # pragma: no cover
        logger.warning("audit log write failed (non-fatal): %s", exc)
        db.rollback()

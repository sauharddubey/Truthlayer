"""Rate limiting (slowapi) for abuse / cost / DoS protection.

Only the expensive endpoints (video upload, URL submit, analysis start, document
indexing, narrative/contradiction recompute, PDF export) are decorated with
``@limiter.limit(settings.RATE_LIMIT_EXPENSIVE)`` — we deliberately do NOT install
a global default limit so ordinary GET/polling traffic (dashboards, analysis
progress polling) is never throttled.

Storage is in-memory by default and uses ``REDIS_URL`` automatically when set.
The client key prefers the first ``X-Forwarded-For`` hop (set by the deployment
proxy) and falls back to the socket peer.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from app.config import settings


def _client_key(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        first = xff.split(",")[0].strip()
        if first:
            return first
    return get_remote_address(request)


limiter = Limiter(
    key_func=_client_key,
    enabled=settings.RATE_LIMIT_ENABLED,
    storage_uri=settings.REDIS_URL or "memory://",
)

# Convenience alias so endpoints read `@limiter.limit(EXPENSIVE)`.
EXPENSIVE = settings.RATE_LIMIT_EXPENSIVE

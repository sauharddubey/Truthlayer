"""Response security-header middleware.

Adds the standard hardening headers to every response. Resource-level CSP for the
UI is enforced by the frontend (`next.config.js`); on the API we set
``frame-ancestors 'none'`` (clickjacking) which does not interfere with the
Swagger ``/docs`` page's CDN assets.
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if not settings.SECURITY_HEADERS_ENABLED:
            return response
        headers = response.headers
        headers.setdefault("X-Content-Type-Options", "nosniff")
        headers.setdefault("X-Frame-Options", "DENY")
        headers.setdefault("Referrer-Policy", "no-referrer")
        headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), browsing-topics=()",
        )
        headers.setdefault("Content-Security-Policy", "frame-ancestors 'none'")
        if settings.SECURITY_HEADERS_HSTS and request.url.scheme == "https":
            headers.setdefault(
                "Strict-Transport-Security",
                "max-age=63072000; includeSubDomains",
            )
        return response

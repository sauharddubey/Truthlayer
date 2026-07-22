"""TruthLayer API entrypoint."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.extension import _rate_limit_exceeded_handler

from app import __version__
from app.api import auth, dashboard, legal, media, products, reports, videos
from app.config import settings
from app.database import init_db
from app.middleware import SecurityHeadersMiddleware
from app.ratelimit import limiter

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="TruthLayer API",
    version=__version__,
    description="AI-powered trust, compliance, and media-intelligence platform.",
)

# Rate limiting: expensive endpoints are decorated individually (see app.ratelimit);
# a 429 is returned when a client exceeds its limit.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Standard response security headers (nosniff, frame-deny, referrer, CSP, HSTS).
app.add_middleware(SecurityHeadersMiddleware)

# Fail closed: never fall back to a wildcard origin (it would reflect any origin
# with credentials). Require an explicit allow-list via BACKEND_CORS_ORIGINS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    init_db()
    import os

    # Uploaded media is served only via signed URLs (see app.api.media); the
    # directory is never mounted statically. Lock it to the app user (0700).
    os.makedirs(settings.MEDIA_STORAGE_DIR, exist_ok=True)
    try:
        os.chmod(settings.MEDIA_STORAGE_DIR, 0o700)
    except OSError:
        pass


@app.get("/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "version": __version__,
        "celery": settings.celery_enabled,
        # API keys are per-user (set in Settings), so there is nothing to report here.
    }


app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(products.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(media.router)
app.include_router(legal.router)

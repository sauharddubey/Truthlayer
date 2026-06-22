"""TruthLayer API entrypoint."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import auth, dashboard, media, products, reports, videos
from app.config import settings
from app.database import init_db

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="TruthLayer API",
    version=__version__,
    description="AI-powered trust, compliance, and media-intelligence platform.",
)

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
    # directory is never mounted statically.
    os.makedirs(settings.MEDIA_STORAGE_DIR, exist_ok=True)


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

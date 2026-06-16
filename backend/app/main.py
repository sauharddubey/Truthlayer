"""TruthLayer API entrypoint."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api import auth, dashboard, products, reports, videos
from app.config import settings
from app.database import init_db

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="TruthLayer API",
    version=__version__,
    description="AI-powered trust, compliance, and media-intelligence platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    init_db()
    # Serve uploaded product images / media.
    import os

    from fastapi.staticfiles import StaticFiles

    os.makedirs(settings.MEDIA_STORAGE_DIR, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.MEDIA_STORAGE_DIR), name="media")


@app.get("/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "version": __version__,
        "celery": settings.celery_enabled,
        "llm_configured": bool(settings.LLM_API_KEY),
        "whisper_configured": bool(settings.WHISPER_API_KEY),
    }


app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(products.router)
app.include_router(dashboard.router)
app.include_router(reports.router)

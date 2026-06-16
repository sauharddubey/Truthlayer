"""End-to-end processing pipeline (SRS §4 core workflow).

Ingest → transcribe → structure → embed/index → parallel agents → fuse → report.
Runs as a Celery task when ``USE_CELERY`` is on, or inline via FastAPI
BackgroundTasks otherwise (free-tier friendly: no separate worker dyno needed).
"""

from __future__ import annotations

import logging

from sqlalchemy import delete

from app.agents.orchestrator import run_pipeline
from app.database import session_scope
from app.models import (
    AnalysisReport,
    CelebrityDetection,
    Claim,
    ComplianceIssue,
    DeepfakeResult,
    ProcessingStatus,
    Transcript,
    Video,
)
from app.services import ingestion, structuring, transcription

logger = logging.getLogger("truthlayer.pipeline")


def _identify_product(db, video, transcript_text: str) -> None:
    """Match a business video to one of the org's products by name/alias."""
    from sqlalchemy import select

    from app.models import Product

    products = db.execute(
        select(Product).where(Product.organization_id == video.organization_id)
    ).scalars().all()
    if not products:
        return

    haystack = " ".join(
        filter(None, [video.title, video.captions, transcript_text])
    ).lower()
    for p in products:
        names = [p.name] + list(p.aliases or [])
        if any(n and n.lower() in haystack for n in names):
            video.product_id = p.id
            db.flush()
            logger.info("Video %s matched product %s", video.id, p.name)
            return


def _clear_previous_results(db, video_id: str) -> None:
    """Remove prior transcript, claims, issues, detections and report for a video."""
    for model in (
        AnalysisReport,
        Claim,
        ComplianceIssue,
        DeepfakeResult,
        CelebrityDetection,
        Transcript,
    ):
        db.execute(delete(model).where(model.video_id == video_id))
    db.flush()


def process_video(video_id: str) -> None:
    """Run the full pipeline for one video, updating status as it progresses."""
    with session_scope() as db:
        video = db.get(Video, video_id)
        if not video:
            logger.error("process_video: video %s not found", video_id)
            return

        try:
            # Use the submitting user's OpenRouter key for this run (falls back to
            # the platform default if they haven't set one).
            from app.llm import set_runtime_api_key
            from app.models import User

            if video.submitted_by:
                user = db.get(User, video.submitted_by)
                if user:
                    from app.llm import (
                        set_runtime_api_key,
                        set_runtime_llm_model,
                        set_runtime_embeddings_model,
                        set_runtime_transcription_model,
                        set_runtime_user_id,
                    )
                    set_runtime_api_key(user.openrouter_api_key)
                    set_runtime_llm_model(user.llm_model)
                    set_runtime_embeddings_model(user.embeddings_model)
                    set_runtime_transcription_model(user.transcription_model)
                    set_runtime_user_id(user.id)

            # 0. Make re-processing idempotent: clear any prior artifacts so a
            #    re-run doesn't violate the one-report-per-video constraint.
            _clear_previous_results(db, video.id)

            # 1. Ingestion -------------------------------------------------
            video.processing_status = ProcessingStatus.INGESTING
            db.flush()

            if video.source_url:
                ing = ingestion.ingest_url(video.source_url)
            elif video.extra_metadata.get("upload_path"):
                ing = ingestion.ingest_upload(video.extra_metadata["upload_path"])
            else:
                ing = ingestion.IngestResult(audio_path=None, platform=video.platform or "unknown")

            video.platform = video.platform or ing.platform
            video.title = video.title or ing.title
            video.creator_handle = ing.creator_handle
            video.duration_seconds = ing.duration_seconds
            video.captions = ing.captions
            video.content_hash = ing.content_hash
            video.extra_metadata = {**(video.extra_metadata or {}), **ing.metadata}
            db.flush()

            # 2. Transcription ---------------------------------------------
            video.processing_status = ProcessingStatus.TRANSCRIBING
            db.flush()
            tr = transcription.transcribe(
                ing.audio_path,
                fallback_text=video.captions or "",
                duration=ing.duration_seconds or video.duration_seconds,
            )

            from app.models import Transcript

            transcript = Transcript(
                video_id=video.id,
                text=tr.text,
                language=tr.language,
                segments=tr.segments,
            )
            db.add(transcript)
            db.flush()

            # 3. Structuring -----------------------------------------------
            video.processing_status = ProcessingStatus.STRUCTURING
            db.flush()
            transcript.structured_blocks = structuring.structure_transcript(
                tr.text, tr.segments
            )
            db.flush()

            # 3b. Business: auto-identify the product from title/captions/transcript
            #     when one wasn't explicitly selected.
            if video.organization_id and not video.product_id:
                _identify_product(db, video, tr.text)

            db.refresh(video)

            # 4. Parallel agents + fusion + scoring ------------------------
            video.processing_status = ProcessingStatus.ANALYZING
            db.flush()
            run_pipeline(db, video)

            video.processing_status = ProcessingStatus.COMPLETED
            logger.info("Pipeline completed for video %s", video_id)
        except Exception as exc:
            logger.exception("Pipeline failed for video %s: %s", video_id, exc)
            video.processing_status = ProcessingStatus.FAILED
            video.error = str(exc)


def dispatch(video_id: str) -> None:
    """Route to Celery or run inline, based on configuration."""
    from app.config import settings

    if settings.celery_enabled:
        from app.tasks.celery_app import process_video_task

        process_video_task.delay(video_id)
    else:
        process_video(video_id)

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
            db.commit()
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
    db.commit()


def process_video(video_id: str) -> None:
    """Run the full pipeline for one video, updating status as it progresses."""
    with session_scope() as db:
        video = db.get(Video, video_id)
        if not video:
            logger.error("process_video: video %s not found", video_id)
            return

        try:
            # Apply the submitting user's own service keys for this run. Every
            # key is decrypted from the user's profile; there is no env fallback.
            from app.models import User

            if video.submitted_by:
                user = db.get(User, video.submitted_by)
                if user:
                    from app.crypto import decrypt_secret
                    from app.llm import (
                        set_runtime_api_key,
                        set_runtime_tavily_key,
                        set_runtime_media_integrity_key,
                        set_runtime_llm_model,
                        set_runtime_embeddings_model,
                        set_runtime_transcription_model,
                        set_runtime_user_id,
                    )

                    set_runtime_api_key(decrypt_secret(user.openrouter_api_key))
                    set_runtime_tavily_key(decrypt_secret(user.tavily_api_key))
                    set_runtime_media_integrity_key(decrypt_secret(user.media_integrity_api_key))
                    set_runtime_llm_model(user.llm_model)
                    set_runtime_embeddings_model(user.embeddings_model)
                    set_runtime_transcription_model(user.transcription_model)
                    set_runtime_user_id(user.id)

            # 0. Make re-processing idempotent: clear any prior artifacts so a
            #    re-run doesn't violate the one-report-per-video constraint.
            _clear_previous_results(db, video.id)

            # 1. Ingestion -------------------------------------------------
            video.processing_status = ProcessingStatus.INGESTING
            db.commit()

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
            db.commit()

            # 2. Transcription ---------------------------------------------
            video.processing_status = ProcessingStatus.TRANSCRIBING
            db.commit()
            tr = transcription.transcribe(
                ing.audio_path,
                fallback_text=video.captions or "",
                duration=ing.duration_seconds or video.duration_seconds,
            )

            # Run OCR on the video if video path is available
            ocr_result = None
            if ing.video_path:
                try:
                    logger.info("Running OCR detection on video: %s", ing.video_path)
                    from app.services import ocr
                    ocr_result = ocr.run_ocr(
                        video_path=ing.video_path,
                        duration=ing.duration_seconds or video.duration_seconds,
                        speech_transcript=tr.text
                    )
                except Exception as e:
                    logger.exception("OCR detection failed: %s", e)

            from app.models import Transcript

            transcript = Transcript(
                video_id=video.id,
                text=tr.text,
                language=tr.language,
                segments=tr.segments,
                ocr_text=ocr_result.get("ocr_text") if ocr_result else None,
                ocr_segments=ocr_result.get("ocr_segments") if ocr_result else [],
                ocr_analysis={
                    **(ocr_result.get("ocr_analysis") or {}),
                    "video_segment_analysis": ocr_result.get("video_segment_analysis") or []
                } if ocr_result else {},
            )
            db.add(transcript)
            db.commit()

            # 3. Structuring -----------------------------------------------
            video.processing_status = ProcessingStatus.STRUCTURING
            db.commit()
            
            speech_blocks = structuring.structure_transcript(tr.text, tr.segments)
            ocr_blocks = []
            if ocr_result and ocr_result.get("ocr_segments"):
                verify_ocr_segments = [
                    s for s in ocr_result["ocr_segments"]
                    if s.get("label") in ("verify", "risky")
                ]
                if verify_ocr_segments:
                    verify_ocr_text = " ".join(s.get("text", "") for s in verify_ocr_segments)
                    ocr_blocks = structuring.structure_transcript(
                        verify_ocr_text, verify_ocr_segments
                    )
            
            transcript.structured_blocks = speech_blocks + ocr_blocks
            db.commit()

            # 3b. Business: auto-identify the product from title/captions/transcript
            #     when one wasn't explicitly selected.
            if video.organization_id and not video.product_id:
                _identify_product(db, video, tr.text)

            db.refresh(video)

            # 4. Parallel agents + fusion + scoring ------------------------
            video.processing_status = ProcessingStatus.ANALYZING
            db.commit()
            run_pipeline(db, video)

            video.processing_status = ProcessingStatus.COMPLETED
            logger.info("Pipeline completed for video %s", video_id)
            if video.organization_id:
                try:
                    from redis import Redis
                    from app.config import settings
                    if settings.REDIS_URL:
                        r = Redis.from_url(settings.REDIS_URL, decode_responses=True)
                        r.delete(f"brand_synthesis:{video.organization_id}")
                except Exception:
                    pass
        except Exception as exc:
            # Full detail to server logs only; clients get a generic message so we
            # never leak internal paths, upstream error bodies, or config.
            logger.exception("Pipeline failed for video %s: %s", video_id, exc)
            video.processing_status = ProcessingStatus.FAILED
            video.error = "Analysis failed. Please try again or contact support."


def dispatch(video_id: str) -> None:
    """Route to Celery or run inline, based on configuration."""
    from app.config import settings

    if settings.celery_enabled:
        from app.tasks.celery_app import process_video_task

        process_video_task.delay(video_id)
    else:
        process_video(video_id)

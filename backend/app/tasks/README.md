# Asynchronous Pipeline & Celery Tasks Subsystem (`backend/app/tasks`)

This directory contains the pipeline orchestration logic, background job dispatchers, and automated retention tasks for TruthLayer.

## Subsystem Architecture

TruthLayer supports two asynchronous execution modes:
1. **In-Process Mode (`USE_CELERY=false`)**: Tasks are dispatched asynchronously via FastAPI `BackgroundTasks`.
2. **Distributed Mode (`USE_CELERY=true`)**: Tasks are enqueued to a Celery worker via Redis.

## Module Breakdown

| Module | Function & Technical Description |
| :--- | :--- |
| **`pipeline.py`** | `process_video(video_id)` pipeline controller executing ingestion, transcription, structuring, agent fleet execution, score fusion, and report generation. |
| **`celery_app.py`** | Celery application configuration, Redis broker connection settings, and task registration. |
| **`retention.py`** | Automated data retention worker purging expired video upload artifacts, temporary audio files, and stale database records. |

## Pipeline Lifecycle States

```
[QUEUED] 
   |
   v
[INGESTING]      --> Ingest video URL / upload & extract audio stream
   |
   v
[TRANSCRIBING]   --> Run speech-to-text transcription via OpenRouter
   |
   v
[STRUCTURING]    --> Mine transcript claims & index in pgvector
   |
   v
[ANALYZING]      --> Execute parallel agent fleet & fuse scores
   |
   +---> [COMPLETED] --> Write final AnalysisReport & update dashboards
   |
   +---> [FAILED]    --> Persist generic error message & log stack trace
```

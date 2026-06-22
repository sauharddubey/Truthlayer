# TruthLayer

**AI-powered trust, compliance, and media-intelligence platform** that analyzes
social-media video content using multimodal and transcript-driven AI pipelines.

TruthLayer ingests video (uploads or public URLs), transcribes speech, structures
the transcript into semantic claims, and runs a fleet of specialized AI agents in
parallel (fact-checking, bias, sentiment, compliance, creator-risk, narrative)
backed by a RAG knowledge layer. It produces explainable, citation-backed reports
for three audiences: **Businesses**, **Creators**, and **Viewers**.

```
Video Upload / URL  →  Ingestion  →  Audio Extraction  →  Transcription
   →  Transcript Structuring  →  Embedding & Indexing
   →  Parallel AI Agents  →  RAG Retrieval  →  Evidence Fusion
   →  Scoring & Confidence  →  Dashboards + Reports + Alerts
```

## Architecture

| Layer       | Technology                                                        |
| ----------- | ----------------------------------------------------------------- |
| Frontend    | Next.js 14 (App Router) + Tailwind CSS + Recharts                 |
| Backend     | FastAPI + SQLAlchemy + Pydantic                                   |
| Async jobs  | Celery + Redis (with in-process `BackgroundTasks` fallback)       |
| Database    | PostgreSQL + `pgvector`                                           |
| AI / LLM    | OpenAI-compatible Chat + Embeddings API (Groq / OpenAI / Gemini)  |
| Transcription | OpenRouter audio model or stub fallback                           |
| Ingestion   | `yt-dlp` (YouTube / TikTok / Instagram public URLs)               |

The system is **provider-agnostic**: every AI call goes through an OpenAI-compatible
client, so you can point it at a free-tier provider (Groq, Google Gemini's OpenAI
endpoint, OpenAI, or a local Ollama) by changing environment variables only.

## Free-tier deployment map

| Component  | Free service                          |
| ---------- | ------------------------------------- |
| Database   | [Supabase](https://supabase.com) or [Neon](https://neon.tech) (Postgres + pgvector) |
| Redis      | [Upstash](https://upstash.com) (serverless Redis) — optional |
| Backend    | [Render](https://render.com) / [Railway](https://railway.app) / [Fly.io](https://fly.io) |
| Frontend   | [Vercel](https://vercel.com)          |
| LLM + STT  | [OpenRouter](https://openrouter.ai) (Free models / OpenRouter audio models) |

> Heavy GPU models (DeepFace/InsightFace face recognition, FaceForensics++/XceptionNet
> deepfake detection) are **not** free-tier friendly. TruthLayer ships these as
> pluggable agents behind a stable interface (`backend/app/agents/media_integrity.py`)
> that return heuristic/stub scores by default and can be swapped for real GPU
> inference services without touching the rest of the pipeline.

## Quick start (local)

```bash
# 1. Copy env and fill in keys
cp .env.example .env

# 2. Spin up Postgres + Redis + backend + worker + frontend
docker compose up --build

# Frontend:  http://localhost:3000
# Backend:   http://localhost:8000/docs
```

Or run pieces individually — see [`backend/README.md`](backend/README.md) and
[`frontend/README.md`](frontend/README.md).

## Repository layout

```
TruthLayer/
├── backend/          FastAPI app, agents, RAG, Celery tasks
├── frontend/         Next.js app (business / creator / viewer dashboards)
├── docker-compose.yml
├── .env.example
└── docs/             Architecture & deployment notes
```

See [`docs/`](docs/) for the requirements traceability matrix and deployment guide.

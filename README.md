# TruthLayer

**Enterprise AI Trust, Compliance, and Media-Intelligence Platform for Video**

TruthLayer is an enterprise-grade AI trust, compliance, and media-intelligence platform designed for analyzing short-form and long-form video content across major video platforms and direct uploads. By integrating multimodal transcription, semantic claim structuring, multi-agent AI execution, vector Retrieval-Augmented Generation (RAG), and live web evidence retrieval, TruthLayer provides explainable, citation-backed trust reports tailored for three distinct user roles: **Businesses**, **Creators**, and **Verifiers**.

---

## Executive Summary & Core Value Proposition

In an era dominated by rapid synthetic media generation and high-velocity social video, verifying facts, compliance, and media integrity is critical. TruthLayer provides end-to-end automated verification and analytical monitoring:

1. **Multi-Source Video Ingestion**: Supports direct video file uploads as well as URL ingestion via `yt-dlp` (YouTube, TikTok, Instagram Reels) with strict domain gating and URL validation.
2. **Multimodal Audio Transcription**: Extracts audio streams and transcribes speech using OpenRouter multimodal audio models (`google/gemini-2.5-flash-lite`) with automatic timestamping and speaker segment mapping.
3. **Semantic Claim Structuring**: Deconstructs raw transcriptions into verifiable factual assertions and contextual statements.
4. **Parallel Multi-Agent Fleet**: Executes 11 specialized AI analysis agents concurrently using `ThreadPoolExecutor` and Python `contextvars` for per-tenant key propagation.
5. **RAG Compliance Verification**: Matches claims against tenant-isolated product specifications and compliance knowledge bases stored in PostgreSQL `pgvector`.
6. **Live Evidence Retrieval**: Validates external claims against current Web data using Tavily Search API.
7. **Explainable Report Generation**: Aggregates agent findings, confidence metrics, and evidence citations into downloadable PDF reports and interactive web dashboards.

---

## Architecture Overview

```
                        +---------------------------------------+
                        |  Video Source (Upload / Public URL)   |
                        +---------------------------------------+
                                            |
                                            v
                        +---------------------------------------+
                        | Ingestion & Security Validation Layer |
                        | (yt-dlp / URLGuard / Extension Check) |
                        +---------------------------------------+
                                            |
                                            v
                        +---------------------------------------+
                        | Audio Extraction & Speech Processing  |
                        |    (FFmpeg / OpenRouter Audio API)    |
                        +---------------------------------------+
                                            |
                                            v
                        +---------------------------------------+
                        |   Semantic Structuring & Claim Mining|
                        +---------------------------------------+
                                            |
                                            v
     +-----------------------------------------------------------------------------+
     |                    Parallel Multi-Agent AI Pipeline                         |
     |                                                                             |
     | +--------------+  +--------------+  +--------------+  +-------------------+ |
     | |  FactCheck   |  |  Perception  |  |     Bias     |  |    Sentiment      | |
     | +--------------+  +--------------+  +--------------+  +-------------------+ |
     | +--------------+  +--------------+  +--------------+  +-------------------+ |
     | |  Compliance  |  | CreatorRisk  |  | MediaIntegr. |  |    Narrative      | |
     | +--------------+  +--------------+  +--------------+  +-------------------+ |
     +-----------------------------------------------------------------------------+
                                            |
                                            v
                        +---------------------------------------+
                        |   pgvector RAG Knowledge Store &      |
                        |      External Evidence Retrieval      |
                        +---------------------------------------+
                                            |
                                            v
                        +---------------------------------------+
                        |  Score Fusion & Report Orchestration  |
                        +---------------------------------------+
                                            |
                                            v
                        +---------------------------------------+
                        | Next.js App Router Role Dashboards &  |
                        |          PDF Export Service           |
                        +---------------------------------------+
```

---

## Technology Stack

| Subsystem | Technologies & Specifications |
| :--- | :--- |
| **Frontend UI** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, Framer Motion |
| **Backend API** | FastAPI, SQLAlchemy 2.0 (Async & Sync Engine), Pydantic v2, Python 3.11+ |
| **Database & Vectors** | PostgreSQL 16+, `pgvector` extension (1536-dimensional vector embedding store) |
| **Asynchronous Engine** | Celery 5.x, Redis 7.x (with inline `BackgroundTasks` fallback for serverless deployments) |
| **AI / LLM Infrastructure** | OpenRouter Unified API (OpenAI-compatible client), Google Gemini 2.5 Flash Lite |
| **Search & Evidence** | Tavily Web Search API |
| **Video & Audio Utilities**| `yt-dlp`, FFmpeg, OpenCV (Heuristic vision processing) |
| **Security & Auth** | Supabase Auth / JWT verification, Fernet Symmetric Encryption (`cryptography`), In-memory Rate Limiting, Audit Logger |

---

## Production Deployment & Deployed Service Endpoints

TruthLayer is engineered for zero-maintenance serverless/cloud deployment across free and low-cost enterprise tiers.

### Production Service Endpoint Mapping

| Service Layer | Provider Platform | Environment Variable Reference | Production Endpoint Mapping |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Vercel | `NEXT_PUBLIC_API_URL` | Deployed Next.js App Router domain |
| **Backend REST API** | Render / Railway | `BACKEND_CORS_ORIGINS` | Deployed FastAPI OpenAPI domain (`/docs`) |
| **PostgreSQL & Vector Store**| Supabase / Neon | `DATABASE_URL` | PostgreSQL pooler endpoint (`sslmode=require`) |
| **Authentication Service** | Supabase Auth | `NEXT_PUBLIC_SUPABASE_URL` | Supabase GoTrue JWKS endpoint |
| **Cache & Task Broker** | Upstash Redis | `REDIS_URL` | Serverless Redis broker |
| **LLM & Audio Engine** | OpenRouter | `LLM_BASE_URL` | Unified OpenRouter OpenAI-compatible API |

For detailed step-by-step instructions on deploying the backend on Render and the frontend on Vercel, consult [`documentation/deployment_docs/DEPLOYMENT.md`](documentation/deployment_docs/DEPLOYMENT.md).

---

## System User Categories & Capabilities

TruthLayer strictly segments user permissions and analytical tools across three primary user roles:

### 1. Business Workspace (`business`)
* **Product Catalog Management**: Upload and manage multi-product compliance knowledge bases (PDF, TXT, DOCX).
* **Automated Claim Verification**: Checks marketing video claims against official product specifications using tenant-isolated RAG retrieval.
* **Hashtag Monitoring**: Continuously tracks brand hashtags and auto-ingests tagged videos.
* **Narrative Intelligence**: Aggregates multi-video sentiment trends and narrative evolution across product lines.

### 2. Creator Workspace (`creator`)
* **Pre-Publication Audit**: Enables content creators to screen drafts prior to posting.
* **Perception & Offensiveness Analysis**: Predicts viewer audience reception, potential cultural sensitivity issues, and tone.
* **Sponsorship Compliance**: Identifies missing disclosures, claim exaggeration, and platform policy risks.

### 3. Verifier Workspace (`verifier`)
* **AI Fact-Checking**: Provides granular claim-by-claim evaluation with source-backed evidence cards.
* **Trust Score Breakdown**: Generates objective numerical confidence scores with transparent breakdowns of verified versus unverified claims.

---

## The 11 AI Agents Fleet

The core analytical pipeline relies on 11 specialized agent modules residing under `backend/app/agents/`:

1. **`orchestrator`**: Manages execution flow, context propagation, tier rights, and final score synthesis.
2. **`content`**: Performs initial segment labeling (safe, verify, risky) and product association.
3. **`fact_check`**: Extracts verifiable assertions and conducts web evidence queries.
4. **`perception`**: Evaluates brand safety, audience perception, and potential public backlash.
5. **`bias`**: Identifies cognitive bias, framing techniques, and political/ideological slant.
6. **`sentiment`**: Tracks emotional valence and sentiment shifts over video timestamps.
7. **`compliance`**: Evaluates adherence to regulatory standards (e.g., FTC, FDA, GDPR, platform guidelines).
8. **`creator_risk`**: Identifies reputational and advertiser risks for content creators.
9. **`media_integrity`**: Evaluates audio-visual manipulation heuristics and synthetic media indicators.
10. **`verification`**: Executes RAG similarity matching against uploaded product documentation.
11. **`narrative`**: Synthesizes macro-narrative themes and recurring messaging patterns.

---

## Security & Enterprise Hardening

TruthLayer implements multi-layered security controls designed for enterprise deployments:

* **Symmetric Encryption at Rest**: Sensitive third-party user credentials (OpenRouter, Tavily, Media Integrity keys) are encrypted using Fernet symmetric encryption before database persistence (`backend/app/crypto.py`).
* **URL Guard & SSRF Protection**: Ingested URLs are strictly validated using `backend/app/urlguard.py` to prevent Server-Side Request Forgery (SSRF) and restrict access to approved video domains (YouTube, TikTok, Instagram).
* **Role-Based Access Control (RBAC)**: Enforced via FastAPI dependencies (`security.require_roles`) and frontend route guards (`useRoleGuard.ts`).
* **Rate Limiting**: Custom token-bucket rate limiters (`backend/app/ratelimit.py`) safeguard endpoints against denial-of-service attempts.
* **Audit Logging**: Comprehensive event logging (`backend/app/audit.py`) captures user access, resource modifications, and authentication attempts.
* **Automated Data Retention**: System background tasks (`backend/app/tasks/retention.py`) enforce retention policies to purge stale video artifacts and temporary uploads.

---

## Repository Structure

```
TruthLayer/
├── AGENTS.md                         AI Agent execution guidelines and technical conventions
├── Makefile                          Development convenience targets
├── README.md                         Root enterprise architecture specification
├── docker-compose.yml                Multi-container orchestration setup
├── render.yaml                       Cloud deployment template for Render
├── backend/                          FastAPI service and AI engine
│   ├── app/                          Application source package
│   │   ├── agents/                   Fleet of 11 AI analysis agents and orchestrator
│   │   ├── api/                      FastAPI route controllers
│   │   ├── compliance/               Compliance data assets and subprocessor registry
│   │   ├── rag/                      PostgreSQL pgvector RAG vector storage
│   │   ├── services/                 Video processing, transcription, and report engines
│   │   └── tasks/                    Asynchronous pipeline and Celery task definitions
│   └── tests/                        Automated test suite (pytest)
├── frontend/                         Next.js 14 web client
│   ├── app/                          App Router pages and API routes
│   ├── components/                   React UI component library
│   └── lib/                          Client utilities, API wrappers, and custom hooks
├── documentation/                    Comprehensive technical documentation suite
│   └── deployment_docs/              Production deployment guides and traceability matrix
└── Promotion/                        Demonstration media and promotional video assets
```

---

## Quick Start & Local Execution

### Prerequisites
* Docker & Docker Compose
* Node.js 18+ (for manual frontend development)
* Python 3.11+ (for manual backend development)
* FFmpeg (installed locally if running without Docker)

### Automated Setup via Docker Compose

```bash
# 1. Clone repository and initialize environment settings
cp .env.example .env

# 2. Launch PostgreSQL (pgvector), Redis, FastAPI backend, Celery worker, and Next.js frontend
docker compose up --build -d

# Access services:
# Frontend Web App:  http://localhost:3000
# Backend OpenAPI:   http://localhost:8000/docs
```

### Manual Service Execution

```bash
# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend setup
cd frontend
npm install
npm run dev
```

---

## Verification & Automated Testing

To ensure full compliance with code quality and reliability standards, run the automated test suite:

```bash
# Execute backend test suite
cd backend
python -m pytest -q

# Execute frontend TypeScript verification
cd frontend
npx tsc --noEmit
```

---

## License & Compliance

TruthLayer is proprietary enterprise software. All rights reserved. For detailed subprocessor manifests and privacy policies, consult `backend/app/compliance/subprocessors.json` and `frontend/app/privacy/page.tsx`.

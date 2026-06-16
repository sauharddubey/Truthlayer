# Requirements Traceability Matrix

Maps each SRS requirement to where it is implemented. "Stub/integration point"
means the interface and plumbing exist and degrade gracefully, but a paid/GPU
external service must be connected for full fidelity.

## 5.1 Authentication & User Management
| Req | Status | Location |
|-----|--------|----------|
| FR-AUTH-001 email/password, OAuth-ready, org accounts | ✅ (email/pw) / OAuth-ready | `api/auth.py`, `models.py:User/Organization` |
| FR-AUTH-002 RBAC | ✅ | `security.py:require_roles` |
| FR-AUTH-003 admin/analyst/reviewer/creator/consumer roles | ✅ | `models.py:UserRole` |
| FR-AUTH-004 multi-tenant orgs | ✅ | `Organization`, org-scoping throughout |

## 5.2 Media Ingestion
| Req | Status | Location |
|-----|--------|----------|
| FR-ING-001 uploads + URLs | ✅ | `api/videos.py`, `services/ingestion.py` |
| FR-ING-002 TikTok/IG/YouTube | ✅ | `services/ingestion.py` (yt-dlp) |
| FR-ING-003 audio/metadata/captions/duration/creator | ✅ | `services/ingestion.py` |
| FR-ING-004 hashtag ingestion | ✅ plumbing | `monitoring.py` |
| FR-ING-005 register hashtags/keywords | ✅ | `api/business.py`, `MonitoredKeyword` |
| FR-ING-006 continuous monitoring | ⚙️ integration point | `monitoring.py`, `tasks/celery_app.py:monitor_keywords_task` |
| FR-ING-007 dedup | ✅ | `api/videos.py` + `Video.content_hash` |

## 5.3 Audio Processing / ASR
| Req | Status | Location |
|-----|--------|----------|
| FR-SP-001 Whisper/WhisperX | ✅ | `services/transcription.py` |
| FR-SP-002 timestamps + confidence | ✅ | segment timestamps + confidence |
| FR-SP-003 multi-language/accents/noise | ✅ (Whisper) | model-level |
| FR-SP-004 normalize | ✅ | transcription output normalization |
| FR-SP-005 chunking | ✅ | `services/structuring.py`, `rag/store.py` |

## 5.4 Transcript Structuring
| Req | Status | Location |
|-----|--------|----------|
| FR-TS-001/002/003 semantic blocks, claims, mentions, claim types | ✅ | `services/structuring.py` |

## 5.5–5.9 Agents
| Req | Status | Location |
|-----|--------|----------|
| FR-AGENT-001 parallel agents | ✅ | `agents/orchestrator.py` (ThreadPool) |
| FR-AGENT-002 aggregate evidence/scores/citations/confidence | ✅ | `orchestrator.py:_fuse_and_score` |
| FR-AGENT-003 modular plug-in agents | ✅ | `agents/base.py`, `AGENT_FUNCS` |
| FR-FACT-001..004 fact-checking | ✅ | `agents/fact_check.py` + `services/evidence.py` |
| FR-BIAS-001..003 bias | ✅ | `agents/bias.py` |
| FR-SENT-001..004 sentiment + timeline | ✅ | `agents/sentiment.py` |
| FR-CR-001..003 creator risk | ✅ | `agents/creator_risk.py` |

## 5.10 Business Compliance
| Req | Status | Location |
|-----|--------|----------|
| FR-BC-001/002 upload + parse/chunk/embed/index docs | ✅ | `api/business.py`, `rag/store.py` |
| FR-BC-003/004 validate + detect issues | ✅ | `agents/compliance.py` |
| FR-BC-005 batch influencer analysis | ✅ | submit many URLs; each runs the pipeline |
| FR-BC-006 parallel pipelines | ✅ | Celery workers / BackgroundTasks |

## 5.11 Viewer Trust
| FR-VIEW-001..003 | ✅ | `api/videos.py` + `dashboard/viewer`, simplified summary in `orchestrator._summary` |

## 5.12 Cross-Transcript Narrative Intelligence
| FR-NARR-001..005 | ✅ | `agents/narrative.py` (embedding clustering + propagation risk) |

## 5.13 Brand Reputation Intelligence
| FR-BRAND-001..003 | ✅ | `api/dashboard.py:business_dashboard` aggregates |

## 5.14 Celebrity Detection
| FR-CELEB-001..004 | ⚙️ stub/integration point | `agents/media_integrity.py`, `CelebrityDetection` table |

## 5.15 Deepfake Detection
| FR-DEEP-001..003 | ⚙️ stub/integration point | `agents/media_integrity.py`, `DeepfakeResult` table |

## 5.16 Video Manipulation Detection
| FR-VM-001/002 | ⚙️ stub/integration point | `agents/media_integrity.py` (manipulation + authenticity) |

## 5.17 RAG Knowledge System
| FR-RAG-001..004 | ✅ | `rag/store.py` (pgvector, PDF/DOCX/TXT, semantic retrieval, citations) |

## 5.18 Dashboards & Reporting
| FR-DASH-001..004 | ✅ | `frontend/app/dashboard/*`, `api/dashboard.py`, `services/reports.py` (PDF/JSON) |

## 6 Non-Functional
| Req | Status | Notes |
|-----|--------|-------|
| NFR-PERF-001 60s video < 90s | ✅ achievable | depends on provider latency; agents run in parallel |
| NFR-PERF-002 async processing | ✅ | Celery / BackgroundTasks |
| NFR-PERF-003 GPU acceleration | ⚙️ | for media-integrity service, not free tier |
| NFR-SCALE-001 horizontal workers | ✅ | Celery workers |
| NFR-SCALE-002 large-scale indexing | ✅ | pgvector |
| NFR-SCALE-003 continuous pipelines | ✅ plumbing | `monitoring.py` + Celery beat |
| NFR-EXP-001..003 explainability | ✅ | every agent returns evidence + confidence; surfaced in UI |
| NFR-SEC-001/002 tenant isolation | ✅ | org-scoping in queries + RAG |
| NFR-SEC-003 auth on APIs | ✅ | JWT dependency on all data routes |
| NFR-SEC-004 encryption at rest/in transit | ⚙️ infra | TLS at platform edge; DB encryption via Supabase/Neon |

Legend: ✅ implemented · ⚙️ interface + plumbing in place, connect external/GPU service for full fidelity.

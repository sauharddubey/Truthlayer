# Requirements Traceability Matrix

Maps each Software Requirements Specification (SRS) requirement to its implementation in the codebase. "PLUMBING" indicates that the interface and execution model exist and degrade gracefully, but a dedicated external GPU service can be connected for full production fidelity.

## 5.1 Authentication & User Management
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-AUTH-001** Email/password & OAuth-ready accounts | [COMPLETED] | `backend/app/api/auth.py`, `backend/app/models.py` |
| **FR-AUTH-002** Role-Based Access Control (RBAC) | [COMPLETED] | `backend/app/security.py:require_roles` |
| **FR-AUTH-003** Business, Creator, Verifier roles | [COMPLETED] | `backend/app/models.py:UserRole` |
| **FR-AUTH-004** Multi-tenant organization accounts | [COMPLETED] | `Organization` model and tenant-scoped endpoints |

## 5.2 Media Ingestion
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-ING-001** Video upload & URL submission | [COMPLETED] | `backend/app/api/videos.py`, `backend/app/services/ingestion.py` |
| **FR-ING-002** TikTok, Instagram, YouTube URL extraction | [COMPLETED] | `backend/app/services/ingestion.py` (`yt-dlp`) |
| **FR-ING-003** Audio, metadata, duration, creator extraction | [COMPLETED] | `backend/app/services/ingestion.py` |
| **FR-ING-004** Hashtag-driven video ingestion | [COMPLETED] | `backend/app/monitoring.py` |
| **FR-ING-005** Monitored keyword and hashtag registration | [COMPLETED] | `backend/app/api/products.py`, `MonitoredKeyword` |
| **FR-ING-006** Continuous keyword monitoring tasks | [PLUMBING] | `backend/app/monitoring.py`, `backend/app/tasks/celery_app.py` |
| **FR-ING-007** Video deduplication by hash | [COMPLETED] | `backend/app/api/videos.py` (`Video.content_hash`) |

## 5.3 Audio Processing & Speech-to-Text
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-SP-001** OpenRouter Audio Transcription | [COMPLETED] | `backend/app/services/transcription.py` |
| **FR-SP-002** Timestamped segment mapping & confidence | [COMPLETED] | `backend/app/services/transcription.py` |
| **FR-SP-003** Multi-language & accent support | [COMPLETED] | OpenRouter Audio API (`google/gemini-2.5-flash-lite`) |
| **FR-SP-004** Transcript text normalization | [COMPLETED] | `backend/app/services/transcription.py` |
| **FR-SP-005** Semantic transcript chunking | [COMPLETED] | `backend/app/services/structuring.py`, `backend/app/rag/store.py` |

## 5.4 Transcript Structuring
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-TS-001..003** Claim mining, mentions, claim categories | [COMPLETED] | `backend/app/services/structuring.py` |

## 5.5–5.9 AI Agent Fleet
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-AGENT-001** Parallel agent execution pool | [COMPLETED] | `backend/app/agents/orchestrator.py` (`ThreadPoolExecutor`) |
| **FR-AGENT-002** Score fusion, evidence citations, confidence | [COMPLETED] | `backend/app/agents/orchestrator.py` (`_fuse_and_score`) |
| **FR-AGENT-003** Pluggable agent architecture | [COMPLETED] | `backend/app/agents/base.py` |
| **FR-FACT-001..004** Fact-checking & web evidence retrieval | [COMPLETED] | `backend/app/agents/fact_check.py`, `backend/app/services/evidence.py` |
| **FR-BIAS-001..003** Cognitive bias & framing analysis | [COMPLETED] | `backend/app/agents/bias.py` |
| **FR-SENT-001..004** Sentiment valence & tone timelines | [COMPLETED] | `backend/app/agents/sentiment.py` |
| **FR-CR-001..003** Creator risk & sponsorship audit | [COMPLETED] | `backend/app/agents/creator_risk.py` |

## 5.10 Business Compliance & RAG
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-BC-001/002** Compliance document parsing & vector embedding | [COMPLETED] | `backend/app/api/products.py`, `backend/app/rag/store.py` |
| **FR-BC-003/004** Claim compliance validation against RAG | [COMPLETED] | `backend/app/agents/compliance.py` |
| **FR-BC-005** Batch video analysis | [COMPLETED] | Ingestion pipeline submission |
| **FR-BC-006** Parallel video analysis execution | [COMPLETED] | Celery workers / FastAPI `BackgroundTasks` |

## 5.11 Viewer Trust
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-VIEW-001..003** Consumer trust report breakdown | [COMPLETED] | `backend/app/api/videos.py`, `frontend/app/dashboard/verifier` |

## 5.12 Narrative Intelligence
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-NARR-001..005** Cross-video narrative theme clustering | [COMPLETED] | `backend/app/agents/narrative.py` |

## 5.13 Brand Reputation Intelligence
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-BRAND-001..003** Brand overview & risk monitoring | [COMPLETED] | `backend/app/api/dashboard.py` (`business_dashboard`) |

## 5.14–5.16 Media Integrity & Manipulation Detection
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-CELEB-001..004** Celebrity detection | [PLUMBING] | `backend/app/agents/media_integrity.py`, `CelebrityDetection` model |
| **FR-DEEP-001..003** Deepfake detection | [PLUMBING] | `backend/app/agents/media_integrity.py`, `DeepfakeResult` model |
| **FR-VM-001/002** Video manipulation heuristics | [PLUMBING] | `backend/app/agents/media_integrity.py` |

## 5.17 RAG Knowledge System
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-RAG-001..004** pgvector similarity search & document retrieval | [COMPLETED] | `backend/app/rag/store.py` |

## 5.18 Dashboards & Reporting
| Requirement ID & Description | Status | Implementation Location |
| :--- | :--- | :--- |
| **FR-DASH-001..004** Role dashboards, JSON exports, PDF reports | [COMPLETED] | `frontend/app/dashboard/*`, `backend/app/services/reports.py` |

## 6. Non-Functional Requirements
| Requirement ID & Description | Status | Technical Implementation Notes |
| :--- | :--- | :--- |
| **NFR-PERF-001** Processing latency < 90s for 60s video | [COMPLETED] | Multi-agent execution parallelization via ThreadPool |
| **NFR-PERF-002** Asynchronous processing engine | [COMPLETED] | Celery with Redis broker / FastAPI BackgroundTasks |
| **NFR-SCALE-001** Horizontal worker scaling | [COMPLETED] | Celery worker instances |
| **NFR-SCALE-002** High-performance vector indexing | [COMPLETED] | PostgreSQL `pgvector` HNSW/IVFFlat indexes |
| **NFR-EXP-001..003** Explainability & citation backing | [COMPLETED] | Structured evidence cards & confidence scores |
| **NFR-SEC-001/002** Multitenant data isolation | [COMPLETED] | Organization scoping on all database queries & RAG retrieval |
| **NFR-SEC-003** Mandatory API authentication | [COMPLETED] | Supabase JWT verification on all protected FastAPI routes |
| **NFR-SEC-004** Data encryption at rest & in transit | [COMPLETED] | Fernet key encryption for API keys; TLS 1.3 in transit |

---
**Legend**: `[COMPLETED]` = Fully implemented and verified; `[PLUMBING]` = Subsystem interfaces, ORM schema, and fallback logic established.

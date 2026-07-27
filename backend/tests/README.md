# Backend Automated Test Suite (`backend/tests`)

This directory contains unit tests, integration tests, and security hardening tests for the TruthLayer backend service.

## Test Suite Manifest

| Test Module | Coverage & Technical Scope |
| :--- | :--- |
| **`conftest.py`** | Pytest fixtures providing in-memory database sessions, mock authentication tokens, and client dependencies. |
| **`test_hardening.py`** | Comprehensive security test suite covering Fernet API key encryption, signed URL validation, rate limiting, and URL Guard SSRF prevention. |
| **`test_claim_extraction.py`** | Unit tests for transcript claim mining and eligibility evaluation logic. |
| **`test_ingestion.py`** | Unit tests verifying video file upload validation and URL parsing. |
| **`test_media_integrity.py`** | Unit tests verifying visual manipulation heuristics and deepfake evaluation stubs. |
| **`test_rag_store.py`** | Tests validating pgvector document chunking, embedding, and multitenant isolation. |
| **`test_hashtag_check.py`** | Tests for continuous brand hashtag monitoring routines. |
| **`test_sipi_mitigation.py`** | Tests covering Indirect Prompt Injection mitigation across AI agent inputs. |
| **`test_smoke.py`** | Fast offline smoke tests verifying backend module importability and routing. |
| **`test_product_delete.py`** | Integration test for cascading deletion of products and associated RAG vectors. |
| **`test_video_delete.py`** | Integration test for video deletion and artifact cleanup. |
| **`test_trust_scoring_business.py`** | Unit tests for business trust score normalization algorithms. |
| **`test_verifier_trust_summary.py`** | Unit tests for verifier trust verdict calculations. |

## Running Tests

```bash
# Execute entire test suite offline
cd backend
python -m pytest -q

# Run specific test file with verbose output
python -m pytest tests/test_hardening.py -v
```

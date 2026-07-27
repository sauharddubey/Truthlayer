# FastAPI API Router Subsystem (`backend/app/api`)

This directory contains the REST API route controllers for the TruthLayer backend service.

## Router Subsystem Overview

All API endpoints are mounted on the main FastAPI application instance (`app/main.py`). Requests require authentication via Supabase JWT Bearer tokens unless explicitly exempted (such as public health endpoints).

| Router Module | Route Prefix | Primary Purpose & Endpoints |
| :--- | :--- | :--- |
| **`auth.py`** | `/auth` | Authentication management, user profile initialization (`POST /auth/bootstrap`), current user profile (`GET /auth/me`), settings update (`PUT /auth/settings`), tier rights resolution (`GET /auth/rights`), and LLM token usage tracking (`GET /auth/usage`). |
| **`videos.py`** | `/videos`, `/analysis` | Video ingestion via URL (`POST /videos/url`), video file upload (`POST /videos/upload`), video metadata retrieval (`GET /videos/{video_id}`), re-analysis triggering (`POST /analysis/start`), and full analysis results retrieval (`GET /analysis/{video_id}`). |
| **`products.py`** | `/products` | Business workspace management: product CRUD operations (`POST`, `GET`, `DELETE /products`), product image uploading (`POST /products/{id}/image`), compliance documentation RAG ingestion (`POST /products/{id}/documents`), hashtag monitoring management (`POST /products/{id}/keywords`), and claim review updates (`PUT /products/claims/{claim_id}/review`). |
| **`dashboard.py`** | `/dashboard` | Role-specific analytical dashboards for Business (`GET /dashboard/brand`), Creator (`GET /dashboard/creator`), and Verifier (`GET /dashboard/verifier`). |
| **`reports.py`** | `/reports` | Export services generating JSON reports (`GET /reports/{video_id}/json`) and compiled PDF documents (`GET /reports/{video_id}/pdf`). |
| **`media.py`** | `/media` | Media access controller serving uploaded video files and thumbnails exclusively through time-limited HMAC-signed URLs (`GET /media/{filename}?exp=&sig=`). |
| **`legal.py`** | `/legal` | Legal terms, privacy policy data disclosures, and subprocessor registry data endpoints. |

## Access Control & Security Layer

1. **Role-Based Authorization**: Protected endpoints enforce role restrictions using `security.require_roles([UserRole.BUSINESS, ...])`.
2. **Tenant Scoping**: All resource queries scope returned objects by `organization_id` (for business users) or `submitted_by` (for personal users) to prevent unauthorized cross-tenant data access.
3. **Signed Media Access**: Direct file access to `/media/` paths is restricted; requests without valid cryptographic signatures (`exp` timestamp and HMAC `sig`) return HTTP 403 Forbidden.

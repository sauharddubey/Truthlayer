# Deployment Documentation & Requirement Traceability Directory

This directory contains production deployment manuals and formal Software Requirements Specification (SRS) traceability mappings for TruthLayer.

## Directory Contents

| File | Purpose & Description |
| :--- | :--- |
| **`DEPLOYMENT.md`** | Production guide for zero-cost / low-cost cloud deployment across Render, Vercel, Supabase, and Upstash. |
| **`REQUIREMENTS_TRACEABILITY.md`** | Formal matrix mapping SRS requirements to backend services, API controllers, RAG vector storage, and frontend components. |

## Operational Guidelines

* Maintain synchronization between deployment environment variable requirements and root `.env.example`.
* Ensure every SRS requirement mapping in `REQUIREMENTS_TRACEABILITY.md` references valid file paths and line ranges.

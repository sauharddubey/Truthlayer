# Frontend Utilities & Helper Client Library (`frontend/lib`)

This directory contains client-side API abstraction helpers, authentication bindings, custom React hooks, and utility functions for TruthLayer.

## Module Manifest

| Module | Technical Function & Description |
| :--- | :--- |
| **`api.ts`** | Primary Axios API client wrapper. Manages JWT authentication token header injection, error handling, base URL routing, local storage token management, and helper functions (`routeForRole`, `mediaUrl`). |
| **`safeUrl.ts`** | Client-side URL sanitization helper validating media and external link targets to protect against open redirects and malicious protocol schemes (`javascript:`). |
| **`useRoleGuard.ts`** | Custom React hook enforcing role-based routing client-side, redirecting unauthorized users to their appropriate dashboard. |
| **`useRefetchOnVisible.ts`** | Custom React hook triggering data re-fetching when browser tabs regain focus or visibility. |
| **`formatMetric.ts`** | Number formatting helper for formatting counts, confidence percentages, currencies, and file sizes cleanly. |
| **`supabase.ts`** | Supabase JS client initializer used for browser-side authentication flows (email/password login, Google OAuth redirects, session updates). |

## Core Architectural Responsibilities

1. **Authentication Token Lifecycle**: `api.ts` extracts the Bearer token stored in `localStorage` and automatically attaches it to the `Authorization` header of outgoing requests.
2. **Media URL Signing Handling**: `mediaUrl(path)` checks if a media URL requires cryptographic signature query parameters (`exp` and `sig`) and appends them cleanly when rendering images or video streams.

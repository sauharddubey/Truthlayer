# Compliance Assets Subsystem (`backend/app/compliance`)

This directory contains compliance static assets, legal disclosures, and subprocessor registries for the TruthLayer platform.

## Directory Contents

| File | Technical Description |
| :--- | :--- |
| **`subprocessors.json`** | JSON registry listing all third-party data subprocessors (OpenRouter, Supabase, Render, Vercel, Tavily, Upstash), specifying service descriptions, processing locations, and compliance certifications. |

## Subprocessor Data Policy

* Data sent to third-party subprocessors is restricted to the minimum required payload for processing.
* User API keys provided for OpenRouter and Tavily are stored using Fernet symmetric encryption and transmitted over TLS 1.3 endpoints exclusively.

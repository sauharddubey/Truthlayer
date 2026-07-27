# Background Services Subsystem (`backend/app/services`)

This directory contains standalone background processing services, external API integration wrappers, audio extraction tools, and report generation utilities.

## Module Breakdown

| Module | Function & Technical Description |
| :--- | :--- |
| **`ingestion.py`** | Handles video ingestion from public platform URLs (YouTube, TikTok, Instagram) using `yt-dlp` and direct file upload processing. |
| **`ffmpeg_utils.py`** | Audio extraction helper executing FFmpeg subprocess commands to extract normalized WAV/MP3 audio streams from video files. |
| **`transcription.py`** | Speech-to-text transcription engine using OpenRouter audio multimodal models (`google/gemini-2.5-flash-lite`) with timestamped segment mapping. |
| **`structuring.py`** | Converts raw transcripts into atomic, verifiable claim statements formatted with timestamps and speaker tags. |
| **`evidence.py`** | External web evidence retrieval engine querying Tavily Web Search API to collect supporting or contradicting sources. |
| **`reports.py`** | PDF report compiler generating structured downloadable compliance and trust reports using ReportLab. |
| **`claim_eligibility.py`** | Heuristic filter determining whether an extracted transcript statement is eligible for fact-checking. |
| **`hashtag_check.py`** | Ingests and monitors brand hashtags across social media platforms. |
| **`trust_scoring.py`** | Mathematical scoring engine computing multi-dimensional composite trust scores, risk indexes, and sub-score breakdowns. |
| **`video_cleanup.py`** | Garbage collection utility removing temporary audio/video files from local disk storage. |
| **`product_cleanup.py`** | Cleanup routines for removing orphaned product documents, chunks, and thumbnails. |
| **`ocr.py`** | Optical character recognition engine extracting textual overlays from video frames. |
| **`media_integrity/`** | Visual manipulation detection stubs and GPU deepfake service connector. |

## Business Tier Scoring Mechanism

The Business Tier Trust Score evaluates video content across five distinct dimensions rather than relying solely on uploaded knowledge base documents:

1. **Product Knowledge Base Compliance (35% Weight)**: Evaluates claim alignment against uploaded product specifications and marketing policy documents (`auto_verified`: 100%, `approved`: 100%, `needs_review`: 55%, `contradicted`/`rejected`: 0%).
2. **Factual Accuracy (25% Weight)**: Verifies claims against external web evidence via the `fact_check` agent (`supported`: 100%, `unverified`: 50%, `misleading`: 15%, `contradicted`: 0%).
3. **Regulatory & Marketing Compliance (25% Weight)**: Evaluates legal disclaimers, FTC disclosure compliance, and prohibited statements via the `compliance` agent.
4. **Brand Safety & Bias (15% Weight)**: Penalizes bias score and perception harm index to protect brand reputation.
5. **Media Authenticity Multiplier**: Scales the composite score by deepfake and visual manipulation analysis (`authenticity_score` from 0.0 to 1.0).

$$\text{Business Trust Score} = \left(0.35 \cdot S_{\text{kb}} + 0.25 \cdot S_{\text{fact}} + 0.25 \cdot S_{\text{comp}} + 0.15 \cdot S_{\text{brand}}\right) \cdot S_{\text{authenticity}}$$

## External Service Integrations

* **`yt-dlp`**: Download library configured to fetch video formats under size thresholds with fallback options.
* **Tavily API**: Used exclusively for evidence gathering during the `fact_check` agent phase.
* **OpenRouter Audio API**: Receives extracted audio snippets to produce timestamped transcriptions.

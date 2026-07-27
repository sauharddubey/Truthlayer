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
| **`trust_scoring.py`** | Mathematical scoring engine computing normalized trust scores, risk indexes, and confidence weights. |
| **`video_cleanup.py`** | Garbage collection utility removing temporary audio/video files from local disk storage. |
| **`product_cleanup.py`** | Cleanup routines for removing orphaned product documents, chunks, and thumbnails. |
| **`ocr.py`** | Optical character recognition engine extracting textual overlays from video frames. |
| **`media_integrity/`** | Visual manipulation detection stubs and GPU deepfake service connector. |

## External Service Integrations

* **`yt-dlp`**: Download library configured to fetch video formats under size thresholds with fallback options.
* **Tavily API**: Used exclusively for evidence gathering during the `fact_check` agent phase.
* **OpenRouter Audio API**: Receives extracted audio snippets to produce timestamped transcriptions.

"""Video OCR detection and speech relationship analysis service.

Extracts keyframes using FFmpeg, sends them to a multimodal vision model on OpenRouter,
transcribes on-screen text with timestamps, classifies segment safety, and determines if
the text is related to the speech transcript.
"""

from __future__ import annotations

import base64
import glob
import logging
import os
import subprocess
import tempfile
from typing import List, Optional

from app.config import settings
from app.llm import _client, effective_chat_key, effective_transcription_model, _extract_json, record_usage

logger = logging.getLogger("truthlayer.ocr")

SYSTEM_PROMPT = (
    "You are an expert video OCR and media intelligence analyst.\n"
    "Your task is to analyze the sequence of frames from a video (which are labeled with their timestamps) "
    "and transcribe all text visible on the screen with its corresponding timestamps. "
    "Also classify each segment's safety: 'safe' (no concerns), 'verify' (contains a factual claim to check), "
    "or 'risky' (likely false, misleading, or could offend/hurt sentiments).\n"
    "Then, compare the screen text with the provided speech transcript. Determine if the on-screen text "
    "is related to the speech, and explain why or why not.\n"
    "Additionally, perform a visual segment analysis: for each frame where text appears or changes, "
    "describe in detail what is visually happening in that frame (e.g., visual actions, actors, settings, gestures, or visual context).\n\n"
    "Return ONLY a valid JSON object matching this schema:\n"
    "{\n"
    '  "ocr_text": "all extracted text concatenated in chronological order",\n'
    '  "ocr_segments": [\n'
    '    {\n'
    '      "start": 0.0,\n'
    '      "end": 3.0,\n'
    '      "text": "text visible on the screen during this time segment",\n'
    '      "label": "safe|verify|risky",\n'
    '      "category": "factual|product_claim|opinion|sentiment_harm|medical|financial|other",\n'
    '      "reason": "explanation for label if not safe"\n'
    '    }\n'
    '  ],\n'
    '  "ocr_analysis": {\n'
    '    "is_related_to_speech": false,\n'
    '    "relationship_verdict": "unrelated|related|partially_related",\n'
    '    "explanation": "concise explanation of the relationship between on-screen text and speech transcript"\n'
    '  },\n'
    '  "video_segment_analysis": [\n'
    '    {\n'
    '      "timestamp": 3.0,\n'
    '      "text_appeared": "text that appeared in this frame",\n'
    '      "visual_description": "detailed description of the visual scene, actions, or objects occurring at this timestamp"\n'
    '    }\n'
    '  ]\n'
    "}\n"
    "Do not include markdown fences or commentary."
)


def run_ocr(video_path: str, duration: Optional[float], speech_transcript: str) -> dict:
    """Extract frames from the video and call the multimodal OpenRouter LLM to extract OCR and analyze speech relationship."""
    if not video_path or not os.path.exists(video_path):
        logger.warning("OCR skipped: video path does not exist.")
        return _empty_result("No video file found.")

    # Calculate optimal frame extraction interval to target around 15 frames max
    dur = duration or 30.0
    interval = max(2, int(dur / 15))
    logger.info("Extracting OCR frames from %s every %d seconds (duration=%s)", video_path, interval, dur)

    frames = []
    with tempfile.TemporaryDirectory() as tmpdir:
        # scale=640:-1 keeps aspect ratio and resizes to 640px width to keep payload sizes small/fast
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vf", f"fps=1/{interval},scale=640:-1",
            "-q:v", "2",
            os.path.join(tmpdir, "frame_%04d.jpg")
        ]
        try:
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        except subprocess.CalledProcessError as e:
            logger.error("FFmpeg frame extraction failed: %s", e.stderr.decode() if e.stderr else str(e))
            return _empty_result(f"Frame extraction failed: {str(e)}")

        files = sorted(glob.glob(os.path.join(tmpdir, "frame_*.jpg")))
        for idx, filepath in enumerate(files):
            timestamp = float(idx * interval)
            try:
                with open(filepath, "rb") as f:
                    b64_data = base64.b64encode(f.read()).decode("utf-8")
                frames.append({
                    "timestamp": timestamp,
                    "b64_data": b64_data
                })
            except Exception as ex:
                logger.warning("Failed to encode frame %s: %s", filepath, ex)

    if not frames:
        logger.warning("No frames extracted from video %s", video_path)
        return _empty_result("No frames could be extracted.")

    # Construct OpenRouter client
    api_key = effective_chat_key()
    if not api_key:
        logger.warning("OCR skipped: No API key available.")
        return _empty_result("No OpenRouter API key found.")

    client = _client(api_key, settings.LLM_BASE_URL)
    if not client:
        logger.warning("OCR skipped: Client construction failed.")
        return _empty_result("Failed to build OpenRouter client.")

    # Build prompt and multimodal messages payload
    user_prompt = (
        f"Speech Transcript of the audio: '{speech_transcript or '(No speech/silence)'}'\n\n"
        "Please perform OCR on the attached frames (ordered chronologically) "
        "and return the JSON analysis matching the requested schema."
    )

    content_list = [{"type": "text", "text": user_prompt}]
    for f in frames:
        t = f["timestamp"]
        content_list.append({
            "type": "text",
            "text": f"--- Frame at timestamp {t:.1f}s ---"
        })
        content_list.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{f['b64_data']}"
            }
        })

    # Use transcription model by default (since Gemini 2.5 Flash Lite is multimodal & cheap/free)
    model = effective_transcription_model() or settings.TRANSCRIPTION_MODEL
    logger.info("Calling OpenRouter multimodal model %s for OCR", model)

    try:
        resp = client.chat.completions.create(
            model=model,
            temperature=0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content_list}
            ]
        )
        if resp and getattr(resp, "usage", None):
            record_usage(
                "transcription",
                model,
                resp.usage.prompt_tokens,
                resp.usage.completion_tokens,
            )
        content = (resp.choices[0].message.content or "").strip()
        if not content:
            return _empty_result("Model returned an empty response.")

        result = _extract_json(content)
        if not isinstance(result, dict) or "ocr_segments" not in result:
            logger.warning("Model response is not in correct JSON structure: %s", content)
            return _empty_result("Invalid JSON response structure.")

        # Ensure values are normalized
        result["ocr_text"] = result.get("ocr_text") or ""
        result["ocr_segments"] = result.get("ocr_segments") or []
        result["ocr_analysis"] = result.get("ocr_analysis") or {
            "is_related_to_speech": True,
            "relationship_verdict": "related",
            "explanation": "No analysis available."
        }
        result["video_segment_analysis"] = result.get("video_segment_analysis") or []
        return result
    except Exception as exc:
        logger.exception("OpenRouter vision OCR API call failed: %s", exc)
        return _empty_result(f"API call failed: {str(exc)}")


def _empty_result(reason: str) -> dict:
    return {
        "ocr_text": "",
        "ocr_segments": [],
        "ocr_analysis": {
            "is_related_to_speech": True,
            "relationship_verdict": "related",
            "explanation": reason
        },
        "video_segment_analysis": []
    }

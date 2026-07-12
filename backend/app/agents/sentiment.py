"""Sentiment & Narrative Agent (FR-SENT-001..004).

Classifies sentiment and tone, estimates emotional intensity / persuasion level /
narrative leaning, and produces a timeline-based sentiment progression keyed to
transcript segment timestamps.
"""

from __future__ import annotations

from app.agents.base import AgentContext
from app.llm import chat_json

NAME = "sentiment"

_SCHEMA = """{
  "overall_sentiment": "positive|negative|neutral",
  "sentiment_score": 0.0,
  "tone": ["aggressive|trust-building|fear-based|neutral"],
  "emotional_intensity": 0.0,
  "persuasion_level": 0.0,
  "timeline": [{"timestamp": 0.0, "sentiment": "positive|negative|neutral", "intensity": 0.0}],
  "speech_sentiment": {
    "overall_sentiment": "positive|negative|neutral",
    "sentiment_score": 0.0,
    "timeline": [{"timestamp": 0.0, "sentiment": "positive|negative|neutral", "intensity": 0.0}],
    "tone": ["string"]
  },
  "video_sentiment": {
    "overall_sentiment": "positive|negative|neutral",
    "sentiment_score": 0.0,
    "timeline": [{"timestamp": 0.0, "sentiment": "positive|negative|neutral", "intensity": 0.0}],
    "tone": ["string"]
  },
  "evidence": [{"text": "string", "explanation": "string"}],
  "confidence": 0.0
}"""


def run(ctx: AgentContext) -> dict:
    speech_segments_view = "\n".join(
        f"[{s.get('start', 0):.1f}] {s.get('text', '')}" for s in ctx.segments[:60]
    )

    video_segments_view = ""
    video_analysis = ctx.ocr_analysis.get("video_segment_analysis") if ctx.ocr_analysis else []
    if video_analysis:
        video_segments_view = "\n".join(
            f"[{item.get('timestamp', 0):.1f}] Text: '{item.get('text_appeared', '')}' - Scene: {item.get('visual_description', '')}"
            for item in video_analysis[:60]
        )

    user_content = (
        f"Speech segments:\n<speech>\n{speech_segments_view or '[No speech detected]'}\n</speech>\n\n"
        f"Video visual segment analysis:\n<video_visuals>\n{video_segments_view or '[No video segment analysis available]'}\n</video_visuals>"
    )

    result = chat_json(
        system=(
            "You are a sentiment and narrative analyst. Your task is to analyze the sentiment of "
            "the audio speech transcript AND/OR the visual video segment analysis.\n"
            "1. If speech audio is present and contains speech (not just '[Music]'), analyze its sentiment and timeline under 'speech_sentiment'.\n"
            "2. If video segment analysis is present, analyze its visual/on-screen sentiment and timeline under 'video_sentiment'.\n"
            "3. If only one is present, base the 'overall_sentiment' and 'sentiment_score' on that one. "
            "If both are present, base them on a combined assessment.\n"
            "Use calibrated scales:\n"
            "- sentiment_score from -1.0 to 1.0: -1.0 to -0.4 is strongly negative/hostile, -0.3 to 0.3 is neutral/objective, 0.4 to 1.0 is strongly positive/supportive.\n"
            "- emotional_intensity from 0.0 to 1.0: 0.0 to 0.25 is monotone/flat, 0.26 to 0.60 is standard conversational, 0.61 to 0.85 is passionate/urgent, 0.86 to 1.0 is screaming/extreme panic.\n"
            "- audience persuasion_level from 0.0 to 1.0: 0.0 to 0.25 is informational/purely objective, 0.26 to 0.60 is mild marketing persuasion, 0.61 to 0.85 is high-pressure sales pitch, 0.86 to 1.0 is deceptive/extreme manipulation.\n\n"
            "CRITICAL TIMELINE REQUIREMENT: The timelines (overall timeline, speech_sentiment.timeline, and video_sentiment.timeline) must NOT be flat or repeat a single static sentiment or intensity value. "
            "Evaluate each timestamped segment's local text, visual cue, or spoken phrase carefully to capture fluctuations, highs, and lows in emotional tone and intensity over the course of the video."
        ),
        user=user_content,
        schema_hint=_SCHEMA,
    )
    if not result:
        return {
            "overall_sentiment": "neutral",
            "sentiment_score": 0.0,
            "tone": ["neutral"],
            "emotional_intensity": 0.0,
            "persuasion_level": 0.0,
            "timeline": [],
            "speech_sentiment": {"overall_sentiment": "neutral", "sentiment_score": 0.0, "timeline": [], "tone": []},
            "video_sentiment": {"overall_sentiment": "neutral", "sentiment_score": 0.0, "timeline": [], "tone": []},
            "evidence": [],
            "confidence": 0.2,
        }
    result.setdefault("evidence", [])
    result.setdefault("confidence", 0.6)
    return result

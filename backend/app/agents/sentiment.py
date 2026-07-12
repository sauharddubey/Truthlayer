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
  "narrative_leaning": "string",
  "timeline": [{"timestamp": 0.0, "sentiment": "positive|negative|neutral", "intensity": 0.0}],
  "evidence": [{"text": "string", "explanation": "string"}],
  "confidence": 0.0
}"""


def run(ctx: AgentContext) -> dict:
    segment_view = "\n".join(
        f"[{s.get('start', 0):.1f}] {s.get('text', '')}" for s in ctx.segments[:60]
    ) or ctx.transcript_text[:4000]

    result = chat_json(
        system=(
            "You are a sentiment and narrative analyst. Provide overall sentiment "
            "(sentiment_score calibrated strictly from -1.0 to 1.0: -1.0 to -0.4 is strongly negative/hostile, -0.3 to 0.3 is neutral/objective, 0.4 to 1.0 is strongly positive/supportive), "
            "tone tags, emotional_intensity (calibrated strictly from 0.0 to 1.0: 0.0 to 0.25 is monotone/flat, 0.26 to 0.60 is standard conversational, 0.61 to 0.85 is passionate/urgent, 0.86 to 1.0 is screaming/extreme panic), "
            "audience persuasion_level (calibrated strictly from 0.0 to 1.0: 0.0 to 0.25 is informational/purely objective, 0.26 to 0.60 is mild marketing persuasion, 0.61 to 0.85 is high-pressure sales pitch, 0.86 to 1.0 is deceptive/extreme manipulation), "
            "narrative leaning, and a per-timestamp sentiment timeline."
        ),
        user=segment_view,
        schema_hint=_SCHEMA,
    )
    if not result:
        return {
            "overall_sentiment": "neutral",
            "sentiment_score": 0.0,
            "tone": ["neutral"],
            "emotional_intensity": 0.0,
            "persuasion_level": 0.0,
            "narrative_leaning": "neutral",
            "timeline": [],
            "evidence": [],
            "confidence": 0.2,
        }
    result.setdefault("evidence", [])
    result.setdefault("confidence", 0.6)
    return result

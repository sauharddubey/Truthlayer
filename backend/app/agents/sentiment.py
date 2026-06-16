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
            "(score -1..1), tone tags, emotional intensity (0-1), audience persuasion "
            "level (0-1), narrative leaning, and a per-timestamp sentiment timeline."
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

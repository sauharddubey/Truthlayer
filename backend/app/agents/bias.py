"""Bias Detection Agent (FR-BIAS-001..003).

Detects political/product bias, emotional manipulation, persuasive framing, fear
and hype-driven language; determines overall narrative leaning with explainable
reasoning and a 0-100 bias score (higher = more biased/manipulative).
"""

from __future__ import annotations

from app.agents.base import AgentContext
from app.llm import chat_json

NAME = "bias"

_SCHEMA = """{
  "bias_score": 0,
  "narrative_leaning": "neutral|left|right|pro-product|anti-product|sensational",
  "detected": {
    "political_bias": false,
    "product_bias": false,
    "emotional_manipulation": false,
    "persuasive_framing": false,
    "fear_messaging": false,
    "hype_language": false
  },
  "reasoning": "string",
  "evidence": [{"text": "string", "explanation": "string"}],
  "confidence": 0.0
}"""


def run(ctx: AgentContext) -> dict:
    result = chat_json(
        system=(
            "You are a media-bias analyst. Identify political bias, product bias, "
            "emotional manipulation, persuasive framing, fear-driven and hype-driven "
            "language. Determine overall narrative leaning and give explainable "
            "reasoning with quoted evidence. bias_score is 0 (neutral) to 100 (highly "
            "manipulative)."
        ),
        user=ctx.transcript_text[:5000],
        schema_hint=_SCHEMA,
    )
    if not result:
        return {
            "bias_score": 0,
            "narrative_leaning": "neutral",
            "detected": {},
            "reasoning": "No LLM available.",
            "evidence": [],
            "confidence": 0.2,
        }
    result.setdefault("evidence", [])
    result.setdefault("confidence", 0.6)
    return result

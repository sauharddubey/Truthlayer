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
            "reasoning with quoted evidence. The bias_score is 0 (neutral) to 100 (highly "
            "manipulative) and must be calibrated strictly against the following scale:\n"
            "- 0-15: Completely neutral, objective, factual presentation without loaded adjectives or selective framing.\n"
            "- 16-40: Mild persuasive tone or slight product favoritism, but mostly balanced.\n"
            "- 41-70: Significant bias, emotional appeals, sensational headlines, one-sided product hype, or partisan framing.\n"
            "- 71-100: Extreme manipulation, fear-mongering, active disinformation, or highly deceptive/hostile persuasive tactics."
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

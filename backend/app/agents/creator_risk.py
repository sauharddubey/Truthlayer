"""Creator Risk Analysis Agent (FR-CR-001..003).

Pre-publication risk analysis for creators: reputational, misinformation,
moderation, controversial-narrative and toxic-language risks, plus a creator risk
score, audience backlash risk, platform-violation risk, and actionable
recommendations.
"""

from __future__ import annotations

from app.agents.base import AgentContext
from app.llm import chat_json

NAME = "creator_risk"

_SCHEMA = """{
  "creator_risk_score": 0,
  "audience_backlash_risk": 0,
  "platform_violation_risk": 0,
  "risks": [
    {"type": "reputational|misinformation|moderation|controversial|toxic_language",
     "severity": "low|medium|high|critical", "description": "string"}
  ],
  "recommendations": ["string"],
  "evidence": [{"text": "string", "explanation": "string"}],
  "confidence": 0.0
}"""


def run(ctx: AgentContext) -> dict:
    result = chat_json(
        system=(
            "You are a pre-publication risk advisor for content creators. Identify "
            "reputational, misinformation, moderation, controversial-narrative and "
            "toxic-language risks. Provide creator_risk_score, audience_backlash_risk "
            "and platform_violation_risk (each 0-100) and concrete, actionable "
            "recommendations to reduce risk before publishing."
        ),
        user=ctx.transcript_text[:5000],
        schema_hint=_SCHEMA,
    )
    if not result:
        return {
            "creator_risk_score": 0,
            "audience_backlash_risk": 0,
            "platform_violation_risk": 0,
            "risks": [],
            "recommendations": [],
            "evidence": [],
            "confidence": 0.2,
        }
    result.setdefault("recommendations", [])
    result.setdefault("evidence", [])
    result.setdefault("confidence", 0.6)
    return result

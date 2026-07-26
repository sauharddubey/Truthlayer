"""Perception / sentiment-harm agent.

For non-product content especially, this answers: "what in this video could hurt,
offend, or alienate other people?" It flags content that targets or could upset
specific groups, inflammatory framing, insensitive statements, and reputational
landmines — with severity and concrete softening recommendations.
"""

from __future__ import annotations

from app.agents.base import AgentContext, sanitize_transcript, wrap_untrusted
from app.llm import chat_json

NAME = "perception"

_SCHEMA = """{
  "sentiment_harm_score": 0,
  "audience_perception": "string",
  "flags": [
    {"topic": "string", "affected_group": "string", "severity": "low|medium|high|critical",
     "quote": "string", "reason": "string"}
  ],
  "recommendations": ["string"],
  "confidence": 0.0
}"""


def run(ctx: AgentContext) -> dict:
    sanitized_text, was_injected = sanitize_transcript(ctx.transcript_text)
    if was_injected:
        return {
            "sentiment_harm_score": 100,
            "audience_perception": "Critical risk. Adversarial prompt injection attempt detected.",
            "flags": [
                {
                    "group": "system",
                    "severity": "critical",
                    "quote": ctx.transcript_text[:100],
                    "explanation": "Spoken prompt injection attempt detected."
                }
            ],
            "recommendations": ["Ensure transcripts do not contain adversarial instructions."],
            "confidence": 0.99
        }

    result = chat_json(
        system=(
            "You are a perception and sensitivity analyst. Identify anything in the "
            "transcript that could hurt or offend people, alienate an audience, or "
            "create backlash: insensitive, inflammatory, discriminatory, stereotyping, "
            "politically charged, or defamatory statements. For each, name the likely "
            "affected group, quote the line, rate severity, and explain. "
            "The sentiment_harm_score is 0 (harmless) to 100 (highly likely to hurt/offend) and must be calibrated strictly against the following scale:\n"
            "- 0-15: Harmless, polite, highly respectful, or neutral objective reporting.\n"
            "- 16-40: Minor insensitivity, mildly edgy jokes, or light political debate with no slurs or aggressive language.\n"
            "- 41-70: Loaded/polarizing framing, stereotyping, insensitive remarks about groups, or highly controversial political attacks.\n"
            "- 71-100: Discriminatory slurs, hate speech, severe defamation, direct harassment, or calling for harm.\n"
            "Give concrete, respectful rewrite recommendations. If the content is "
            "harmless, return an empty flags list and a low score."
        ),
        user=wrap_untrusted("transcript", sanitized_text[:5000]),
        schema_hint=_SCHEMA,
    )
    if not result:
        return {
            "sentiment_harm_score": 0,
            "audience_perception": "",
            "flags": [],
            "recommendations": [],
            "evidence": [],
            "confidence": 0.2,
        }
    result.setdefault("flags", [])
    result.setdefault("recommendations", [])
    result.setdefault("confidence", 0.6)
    result["evidence"] = []
    return result

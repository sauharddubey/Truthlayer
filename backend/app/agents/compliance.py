"""Business Compliance Agent (FR-BC-003..004).

Validates a video against the organization's RAG-indexed knowledge (brand
guidelines, product restrictions, advertising policies, campaign rules) and detects
missing disclosures, unsupported claims, competitor mentions, off-brand messaging,
and restricted terminology — each with a rule citation and severity.
"""

from __future__ import annotations

from app.agents.base import AgentContext, sanitize_transcript, wrap_untrusted
from app.llm import chat_json

NAME = "compliance"

_SCHEMA = """{
  "compliance_score": 0,
  "issues": [
    {
      "issue_type": "missing_disclosure|unsupported_claim|competitor_mention|off_brand|restricted_term",
      "severity": "low|medium|high|critical",
      "description": "string",
      "rule_citation": "string",
      "evidence": [{"text": "string"}]
    }
  ],
  "confidence": 0.0
}"""


def run(ctx: AgentContext) -> dict:
    # Pull the most relevant policy/rule chunks for this transcript.
    policy_context = _retrieve_policy_excerpts(ctx)

    if not policy_context:
        # No org policies indexed → apply generic advertising-standards baseline.
        policy_context = [
            "Sponsored or paid content must include a clear #ad or 'paid partnership' "
            "disclosure. Health and financial claims must be substantiated. Comparative "
            "claims naming competitors must be accurate and not disparaging."
        ]

    sanitized_text, was_injected = sanitize_transcript(ctx.transcript_text)
    if was_injected:
        return {
            "compliance_score": 0,
            "issues": [
                {
                    "issue_type": "off_brand",
                    "severity": "critical",
                    "description": "Adversarial prompt injection attempt detected in transcript.",
                    "rule_citation": "Security Policy: Prompt injection attempts are prohibited.",
                    "evidence": [{"text": ctx.transcript_text[:200]}]
                }
            ],
            "confidence": 0.99,
            "evidence": [{"text": p[:300]} for p in policy_context[:3]]
        }

    user_content = (
        f"Policy excerpts:\n<policies>\n{chr(10).join(policy_context)[:4000]}\n</policies>\n\n"
        f"Transcript:\n<transcript>\n{sanitized_text[:4000]}\n</transcript>"
    )
    result = chat_json(
        system=(
            "You are a brand-compliance reviewer. Validate the transcript against the "
            "provided policy excerpts. Flag missing disclosures, unsupported claims, "
            "competitor mentions, off-brand messaging and restricted terminology. Cite "
            "the relevant rule for each issue. The compliance_score is 0 (non-compliant) to "
            "100 (fully compliant) and must be calibrated strictly against the following scale:\n"
            "- 100: Fully compliant; zero issues flagged.\n"
            "- 80-99: Minor issues only (e.g. low-severity off-brand phrasing, minor disclosure omissions).\n"
            "- 60-79: Medium-severity issues (e.g. competitor mentions, moderate unverified claims).\n"
            "- 40-59: High-severity or multiple critical issues (e.g. serious unauthorized claims, direct policy violations).\n"
            "- 0-39: Severe policy violations or critical legal non-compliance."
        ),
        user=wrap_untrusted("policy excerpts and transcript", user_content),
        schema_hint=_SCHEMA,
    )
    if not result:
        return {"compliance_score": 50, "issues": [], "evidence": [], "confidence": 0.2}
    result.setdefault("issues", [])
    result["evidence"] = [{"text": p[:300]} for p in policy_context[:3]]
    result.setdefault("confidence", 0.6)
    return result


def _retrieve_policy_excerpts(ctx: AgentContext) -> list[str]:
    retrieve_fn = ctx.rag_retrieve_marketing_policies or ctx.rag_retrieve
    if not retrieve_fn:
        return []
    queries = [
        "advertising disclosure requirements",
        "restricted terminology and prohibited claims",
        "brand guidelines and tone",
        ctx.transcript_text[:300],
    ]
    seen: set[tuple] = set()
    excerpts: list[str] = []
    for q in queries:
        for r in retrieve_fn(q, 3):
            key = (r.get("document_id"), r.get("chunk_index"))
            if key not in seen:
                seen.add(key)
                excerpts.append(r["content"])
    return excerpts

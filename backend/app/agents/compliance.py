"""Business Compliance Agent (FR-BC-003..004).

Validates a video against the organization's RAG-indexed knowledge (brand
guidelines, product restrictions, advertising policies, campaign rules) and detects
missing disclosures, unsupported claims, competitor mentions, off-brand messaging,
and restricted terminology — each with a rule citation and severity.
"""

from __future__ import annotations

from app.agents.base import AgentContext
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
    policy_context = []
    if ctx.rag_retrieve:
        queries = [
            "advertising disclosure requirements",
            "restricted terminology and prohibited claims",
            "brand guidelines and tone",
            ctx.transcript_text[:300],
        ]
        seen = set()
        for q in queries:
            for r in ctx.rag_retrieve(q, 3):
                key = (r["document_id"], r["chunk_index"])
                if key not in seen:
                    seen.add(key)
                    policy_context.append(r["content"])

    if not policy_context:
        # No org policies indexed → apply generic advertising-standards baseline.
        policy_context = [
            "Sponsored or paid content must include a clear #ad or 'paid partnership' "
            "disclosure. Health and financial claims must be substantiated. Comparative "
            "claims naming competitors must be accurate and not disparaging."
        ]

    result = chat_json(
        system=(
            "You are a brand-compliance reviewer. Validate the transcript against the "
            "provided policy excerpts. Flag missing disclosures, unsupported claims, "
            "competitor mentions, off-brand messaging and restricted terminology. Cite "
            "the relevant rule for each issue. compliance_score is 0 (non-compliant) to "
            "100 (fully compliant)."
        ),
        user=(
            f"Policy excerpts:\n{chr(10).join(policy_context)[:4000]}\n\n"
            f"Transcript:\n{ctx.transcript_text[:4000]}"
        ),
        schema_hint=_SCHEMA,
    )
    if not result:
        return {"compliance_score": 50, "issues": [], "evidence": [], "confidence": 0.2}
    result.setdefault("issues", [])
    result["evidence"] = [{"text": p[:300]} for p in policy_context[:3]]
    result.setdefault("confidence", 0.6)
    return result

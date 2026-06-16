"""Fact-Checking Agent (FR-FACT-001..004).

Extracts factual claims, retrieves supporting evidence (tenant knowledge base via
RAG + web via Tavily), and classifies each claim as supported / contradicted /
misleading / unverified with citations, confidence, and timestamps.
"""

from __future__ import annotations

from app.agents.base import AgentContext
from app.llm import chat_json
from app.services.evidence import search_evidence

NAME = "fact_check"

_SCHEMA = """{
  "claims": [
    {
      "claim_text": "string",
      "claim_type": "string",
      "verdict": "supported|contradicted|misleading|unverified",
      "confidence": 0.0,
      "timestamp_start": 0.0,
      "timestamp_end": 0.0,
      "reasoning": "string",
      "evidence": [{"text": "string", "source": "string", "url": "string"}]
    }
  ],
  "confidence": 0.0
}"""


def run(ctx: AgentContext) -> dict:
    # Pull candidate claims from structured blocks (with fallback to transcript).
    candidate_claims = []
    for block in ctx.structured_blocks:
        for c in block.get("claims", []):
            candidate_claims.append(
                {
                    "claim_text": c.get("claim_text"),
                    "claim_type": c.get("claim_type", "factual"),
                    "timestamp_start": block.get("timestamp_start"),
                    "timestamp_end": block.get("timestamp_end"),
                }
            )

    # Gather external evidence for the most checkable claims.
    evidence_snippets = []
    for c in candidate_claims[:5]:
        text = c.get("claim_text") or ""
        if not text:
            continue
        web = search_evidence(text, max_results=3)
        for w in web:
            evidence_snippets.append(
                {"for_claim": text, "text": w["content"], "source": w["title"], "url": w["url"]}
            )
        if ctx.rag_retrieve:
            for r in ctx.rag_retrieve(text, 3):
                evidence_snippets.append(
                    {"for_claim": text, "text": r["content"], "source": "knowledge_base", "url": ""}
                )

    result = chat_json(
        system=(
            "You are a rigorous fact-checking agent. For each claim, weigh the provided "
            "evidence and classify it as supported, contradicted, misleading, or "
            "unverified. Cite the evidence you used. Be conservative: if evidence is "
            "weak or absent, mark unverified. Always include confidence (0-1)."
        ),
        user=(
            f"Transcript:\n{ctx.transcript_text[:4000]}\n\n"
            f"Candidate claims:\n{candidate_claims}\n\n"
            f"Retrieved evidence:\n{evidence_snippets}"
        ),
        schema_hint=_SCHEMA,
    )

    if not result or "claims" not in result:
        # Heuristic fallback: everything unverified, low confidence.
        return {
            "claims": [
                {**c, "verdict": "unverified", "confidence": 0.3, "evidence": [], "reasoning": "No LLM available."}
                for c in candidate_claims
            ],
            "confidence": 0.3,
            "evidence": evidence_snippets,
        }

    result.setdefault("confidence", 0.6)
    result["evidence"] = evidence_snippets
    return result

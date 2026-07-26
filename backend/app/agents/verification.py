"""Business claim verification against product details + marketing policies.

For each factual/product claim in the video, decide:
* ``auto_verified`` — the claim is explicitly supported by the product details or
  approved marketing policies the brand uploaded.
* ``contradicted``  — the claim conflicts with those documents.
* ``needs_review``  — a product/marketing claim that is NOT covered by the docs, so
  a human at the brand must approve or reject it.
* ``not_applicable``— not a verifiable product claim.
"""

from __future__ import annotations

from typing import List

from app.agents.base import AgentContext, wrap_untrusted
from app.llm import chat_json

NAME = "verification"

_SCHEMA = """{
  "results": [
    {"index": 0, "status": "auto_verified|contradicted|needs_review|not_applicable", "note": "string"}
  ]
}"""


def verify_claims(ctx: AgentContext, claims: List[dict]) -> List[dict]:
    if not claims:
        return []

    details_excerpts = _retrieve_excerpts(
        ctx.rag_retrieve_product_details,
        [ctx.transcript_text[:300]] + [c.get("claim_text", "") for c in claims[:6]],
    )
    policy_excerpts = _retrieve_excerpts(
        ctx.rag_retrieve_marketing_policies,
        [
            "approved marketing claims and restrictions",
            "disclosure and advertising policy",
            ctx.transcript_text[:300],
        ],
    )
    if not details_excerpts and not policy_excerpts and ctx.rag_retrieve:
        details_excerpts = _retrieve_excerpts(
            ctx.rag_retrieve,
            [ctx.transcript_text[:300]] + [c.get("claim_text", "") for c in claims[:6]],
        )

    knowledge_parts = []
    if ctx.product_description:
        knowledge_parts.append(f"PRODUCT SUMMARY:\n{ctx.product_description}")
    if details_excerpts:
        knowledge_parts.append("PRODUCT DETAILS:\n" + "\n---\n".join(details_excerpts[:6]))
    if policy_excerpts:
        knowledge_parts.append("MARKETING POLICIES:\n" + "\n---\n".join(policy_excerpts[:4]))
    knowledge = "\n\n".join(knowledge_parts)
    indexed = "\n".join(f"[{i}] {c.get('claim_text','')}" for i, c in enumerate(claims))

    result = chat_json(
        system=(
            "You verify a video's claims against a brand's official PRODUCT DETAILS and "
            "MARKETING POLICIES. For each numbered claim decide:\n"
            "- auto_verified: the claim is clearly supported by the provided documents\n"
            "- contradicted: the claim conflicts with the documents\n"
            "- needs_review: a product/marketing claim NOT covered by the documents "
            "(a human at the brand must approve it)\n"
            "- not_applicable: not a verifiable product claim (small talk, opinion).\n"
            "Be strict: only auto_verify when the documents actually say it."
        ),
        user=(
            wrap_untrusted("brand product knowledge", knowledge[:4000])
            + "\n\n"
            + wrap_untrusted("video claims", indexed)
        ),
        schema_hint=_SCHEMA,
    )

    by_index = {r.get("index"): r for r in (result.get("results") or []) if "index" in r}
    out = []
    for i, c in enumerate(claims):
        r = by_index.get(i, {})
        has_docs = bool(knowledge.strip())
        default = "needs_review" if has_docs else "not_applicable"
        out.append(
            {
                **c,
                "verification_status": r.get("status", default),
                "verification_note": r.get("note", ""),
            }
        )
    return out


def _retrieve_excerpts(retrieve_fn, queries: List[str], per_query: int = 3) -> List[str]:
    if not retrieve_fn:
        return []
    seen: set[tuple] = set()
    excerpts: List[str] = []
    for q in queries:
        if not q:
            continue
        for r in retrieve_fn(q, per_query):
            key = (r.get("document_id"), r.get("chunk_index"))
            if key not in seen:
                seen.add(key)
                excerpts.append(r["content"])
    return excerpts

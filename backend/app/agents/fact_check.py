"""Fact-Checking Agent (FR-FACT-001..004).

Extracts factual claims, retrieves supporting evidence (tenant knowledge base via
RAG + web via Tavily), and classifies each claim as supported / contradicted /
misleading / unverified with citations, confidence, and timestamps.
"""

from __future__ import annotations

import re
from urllib.parse import urlparse

from app.agents.base import AgentContext
from app.llm import chat_json
from app.services.claim_eligibility import (
    claim_eligibility_reasons,
    filter_checkable_claims,
    has_declarative_predicate,
)
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

    content_segments = (ctx.metadata or {}).get("content_segments") or []
    content_type = (ctx.metadata or {}).get("content_type")
    checkable_claims, skipped_claims = filter_checkable_claims(
        candidate_claims,
        content_segments,
        content_type=content_type,
    )

    # Gather external evidence for the most checkable claims only.
    claim_evidence_index: dict[str, list[dict]] = {}
    retrieval_diagnostics: dict[str, dict] = {}
    claim_candidates = _prioritize_claims(checkable_claims)
    for c in claim_candidates:
        text = c.get("claim_text") or ""
        if not text:
            continue
        claim_key = text.strip().lower()
        claim_evidence_index.setdefault(claim_key, [])
        rewritten_query = _rewrite_query(text)
        web = search_evidence(rewritten_query, max_results=5)
        for w in web:
            item = {
                "for_claim": text,
                "text": w["content"],
                "source": w["title"],
                "url": w["url"],
                "source_type": "web",
                "query": rewritten_query,
            }
            claim_evidence_index[claim_key].append(item)
        if ctx.rag_retrieve:
            for r in ctx.rag_retrieve(text, 3):
                item = {
                    "for_claim": text,
                    "text": r["content"],
                    "source": "knowledge_base",
                    "url": "",
                    "source_type": "rag",
                    "query": rewritten_query,
                }
                claim_evidence_index[claim_key].append(item)

        ranked = _rank_and_filter_evidence(text, claim_evidence_index[claim_key], k=4)
        claim_evidence_index[claim_key] = ranked
        retrieval_diagnostics[claim_key] = _retrieval_metrics(text, ranked, rewritten_query)

    result = chat_json(
        system=(
            "You are a rigorous fact-checking agent. For each claim, weigh the provided "
            "evidence and classify it as supported, contradicted, misleading, or "
            "unverified. Cite the evidence you used. Be conservative: if evidence is "
            "weak or absent, mark unverified. If claim_text is not a factual proposition "
            "(topic phrase, title, intro fragment, or opinion), mark unverified and "
            "explain that it is not a checkable claim. Do not treat keyword overlap or "
            "related web titles as support for non-declarative phrases. Always include "
            "confidence (0-1)."
        ),
        user=(
            f"Transcript:\n{ctx.transcript_text[:4000]}\n\n"
            f"Candidate claims:\n{checkable_claims}\n\n"
            f"Retrieved evidence:\n{_flatten_claim_evidence(claim_evidence_index)}"
        ),
        schema_hint=_SCHEMA,
    )

    if not result or "claims" not in result:
        # Heuristic fallback: everything unverified, low confidence.
        return {
            "claims": [
                {
                    **c,
                    "verdict": "unverified",
                    "confidence": 0.25,
                    "evidence": claim_evidence_index.get((c.get("claim_text") or "").strip().lower(), []),
                    "reasoning": "No LLM available.",
                }
                for c in checkable_claims
            ],
            "confidence": 0.3,
            "evidence": _flatten_claim_evidence(claim_evidence_index),
            "evidence_summary": _summarize_evidence(checkable_claims, claim_evidence_index, retrieval_diagnostics),
            "skipped_claims": skipped_claims,
        }

    claims = result.get("claims") or []
    normalized_claims = []
    for claim in claims:
        text = (claim.get("claim_text") or "").strip()
        key = text.lower()
        model_evidence = [e for e in (claim.get("evidence") or []) if isinstance(e, dict)]
        retrieved = claim_evidence_index.get(key, [])

        # Merge model-selected and retrieved evidence by (text, source, url).
        merged = []
        seen = set()
        for e in model_evidence + retrieved:
            item = {
                "text": (e.get("text") or "")[:600],
                "source": e.get("source") or "evidence",
                "url": e.get("url") or "",
                "source_type": e.get("source_type") or ("web" if e.get("url") else "rag"),
            }
            ident = (item["text"], item["source"], item["url"])
            if ident in seen:
                continue
            seen.add(ident)
            merged.append(item)
        merged = _rank_and_filter_evidence(text, merged, k=4)

        confidence = claim.get("confidence")
        try:
            confidence = float(confidence) if confidence is not None else 0.0
        except (TypeError, ValueError):
            confidence = 0.0

        verdict = claim.get("verdict") or "unverified"
        evidence_quality = _evidence_quality_score(text, merged)
        reason_codes = _reason_codes(text, merged, evidence_quality, claim.get("claim_type"))
        if not _passes_evidence_contract(verdict, text, merged, evidence_quality):
            verdict = "unverified"
            confidence = min(confidence, 0.35 if merged else 0.25)
        elif not merged:
            confidence = min(confidence, 0.45)
        else:
            confidence = min(confidence, round(max(0.0, min(1.0, evidence_quality / 100)), 3))

        normalized_claims.append(
            {
                **claim,
                "verdict": verdict,
                "confidence": round(max(0.0, min(1.0, confidence)), 3),
                "evidence": merged,
                "evidence_quality_score": round(evidence_quality, 2),
                "insufficient_evidence_reasons": reason_codes,
            }
        )

    result["claims"] = normalized_claims
    result.setdefault("confidence", 0.6)
    result["evidence"] = _flatten_claim_evidence(claim_evidence_index)
    result["evidence_summary"] = _summarize_evidence(normalized_claims, claim_evidence_index, retrieval_diagnostics)
    result["skipped_claims"] = skipped_claims
    return result


def _prioritize_claims(claims: list[dict], limit: int = 8) -> list[dict]:
    scored = []
    for c in claims or []:
        text = (c.get("claim_text") or "").strip()
        if not text:
            continue
        salience = 0
        if re.search(r"\d", text):
            salience += 2
        if len(text.split()) >= 5:
            salience += 1
        ctype = (c.get("claim_type") or "").lower()
        if ctype in {"factual", "medical", "financial", "legal", "comparative"}:
            salience += 2
        scored.append((salience, c))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:limit]]


def _rewrite_query(claim_text: str) -> str:
    text = " ".join((claim_text or "").split())
    text = re.sub(r"(?i)\b(i think|we think|in my opinion|maybe|probably|possibly|kind of|sort of)\b", "", text)
    text = re.sub(r"\s+", " ", text).strip(" ,.-")
    if len(text) < 16:
        return claim_text
    return text


def _rank_and_filter_evidence(claim_text: str, items: list[dict], k: int = 4) -> list[dict]:
    ranked = []
    seen = set()
    for e in items or []:
        text = (e.get("text") or "").strip()
        source = (e.get("source") or "evidence").strip()
        url = (e.get("url") or "").strip()
        if len(text) < 40:
            continue
        ident = (text.lower(), source.lower(), url.lower())
        if ident in seen:
            continue
        seen.add(ident)
        score = _alignment_score(claim_text, text)
        if score < 15:
            continue
        ranked.append((score, {**e, "relevance_score": round(score, 2)}))
    ranked.sort(key=lambda x: x[0], reverse=True)
    return [e for _, e in ranked[:k]]


def _alignment_score(claim_text: str, evidence_text: str) -> float:
    c_tokens = _tokenize(claim_text)
    e_tokens = _tokenize(evidence_text)
    if not c_tokens:
        return 0.0
    overlap = len(c_tokens & e_tokens)
    ratio = overlap / max(1, len(c_tokens))
    num_bonus = 0.0
    nums = re.findall(r"\d+(?:\.\d+)?", claim_text or "")
    if nums and any(n in evidence_text for n in nums):
        num_bonus = 0.2
    return min(1.0, ratio + num_bonus) * 100


def _tokenize(text: str) -> set[str]:
    stop = {
        "the",
        "a",
        "an",
        "and",
        "or",
        "is",
        "are",
        "was",
        "were",
        "to",
        "of",
        "in",
        "on",
        "for",
        "that",
        "this",
        "it",
        "with",
        "as",
        "by",
        "from",
    }
    return {t for t in re.findall(r"[A-Za-z0-9_]+", (text or "").lower()) if len(t) > 2 and t not in stop}


def _evidence_quality_score(claim_text: str, evidence: list[dict]) -> float:
    if not evidence:
        return 0.0
    align = sum(_alignment_score(claim_text, e.get("text") or "") for e in evidence) / len(evidence)
    unique_domains = {urlparse((e.get("url") or "")).netloc for e in evidence if e.get("url")}
    diversity = min(1.0, len(unique_domains) / 2) * 100
    complete = sum(1 for e in evidence if e.get("source") and e.get("text")) / len(evidence) * 100
    dup_penalty = max(0.0, (len(evidence) - len({(e.get("source"), e.get("url")) for e in evidence})) * 8)
    score = align * 0.55 + diversity * 0.2 + complete * 0.25 - dup_penalty
    return max(0.0, min(100.0, score))


def _passes_evidence_contract(
    verdict: str,
    claim_text: str,
    evidence: list[dict],
    evidence_quality: float,
) -> bool:
    if verdict == "unverified":
        return True
    if not evidence:
        return False
    has_citation = any((e.get("source") and e.get("text")) for e in evidence)
    quality_threshold = 48.0 if verdict in {"supported", "contradicted"} else 38.0
    if not has_declarative_predicate(claim_text):
        quality_threshold = max(quality_threshold, 58.0)
    if len((claim_text or "").split()) <= 6:
        quality_threshold = max(quality_threshold, 55.0)
    return has_citation and evidence_quality >= quality_threshold


def _reason_codes(
    claim_text: str,
    evidence: list[dict],
    evidence_quality: float,
    claim_type: str | None = None,
) -> list[str]:
    reasons = list(claim_eligibility_reasons(claim_text, claim_type))
    if len((claim_text or "").split()) < 4 and "claim_too_vague" not in reasons:
        reasons.append("claim_too_vague")
    if not evidence:
        reasons.append("no_external_sources")
    elif evidence_quality < 40:
        reasons.append("low_alignment")
    if evidence and not any(e.get("url") for e in evidence):
        reasons.append("no_url_citations")
    return sorted(set(reasons))


def _retrieval_metrics(claim_text: str, evidence: list[dict], query: str) -> dict:
    domains = sorted({urlparse((e.get("url") or "")).netloc for e in evidence if e.get("url")})
    entity_tokens = [t for t in re.findall(r"[A-Z][A-Za-z0-9]+", claim_text or "") if len(t) > 2]
    exact_entity = bool(entity_tokens) and any(any(ent.lower() in (e.get("text") or "").lower() for ent in entity_tokens) for e in evidence)
    mean_rel = round(sum(float(e.get("relevance_score") or 0.0) for e in evidence) / len(evidence), 2) if evidence else 0.0
    return {
        "query": query,
        "retrieved_docs": len(evidence),
        "distinct_domains": len(domains),
        "domains": domains,
        "exact_entity_match": exact_entity,
        "mean_relevance_score": mean_rel,
    }


def _flatten_claim_evidence(claim_evidence_index: dict[str, list[dict]]) -> list[dict]:
    out = []
    for claim, items in (claim_evidence_index or {}).items():
        for e in items:
            out.append({**e, "for_claim": e.get("for_claim") or claim})
    return out


def _summarize_evidence(
    claims: list[dict],
    claim_evidence_index: dict[str, list[dict]],
    retrieval_diagnostics: dict[str, dict],
) -> dict:
    total = len(claims or [])
    with_evidence = 0
    web = 0
    rag = 0
    quality_sum = 0.0
    quality_n = 0
    for claim in claims or []:
        key = (claim.get("claim_text") or "").strip().lower()
        evidence = claim.get("evidence") or claim_evidence_index.get(key, [])
        if evidence:
            with_evidence += 1
        for e in evidence:
            source_type = (e or {}).get("source_type")
            if source_type == "web":
                web += 1
            elif source_type == "rag":
                rag += 1
        q = claim.get("evidence_quality_score")
        if q is not None:
            quality_sum += float(q)
            quality_n += 1
    return {
        "total_claims": total,
        "claims_with_evidence": with_evidence,
        "coverage_pct": round((with_evidence / total) * 100, 2) if total else 0.0,
        "web_evidence_count": web,
        "rag_evidence_count": rag,
        "avg_evidence_quality": round(quality_sum / quality_n, 2) if quality_n else 0.0,
        "retrieval_diagnostics": retrieval_diagnostics,
    }

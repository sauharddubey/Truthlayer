"""Helpers for deciding whether extracted text is a checkable factual claim."""

from __future__ import annotations

import re
from typing import List, Tuple

INTRO_PATTERNS = (
    r"(?i)^today we(?:'re| are)",
    r"(?i)^in this video",
    r"(?i)^welcome to",
    r"(?i)^let(?:'s| us)",
    r"(?i)^we(?:'re| are) (?:going to|gonna|ranking|reviewing|talking about)",
    r"(?i)^this video (?:is|covers|ranks|reviews)",
    r"(?i)^from .+ all the way (?:back )?to",
)

FINITE_VERBS = {
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "has",
    "have",
    "had",
    "having",
    "will",
    "would",
    "can",
    "could",
    "should",
    "shall",
    "may",
    "might",
    "must",
    "do",
    "does",
    "did",
    "makes",
    "make",
    "made",
    "contains",
    "include",
    "includes",
    "causes",
    "cause",
    "cures",
    "cure",
    "treats",
    "treat",
    "shows",
    "show",
    "proved",
    "proves",
    "prove",
    "found",
    "finds",
    "states",
    "state",
    "said",
    "says",
    "reported",
    "reports",
    "claims",
    "claim",
    "offers",
    "offer",
    "delivers",
    "deliver",
    "supports",
    "support",
    "reduces",
    "reduce",
    "increases",
    "increase",
    "improves",
    "improve",
    "outperforms",
    "outperform",
    "guarantees",
    "guarantee",
    "invest",
    "invests",
    "use",
    "uses",
    "used",
    "earn",
    "earns",
    "save",
    "saves",
}

PARTICIPLE_ONLY = {
    "made",
    "ranked",
    "reviewed",
    "listed",
    "mentioned",
    "discussed",
    "talking",
    "going",
}

RELAXED_SEGMENT_CONTENT_TYPES = frozenset(
    {"review", "entertainment", "tutorial", "informational"}
)


def _normalize_text(text: str) -> str:
    return " ".join((text or "").split()).strip()


def has_declarative_predicate(text: str) -> bool:
    """Return True when the text looks like a proposition, not a noun phrase."""
    normalized = _normalize_text(text)
    if not normalized:
        return False
    if normalized.endswith("?"):
        return False

    words = re.findall(r"[A-Za-z']+", normalized.lower())
    if not words:
        return False

    for word in words:
        if word in FINITE_VERBS and word not in PARTICIPLE_ONLY:
            return True

    # Allow clear passive constructions such as "X was released in 2024".
    if re.search(
        r"\b(is|are|was|were|has|have|had|will|would|can|could|should|must|does|did)\b",
        normalized,
        flags=re.I,
    ):
        return True

    return False


def claim_eligibility_reasons(text: str, claim_type: str | None = None) -> List[str]:
    """Return reason codes when text should not be fact-checked."""
    normalized = _normalize_text(text)
    reasons: List[str] = []
    if not normalized:
        return ["claim_empty"]

    ctype = (claim_type or "").lower()
    if ctype == "opinion":
        reasons.append("non_factual_opinion")

    if normalized.endswith("?"):
        reasons.append("claim_fragment")

    word_count = len(normalized.split())
    if word_count < 3:
        reasons.append("claim_too_vague")
    elif word_count < 4 and not has_declarative_predicate(normalized):
        reasons.append("claim_too_vague")

    for pattern in INTRO_PATTERNS:
        if re.search(pattern, normalized):
            reasons.append("claim_fragment")
            break

    if not has_declarative_predicate(normalized):
        reasons.append("not_declarative")
        if word_count <= 6:
            reasons.append("claim_fragment")

    return sorted(set(reasons))


def is_checkable_claim(text: str, claim_type: str | None = None) -> bool:
    return not claim_eligibility_reasons(text, claim_type)


def claim_in_verifiable_segment(
    timestamp_start: float | None,
    content_segments: List[dict] | None,
    content_type: str | None = None,
) -> bool:
    """Only fact-check claims that fall inside verify/risky transcript segments."""
    if (content_type or "").lower() in RELAXED_SEGMENT_CONTENT_TYPES:
        return True
    if timestamp_start is None:
        return True
    segments = content_segments or []
    if not segments:
        return True

    ts = float(timestamp_start)
    matched = False
    for seg in segments:
        start = seg.get("start")
        end = seg.get("end")
        if start is None and end is None:
            continue
        start_f = float(start or 0.0)
        end_f = float(end if end is not None else start_f)
        if start_f <= ts <= end_f:
            matched = True
            label = (seg.get("label") or "safe").lower()
            return label in {"verify", "risky"}

    return True if not matched else False


def filter_checkable_claims(
    claims: List[dict],
    content_segments: List[dict] | None = None,
    content_type: str | None = None,
) -> Tuple[List[dict], List[dict]]:
    """Split claims into checkable vs skipped with diagnostic metadata."""
    kept: List[dict] = []
    skipped: List[dict] = []
    for claim in claims or []:
        text = _normalize_text(claim.get("claim_text") or "")
        ctype = claim.get("claim_type")
        reasons = claim_eligibility_reasons(text, ctype)
        if not claim_in_verifiable_segment(
            claim.get("timestamp_start"),
            content_segments,
            content_type=content_type,
        ):
            reasons = sorted(set(reasons + ["segment_not_verifiable"]))
        if reasons:
            skipped.append(
                {
                    **claim,
                    "claim_text": text,
                    "skipped": True,
                    "skip_reasons": reasons,
                }
            )
            continue
        kept.append({**claim, "claim_text": text})
    return kept, skipped

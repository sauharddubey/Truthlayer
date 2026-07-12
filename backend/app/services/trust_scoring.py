"""Trust score helpers for business/creator tiers."""

from __future__ import annotations

from typing import Optional


def _as_float(v):
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def compute_tier_trust_score(
    fact: dict,
    bias_r: dict,
    mi: dict,
    *,
    tier: str = "business",
) -> Optional[float]:
    """Return nullable trust for non-verifier tiers based on claim verdicts."""
    claims = fact.get("claims", []) or []
    if not claims:
        return None

    verdict_weights = {"supported": 1.0, "unverified": 0.5, "misleading": 0.15, "contradicted": 0.0}
    verification_weights = {
        "auto_verified": 1.0,
        "approved": 1.0,
        "needs_review": 0.55,
        "contradicted": 0.0,
        "rejected": 0.0,
    }

    total = 0.0
    for c in claims:
        vs = c.get("verification_status")
        if tier == "business" and vs in verification_weights:
            total += verification_weights[vs]
        elif vs == "not_applicable":
            total += verdict_weights.get(c.get("verdict", "unverified"), 0.5)
        else:
            total += verdict_weights.get(c.get("verdict", "unverified"), 0.5)
    base = total / len(claims)
    bias_penalty = (_as_float(bias_r.get("bias_score")) or 0.0) / 100 * 0.3
    authenticity = _as_float((mi.get("deepfake") or {}).get("authenticity_score")) or 1.0
    score = (base - bias_penalty) * authenticity
    return round(max(0.0, min(1.0, score)) * 100, 1)


def summarize_skipped_claims(skipped_claims: list[dict]) -> dict:
    """Aggregate skipped-claim diagnostics for report metadata."""
    skipped = skipped_claims or []
    reason_counts: dict[str, int] = {}
    for item in skipped:
        for reason in item.get("skip_reasons") or []:
            reason_counts[reason] = reason_counts.get(reason, 0) + 1
    return {
        "skipped_claim_count": len(skipped),
        "skipped_claim_reason_counts": reason_counts,
    }

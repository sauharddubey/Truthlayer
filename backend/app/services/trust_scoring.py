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
    comp: Optional[dict] = None,
    perc: Optional[dict] = None,
    risk: Optional[dict] = None,
    *,
    tier: str = "business",
) -> tuple[Optional[float], dict]:
    """Return composite trust score + breakdown dict for business/creator tiers."""
    claims = fact.get("claims", []) or []
    if not claims:
        return None, {
            "mode": tier,
            "insufficient_claims": True,
            "final_score": None,
        }

    comp = comp or {}
    perc = perc or {}
    risk = risk or {}

    verdict_weights = {"supported": 1.0, "unverified": 0.5, "misleading": 0.15, "contradicted": 0.0}
    verification_weights = {
        "auto_verified": 1.0,
        "approved": 1.0,
        "needs_review": 0.55,
        "contradicted": 0.0,
        "rejected": 0.0,
    }

    # 1. Product Knowledge Base Compliance Sub-score (35% for Business)
    kb_total = 0.0
    for c in claims:
        vs = c.get("verification_status")
        if vs in verification_weights:
            kb_total += verification_weights[vs]
        else:
            kb_total += verdict_weights.get(c.get("verdict", "unverified"), 0.5)

    s_kb = kb_total / len(claims) if claims else 0.85

    # 2. Factual Accuracy Sub-score (25% for Business / 40% for Creator)
    fact_total = sum(verdict_weights.get(c.get("verdict", "unverified"), 0.5) for c in claims)
    s_fact = fact_total / len(claims) if claims else 0.85

    # 3. Regulatory & Marketing Policy Compliance Sub-score (25% for Business)
    comp_score_val = _as_float(comp.get("compliance_score"))
    s_comp = (comp_score_val / 100.0) if comp_score_val is not None else 0.85

    # 4. Brand Safety & Bias Sub-score (15% for Business / 30% for Creator)
    bias_score = _as_float(bias_r.get("bias_score")) or 0.0
    harm_score = _as_float((perc.get("harm_evaluation") or {}).get("harm_index")) or 0.0
    s_brand = max(0.0, min(1.0, 1.0 - (bias_score / 100.0 * 0.25) - (harm_score / 100.0 * 0.25)))

    # 5. Media Integrity & Authenticity Multiplier
    authenticity = _as_float((mi.get("deepfake") or {}).get("authenticity_score"))
    if authenticity is None:
        authenticity = 1.0

    if tier == "business":
        composite = (0.35 * s_kb + 0.25 * s_fact + 0.25 * s_comp + 0.15 * s_brand) * authenticity
    elif tier == "creator":
        risk_score_val = _as_float(risk.get("risk_score")) or 0.0
        s_risk = max(0.0, min(1.0, 1.0 - (risk_score_val / 100.0)))
        composite = (0.40 * s_fact + 0.30 * s_brand + 0.30 * s_risk) * authenticity
    else:
        composite = s_fact * authenticity

    final = round(max(0.0, min(1.0, composite)) * 100, 1)

    breakdown = {
        "mode": tier,
        "insufficient_claims": False,
        "final_score": final,
        "sub_scores": {
            "kb_compliance": round(s_kb * 100, 1),
            "factual_accuracy": round(s_fact * 100, 1),
            "regulatory_compliance": round(s_comp * 100, 1),
            "brand_safety": round(s_brand * 100, 1),
            "authenticity_multiplier": round(authenticity, 3),
        },
    }

    return final, breakdown


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

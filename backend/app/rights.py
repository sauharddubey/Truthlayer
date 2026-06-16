"""Three user categories — capabilities & analysis depth.

* business — Products workspace: per-product videos, compliance KB, hashtag
             monitoring, narrative intelligence, brand overview. Claims are
             verified against the product's details + marketing policies.
* creator  — Self-check of own uploads: perception, sentiment, bias, factual
             accuracy — "how will this land, could it hurt anyone, is it wrong".
* verifier — AI fact-checking: evaluate every claim, return the core verdict.
"""

from __future__ import annotations

from app.models import UserRole

BUSINESS = "business"
CREATOR = "creator"
VERIFIER = "verifier"

_ROLE_TIER = {
    UserRole.BUSINESS: BUSINESS,
    UserRole.CREATOR: CREATOR,
    UserRole.VERIFIER: VERIFIER,
}

_RIGHTS = {
    BUSINESS: {
        "label": "Business",
        "formats": ["url", "upload"],
        "has_products": True,
        "capabilities": [
            "transcript", "claim_verification", "compliance", "perception",
            "bias", "sentiment", "media_integrity", "narrative", "brand_overview",
        ],
    },
    CREATOR: {
        "label": "Creator",
        "formats": ["upload", "url"],
        "has_products": False,
        "capabilities": ["transcript", "perception", "sentiment", "bias", "fact_check"],
    },
    VERIFIER: {
        "label": "Verifier",
        "formats": ["url", "upload"],
        "has_products": False,
        "capabilities": ["transcript", "fact_check"],
    },
}

# Parallel agents per category (content classifier always runs first).
_AGENTS = {
    BUSINESS: ["fact_check", "perception", "bias", "sentiment", "compliance", "media_integrity"],
    CREATOR: ["perception", "sentiment", "bias", "fact_check", "creator_risk"],
    VERIFIER: ["fact_check"],
}


def tier_for_role(role: UserRole) -> str:
    return _ROLE_TIER.get(role, VERIFIER)


def rights_for_role(role: UserRole) -> dict:
    tier = tier_for_role(role)
    return {"tier": tier, **_RIGHTS[tier]}


def agents_for_tier(tier: str) -> list[str]:
    return list(_AGENTS.get(tier, _AGENTS[VERIFIER]))

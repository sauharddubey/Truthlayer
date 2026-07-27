"""Business trust scoring with product-doc verification statuses."""

from app.services.trust_scoring import compute_tier_trust_score


def test_business_trust_uses_verification_status_when_present():
    fact = {
        "claims": [
            {"verdict": "unverified", "verification_status": "auto_verified"},
            {"verdict": "supported", "verification_status": "contradicted"},
            {"verdict": "supported", "verification_status": "needs_review"},
        ]
    }
    score, breakdown = compute_tier_trust_score(fact, {}, {}, tier="business")
    assert score is not None
    assert breakdown["sub_scores"]["kb_compliance"] == 51.7


def test_creator_trust_ignores_verification_status():
    fact = {
        "claims": [
            {"verdict": "supported", "verification_status": "contradicted"},
            {"verdict": "unverified", "verification_status": "auto_verified"},
        ]
    }
    score, breakdown = compute_tier_trust_score(fact, {}, {}, tier="creator")
    assert score is not None
    assert breakdown["sub_scores"]["factual_accuracy"] == 75.0

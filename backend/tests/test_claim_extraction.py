"""Tests for claim eligibility filtering and structuring sanitization."""

from app.agents.fact_check import _passes_evidence_contract, _reason_codes
from app.services.trust_scoring import compute_tier_trust_score, summarize_skipped_claims
from app.services.claim_eligibility import (
    claim_in_verifiable_segment,
    filter_checkable_claims,
    is_checkable_claim,
)
from app.services.structuring import _heuristic_blocks, _sanitize_blocks


def test_noun_phrase_is_not_checkable():
    assert not is_checkable_claim("every Google phone ever made")
    reasons = _reason_codes("every Google phone ever made", [], 0.0, "factual")
    assert "not_declarative" in reasons
    assert "claim_fragment" in reasons


def test_complete_factual_statement_is_checkable():
    assert is_checkable_claim("The Pixel 10 has the best camera in its class.")


def test_opinion_claim_is_skipped():
    assert not is_checkable_claim("This is the best phone ever", "opinion")


def test_intro_fragment_is_skipped():
    assert not is_checkable_claim("Today we're ranking every Google phone ever made")


def test_filter_checkable_claims_splits_noise():
    claims = [
        {"claim_text": "every Google phone ever made", "claim_type": "factual", "timestamp_start": 4.0},
        {
            "claim_text": "The Pixel 10 includes a 50 megapixel camera.",
            "claim_type": "factual",
            "timestamp_start": 12.0,
        },
    ]
    segments = [
        {"start": 0.0, "end": 8.0, "label": "safe"},
        {"start": 8.0, "end": 20.0, "label": "verify"},
    ]
    kept, skipped = filter_checkable_claims(claims, segments)
    assert len(kept) == 1
    assert kept[0]["claim_text"].startswith("The Pixel 10")
    assert len(skipped) == 1
    assert "not_declarative" in skipped[0]["skip_reasons"]
    assert "segment_not_verifiable" in skipped[0]["skip_reasons"]


def test_segment_gate_allows_verify_and_risky():
    segments = [{"start": 0.0, "end": 10.0, "label": "verify"}]
    assert claim_in_verifiable_segment(4.0, segments)
    segments[0]["label"] = "risky"
    assert claim_in_verifiable_segment(4.0, segments)
    segments[0]["label"] = "safe"
    assert not claim_in_verifiable_segment(4.0, segments)


def test_segment_gate_falls_back_without_timestamps():
    segments = [{"start": 0.0, "end": 10.0, "label": "safe"}]
    assert claim_in_verifiable_segment(None, segments)


def test_sanitize_blocks_drops_fragments():
    blocks = [
        {
            "timestamp_start": 0.0,
            "timestamp_end": 5.0,
            "topic": "phones",
            "text": "every Google phone ever made",
            "claims": [
                {"claim_text": "every Google phone ever made", "claim_type": "factual"},
                {
                    "claim_text": "The Pixel 10 was released in 2025.",
                    "claim_type": "factual",
                },
            ],
        }
    ]
    cleaned = _sanitize_blocks(blocks)
    assert len(cleaned[0]["claims"]) == 1
    assert cleaned[0]["claims"][0]["claim_text"].startswith("The Pixel 10")


def test_heuristic_blocks_keep_declarative_claims():
    text = "This cures cancer. Invest now for guaranteed returns. Use code SAVE50."
    blocks = _heuristic_blocks(text, [{"start": 0, "end": 5}])
    types = {c["claim_type"] for c in blocks[0]["claims"]}
    assert "medical" in types
    assert "financial" in types
    assert "promotional" in types


def test_evidence_contract_is_stricter_for_non_declarative_text():
    evidence = [{"source": "Example", "text": "A long enough evidence snippet about Google phones and rankings."}]
    assert not _passes_evidence_contract("supported", "every Google phone ever made", evidence, 50.0)
    assert _passes_evidence_contract(
        "supported",
        "The Pixel 10 includes a 50 megapixel camera.",
        evidence,
        50.0,
    )


def test_relaxed_content_allows_declarative_claims_in_safe_segments():
    claims = [
        {
            "claim_text": "The T-Mobile G1 was the first Android phone.",
            "claim_type": "factual",
            "timestamp_start": 4.0,
        }
    ]
    segments = [{"start": 0.0, "end": 10.0, "label": "safe"}]
    kept, skipped = filter_checkable_claims(claims, segments, content_type="entertainment")
    assert len(kept) == 1
    assert kept[0]["claim_text"].startswith("The T-Mobile G1")


def test_trust_score_is_none_without_claims():
    assert compute_tier_trust_score({"claims": []}, {"bias_score": 10}, {}) is None


def test_trust_score_computed_with_claims():
    fact = {"claims": [{"verdict": "supported"}]}
    score = compute_tier_trust_score(fact, {"bias_score": 0}, {})
    assert score is not None
    assert score > 0


def test_diagnostics_include_skipped_claim_counts():
    summary = summarize_skipped_claims(
        [
            {"claim_text": "every Google phone ever made", "skip_reasons": ["not_declarative"]},
            {"claim_text": "Today we're ranking phones", "skip_reasons": ["claim_fragment", "not_declarative"]},
        ]
    )
    assert summary["skipped_claim_count"] == 2
    assert summary["skipped_claim_reason_counts"]["not_declarative"] == 2
    assert summary["skipped_claim_reason_counts"]["claim_fragment"] == 1

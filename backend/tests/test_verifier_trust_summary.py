"""Tests for verifier-tier trust score summary fallbacks."""

from types import SimpleNamespace
from unittest.mock import patch

from app.agents.orchestrator import _generate_summary_and_reasonings, _verifier_trust_score


def test_verifier_trust_score_returns_none_without_claims():
    trust, breakdown = _verifier_trust_score({"claims": []})
    assert trust is None
    assert breakdown["insufficient_claims"] is True


@patch("app.agents.orchestrator.chat_json", return_value={})
def test_fallback_summary_handles_null_verifier_trust(mock_chat_json):
    video = SimpleNamespace()
    results = {
        "content": {"is_about_product": False, "content_type": "news", "products": []},
        "fact_check": {"claims": []},
    }

    data = _generate_summary_and_reasonings(
        video=video,
        results=results,
        trust=None,
        risk=None,
        compliance=None,
        bias=None,
        sentiment=None,
        authenticity=None,
        tier="verifier",
    )

    assert "None" not in data["summary"]
    assert "None" not in data["trust"]
    assert "unavailable" in data["summary"].lower() or "no checkable" in data["summary"].lower()
    assert data["trust"] == (
        "Trust score unavailable: no checkable factual claims were extracted from the transcript."
    )
    assert data["risk"] == ""
    mock_chat_json.assert_called_once()

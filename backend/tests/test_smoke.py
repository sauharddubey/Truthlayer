"""Smoke tests that don't require a live database or external keys.

Run with: cd backend && python -m pytest -q
"""

from app.services.structuring import _heuristic_blocks
from app.agents.media_integrity import _stub
from app.agents.base import AgentContext
from app.llm import _extract_json


def test_heuristic_structuring_classifies_claims():
    text = "This cures cancer. Invest now for guaranteed returns. Use code SAVE50."
    blocks = _heuristic_blocks(text, [{"start": 0, "end": 5}])
    types = {c["claim_type"] for c in blocks[0]["claims"]}
    assert "medical" in types
    assert "financial" in types
    assert "promotional" in types


def test_media_integrity_stub_is_deterministic():
    ctx = AgentContext(video_id="abc-123", transcript_text="")
    a = _stub(ctx)
    b = _stub(ctx)
    assert a == b
    assert 0.0 <= a["deepfake"]["probability_score"] <= 1.0
    assert a["method"] == "stub"


def test_extract_json_handles_fences_and_noise():
    assert _extract_json('```json\n{"a": 1}\n```') == {"a": 1}
    assert _extract_json('noise {"b": 2} trailing') == {"b": 2}
    assert _extract_json("not json") == {}

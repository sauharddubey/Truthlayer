"""Tests for hashtag presence checking."""

from types import SimpleNamespace
from unittest.mock import MagicMock

from app.services.hashtag_check import (
    applicable_keywords,
    check_video_hashtags,
    compliance_issues_for_missing,
    get_description_text,
    keyword_in_text,
    normalize_keyword,
    summarize_video_hashtag_status,
)


def test_normalize_keyword_strips_hash_and_lowercases():
    assert normalize_keyword("  #iPhone17Pro  ") == "iphone17pro"
    assert normalize_keyword("brand") == "brand"


def test_keyword_in_text_case_insensitive_with_optional_hash():
    text = "Check out our new phone #iPhone17Pro today!"
    assert keyword_in_text("#iphone17pro", text)
    assert keyword_in_text("iphone17pro", text)
    assert not keyword_in_text("#iphone17", text)


def test_keyword_in_text_uses_word_boundaries():
    text = "This is not about #iphone17promax"
    assert not keyword_in_text("#iphone17pro", text)


def test_get_description_text_prefers_captions():
    video = SimpleNamespace(
        captions="Caption text",
        extra_metadata={"description": "Meta text"},
    )
    text, source = get_description_text(video)
    assert text == "Caption text"
    assert source == "description"


def test_get_description_text_falls_back_to_metadata():
    video = SimpleNamespace(captions="", extra_metadata={"description": "Meta text"})
    text, source = get_description_text(video)
    assert text == "Meta text"
    assert source == "description"


def test_get_description_text_returns_none_when_missing():
    video = SimpleNamespace(captions=None, extra_metadata={})
    text, source = get_description_text(video)
    assert text is None
    assert source == "none"


def test_applicable_keywords_scoped_to_product_and_brand():
    brand_kw = SimpleNamespace(
        id="b1",
        keyword="#brand",
        keyword_type="brand",
        organization_id="org1",
        product_id=None,
        active=True,
        created_at=1,
    )
    product_kw = SimpleNamespace(
        id="p1",
        keyword="#product",
        keyword_type="product_hashtag",
        organization_id="org1",
        product_id="prod1",
        active=True,
        created_at=2,
    )
    other_product_kw = SimpleNamespace(
        id="p2",
        keyword="#other",
        keyword_type="product_hashtag",
        organization_id="org1",
        product_id="prod2",
        active=True,
        created_at=3,
    )

    db = MagicMock()
    db.execute.return_value.scalars.return_value.all.return_value = [brand_kw, product_kw]

    video = SimpleNamespace(organization_id="org1", product_id="prod1")
    keywords = applicable_keywords(db, video)
    assert [k.id for k in keywords] == ["b1", "p1"]

    db.execute.return_value.scalars.return_value.all.return_value = [brand_kw]
    video_no_product = SimpleNamespace(organization_id="org1", product_id=None)
    keywords = applicable_keywords(db, video_no_product)
    assert [k.id for k in keywords] == ["b1"]


def test_check_video_hashtags_marks_missing_tags():
    kw_present = SimpleNamespace(
        id="1",
        keyword="#brand",
        keyword_type="brand",
        organization_id="org1",
        product_id=None,
        active=True,
        created_at=1,
    )
    kw_missing = SimpleNamespace(
        id="2",
        keyword="#product",
        keyword_type="product_hashtag",
        organization_id="org1",
        product_id="prod1",
        active=True,
        created_at=2,
    )

    db = MagicMock()
    db.execute.return_value.scalars.return_value.all.return_value = [kw_present, kw_missing]
    video = SimpleNamespace(
        organization_id="org1",
        product_id="prod1",
        captions="Launch video #brand",
        extra_metadata={},
    )

    result = check_video_hashtags(db, video)
    assert result["description_available"] is True
    assert len(result["present"]) == 1
    assert len(result["missing"]) == 1
    assert result["missing"][0]["keyword"] == "#product"


def test_check_video_hashtags_skips_without_description():
    db = MagicMock()
    db.execute.return_value.scalars.return_value.all.return_value = []
    video = SimpleNamespace(
        organization_id="org1",
        product_id=None,
        captions=None,
        extra_metadata={},
    )

    result = check_video_hashtags(db, video)
    assert result["description_available"] is False
    assert result["matches"] == []


def test_compliance_issues_for_missing_builds_disclosure_issues():
    issues = compliance_issues_for_missing(
        [{"keyword": "#brand"}],
        "Video description without tag",
    )
    assert len(issues) == 1
    assert issues[0]["issue_type"] == "missing_disclosure"
    assert "#brand" in issues[0]["description"]


def test_summarize_video_hashtag_status_from_agent_results():
    status = summarize_video_hashtag_status(
        {
            "description_available": True,
            "present": [{"keyword": "#brand"}],
            "missing": [{"keyword": "#product"}],
        }
    )
    assert status["present_keywords"] == ["#brand"]
    assert status["missing_keywords"] == ["#product"]
    assert status["description_available"] is True

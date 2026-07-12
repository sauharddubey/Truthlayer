"""Offline tests for RAG parsing, chunking, and validation."""

import pytest

from app.rag.store import (
    ALLOWED_DOCUMENT_TYPES,
    ALLOWED_EXTENSIONS,
    chunk_text,
    ingest_document,
    parse_document,
)


def test_chunk_text_splits_with_overlap():
    text = "word " * 300
    chunks = chunk_text(text, size=100, overlap=20)
    assert len(chunks) > 1
    assert all(len(c) <= 100 for c in chunks)


def test_parse_txt_document():
    raw = b"Approved claim: 24h hydration.\nNo parabens."
    assert "24h hydration" in parse_document("specs.txt", raw)


def test_ingest_document_rejects_unknown_type():
    class _Session:
        def add(self, *_args, **_kwargs):
            pass

        def flush(self):
            pass

        def commit(self):
            pass

        def refresh(self, _obj):
            pass

    with pytest.raises(ValueError, match="document_type"):
        ingest_document(
            _Session(),
            organization_id="org-1",
            filename="policy.txt",
            document_type="unknown",
            raw=b"hello",
            product_id="prod-1",
        )


def test_ingest_document_rejects_unsupported_extension():
    class _Session:
        def add(self, *_args, **_kwargs):
            pass

        def flush(self):
            pass

        def commit(self):
            pass

        def refresh(self, _obj):
            pass

    with pytest.raises(ValueError, match="Unsupported file type"):
        ingest_document(
            _Session(),
            organization_id="org-1",
            filename="policy.exe",
            document_type="product_details",
            raw=b"hello",
            product_id="prod-1",
        )


def test_allowed_document_types_include_business_buckets():
    assert "product_details" in ALLOWED_DOCUMENT_TYPES
    assert "marketing_policy" in ALLOWED_DOCUMENT_TYPES
    assert ".pdf" in ALLOWED_EXTENSIONS

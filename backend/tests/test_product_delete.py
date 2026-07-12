"""Tests for product delete helpers."""

from app.services.product_cleanup import cleanup_product_image


def test_cleanup_product_image_removes_existing_file(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.product_cleanup.settings.MEDIA_STORAGE_DIR", str(tmp_path))
    image = tmp_path / "product_abc123.jpg"
    image.write_bytes(b"img")

    removed = cleanup_product_image("/media/product_abc123.jpg")

    assert removed == [str(image)]
    assert not image.exists()


def test_cleanup_product_image_ignores_missing_file(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.product_cleanup.settings.MEDIA_STORAGE_DIR", str(tmp_path))

    assert cleanup_product_image("/media/missing.jpg") == []
    assert not (tmp_path / "missing.jpg").exists()


def test_cleanup_product_image_ignores_null_and_external_urls(tmp_path, monkeypatch):
    monkeypatch.setattr("app.services.product_cleanup.settings.MEDIA_STORAGE_DIR", str(tmp_path))

    assert cleanup_product_image(None) == []
    assert cleanup_product_image("") == []
    assert cleanup_product_image("https://cdn.example.com/logo.png") == []

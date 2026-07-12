"""Best-effort cleanup helpers for deleted products."""

from __future__ import annotations

import os

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    BusinessDocument,
    DocumentChunk,
    MonitoredKeyword,
    NarrativeCluster,
    Product,
    Video,
)
from app.services.video_cleanup import cleanup_video_media


def _product_image_path(image_url: str | None) -> str | None:
    """Resolve a stored ``/media/...`` URL to a local filesystem path."""
    if not image_url or not isinstance(image_url, str):
        return None
    url = image_url.strip()
    if not url:
        return None
    if url.startswith("/media/"):
        fname = url[len("/media/") :]
    elif url.startswith("media/"):
        fname = url[len("media/") :]
    else:
        return None
    if not fname or ".." in fname.replace("\\", "/").split("/"):
        return None
    return os.path.join(settings.MEDIA_STORAGE_DIR, fname)


def cleanup_product_image(image_url: str | None) -> list[str]:
    """Delete the product catalog image if it exists on disk."""
    path = _product_image_path(image_url)
    if not path:
        return []
    try:
        if os.path.isfile(path):
            os.remove(path)
            return [path]
    except OSError:
        pass
    return []


def delete_product_and_related(db: Session, product: Product) -> None:
    """Hard-delete a product and all related rows, with media cleanup."""
    pid = product.id

    videos = db.execute(select(Video).where(Video.product_id == pid)).scalars().all()
    for video in videos:
        cleanup_video_media(video.extra_metadata)
        db.delete(video)

    db.execute(delete(DocumentChunk).where(DocumentChunk.product_id == pid))
    db.execute(delete(BusinessDocument).where(BusinessDocument.product_id == pid))
    db.execute(delete(MonitoredKeyword).where(MonitoredKeyword.product_id == pid))
    db.execute(delete(NarrativeCluster).where(NarrativeCluster.product_id == pid))

    cleanup_product_image(product.image_url)
    db.delete(product)

"""Cross-Transcript Narrative Intelligence (FR-NARR-001..005).

Operates across multiple videos in an organization: clusters by topic/narrative
similarity using embeddings, summarizes each cluster, and estimates narrative
propagation risk. Exposed as a standalone service (not a per-video agent) because
it needs the corpus, not one transcript.
"""

from __future__ import annotations

from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.base import clamp_score, wrap_untrusted
from app.llm import chat_json, embed_texts
from app.models import NarrativeCluster, Transcript, Video


def _cosine(a: List[float], b: List[float]) -> float:
    import math

    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1e-9
    nb = math.sqrt(sum(y * y for y in b)) or 1e-9
    return dot / (na * nb)


def cluster_narratives(
    db: Session, organization_id: str, *, threshold: float = 0.6, product_id: str = None
) -> List[NarrativeCluster]:
    """Cluster analyzed videos into narrative groups and persist them.

    Scoped to a product when ``product_id`` is given, else the whole org."""
    stmt = (
        select(Video.id, Transcript.text)
        .join(Transcript, Transcript.video_id == Video.id)
        .where(Video.organization_id == organization_id)
    )
    if product_id:
        stmt = stmt.where(Video.product_id == product_id)
    rows = db.execute(stmt).all()
    if not rows:
        return []

    video_ids = [r[0] for r in rows]
    texts = [(r[1] or "")[:2000] for r in rows]
    vectors = embed_texts(texts)

    # Greedy agglomerative clustering by cosine similarity.
    clusters: List[dict] = []
    for vid, vec, text in zip(video_ids, vectors, texts):
        placed = False
        for c in clusters:
            if _cosine(vec, c["centroid"]) >= threshold:
                c["video_ids"].append(vid)
                c["texts"].append(text)
                n = len(c["video_ids"])
                c["centroid"] = [
                    (c["centroid"][i] * (n - 1) + vec[i]) / n for i in range(len(vec))
                ]
                placed = True
                break
        if not placed:
            clusters.append({"centroid": vec, "video_ids": [vid], "texts": [text]})

    # Clear previous clusters for this scope, then summarize + persist.
    clear_stmt = select(NarrativeCluster).where(NarrativeCluster.organization_id == organization_id)
    if product_id:
        clear_stmt = clear_stmt.where(NarrativeCluster.product_id == product_id)
    for old in db.execute(clear_stmt).scalars():
        db.delete(old)

    persisted: List[NarrativeCluster] = []
    for c in clusters:
        summary = chat_json(
            system=(
                "Summarize the shared narrative across these video transcripts. Return "
                "a short topic label, a 1-2 sentence summary, a risk_score (0-100) for "
                "misinformation/reputational harm, and propagation_risk (0-100)."
            ),
            user=wrap_untrusted("video transcripts", "\n---\n".join(c["texts"][:6])[:4000]),
            schema_hint='{"topic": "string", "summary": "string", "risk_score": 0, "propagation_risk": 0}',
        )
        cluster = NarrativeCluster(
            organization_id=organization_id,
            product_id=product_id,
            topic=summary.get("topic", "Unlabeled narrative"),
            summary=summary.get("summary", ""),
            risk_score=clamp_score(summary.get("risk_score", 0), 0, 100, default=0.0),
            propagation_risk=clamp_score(summary.get("propagation_risk", 0), 0, 100, default=0.0),
            video_ids=c["video_ids"],
        )
        db.add(cluster)
        persisted.append(cluster)

    db.commit()
    for c in persisted:
        db.refresh(c)
    return persisted

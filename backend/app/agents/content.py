"""Content classification + per-segment risk labelling.

Runs first in the pipeline. It decides what the video is about (product vs.
informational/opinion/news/etc.), extracts any product/brand mentions, and labels
every transcript segment as:

* ``safe``   — benign, no action needed
* ``verify`` — a factual claim that needs verification
* ``risky``  — likely false, misleading, or harmful to others' sentiment

The labelled segments drive the highlighted-transcript view, and ``content_type``
routes the rest of the pipeline (product → compliance/product analysis;
non-product → fact-check + perception).
"""

from __future__ import annotations

from app.agents.base import AgentContext
from app.llm import chat_json

NAME = "content"

_SCHEMA = """{
  "content_type": "product|informational|opinion|news|entertainment|tutorial|other",
  "is_about_product": false,
  "products": ["string"],
  "brands": ["string"],
  "topics": ["string"],
  "one_line": "string",
  "segments": [
    {"index": 0, "label": "safe|verify|risky", "category": "factual|product_claim|opinion|sentiment_harm|medical|financial|other", "reason": "string"}
  ],
  "confidence": 0.0
}"""


def run(ctx: AgentContext) -> dict:
    # Build an indexed view of the segments for the model to label.
    seg_list = ctx.segments or [{"start": 0, "end": 0, "text": ctx.transcript_text}]
    indexed = "\n".join(
        f"[{i}] ({s.get('start', 0):.0f}-{s.get('end', 0):.0f}s) {s.get('text', '')}"
        for i, s in enumerate(seg_list[:70])
    )

    result = chat_json(
        system=(
            "You are a content-analysis engine for a media-trust platform. "
            "First classify what the video is about. Set is_about_product=true ONLY "
            "if it promotes/reviews/sells a specific product or service, and list the "
            "product names. Then label EVERY numbered segment:\n"
            "- 'safe': benign, no concern\n"
            "- 'verify': contains a factual/statistical/medical/financial claim that "
            "should be checked\n"
            "- 'risky': likely false or misleading, OR content that could offend or "
            "hurt the sentiments of a group of people (insensitive, inflammatory, "
            "discriminatory, defamatory).\n"
            "Give a short reason for every non-safe segment. Return one entry per "
            "segment index."
        ),
        user=f"Segments:\n{indexed}",
        schema_hint=_SCHEMA,
    )

    if not result:
        result = {
            "content_type": "other",
            "is_about_product": False,
            "products": [],
            "brands": [],
            "topics": [],
            "one_line": "",
            "segments": [],
            "confidence": 0.2,
        }

    # Merge model labels back onto the real segments (keep timestamps/text).
    labels = {s.get("index"): s for s in (result.get("segments") or []) if "index" in s}
    merged = []
    for i, s in enumerate(seg_list):
        lab = labels.get(i, {})
        merged.append(
            {
                "index": i,
                "start": s.get("start"),
                "end": s.get("end"),
                "text": s.get("text", ""),
                "label": lab.get("label", "safe"),
                "category": lab.get("category", "other"),
                "reason": lab.get("reason", ""),
            }
        )

    result["segments"] = merged
    result.setdefault("products", [])
    result.setdefault("confidence", 0.6)
    result["evidence"] = []
    return result

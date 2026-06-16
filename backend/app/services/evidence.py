"""External evidence retrieval for fact-checking (FR-FACT-002).

Uses Tavily (free tier) for web/fact-check search when a key is configured.
Returns a normalized list of {title, url, content} citations. No-ops gracefully
to an empty list when unconfigured so the fact-check agent still runs.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import List, Optional

from app.config import settings

logger = logging.getLogger("truthlayer.evidence")


@lru_cache
def _client():
    if not settings.TAVILY_API_KEY:
        return None
    try:
        from tavily import TavilyClient

        return TavilyClient(api_key=settings.TAVILY_API_KEY)
    except Exception as exc:  # pragma: no cover
        logger.warning("Tavily init failed: %s", exc)
        return None


def search_evidence(query: str, max_results: int = 4) -> List[dict]:
    client = _client()
    if client is None:
        return []
    try:
        resp = client.search(query=query, max_results=max_results, search_depth="basic")
        return [
            {
                "title": r.get("title"),
                "url": r.get("url"),
                "content": (r.get("content") or "")[:600],
            }
            for r in resp.get("results", [])
        ]
    except Exception as exc:  # pragma: no cover
        logger.exception("Tavily search failed: %s", exc)
        return []

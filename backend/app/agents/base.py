"""Shared context and contract for AI agents (FR-AGENT-001..003).

Each agent is a small, modular plug-in: it takes an ``AgentContext`` and returns a
JSON-serializable dict that always carries ``evidence`` and ``confidence`` so the
orchestrator can fuse outputs and the platform stays explainable (NFR-EXP-001..003).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional


@dataclass
class AgentContext:
    video_id: str
    transcript_text: str
    segments: List[dict] = field(default_factory=list)
    structured_blocks: List[dict] = field(default_factory=list)
    organization_id: Optional[str] = None
    mode: str = "verifier"
    tier: str = "verifier"
    metadata: dict = field(default_factory=dict)
    source_url: Optional[str] = None
    platform: Optional[str] = None
    duration_seconds: Optional[float] = None
    # Product context (business tier).
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_description: Optional[str] = None
    # Injected by the orchestrator so agents can pull tenant knowledge / web evidence.
    rag_retrieve: Optional[Callable[[str, int], List[dict]]] = None


# An agent: name -> callable(ctx) -> result dict
Agent = Callable[[AgentContext], Dict]


def base_result(confidence: float = 0.0) -> dict:
    return {"evidence": [], "confidence": confidence}

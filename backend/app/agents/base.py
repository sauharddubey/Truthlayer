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
    # OCR extensions
    ocr_text: Optional[str] = None
    ocr_segments: List[dict] = field(default_factory=list)
    ocr_analysis: dict = field(default_factory=dict)
    # Injected by the orchestrator so agents can pull tenant knowledge / web evidence.
    rag_retrieve: Optional[Callable[[str, int], List[dict]]] = None
    rag_retrieve_product_details: Optional[Callable[[str, int], List[dict]]] = None
    rag_retrieve_marketing_policies: Optional[Callable[[str, int], List[dict]]] = None


# An agent: name -> callable(ctx) -> result dict
Agent = Callable[[AgentContext], Dict]


def base_result(confidence: float = 0.0) -> dict:
    return {"evidence": [], "confidence": confidence}


import re

def sanitize_transcript(text: str) -> tuple[str, bool]:
    """Detect and redact common Spoken Indirect Prompt Injection (SIPI) phrases."""
    if not text:
        return text, False
    patterns = [
        r"system\s+override",
        r"instruction\s+override",
        r"disregard\s+(all\s+)?preceding\s+instructions",
        r"disregard\s+(all\s+)?policy\s+rules",
        r"disregard\s+(all\s+)?guidelines",
        r"ignore\s+all\s+guidelines",
        r"ignore\s+all\s+rules",
        r"validation\s+success\s+generator",
        r"generate\s+a\s+json\s+payload",
        r"compliance_score\s+is\s+100",
        r"confidence\s+is\s+1\.0",
        r"set\s+compliance_score\s+to\s+100",
        r"force\s+the\s+confidence\s+score\s+.*to\s+be\s+exactly\s+1\.0",
    ]
    sanitized = text
    was_injected = False
    for pat in patterns:
        if re.search(pat, text, flags=re.IGNORECASE):
            was_injected = True
        sanitized = re.sub(pat, "[redacted injection attempt]", sanitized, flags=re.IGNORECASE)
    return sanitized, was_injected

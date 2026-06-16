"""AI Agent Orchestration (FR-AGENT-001..003, evidence fusion + scoring).

Runs the per-video agents in parallel, fuses their evidence, calibrates a unified
set of scores with overall confidence, and persists claims, compliance issues,
deepfake/celebrity results, and the final AnalysisReport. Which agents run is
selected by analysis mode.
"""

from __future__ import annotations

import contextvars
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, Dict, List

from sqlalchemy.orm import Session

from app.agents import (
    bias,
    compliance,
    content,
    creator_risk,
    fact_check,
    media_integrity,
    perception,
    sentiment,
    verification,
)
from app.agents.base import AgentContext
from app.llm import chat_text
from app.models import (
    AnalysisReport,
    CelebrityDetection,
    Claim,
    ComplianceIssue,
    DeepfakeResult,
    Video,
)
from app.rag.store import retrieve
from app.rights import agents_for_tier

logger = logging.getLogger("truthlayer.orchestrator")

AGENT_FUNCS: Dict[str, Callable[[AgentContext], dict]] = {
    "fact_check": fact_check.run,
    "bias": bias.run,
    "sentiment": sentiment.run,
    "compliance": compliance.run,
    "creator_risk": creator_risk.run,
    "media_integrity": media_integrity.run,
    "perception": perception.run,
}


def run_pipeline(db: Session, video: Video) -> AnalysisReport:
    transcript = video.transcript
    meta = video.extra_metadata or {}
    tier = meta.get("tier", "verifier")
    product = video.product

    ctx = AgentContext(
        video_id=video.id,
        transcript_text=transcript.text if transcript else "",
        segments=transcript.segments if transcript else [],
        structured_blocks=transcript.structured_blocks if transcript else [],
        organization_id=video.organization_id,
        mode=video.mode.value,
        tier=tier,
        metadata=meta,
        product_id=video.product_id,
        product_name=product.name if product else None,
        product_description=product.description if product else None,
        rag_retrieve=lambda q, k=5: retrieve(
            db,
            organization_id=video.organization_id,
            query=q,
            k=k,
            product_id=video.product_id,
        ),
    )

    # 1) Content classification + segment labelling runs first.
    content_result = content.run(ctx)
    is_product = bool(content_result.get("is_about_product"))

    # 2) Parallel agents selected by user category (tier). Each runs inside a copy
    #    of the current context so the per-user OpenRouter key propagates to the
    #    worker threads.
    agent_names = agents_for_tier(tier)
    results: Dict[str, dict] = {"content": content_result}

    with ThreadPoolExecutor(max_workers=min(8, max(1, len(agent_names)))) as pool:
        futures = {}
        for n in agent_names:
            snapshot = contextvars.copy_context()
            futures[pool.submit(snapshot.run, AGENT_FUNCS[n], ctx)] = n
        for fut in as_completed(futures):
            name = futures[fut]
            try:
                results[name] = fut.result()
            except Exception as exc:  # pragma: no cover
                logger.exception("Agent %s failed: %s", name, exc)
                results[name] = {"error": str(exc), "confidence": 0.0}

    # 3) Business: verify each claim against the product's details + policies.
    if tier == "business" and results.get("fact_check", {}).get("claims"):
        verified = verification.verify_claims(ctx, results["fact_check"]["claims"])
        results["fact_check"]["claims"] = verified

    _persist_entities(db, video, results)
    report = _fuse_and_score(db, video, results)
    return report


# ── Persistence of structured findings ───────────────────────────────────────


def _persist_entities(db: Session, video: Video, results: Dict[str, dict]) -> None:
    # Claims (from fact-check)
    for c in results.get("fact_check", {}).get("claims", []) or []:
        db.add(
            Claim(
                video_id=video.id,
                claim_text=c.get("claim_text", ""),
                claim_type=c.get("claim_type", "factual"),
                verdict=c.get("verdict"),
                confidence=_as_float(c.get("confidence")),
                timestamp_start=_as_float(c.get("timestamp_start")),
                timestamp_end=_as_float(c.get("timestamp_end")),
                evidence=c.get("evidence", []),
                verification_status=c.get("verification_status"),
                verification_note=c.get("verification_note"),
            )
        )

    # Compliance issues
    for i in results.get("compliance", {}).get("issues", []) or []:
        db.add(
            ComplianceIssue(
                video_id=video.id,
                issue_type=i.get("issue_type", "other"),
                severity=i.get("severity", "low"),
                description=i.get("description", ""),
                evidence=i.get("evidence", []),
                rule_citation=i.get("rule_citation"),
            )
        )

    # Media integrity → deepfake + celebrity tables
    mi = results.get("media_integrity", {})
    if mi:
        df = mi.get("deepfake", {})
        db.add(
            DeepfakeResult(
                video_id=video.id,
                probability_score=_as_float(df.get("probability_score")) or 0.0,
                authenticity_score=_as_float(df.get("authenticity_score")) or 1.0,
                confidence=_as_float(df.get("confidence")) or 0.0,
                manipulation_evidence=df.get("manipulation_evidence", []),
                method=mi.get("method", "stub"),
            )
        )
        for celeb in mi.get("celebrities", []) or []:
            db.add(
                CelebrityDetection(
                    video_id=video.id,
                    celebrity_name=celeb.get("name", "unknown"),
                    confidence=_as_float(celeb.get("confidence")) or 0.0,
                    appearance_seconds=_as_float(celeb.get("appearance_seconds")),
                    unauthorized_endorsement=bool(celeb.get("unauthorized_endorsement")),
                )
            )
    db.flush()


# ── Evidence fusion + score calibration ──────────────────────────────────────


def _fuse_and_score(db: Session, video: Video, results: Dict[str, dict]) -> AnalysisReport:
    fact = results.get("fact_check", {})
    bias_r = results.get("bias", {})
    sent = results.get("sentiment", {})
    comp = results.get("compliance", {})
    risk = results.get("creator_risk", {})
    mi = results.get("media_integrity", {})
    cont = results.get("content", {})
    perc = results.get("perception", {})

    # Trust score: penalize contradicted/misleading/unverified claims and high bias.
    trust = _trust_score(fact, bias_r, mi)
    bias_score = _as_float(bias_r.get("bias_score")) or 0.0
    sentiment_score = _as_float(sent.get("sentiment_score")) or 0.0
    compliance_score = _as_float(comp.get("compliance_score"))
    risk_score = _as_float(risk.get("creator_risk_score"))
    perception_harm = _as_float(perc.get("sentiment_harm_score"))
    authenticity = _as_float((mi.get("deepfake") or {}).get("authenticity_score")) or 1.0

    # Risky segments also raise overall risk.
    segs = cont.get("segments") or []
    risky_ratio = (
        sum(1 for s in segs if s.get("label") == "risky") / len(segs) * 100 if segs else None
    )

    # Overall risk: blend creator-risk, bias, (100 - compliance), perception harm
    # and the share of risky segments.
    overall_risk = _overall_risk(risk_score, bias_score, compliance_score, perception_harm, risky_ratio)

    confidences = [
        _as_float(r.get("confidence")) for r in results.values() if r.get("confidence") is not None
    ]
    overall_conf = round(sum(c for c in confidences if c) / len(confidences), 3) if confidences else 0.5

    summary = _summary(video, results, trust, overall_risk)

    report = AnalysisReport(
        video_id=video.id,
        trust_score=trust,
        risk_score=overall_risk,
        compliance_score=compliance_score,
        bias_score=bias_score,
        sentiment_score=sentiment_score,
        narrative_leaning=bias_r.get("narrative_leaning") or sent.get("narrative_leaning"),
        authenticity_score=authenticity * 100,
        overall_confidence=overall_conf,
        summary=summary,
        agent_results=results,
    )
    db.add(report)
    db.flush()
    return report


def _trust_score(fact: dict, bias_r: dict, mi: dict) -> float:
    claims = fact.get("claims", []) or []
    if claims:
        weights = {"supported": 1.0, "unverified": 0.5, "misleading": 0.15, "contradicted": 0.0}
        base = sum(weights.get(c.get("verdict", "unverified"), 0.5) for c in claims) / len(claims)
    else:
        base = 0.6
    bias_penalty = (_as_float(bias_r.get("bias_score")) or 0.0) / 100 * 0.3
    authenticity = _as_float((mi.get("deepfake") or {}).get("authenticity_score")) or 1.0
    score = (base - bias_penalty) * authenticity
    return round(max(0.0, min(1.0, score)) * 100, 1)


def _overall_risk(risk_score, bias_score, compliance_score, perception_harm, risky_ratio) -> float:
    parts = []
    for v in (risk_score, bias_score, perception_harm, risky_ratio):
        if v is not None:
            parts.append(v)
    if compliance_score is not None:
        parts.append(100 - compliance_score)
    return round(sum(parts) / len(parts), 1) if parts else 0.0


def _summary(video: Video, results: dict, trust: float, risk: float) -> str:
    cont = results.get("content", {})
    is_product = bool(cont.get("is_about_product"))
    products = cont.get("products") or []
    content_type = cont.get("content_type", "unknown")
    perc = results.get("perception", {})

    if is_product:
        focus = (
            f"This video IS about a product/service ({', '.join(products) or 'unnamed product'}). "
            "Name the product(s), summarize the product claims and whether they are "
            "supported, and note any compliance/disclosure issues."
        )
    else:
        focus = (
            f"This video is NOT about a product (type: {content_type}). Do a fact-check "
            "summary of the key claims AND a perception check: what could offend or hurt "
            "people's sentiments."
        )

    text = chat_text(
        system=(
            "Write a concise 3-5 sentence plain-English summary of this video analysis "
            "for a non-technical reader. " + focus + " Mention the trust and risk scores."
        ),
        user=(
            f"Trust score: {trust}/100. Risk score: {risk}/100. Content type: {content_type}.\n"
            f"Products: {products}\n"
            f"Fact-check: {str(results.get('fact_check', {}))[:1100]}\n"
            f"Perception: {str(perc)[:700]}\n"
            f"Bias: {str(results.get('bias', {}))[:400]}"
        ),
    )
    if text:
        return text.strip()
    kind = f"product video about {', '.join(products)}" if is_product else f"{content_type} video"
    return (
        f"Automated analysis of this {kind}. Trust score {trust}/100, risk score {risk}/100. "
        "Configure an LLM API key for richer summaries."
    )


def _as_float(v):
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None

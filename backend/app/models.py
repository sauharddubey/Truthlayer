"""ORM models — TruthLayer data model (three user categories).

Categories:
* business  — manages Products; each product has its own videos, compliance
              knowledge base, hashtag monitoring and narrative intelligence.
* creator   — pre-publication self-check of their own uploaded videos.
* verifier  — AI fact-checking of any public video.

Multi-tenancy (NFR-SEC-001/002): business data is scoped to ``organization_id``
and, within that, to ``product_id``.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import settings
from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── Enums ────────────────────────────────────────────────────────────────────


class UserRole(str, enum.Enum):
    BUSINESS = "business"
    CREATOR = "creator"
    VERIFIER = "verifier"


class ProcessingStatus(str, enum.Enum):
    PENDING = "pending"
    INGESTING = "ingesting"
    TRANSCRIBING = "transcribing"
    STRUCTURING = "structuring"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"


class AnalysisMode(str, enum.Enum):
    BUSINESS = "business"
    CREATOR = "creator"
    VERIFIER = "verifier"


# ── Tenancy & identity ───────────────────────────────────────────────────────


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    subscription_plan: Mapped[str] = mapped_column(String, default="free")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    users: Mapped[list["User"]] = relationship(back_populates="organization")
    products: Mapped[list["Product"]] = relationship(back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    # Auth is delegated to Supabase, so credentials live there — kept nullable
    # only for legacy rows.
    hashed_password: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    full_name: Mapped[Optional[str]] = mapped_column(String)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.VERIFIER)
    organization_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("organizations.id"), nullable=True
    )
    # Per-user external-service API keys. ALL encrypted at rest (Fernet) and
    # supplied by the user in Settings — never read from environment variables.
    openrouter_api_key: Mapped[Optional[str]] = mapped_column(String)        # LLM + embeddings + transcription (OpenRouter)
    tavily_api_key: Mapped[Optional[str]] = mapped_column(String)            # fact-check web search (optional)
    media_integrity_api_key: Mapped[Optional[str]] = mapped_column(String)   # external deepfake service (optional)

    # Per-user custom model selections
    llm_model: Mapped[Optional[str]] = mapped_column(String)
    embeddings_model: Mapped[Optional[str]] = mapped_column(String)
    transcription_model: Mapped[Optional[str]] = mapped_column(String)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Consent capture (compliance): the policy version the user accepted at
    # sign-up and when. Populated via /auth/bootstrap; surfaced for accountability.
    consent_version: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    consent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    organization: Mapped[Optional[Organization]] = relationship(back_populates="users")


# ── Products (business) ──────────────────────────────────────────────────────


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)  # product details
    image_url: Mapped[Optional[str]] = mapped_column(String)  # catalog image
    aliases: Mapped[list] = mapped_column(JSON, default=list)  # alt names for matching
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    organization: Mapped[Organization] = relationship(back_populates="products")
    videos: Mapped[list["Video"]] = relationship(back_populates="product")
    documents: Mapped[list["BusinessDocument"]] = relationship(back_populates="product")
    keywords: Mapped[list["MonitoredKeyword"]] = relationship(back_populates="product")


# ── Media & analysis ─────────────────────────────────────────────────────────


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    organization_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("organizations.id"), nullable=True, index=True
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("products.id"), nullable=True, index=True
    )
    submitted_by: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)

    source_url: Mapped[Optional[str]] = mapped_column(String)
    platform: Mapped[Optional[str]] = mapped_column(String)
    title: Mapped[Optional[str]] = mapped_column(String)
    creator_handle: Mapped[Optional[str]] = mapped_column(String)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float)
    content_hash: Mapped[Optional[str]] = mapped_column(String, index=True)
    captions: Mapped[Optional[str]] = mapped_column(Text)
    extra_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(ProcessingStatus), default=ProcessingStatus.PENDING
    )
    mode: Mapped[AnalysisMode] = mapped_column(Enum(AnalysisMode), default=AnalysisMode.VERIFIER)
    error: Mapped[Optional[str]] = mapped_column(Text)
    # Rights attestation (compliance): the submitter confirmed they own / have the
    # rights + a lawful basis to submit this third-party content for processing.
    rights_attested: Mapped[bool] = mapped_column(Boolean, default=False)
    rights_attested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    product: Mapped[Optional[Product]] = relationship(back_populates="videos")
    transcript: Mapped[Optional["Transcript"]] = relationship(
        back_populates="video", uselist=False, cascade="all, delete-orphan"
    )
    claims: Mapped[list["Claim"]] = relationship(back_populates="video", cascade="all, delete-orphan")
    compliance_issues: Mapped[list["ComplianceIssue"]] = relationship(
        back_populates="video", cascade="all, delete-orphan"
    )
    deepfake_results: Mapped[list["DeepfakeResult"]] = relationship(
        back_populates="video", cascade="all, delete-orphan"
    )
    celebrity_detections: Mapped[list["CelebrityDetection"]] = relationship(
        back_populates="video", cascade="all, delete-orphan"
    )
    report: Mapped[Optional["AnalysisReport"]] = relationship(
        back_populates="video", uselist=False, cascade="all, delete-orphan"
    )


class Transcript(Base):
    __tablename__ = "transcripts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id"), index=True)
    text: Mapped[str] = mapped_column(Text)
    language: Mapped[Optional[str]] = mapped_column(String)
    segments: Mapped[list] = mapped_column(JSON, default=list)
    structured_blocks: Mapped[list] = mapped_column(JSON, default=list)
    ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ocr_segments: Mapped[list] = mapped_column(JSON, default=list)
    ocr_analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    video: Mapped[Video] = relationship(back_populates="transcript")


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id"), index=True)
    claim_text: Mapped[str] = mapped_column(Text)
    claim_type: Mapped[str] = mapped_column(String)
    verdict: Mapped[Optional[str]] = mapped_column(String)  # supported|contradicted|misleading|unverified
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    timestamp_start: Mapped[Optional[float]] = mapped_column(Float)
    timestamp_end: Mapped[Optional[float]] = mapped_column(Float)
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    # Business product verification: auto_verified | needs_review | contradicted | approved | rejected
    verification_status: Mapped[Optional[str]] = mapped_column(String)
    verification_note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    video: Mapped[Video] = relationship(back_populates="claims")


class ComplianceIssue(Base):
    __tablename__ = "compliance_issues"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id"), index=True)
    issue_type: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(Text)
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    rule_citation: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    video: Mapped[Video] = relationship(back_populates="compliance_issues")


class DeepfakeResult(Base):
    __tablename__ = "deepfake_results"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id"), index=True)
    probability_score: Mapped[float] = mapped_column(Float, default=0.0)
    authenticity_score: Mapped[float] = mapped_column(Float, default=1.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    manipulation_evidence: Mapped[list] = mapped_column(JSON, default=list)
    method: Mapped[str] = mapped_column(String, default="stub")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    video: Mapped[Video] = relationship(back_populates="deepfake_results")


class CelebrityDetection(Base):
    __tablename__ = "celebrity_detections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id"), index=True)
    celebrity_name: Mapped[str] = mapped_column(String)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    appearance_seconds: Mapped[Optional[float]] = mapped_column(Float)
    unauthorized_endorsement: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    video: Mapped[Video] = relationship(back_populates="celebrity_detections")


class NarrativeCluster(Base):
    __tablename__ = "narrative_clusters"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    organization_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("organizations.id"), nullable=True, index=True
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("products.id"), nullable=True, index=True
    )
    topic: Mapped[str] = mapped_column(String)
    summary: Mapped[Optional[str]] = mapped_column(Text)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    propagation_risk: Mapped[float] = mapped_column(Float, default=0.0)
    video_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AnalysisReport(Base):
    __tablename__ = "analysis_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    video_id: Mapped[str] = mapped_column(ForeignKey("videos.id"), index=True, unique=True)

    trust_score: Mapped[Optional[float]] = mapped_column(Float)
    risk_score: Mapped[Optional[float]] = mapped_column(Float)
    compliance_score: Mapped[Optional[float]] = mapped_column(Float)
    bias_score: Mapped[Optional[float]] = mapped_column(Float)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float)
    narrative_leaning: Mapped[Optional[str]] = mapped_column(String)
    authenticity_score: Mapped[Optional[float]] = mapped_column(Float)
    overall_confidence: Mapped[Optional[float]] = mapped_column(Float)

    summary: Mapped[Optional[str]] = mapped_column(Text)
    agent_results: Mapped[dict] = mapped_column(JSON, default=dict)
    score_reasonings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    video: Mapped[Video] = relationship(back_populates="report")


# ── RAG knowledge layer (business) ───────────────────────────────────────────


class BusinessDocument(Base):
    __tablename__ = "business_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), index=True, nullable=False
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("products.id"), nullable=True, index=True
    )
    document_type: Mapped[str] = mapped_column(String)  # product_details | marketing_policy | policy
    filename: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="indexed")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    product: Mapped[Optional[Product]] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("business_documents.id"), index=True)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), index=True, nullable=False
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("products.id"), nullable=True, index=True
    )
    content: Mapped[str] = mapped_column(Text)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    embedding: Mapped[list] = mapped_column(Vector(settings.EMBEDDINGS_DIM))
    extra_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

    document: Mapped[BusinessDocument] = relationship(back_populates="chunks")


class MonitoredKeyword(Base):
    __tablename__ = "monitored_keywords"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    organization_id: Mapped[str] = mapped_column(
        ForeignKey("organizations.id"), index=True, nullable=False
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("products.id"), nullable=True, index=True
    )
    keyword: Mapped[str] = mapped_column(String)
    keyword_type: Mapped[str] = mapped_column(String)  # product_hashtag | brand
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    product: Mapped[Optional[Product]] = relationship(back_populates="keywords")


# ── LLM usage tracking ───────────────────────────────────────────────────────


class UsageRecord(Base):
    """One row per LLM API call: tracks tokens consumed and estimated cost.

    Scoped to the user who triggered the call. ``call_type`` distinguishes
    chat completions (``chat``) from embedding calls (``embed``) and
    transcription (``transcription``).

    Costs are stored in USD micro-dollars (1e-6) as integers to avoid float
    precision issues, but the API returns them as float dollars.
    """

    __tablename__ = "usage_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    call_type: Mapped[str] = mapped_column(String, default="chat")  # chat | embed | transcription
    model: Mapped[str] = mapped_column(String, nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    # cost_microdollars: cost * 1_000_000 stored as int for precision
    cost_microdollars: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    @property
    def cost_usd(self) -> float:
        return self.cost_microdollars / 1_000_000


# ── Audit log (compliance / accountability) ──────────────────────────────────


class AuditLog(Base):
    """Append-only record of security/privacy-relevant actions.

    Captures who did what to which object and when (e.g. exporting a report,
    deleting an account). ``actor_id`` is intentionally NOT a foreign key so the
    trail survives erasure of the actor — an audit log that is cascade-deleted
    with its subject provides no accountability.
    """

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    actor_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    object_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    object_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)

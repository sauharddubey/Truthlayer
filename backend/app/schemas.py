"""Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, field_serializer

from app.models import UserRole


# ── Auth ─────────────────────────────────────────────────────────────────────


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str]
    role: UserRole
    organization_id: Optional[str]
    has_api_key: bool = False             # OpenRouter (required)
    has_tavily_key: bool = False
    has_media_integrity_key: bool = False
    llm_model: Optional[str] = None
    embeddings_model: Optional[str] = None
    transcription_model: Optional[str] = None

    model_config = {"from_attributes": True}


class BootstrapRequest(BaseModel):
    """Applied to the profile right after a Supabase sign-up."""

    role: Optional[UserRole] = None
    organization_name: Optional[str] = None
    full_name: Optional[str] = None


class SettingsRequest(BaseModel):
    openrouter_api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None
    media_integrity_api_key: Optional[str] = None
    llm_model: Optional[str] = None
    embeddings_model: Optional[str] = None
    transcription_model: Optional[str] = None


# ── Products ─────────────────────────────────────────────────────────────────


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    aliases: List[str] = []


class ProductOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    image_url: Optional[str]
    aliases: List[str] = []
    created_at: datetime
    video_count: int = 0
    trust_score: Optional[float] = None

    model_config = {"from_attributes": True}

    @field_serializer("image_url")
    def _sign_image(self, value: Optional[str]) -> Optional[str]:
        # Hand out a short-lived signed URL for uploaded media; pass external URLs through.
        from app.crypto import sign_media_url

        return sign_media_url(value)


# ── Videos / analysis ────────────────────────────────────────────────────────


class VideoUrlRequest(BaseModel):
    url: str
    product_id: Optional[str] = None


class AnalysisStartRequest(BaseModel):
    video_id: str


class VideoOut(BaseModel):
    id: str
    source_url: Optional[str]
    platform: Optional[str]
    title: Optional[str]
    creator_handle: Optional[str]
    duration_seconds: Optional[float]
    processing_status: str
    mode: str
    product_id: Optional[str]
    error: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class ClaimOut(BaseModel):
    id: str
    claim_text: str
    claim_type: str
    verdict: Optional[str]
    confidence: Optional[float]
    timestamp_start: Optional[float]
    timestamp_end: Optional[float]
    evidence: List[Any] = []
    evidence_quality_score: Optional[float] = None
    insufficient_evidence_reasons: List[str] = []
    verification_status: Optional[str]
    verification_note: Optional[str]

    model_config = {"from_attributes": True}


class ClaimReviewRequest(BaseModel):
    status: str  # approved | rejected


class ReportOut(BaseModel):
    video_id: str
    trust_score: Optional[float]
    risk_score: Optional[float]
    compliance_score: Optional[float]
    bias_score: Optional[float]
    sentiment_score: Optional[float]
    narrative_leaning: Optional[str]
    authenticity_score: Optional[float]
    overall_confidence: Optional[float]
    summary: Optional[str]
    agent_results: dict = {}
    score_reasonings: dict = {}

    model_config = {"from_attributes": True}


class AnalysisOut(BaseModel):
    video: VideoOut
    report: Optional[ReportOut]
    claims: List[ClaimOut] = []


# ── Business ─────────────────────────────────────────────────────────────────


class KeywordRequest(BaseModel):
    keyword: str
    keyword_type: str = "product_hashtag"  # product_hashtag | brand
    product_id: Optional[str] = None


class DocumentOut(BaseModel):
    id: str
    document_type: str
    filename: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}

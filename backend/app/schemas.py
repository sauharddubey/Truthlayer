"""Pydantic request/response models."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field

from app.models import UserRole


# ── Auth ─────────────────────────────────────────────────────────────────────


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: Optional[str] = None
    role: UserRole = UserRole.VERIFIER
    organization_name: Optional[str] = None  # required-ish for business


class GoogleLoginRequest(BaseModel):
    credential: str
    role: UserRole = UserRole.VERIFIER
    organization_name: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    organization_id: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str]
    role: UserRole
    organization_id: Optional[str]
    has_api_key: bool = False

    model_config = {"from_attributes": True}


class SettingsRequest(BaseModel):
    openrouter_api_key: Optional[str] = None


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

    model_config = {"from_attributes": True}


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

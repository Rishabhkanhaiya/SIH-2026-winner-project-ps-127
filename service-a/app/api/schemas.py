"""
schemas.py — Pydantic models for all Service A request/response shapes.
Exactly matches the locked Part D contract from SIH26127_Master_Build_Spec_v2.1.
"""
from __future__ import annotations

from typing import Optional, Literal
from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    model_version: str


# ──────────────────────────────────────────────
# Bounding box
# ──────────────────────────────────────────────

class BBox(BaseModel):
    x1: int
    y1: int
    x2: int
    y2: int


# ──────────────────────────────────────────────
# POST /api/v1/read-plate — success response
# ──────────────────────────────────────────────

class PlateReadSuccess(BaseModel):
    success: Literal[True] = True
    plate_number: str = Field(..., description="Uppercase plate string, no spaces")
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidence_band: Literal["HIGH", "MEDIUM", "LOW"]
    bbox: BBox
    raw_ocr_text: str = Field(..., description="Pre-correction OCR output")
    state_code_valid: bool
    track_id: str
    vote_count: int = Field(..., ge=1)
    is_consensus: bool
    processing_time_ms: int


# ──────────────────────────────────────────────
# POST /api/v1/read-plate — no-read response
# ──────────────────────────────────────────────

NoReadReason = Literal["NO_PLATE_DETECTED", "LOW_CONFIDENCE", "INVALID_FORMAT"]


class PlateReadNoRead(BaseModel):
    success: Literal[False] = False
    plate_number: None = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidence_band: Literal["HIGH", "MEDIUM", "LOW"]
    reason: NoReadReason
    track_id: Optional[str] = None
    processing_time_ms: int


# ──────────────────────────────────────────────
# Error shape (global)
# ──────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error: Literal[True] = True
    message: str
    code: str

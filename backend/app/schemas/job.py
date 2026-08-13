"""Pydantic schemas for job API requests and responses."""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

from pydantic import BaseModel, Field

# Import JobPosting model for type hints (at module level to avoid forward reference issues)
from src.models.job import JobPosting as JobPostingModel


class ExtractionInfo(BaseModel):
    """Information about the job extraction process."""
    source: Optional[str] = Field(
        default=None,
        description="Source of the job content (url, description, or None)"
    )
    method: Optional[str] = Field(
        default=None,
        description="Method used (url, manual, fallback, or None)"
    )
    status: str = Field(
        default="pending",
        description="Extraction status (success, failed, partial)"
    )
    reason: Optional[str] = Field(
        default=None,
        description="Reason for failure or partial result"
    )


class JobResponseSuccessData(BaseModel):
    """Response data for successful job extraction."""
    job_id: str
    status: str
    processed_at: datetime
    data: JobPostingModel


class JobResponseSuccess(BaseModel):
    """Success response structure for job endpoint."""
    success: bool = True
    job_id: str
    status: str = "processed"
    extraction: ExtractionInfo
    data: JobResponseSuccessData


class JobResponsePartial(BaseModel):
    """Partial response for job with limited extraction."""
    success: bool = True
    job_id: str
    status: str = "partial"
    extraction: ExtractionInfo
    data: Optional[JobResponseSuccessData] = None


class JobResponseFailed(BaseModel):
    """Failed response structure for job endpoint."""
    success: bool = False
    job_id: str
    status: str = "extraction_failed"
    extraction: ExtractionInfo
    data: None = None


class ErrorResponse(BaseModel):
    """Error response structure."""
    success: bool = False
    error: str
    job_id: Optional[str] = None


__all__ = [
    "ExtractionInfo",
    "JobResponseSuccessData",
    "JobResponseSuccess",
    "JobResponsePartial",
    "JobResponseFailed",
    "ErrorResponse",
]

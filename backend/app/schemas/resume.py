"""Pydantic schemas for resume API requests and responses."""

import uuid
from typing import List, Optional
from datetime import datetime

from pydantic import BaseModel

from src.models.resume import Resume as ResumeModel


class ResumeResponseData(BaseModel):
    """Response data containing the processed resume."""
    resume_id: str
    status: str
    extracted_at: datetime
    data: ResumeModel


class ResumeResponse(BaseModel):
    """Standard response structure for resume endpoint."""
    success: bool
    resume_id: str
    status: str
    data: Optional[ResumeResponseData] = None


class ErrorResponse(BaseModel):
    """Error response structure."""
    success: bool = False
    error: str
    resume_id: Optional[str] = None


class UploadRequest(BaseModel):
    """Request model for resume upload."""
    pass  # File is uploaded via multipart/form-data

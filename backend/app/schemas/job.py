"""Pydantic schemas for job API requests and responses."""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

from pydantic import BaseModel, Field

# Import JobPosting model for type hints (at module level to avoid forward reference issues)
from src.models.job import JobPosting as JobPostingModel


class JobResponseData(BaseModel):
    """Response data containing the processed job posting."""
    job_id: str
    status: str
    processed_at: datetime
    data: JobPostingModel


class JobResponse(BaseModel):
    """Standard response structure for job endpoint."""
    success: bool
    job_id: str
    status: str
    data: Optional[JobResponseData] = None


class ErrorResponse(BaseModel):
    """Error response structure."""
    success: bool = False
    error: str
    job_id: Optional[str] = None


class JobRequest(BaseModel):
    """Request model for job processing."""
    description: Optional[str] = Field(
        default=None,
        description="Job description text to process"
    )
    url: Optional[str] = Field(
        default=None,
        description="URL to job posting to scrape and process"
    )


__all__ = [
    "JobRequest",
    "JobResponse",
    "JobResponseData",
    "ErrorResponse",
]

"""Schemas module."""

from app.schemas.job import (
    ExtractionInfo,
    JobResponseSuccessData,
    JobResponseSuccess,
    JobResponsePartial,
    JobResponseFailed,
    ErrorResponse,
)
from app.schemas.resume import ResumeResponse, ResumeResponseData, UploadRequest, ErrorResponse as ResumeErrorResponse

__all__ = [
    # Job schemas
    "ExtractionInfo",
    "JobResponseSuccessData",
    "JobResponseSuccess",
    "JobResponsePartial",
    "JobResponseFailed",
    "ErrorResponse",
    # Resume schemas
    "ResumeResponse",
    "ResumeResponseData",
    "UploadRequest",
    "ResumeErrorResponse",
]

"""Schemas module."""

from app.schemas.job import JobRequest, JobResponse, JobResponseData, ErrorResponse
from app.schemas.resume import ResumeResponse, ResumeResponseData, UploadRequest, ErrorResponse as ResumeErrorResponse

__all__ = [
    # Job schemas
    "JobRequest",
    "JobResponse",
    "JobResponseData",
    "ErrorResponse",
    # Resume schemas
    "ResumeResponse",
    "ResumeResponseData",
    "UploadRequest",
    "ResumeErrorResponse",
]

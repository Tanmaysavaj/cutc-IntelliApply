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
from app.schemas.matching import (
    MatchResult,
    ScoreBreakdown,
    RequiredSkillsScore,
    PreferredSkillsScore,
    ExperienceScore,
    EducationScore,
    ResponsibilitiesScore,
)
from app.schemas.ai_insights import (
    SkillGap,
    ApplicationRecommendation,
    AIInsights,
    AnalysisResponse,
)

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
    # Matching schemas
    "MatchResult",
    "ScoreBreakdown",
    "RequiredSkillsScore",
    "PreferredSkillsScore",
    "ExperienceScore",
    "EducationScore",
    "ResponsibilitiesScore",
    # AI Insights schemas
    "SkillGap",
    "ApplicationRecommendation",
    "AIInsights",
    "AnalysisResponse",
]

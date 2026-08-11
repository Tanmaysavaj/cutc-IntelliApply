from typing import List, Optional

from pydantic import BaseModel, Field


class ResumeSuggestion(BaseModel):
    section: str = Field(description="Resume section to improve")
    suggestion: str = Field(description="Suggested improvement")


class InterviewQuestion(BaseModel):
    question: str
    reason: str


class ApplicationReport(BaseModel):
    legitimacy: str = Field(
        description="Legitimate, Suspicious, or Needs Manual Review"
    )

    legitimacy_reason: str

    fit_score: int = Field(
        ge=0,
        le=100,
        description="Overall resume fit score."
    )

    strengths: List[str] = Field(default_factory=list)

    weaknesses: List[str] = Field(default_factory=list)

    resume_suggestions: List[ResumeSuggestion] = Field(
        default_factory=list
    )

    cover_letter_points: List[str] = Field(
        default_factory=list
    )

    interview_questions: List[InterviewQuestion] = Field(
        default_factory=list
    )
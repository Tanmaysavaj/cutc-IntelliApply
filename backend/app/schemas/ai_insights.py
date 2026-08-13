"""Pydantic schemas for AI career insights.

These schemas define the structured output for AI-generated career insights
that explain deterministic matching results and provide recommendations.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class SkillGap(BaseModel):
    """A specific skill gap identified by the AI."""
    skill: str = Field(description="The skill that is missing or insufficient")
    importance: Literal["required", "preferred"] = Field(
        description="Whether this is a required or preferred skill gap"
    )
    reason: str = Field(description="Explanation of why this skill gap matters")
    recommendation: str = Field(description="Actionable recommendation to address this gap")


class ApplicationRecommendation(BaseModel):
    """AI's qualitative recommendation about applying for the job."""
    recommendation: Literal["apply", "consider", "low_match"] = Field(
        description="Qualitative recommendation: apply (strong match), consider (moderate match), low_match (weak match)"
    )
    reason: str = Field(description="Reasoning behind the recommendation")


class AIInsights(BaseModel):
    """Complete AI-generated career insights.
    
    This schema defines the structured output that the LLM should generate
    to explain deterministic matching results and provide career advice.
    """
    status: Literal["completed", "unavailable", "failed"] = Field(
        default="completed",
        description="Status of AI insights generation"
    )
    summary: str = Field(
        description="Brief summary of the match and key insights"
    )
    why_you_match: List[str] = Field(
        default_factory=list,
        description="List of reasons why the candidate matches the job, based on actual resume content"
    )
    skill_gaps: List[SkillGap] = Field(
        default_factory=list,
        description="List of identified skill gaps with recommendations"
    )
    resume_improvements: List[str] = Field(
        default_factory=list,
        description="Actionable recommendations for improving the resume"
    )
    application_recommendation: ApplicationRecommendation = Field(
        description="Qualitative recommendation about whether to apply"
    )
    interview_focus: List[str] = Field(
        default_factory=list,
        description="Areas the candidate should focus on for interview preparation"
    )
    reason: Optional[str] = Field(
        default=None,
        description="Reason for status if not 'completed' (e.g., error message)"
    )


class AnalysisResponse(BaseModel):
    """Complete analysis response including both deterministic match and AI insights.
    
    This schema extends the existing MatchResult with AI insights.
    The deterministic match result is preserved as-is.
    """
    success: bool = Field(default=True, description="Overall success of the analysis")
    analysis_id: str = Field(description="Unique identifier for this analysis")
    status: Literal["completed", "incomplete", "failed"] = Field(
        description="Overall analysis status"
    )
    match: "MatchResult" = Field(description="Deterministic match result (source of truth)")
    ai_insights: AIInsights = Field(description="AI-generated career insights and recommendations")


# Import MatchResult here to avoid circular imports
from app.schemas.matching import MatchResult

# Update forward reference
AnalysisResponse.model_rebuild()
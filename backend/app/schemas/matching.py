"""Pydantic schemas for matching and analysis results."""

from typing import List, Optional
from pydantic import BaseModel


class RequiredSkillsScore(BaseModel):
    """Score for required skills matching."""
    score: int
    matched_skills: List[str]
    missing_skills: List[str]


class PreferredSkillsScore(BaseModel):
    """Score for preferred skills matching."""
    score: int
    matched_skills: List[str]
    missing_skills: List[str]


class ExperienceScore(BaseModel):
    """Score for experience matching."""
    score: int
    matched: bool
    unknown: bool
    job_requirement: Optional[str] = None
    candidate_experience: Optional[str] = None


class EducationScore(BaseModel):
    """Score for education matching."""
    score: int
    matched: bool
    unknown: bool
    job_requirement: Optional[str] = None
    candidate_education: Optional[str] = None


class ResponsibilitiesScore(BaseModel):
    """Score for responsibilities/keyword alignment."""
    score: int
    keyword_count: int
    keyword_matches: List[str]


class ScoreBreakdown(BaseModel):
    """Detailed breakdown of all scoring components."""
    required_skills: RequiredSkillsScore
    preferred_skills: PreferredSkillsScore
    experience: ExperienceScore
    education: EducationScore
    responsibilities: ResponsibilitiesScore


class MatchResult(BaseModel):
    """Complete match result with scoring and recommendations."""
    overall_score: int
    score_breakdown: ScoreBreakdown
    matched_required_skills: List[str]
    missing_required_skills: List[str]
    matched_preferred_skills: List[str]
    missing_preferred_skills: List[str]
    strengths: List[str]
    gaps: List[str]
    status: str = "complete"

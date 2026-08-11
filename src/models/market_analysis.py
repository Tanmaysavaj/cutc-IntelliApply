from typing import List

from pydantic import BaseModel, Field


class MarketAnalysis(BaseModel):
    common_required_skills: List[str] = Field(default_factory=list)

    common_preferred_skills: List[str] = Field(default_factory=list)

    common_experience: str | None = None

    common_education: str | None = None

    salary_summary: str | None = None

    common_responsibilities: List[str] = Field(default_factory=list)

    trends: List[str] = Field(default_factory=list)
from typing import List

from pydantic import BaseModel, Field


class Gap(BaseModel):
    skill: str = Field(description="Missing or weak skill")

    level: str = Field(
        description="One of: Quick Win, Short-term, Medium-term, Long-term"
    )

    recommendation: str = Field(
        description="Practical recommendation to improve this skill"
    )


class GapAnalysis(BaseModel):
    strengths: List[str] = Field(default_factory=list)

    gaps: List[Gap] = Field(default_factory=list)

    unique_value: List[str] = Field(default_factory=list)
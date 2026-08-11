from typing import List, Optional

from pydantic import BaseModel, Field


class WorkExperience(BaseModel):
    company: Optional[str] = None
    role: Optional[str] = None
    duration: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)


class Education(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None


class Resume(BaseModel):
    hard_skills: List[str] = Field(default_factory=list)

    soft_skills: List[str] = Field(default_factory=list)

    work_experience: List[WorkExperience] = Field(default_factory=list)

    education: List[Education] = Field(default_factory=list)

    certifications: List[str] = Field(default_factory=list)

    projects: List[str] = Field(default_factory=list)

    keywords: List[str] = Field(default_factory=list)
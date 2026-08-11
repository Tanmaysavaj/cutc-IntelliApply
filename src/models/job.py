from typing import List, Optional

from pydantic import BaseModel, Field


class CompanyResearch(BaseModel):
    summary: str = Field(
        description="Company research gathered using Tavily."
    )


class JobPosting(BaseModel):
    job_title: str = Field(description="Job title")

    company_name: str = Field(description="Company name")
    company_website: Optional[str] = None

    location: Optional[str] = Field(
        default=None,
        description="Job location"
    )

    remote_status: Optional[str] = Field(
        default=None,
        description="Remote, Hybrid, On-site, or Not Listed"
    )

    posting_age_days: Optional[int] = Field(
        default=None,
        description="Age of the posting in days"
    )

    required_skills: List[str] = Field(
        default_factory=list,
        description="Required technical skills"
    )

    preferred_skills: List[str] = Field(
        default_factory=list,
        description="Preferred or nice-to-have skills"
    )

    experience_level: Optional[str] = Field(
        default=None,
        description="Years of experience or seniority"
    )

    education_requirements: Optional[str] = Field(
        default=None,
        description="Education requirements"
    )

    salary_range: Optional[str] = Field(
        default=None,
        description="Salary if listed"
    )

    key_responsibilities: List[str] = Field(
        default_factory=list,
        description="Main responsibilities"
    )

    company_research: Optional[CompanyResearch] = Field(
        default=None,
        description="Information gathered using Tavily."
    )
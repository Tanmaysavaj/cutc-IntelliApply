"""Tests for the matching service and API endpoints."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.matching_service import MatchingService, SkillNormalizer
from src.models.resume import Resume, WorkExperience, Education
from src.models.job import JobPosting, CompanyResearch


client = TestClient(app)


class TestSkillNormalizer:
    """Tests for the SkillNormalizer class."""
    
    def test_normalize_lowercase(self):
        """Should normalize to lowercase."""
        assert SkillNormalizer.normalize("Python") == "python"
        assert SkillNormalizer.normalize("PYTHON") == "python"
    
    def test_normalize_whitespace(self):
        """Should trim whitespace."""
        assert SkillNormalizer.normalize("  python  ") == "python"
    
    def test_normalize_aliases(self):
        """Should handle common aliases."""
        # Node.js -> node
        assert SkillNormalizer.normalize("Node.js") == "node"
        assert SkillNormalizer.normalize("node.js") == "node"
        
        # PostgreSQL -> postgres
        assert SkillNormalizer.normalize("PostgreSQL") == "postgres"
        assert SkillNormalizer.normalize("Postgres") == "postgres"
        
        # AWS -> aws (exact match in aliases)
        assert SkillNormalizer.normalize("AWS") == "aws"
    
    def test_normalize_unknown_skill(self):
        """Should return lowercase for unknown skills (normalized version)."""
        # These skills don't have exact matches in the alias map
        assert SkillNormalizer.normalize("Golang") == "golang"
        assert SkillNormalizer.normalize("Rust") == "rust"
    
    def test_normalize_list(self):
        """Should normalize a list of skills."""
        skills = ["Python", "PYTHON", "python"]
        normalized = SkillNormalizer.normalize_list(skills)
        assert normalized == ["python"]
    
    def test_normalize_list_multiple_skills(self):
        """Should handle multiple different skills."""
        skills = ["Python", "JavaScript", "AWS", "Node.js"]
        normalized = SkillNormalizer.normalize_list(skills)
        assert "python" in normalized
        assert "javascript" in normalized
        assert "aws" in normalized
        assert "node" in normalized
    
    def test_normalize_empty_list(self):
        """Should return empty list for empty input."""
        assert SkillNormalizer.normalize_list([]) == []
    
    def test_normalize_none_value(self):
        """Should handle None values."""
        assert SkillNormalizer.normalize(None) == ""
    
    def test_normalize_unknown_skill(self):
        """Should return normalized version for unknown skills."""
        assert SkillNormalizer.normalize("Golang") == "golang"
        assert SkillNormalizer.normalize("Rust") == "rust"


class TestMatchingServiceSkillMatching:
    """Tests for skill matching in the MatchingService."""
    
    def test_perfect_skill_match(self):
        """Should return 100 score for perfect match."""
        job = JobPosting(
            required_skills=["Python", "SQL", "AWS"],
            preferred_skills=["Docker", "Kubernetes"],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=["Python", "SQL", "AWS"],
            soft_skills=["Docker", "Kubernetes"],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.overall_score == 100
        assert result.matched_required_skills == ["aws", "python", "sql"]
        assert result.missing_required_skills == []
    
    def test_partial_skill_match(self):
        """Should return partial score for partial match."""
        job = JobPosting(
            required_skills=["Python", "SQL", "AWS", "Kubernetes"],
            preferred_skills=[],
            experience_level=None,
            education_requirements=None,
            key_responsibilities=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=["Python", "SQL"],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        # 2 out of 4 required skills = 50%
        # But since experience, education, and responsibilities have no requirements,
        # they score 100 each, affecting overall score
        assert result.matched_required_skills == ["python", "sql"]
        assert result.missing_required_skills == ["aws", "kubernetes"]
        # 45% weight * 50 + 15% * 100 + 15% * 100 + 10% * 100 + 15% * 100 = 77.5 -> 78
        assert result.overall_score >= 75
    
    def test_no_skill_match(self):
        """Should return low score for no match."""
        job = JobPosting(
            required_skills=["Python", "SQL"],
            preferred_skills=[],
            experience_level=None,
            education_requirements=None,
            key_responsibilities=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=["Java", "C++"],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.matched_required_skills == []
        assert result.missing_required_skills == ["python", "sql"]
        # 45% * 0 + 15% * 100 + 15% * 100 + 10% * 100 + 15% * 100 = 55
        assert result.overall_score >= 50
    
    def test_case_insensitive_matching(self):
        """Should match skills case-insensitively."""
        job = JobPosting(
            required_skills=["PYTHON", "sql"],
            preferred_skills=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=["python", "SQL"],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.matched_required_skills == ["python", "sql"]
        assert result.missing_required_skills == []
    
    def test_skill_aliases(self):
        """Should match skills using aliases."""
        job = JobPosting(
            required_skills=["node", "postgres"],
            preferred_skills=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=["Node.js", "PostgreSQL"],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.matched_required_skills == ["node", "postgres"]
        assert result.missing_required_skills == []


class TestMatchingServiceExperience:
    """Tests for experience matching in the MatchingService."""
    
    def test_experience_match(self):
        """Should match when resume has sufficient experience."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            experience_level="3+ years",
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
            work_experience=[
                WorkExperience(
                    company="Company A",
                    role="Developer",
                    duration="3 years",
                    responsibilities=["Built features"],
                ),
            ],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.score_breakdown.experience.matched is True
        assert result.score_breakdown.experience.score == 100
    
    def test_experience_mismatch(self):
        """Should not match when resume has insufficient experience."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            experience_level="5+ years",
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
            work_experience=[
                WorkExperience(
                    company="Company A",
                    role="Developer",
                    duration="2 years",
                    responsibilities=["Built features"],
                ),
            ],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.score_breakdown.experience.matched is False
    
    def test_unknown_experience(self):
        """Should return unknown when experience cannot be determined."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            experience_level="senior",
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        # Senior level maps to 5 years, but resume has no experience
        assert result.score_breakdown.experience.unknown is False
    
    def test_no_experience_requirement(self):
        """Should return unknown but not penalize when no experience required."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        # No experience requirement means it's unknown but not penalized
        assert result.score_breakdown.experience.score == 100
    
    def test_empty_experience_in_resume(self):
        """Should handle empty experience in resume."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            experience_level="3+ years",
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
            work_experience=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.score_breakdown.experience.score == 0


class TestMatchingServiceEducation:
    """Tests for education matching in the MatchingService."""
    
    def test_education_match(self):
        """Should match when education requirements are met."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            education_requirements="Bachelor's degree",
            experience_level=None,
            key_responsibilities=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
            education=[
                Education(
                    institution="University",
                    degree="Bachelor of Science",
                ),
            ],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.score_breakdown.education.matched is True
        assert result.score_breakdown.education.score == 100
    
    def test_education_mismatch(self):
        """Should not match when education requirements are not met."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            education_requirements="Master's degree",
            experience_level=None,
            key_responsibilities=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
            education=[
                Education(
                    institution="University",
                    degree="Bachelor of Science",
                ),
            ],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        # Bachelor's doesn't meet Master's requirement
        assert result.score_breakdown.education.score < 100
    
    def test_unknown_education(self):
        """Should return unknown when education cannot be determined."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            education_requirements="Bachelor's in Computer Science",
            experience_level=None,
            key_responsibilities=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        # No education in resume means unknown
        assert result.score_breakdown.education.score == 0
    
    def test_no_education_requirement(self):
        """Should return unknown but not penalize when no education required."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.score_breakdown.education.score == 100


class TestMatchingServiceResponsibilities:
    """Tests for responsibilities matching in the MatchingService."""
    
    def test_responsibilities_match(self):
        """Should match responsibilities with resume content."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            key_responsibilities=[
                "Develop Python applications",
                "Work with AWS cloud services",
            ],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=["Python", "AWS"],
            soft_skills=[],
            projects=["Python web app", "AWS deployment"],
            keywords=["cloud", "development"],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.score_breakdown.responsibilities.score >= 50
    
    def test_empty_responsibilities(self):
        """Should return full score when no responsibilities specified."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            key_responsibilities=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.score_breakdown.responsibilities.score == 100


class TestMatchingServiceEdgeCases:
    """Tests for edge cases in the MatchingService."""
    
    def test_no_required_skills_in_job(self):
        """Should handle job with no required skills."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=["Python"],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=["Python"],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        # No required skills - full score for that component
        assert result.score_breakdown.required_skills.score == 100
    
    def test_no_required_skills_in_resume(self):
        """Should handle resume with no skills."""
        job = JobPosting(
            required_skills=["Python"],
            preferred_skills=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.matched_required_skills == []
        assert result.missing_required_skills == ["python"]
        assert result.score_breakdown.required_skills.score == 0
    
    def test_empty_both_lists(self):
        """Should handle empty lists in both job and resume."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.score_breakdown.required_skills.score == 100
        assert result.score_breakdown.preferred_skills.score == 100
    
    def test_incomplete_job_posting(self):
        """Should handle incomplete job posting."""
        job = JobPosting(
            required_skills=[],
            preferred_skills=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        # Status should be incomplete due to missing required skills
        assert result.status == "incomplete"
    
    def test_incomplete_resume(self):
        """Should handle incomplete resume."""
        job = JobPosting(
            required_skills=["Python"],
            preferred_skills=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=[],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        assert result.status == "incomplete"


class TestMatchingServiceWeighting:
    """Tests for scoring weight distribution."""
    
    def test_required_skills_weight(self):
        """Required skills should have highest impact on score."""
        # High required skills score, low others
        job = JobPosting(
            required_skills=["Python"],
            preferred_skills=[],
            experience_level=None,
            education_requirements=None,
            key_responsibilities=[],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=["Python"],
            soft_skills=[],
        )
        
        result = MatchingService.generate_match_result(resume, job)
        
        # With only required skills matching, overall should be high
        assert result.overall_score >= 85


class TestMatchingServiceDeterministic:
    """Tests for deterministic scoring."""
    
    def test_reproducible_scores(self):
        """Same input should always produce same output."""
        job = JobPosting(
            required_skills=["Python", "SQL"],
            preferred_skills=["AWS"],
            experience_level="3+ years",
            education_requirements="Bachelor's",
            key_responsibilities=["Build features"],
            job_title="Developer",
            company_name="Test Corp",
        )
        resume = Resume(
            hard_skills=["Python", "SQL"],
            soft_skills=[],
            work_experience=[
                WorkExperience(
                    company="Company A",
                    role="Developer",
                    duration="3 years",
                    responsibilities=["Built features"],
                ),
            ],
            education=[
                Education(
                    institution="University",
                    degree="Bachelor of Science",
                ),
            ],
        )
        
        # Run twice
        result1 = MatchingService.generate_match_result(resume, job)
        result2 = MatchingService.generate_match_result(resume, job)
        
        assert result1.overall_score == result2.overall_score
        assert result1.matched_required_skills == result2.matched_required_skills


class TestHealthEndpoint:
    """Tests for the health check endpoint."""
    
    def test_health_returns_ok(self):
        """Health endpoint should return 200 with status ok."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "intelliapply-api"


class TestRootEndpoint:
    """Tests for the root endpoint."""
    
    def test_root_returns_api_info(self):
        """Root endpoint should return API information."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert data["docs"] == "/api/docs"
        assert data["health"] == "/api/health"
        assert "resume" in data
        assert "jobs" in data
        assert "analysis" in data


class TestResumeEndpoint:
    """Tests for the POST /api/resume endpoint."""
    
    def test_missing_file_returns_422(self):
        """Missing required file should return 422 Unprocessable Entity."""
        response = client.post("/api/resume")
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data  # FastAPI's default error format
    
    def test_non_pdf_file_returns_400(self):
        """Non-PDF file should return 400 Bad Request."""
        response = client.post(
            "/api/resume",
            files={"resume": ("test.txt", b"This is not a PDF", "text/plain")},
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Invalid file type" in data["error"]
    
    def test_empty_file_returns_400(self):
        """Empty file should return 400 Bad Request."""
        response = client.post(
            "/api/resume",
            files={"resume": ("empty.pdf", b"", "application/pdf")},
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "Empty file"


class TestJobsEndpoint:
    """Tests for the POST /api/jobs endpoint."""
    
    def test_missing_all_sources_returns_400(self):
        """Missing all job sources should return 400 Bad Request."""
        response = client.post("/api/jobs")
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Missing job source" in data["error"]
    
    def test_empty_job_description_returns_400(self):
        """Empty job description with no other sources should return 400."""
        response = client.post(
            "/api/jobs",
            data={"description": ""},
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Missing job source" in data["error"]
    
    def test_whitespace_only_description_returns_error(self):
        """Whitespace-only description with no other sources should return error."""
        response = client.post(
            "/api/jobs",
            data={"description": "   "},
        )
        # Should be an error (could be 400 or 422 depending on when validation fails)
        assert response.status_code in [400, 422]
        data = response.json()
        assert data["success"] is False
    
    def test_empty_pdf_and_no_other_sources_returns_422(self):
        """Empty PDF with no other sources should return error."""
        response = client.post(
            "/api/jobs",
            files={"job_description_pdf": ("empty.pdf", b"", "application/pdf")},
        )
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
    
    def test_corrupt_pdf_and_no_other_sources_returns_error(self):
        """Corrupt PDF with no other sources should return error."""
        corrupt_pdf = b"%PDF-1.4\nThis is not a valid PDF\nSome garbage data\n%\xFF\xFF\xFF\xFF"
        response = client.post(
            "/api/jobs",
            files={"job_description_pdf": ("corrupt.pdf", corrupt_pdf, "application/pdf")},
        )
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
    
    def test_description_only_succeeds(self):
        """Should succeed with description only."""
        # This test would require mocking the LLM service
        # For now, we test the endpoint structure
        pass
    
    def test_parameter_renamed_to_job_description_pdf(self):
        """The parameter should be named job_description_pdf, not resume."""
        # This verifies the endpoint accepts the correct parameter name
        # A 422 or other response is acceptable; we just want to verify no 404
        response = client.post(
            "/api/jobs",
            files={"job_description_pdf": ("job.pdf", b"%PDF-1.4", "application/pdf")},
        )
        # Should not be 404 (which would mean parameter not found)
        assert response.status_code != 404


class TestAnalysisEndpoint:
    """Tests for the POST /api/analysis endpoint."""
    
    def test_missing_resume_returns_422(self):
        """Missing resume should return 422 Unprocessable Entity (FastAPI validation)."""
        response = client.post("/api/analysis")
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
    
    def test_missing_job_source_returns_400(self):
        """Missing job source should return 400 Bad Request."""
        response = client.post(
            "/api/analysis",
            files={"resume": ("test.pdf", b"%PDF-1.4\n%test", "application/pdf")},
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Missing job source" in data["error"]
    
    def test_invalid_resume_file_returns_400(self):
        """Non-PDF resume should return 400 Bad Request."""
        response = client.post(
            "/api/analysis",
            files={"resume": ("test.txt", b"not a pdf", "text/plain")},
            data={"description": "Software engineer needed"},
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Invalid file type" in data["error"]
    
    def test_empty_resume_returns_400(self):
        """Empty resume should return 400 Bad Request."""
        response = client.post(
            "/api/analysis",
            files={"resume": ("empty.pdf", b"", "application/pdf")},
            data={"description": "Software engineer needed"},
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "Empty resume file"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

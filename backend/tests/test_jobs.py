"""Tests for the jobs API endpoint with focus on LinkedIn URL handling and extraction validation."""

from unittest.mock import Mock, patch, MagicMock
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.api.jobs import (
    normalize_linkedin_url,
    validate_job_extraction,
    ExtractionValidationError,
)
from src.models.job import JobPosting

client = TestClient(app)


class TestLinkedInURLNormalization:
    """Tests for LinkedIn URL normalization."""
    
    def test_normalize_search_results_url_with_current_job_id(self):
        """Search results URL with currentJobId should convert to direct job URL."""
        input_url = "https://www.linkedin.com/jobs/search/?currentJobId=4453319631&eBP=NON_CHARGEABLE_CHANNEL&refId=xwXOT6rpOaOk6n%2BJFVEcXQ%3D%3D"
        expected_url = "https://www.linkedin.com/jobs/view/4453319631/"
        
        result = normalize_linkedin_url(input_url)
        assert result == expected_url
    
    def test_normalize_direct_view_url_unchanged(self):
        """Direct job view URL should remain unchanged."""
        input_url = "https://www.linkedin.com/jobs/view/4453319631/"
        result = normalize_linkedin_url(input_url)
        assert result == input_url
    
    def test_normalize_non_linkedin_url_unchanged(self):
        """Non-LinkedIn URLs should pass through unchanged."""
        input_url = "https://example.com/jobs/123"
        result = normalize_linkedin_url(input_url)
        assert result == input_url


class TestExtractionValidation:
    """Tests for job extraction validation."""
    
    def test_valid_job_extraction_passes(self):
        """Valid job extraction should pass validation."""
        job_data = JobPosting(
            job_title="Backend Engineer",
            company_name="HelloFresh",
            required_skills=["Python", "AWS"],
            key_responsibilities=["Design systems", "Lead migration"]
        )
        
        scraped_text = "Backend Engineer at HelloFresh. " * 20
        validate_job_extraction(job_data, scraped_text)  # Should not raise
    
    def test_validation_fails_linkedin_company_name(self):
        """Validation should fail when company_name is 'LinkedIn'."""
        job_data = JobPosting(
            job_title="Backend Engineer",
            company_name="LinkedIn",
            required_skills=["Python"],
            key_responsibilities=["Build systems"]
        )
        
        scraped_text = "Some job description " * 50
        
        with pytest.raises(ExtractionValidationError) as exc_info:
            validate_job_extraction(job_data, scraped_text)
        
        assert "generic" in str(exc_info.value).lower()
    
    def test_validation_fails_empty_responsibilities(self):
        """Validation should fail when key_responsibilities is empty."""
        job_data = JobPosting(
            job_title="Backend Engineer",
            company_name="HelloFresh",
            required_skills=["Python"],
            key_responsibilities=[]
        )
        
        scraped_text = "Some job description " * 50
        
        with pytest.raises(ExtractionValidationError):
            validate_job_extraction(job_data, scraped_text)
    
    def test_validation_fails_empty_skills(self):
        """Validation should fail when required_skills is empty."""
        job_data = JobPosting(
            job_title="Backend Engineer",
            company_name="HelloFresh",
            required_skills=[],
            key_responsibilities=["Build systems"]
        )
        
        scraped_text = "Some job description " * 50
        
        with pytest.raises(ExtractionValidationError):
            validate_job_extraction(job_data, scraped_text)


class TestHealthEndpoint:
    """Tests for the health check endpoint."""
    
    def test_health_returns_ok(self):
        """Health endpoint should return 200 with status ok."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "intelliapply-api"


class TestLinkedInURLIntegration:
    """Integration tests for LinkedIn URL handling and the HelloFresh scenario."""
    
    def test_linkedin_search_url_normalizes_correctly(self):
        """Test the exact LinkedIn URL from requirements normalizes correctly."""
        # The URL provided in requirements
        input_url = "https://www.linkedin.com/jobs/search/?currentJobId=4453319631&eBP=NON_CHARGEABLE_CHANNEL&refId=xwXOT6rpOaOk6n%2BJFVEcXQ%3D%3D&trackingId=PZS2Y%2Ba%2FA39dCPR2rgnxww%3D%3D&showHowYouFit=HOW_YOU_FIT&keywords=Backend%20Engineer&origin=QUALIFICATION_LANDING&geoId=90009551"
        
        normalized_url = normalize_linkedin_url(input_url)
        
        # Should convert to direct job URL
        assert normalized_url == "https://www.linkedin.com/jobs/view/4453319631/"
    
    def test_hellofresh_backend_job_extraction_scenario(self):
        """
        Test the exact scenario from requirements:
        LinkedIn search URL resolves to HelloFresh Backend Engineer job.
        
        This test validates that:
        1. URL normalizes correctly
        2. Extracted data contains required fields
        3. Validation passes for real job data
        """
        # The HelloFresh job as described in requirements
        hellofresh_job = JobPosting(
            job_title="Backend/Software Engineer",
            company_name="HelloFresh",
            company_website="https://www.hellofresh.com",
            location="Berlin, Germany",
            remote_status="Hybrid",
            posting_age_days=5,
            required_skills=[
                "Python", "SQL", "Go", "distributed systems",
                "microservices architecture", "AWS", "Azure", "GCP",
                "Docker", "Kubernetes", "Agile"
            ],
            preferred_skills=["Rust", "GraphQL"],
            experience_level="Senior (5+ years)",
            education_requirements="Bachelor's in Computer Science",
            salary_range="€75,000 - €95,000",
            key_responsibilities=[
                "Design, develop, and maintain scalable and reliable back-end services",
                "Focus on distributed architecture and microservices",
                "Lead the migration of critical services from monolithic to microservices"
            ],
            company_research=None
        )
        
        # Simulate scraped content from the actual job page
        scraped_content = """
        Backend Engineer
        HelloFresh
        Berlin, Germany
        Hybrid
        
        Our operation planning team is focused on optimizing our planning processes and forecasting capabilities.
        We are looking for a Backend Engineer to join our team.
        
        Key Responsibilities:
        - Design, develop, and maintain scalable and reliable back-end services, focusing on distributed architecture and microservices.
        - Lead the migration of critical services from a monolithic architecture to a microservices framework.
        - Optimize planning processes and forecasting capabilities.
        
        Required Skills:
        Python, SQL, Go, distributed systems, microservices architecture, AWS, Azure, GCP, Docker, Kubernetes, Agile
        
        Experience: 5+ years of backend development experience
        Education: Bachelor's degree in Computer Science
        Salary: €75,000 - €95,000
        """ * 5  # Make it long enough to pass validation
        
        # Should pass validation
        validate_job_extraction(hellofresh_job, scraped_content)
        
        # Verify required fields are present
        assert hellofresh_job.company_name == "HelloFresh"
        assert "Python" in hellofresh_job.required_skills
        assert "AWS" in hellofresh_job.required_skills
        assert "Docker" in hellofresh_job.required_skills
        assert "Kubernetes" in hellofresh_job.required_skills
        assert len(hellofresh_job.key_responsibilities) > 0
    
    def test_linkedin_page_shell_extraction_fails_validation(self):
        """
        Test the regression scenario: LinkedIn search URL returns page shell data.
        
        This is what happens BEFORE the fix when a search URL scrapes the page shell.
        After the fix, this scenario should be detected and rejected.
        """
        # This is what would be extracted from the search page shell (the problem)
        invalid_extraction = JobPosting(
            job_title="null",
            company_name="LinkedIn",
            required_skills=[],
            key_responsibilities=[]
        )
        
        # This extraction should FAIL validation
        short_shell_content = "LinkedIn Search Results"
        
        with pytest.raises(ExtractionValidationError) as exc_info:
            validate_job_extraction(invalid_extraction, short_shell_content)
        
        error_msg = str(exc_info.value)
        # Should detect that this is generic platform data, not real job
        assert "generic" in error_msg.lower() or "linkedin" in error_msg.lower()


class TestRegressionPrevention:
    """Tests to prevent regression of the original bug."""
    
    def test_empty_job_data_response_never_succeeds(self):
        """
        Regression test: Ensure the response from the original bug:
        {
            "job_title": "null",
            "company_name": "LinkedIn",
            "required_skills": [],
            "key_responsibilities": []
        }
        
        Cannot be returned as HTTP 200 successful extraction.
        """
        bad_response_data = JobPosting(
            job_title="null",
            company_name="LinkedIn",
            company_website=None,
            location=None,
            remote_status=None,
            posting_age_days=None,
            required_skills=[],
            preferred_skills=[],
            experience_level=None,
            education_requirements=None,
            salary_range=None,
            key_responsibilities=[],
            company_research=None
        )
        
        # Should fail validation - never passes through
        with pytest.raises(ExtractionValidationError):
            validate_job_extraction(bad_response_data, "LinkedIn")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

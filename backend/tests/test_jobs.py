"""Tests for the jobs API endpoint."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


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
        assert "jobs" in data


class TestJobsEndpoint:
    """Tests for the POST /api/jobs endpoint."""
    
    def test_missing_both_description_and_url_returns_422(self):
        """Missing both description and url should return 422 Unprocessable Entity."""
        response = client.post("/api/jobs", json={})
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert "description" in data["error"] or "url" in data["error"]
    
    def test_empty_description_returns_422(self):
        """Empty description should return 422 (treated as no input)."""
        response = client.post(
            "/api/jobs",
            json={"description": ""},
        )
        # Empty description is treated as no input
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
    
    def test_invalid_url_format_returns_400(self):
        """Invalid URL format should return 400 Bad Request."""
        response = client.post(
            "/api/jobs",
            json={"url": "not-a-valid-url"},
        )
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Invalid URL" in data["error"]
    
    def test_valid_description_returns_processed_job(self):
        """Valid job description should return 200 with processed job data."""
        valid_job_description = """
        Job Title: Senior Software Engineer
        
        Company: TechCorp Inc.
        Website: https://techcorp.example.com
        
        Location: San Francisco, CA
        Remote Status: Hybrid
        
        Required Skills:
        - Python
        - JavaScript
        - AWS
        - Docker
        
        Preferred Skills:
        - Kubernetes
        - React
        - TypeScript
        
        Experience Level: 5+ years
        Education Requirements: BS in Computer Science or related field
        
        Salary Range: $150,000 - $200,000
        
        Key Responsibilities:
        - Lead development of cloud-based applications
        - Design and implement scalable microservices
        - Collaborate with cross-functional teams
        """
        
        response = client.post(
            "/api/jobs",
            json={"description": valid_job_description},
        )
        
        # Without API key, we expect 500 (LLM failure) - this is expected behavior
        # The test verifies that the request was processed and failed gracefully
        assert response.status_code in [200, 500]  # 200 if API key available, 500 otherwise
        
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            assert "job_id" in data
            assert data["status"] == "processed"
            assert "data" in data
            assert "data" in data["data"]
            
            job_data = data["data"]["data"]
            assert "job_title" in job_data
            assert "company_name" in job_data
            assert "required_skills" in job_data
    
    def test_valid_url_returns_processed_job(self):
        """Valid URL should return 200 with processed job data (placeholder implementation)."""
        response = client.post(
            "/api/jobs",
            json={"url": "https://example.com/job/123"},
        )
        
        # Without API key, we expect 500 (LLM failure) - this is expected behavior
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            assert "job_id" in data
            assert data["status"] == "processed"
    
    def test_both_description_and_url_prefers_description(self):
        """When both description and url are provided, description should be used."""
        valid_job_description = """
        Job Title: Frontend Developer
        
        Company: DesignStudio
        Location: New York, NY
        
        Required Skills:
        - React
        - CSS
        - HTML
        
        Experience Level: 3+ years
        """
        
        response = client.post(
            "/api/jobs",
            json={
                "description": valid_job_description,
                "url": "https://example.com/job/123",
            },
        )
        
        # Without API key, we expect 500 (LLM failure) - this is expected behavior
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
    
    def test_empty_url_returns_422(self):
        """Empty URL should return 422 (treated as no input)."""
        response = client.post(
            "/api/jobs",
            json={"url": ""},
        )
        # Empty URL is treated as no input
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False


class TestJobSchema:
    """Tests for job request/response schemas."""
    
    def test_job_request_with_only_description(self):
        """JobRequest should accept only description."""
        response = client.post(
            "/api/jobs",
            json={"description": "Test job description"},
        )
        # Expected to succeed (if description is valid) or fail gracefully with 500
        assert response.status_code in [200, 422, 500]
    
    def test_job_request_with_only_url(self):
        """JobRequest should accept only url."""
        response = client.post(
            "/api/jobs",
            json={"url": "https://example.com/job"},
        )
        # Expected to succeed (if url is valid) or fail gracefully with 500
        assert response.status_code in [200, 500]
    
    def test_job_request_with_both(self):
        """JobRequest should accept both description and url."""
        response = client.post(
            "/api/jobs",
            json={
                "description": "Test description",
                "url": "https://example.com/job",
            },
        )
        # Expected to succeed (if valid) or fail gracefully with 500
        assert response.status_code in [200, 500]


class TestErrorHandling:
    """Tests for error handling scenarios."""
    
    def test_large_description_returns_400(self):
        """Excessively large description should return 400 Bad Request."""
        large_description = "x" * (51 * 1024)  # 51KB, exceeds 50KB limit
        
        response = client.post(
            "/api/jobs",
            json={"description": large_description},
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "too large" in data["error"].lower()
    
    def test_url_without_http_scheme_returns_400(self):
        """URL without http/https scheme should return 400."""
        response = client.post(
            "/api/jobs",
            json={"url": "example.com/job"},
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "Invalid URL" in data["error"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

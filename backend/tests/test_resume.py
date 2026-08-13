"""Tests for the resume API endpoint."""

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


class TestResumeEndpoint:
    """Tests for the POST /api/resume endpoint."""
    
    def test_missing_file_returns_422(self):
        """Missing required file should return 422 Unprocessable Entity."""
        # FastAPI returns 422 for missing required fields
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
    
    def test_corrupt_pdf_returns_500(self):
        """Corrupt PDF should return 500 Internal Server Error."""
        corrupt_pdf = (
            b"%PDF-1.4\nThis is not a valid PDF\nSome garbage data\n%\xFF\xFF\xFF\xFF"
        )
        response = client.post(
            "/api/resume",
            files={"resume": ("corrupt.pdf", corrupt_pdf, "application/pdf")},
        )
        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert "Failed to extract text" in data["error"]
    
    @pytest.mark.skip(reason="Requires valid PDF file with extractable text")
    def test_valid_pdf_returns_processed_resume(self):
        """Valid PDF should return 200 with processed resume data."""
        # This would require a real PDF fixture
        # For now, this test is marked to skip
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""Job Service wrapper for existing job extraction functionality."""

from src.services.llm_service import LLMService
from src.models.job import JobPosting


class JobExtractor:
    """Wrapper around existing LLMService for job extraction."""
    
    def __init__(self):
        self._service = LLMService()
    
    def extract_job(self, text: str) -> JobPosting:
        """Extract structured job data from text.
        
        Args:
            text: Extracted text content from job posting (PDF or scraped)
            
        Returns:
            JobPosting Pydantic model with structured data
        """
        return self._service.extract_job(text)

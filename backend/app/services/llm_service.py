"""LLM Service wrapper for existing resume extraction functionality."""

from src.services.llm_service import LLMService
from src.models.resume import Resume


class ResumeExtractor:
    """Wrapper around existing LLMService for resume extraction."""
    
    def __init__(self):
        self._service = LLMService()
    
    def extract_resume(self, text: str) -> Resume:
        """Extract structured resume data from text.
        
        Args:
            text: Extracted text content from resume PDF
            
        Returns:
            Resume Pydantic model with structured data
        """
        return self._service.extract_resume(text)

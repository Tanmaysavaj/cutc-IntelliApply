"""Tavily Service wrapper for existing company research functionality."""

from src.services.tavily_service import TavilyService


class TavilyExtractor:
    """Wrapper around existing TavilyService for API use."""
    
    def __init__(self):
        self._service = TavilyService()
    
    def research_company(self, company_name: str) -> str:
        """Research a company using Tavily.
        
        Args:
            company_name: Name of the company to research
            
        Returns:
            Company research summary
        """
        return self._service.research_company(company_name)

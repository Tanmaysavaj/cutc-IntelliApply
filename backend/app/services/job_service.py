"""Job Service wrapper for existing job extraction functionality."""

import re
import logging
from typing import Optional
from src.services.llm_service import LLMService
from src.models.job import JobPosting
from src.services.tavily_service import TavilyService
from src.services.whois_service import WhoisService
from src.models.job import CompanyResearch

logger = logging.getLogger(__name__)


class JobExtractor:
    """Wrapper around existing LLMService for job extraction."""
    
    def __init__(self):
        self._llm_service = LLMService()
        self._tavily_service = TavilyService()
        self._whois_service = WhoisService()
    
    def extract_job_from_text(self, text: str) -> JobPosting:
        """Extract structured job data from text.
        
        Args:
            text: Extracted text content from job posting (PDF or webpage)
            
        Returns:
            JobPosting Pydantic model with structured data
        """
        return self._llm_service.extract_job(text)
    
    def extract_job_from_url(self, url: str) -> JobPosting:
        """Extract structured job data from a job URL.
        
        This method fetches the job posting content and extracts structured data.
        
        Args:
            url: URL to the job posting
            
        Returns:
            JobPosting Pydantic model with structured data
        """
        # For now, we'll return a placeholder that will be filled by the API layer
        # The actual URL fetching and extraction would require an HTML parser
        raise NotImplementedError(
            "URL-based job extraction requires HTML parsing. "
            "Please provide job text or use description fallback."
        )
    
    def enrich_job_with_research(self, job: JobPosting) -> JobPosting:
        """Enrich a job posting with company research and WHOIS data.
        
        Args:
            job: JobPosting object to enrich
            
        Returns:
            Enriched JobPosting with company research data
        """
        if job.company_name:
            try:
                company_research = self._tavily_service.research_company(job.company_name)
                job.company_research = CompanyResearch(summary=company_research)
            except Exception as e:
                logger.warning(f"Failed to research company {job.company_name}: {e}")
        
        if job.company_website:
            try:
                whois_data = self._whois_service.lookup(job.company_website)
                # Note: We could add WHOIS data to a new field if needed
                logger.debug(f"WHOIS lookup for {job.company_website}: {whois_data}")
            except Exception as e:
                logger.warning(f"Failed to lookup WHOIS for {job.company_website}: {e}")
        
        return job

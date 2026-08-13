"""Whois Service wrapper for existing domain lookup functionality."""

from src.services.whois_service import WhoisService


class WhoisExtractor:
    """Wrapper around existing WhoisService for API use."""
    
    def __init__(self):
        self._service = WhoisService()
    
    def lookup(self, domain: str) -> dict:
        """Lookup WHOIS information for a domain.
        
        Args:
            domain: Domain name to lookup
            
        Returns:
            WHOIS lookup result as dictionary
        """
        return self._service.lookup(domain)

"""URL Service for extracting job content from URLs."""

import logging
import requests
from requests.exceptions import RequestException, Timeout, HTTPError

# Configure logging
logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.INFO)


class URLEncoder:
    """Service for fetching and extracting job content from URLs."""
    
    # User agent to use for requests
    USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    # Maximum response size: 100KB
    MAX_CONTENT_SIZE = 100 * 1024  # 100 KB
    
    # Request timeout: 10 seconds
    REQUEST_TIMEOUT = 10
    
    def __init__(self):
        """Initialize the URL encoder with a session."""
        self._session = requests.Session()
        self._session.headers.update({"User-Agent": self.USER_AGENT})
    
    def fetch_url(self, url: str) -> str:
        """Fetch content from a URL.
        
        Args:
            url: URL to fetch
            
        Returns:
            Extracted text content from the URL, or empty string if failed
            
        Note:
            This is a basic implementation. Complex sites like LinkedIn
            may require more sophisticated scraping with browser automation.
            For now, this works for simple HTML pages.
        """
        if not url:
            return ""
        
        url = url.strip()
        
        if not url.startswith(('http://', 'https://')):
            logger.warning(f"Invalid URL format: {url}")
            return ""
        
        try:
            logger.info(f"Fetching URL: {url}")
            response = self._session.get(
                url,
                timeout=self.REQUEST_TIMEOUT,
                allow_redirects=True
            )
            
            # Check for HTTP errors
            response.raise_for_status()
            
            # Check content size
            if len(response.content) > self.MAX_CONTENT_SIZE:
                logger.warning(f"URL content too large: {len(response.content)} bytes")
                return ""
            
            # Try to extract text content
            content_type = response.headers.get('Content-Type', '').lower()
            
            # Only process HTML content
            if 'text/html' not in content_type and 'application/xhtml+xml' not in content_type:
                logger.info(f"URL content type not HTML: {content_type}")
                return ""
            
            # Extract text from HTML (basic implementation)
            text = self._extract_text_from_html(response.text)
            
            if not text or not text.strip():
                logger.warning(f"No text extracted from URL: {url}")
                return ""
            
            logger.info(f"Successfully fetched {len(text)} characters from URL")
            return text
            
        except Timeout:
            logger.error(f"Request timeout for URL: {url}")
            return ""
        except HTTPError as e:
            logger.error(f"HTTP error fetching URL {url}: {e}")
            return ""
        except RequestException as e:
            logger.error(f"Request error fetching URL {url}: {e}")
            return ""
        except Exception as e:
            logger.error(f"Unexpected error fetching URL {url}: {e}")
            return ""
    
    def _extract_text_from_html(self, html: str) -> str:
        """Extract plain text from HTML content.
        
        Args:
            html: HTML content string
            
        Returns:
            Extracted plain text
        """
        if not html:
            return ""
        
        # Basic HTML to text extraction
        # Remove script and style elements
        import re
        
        # Remove script and style tags
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', ' ', html)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        return text


__all__ = ["URLEncoder"]

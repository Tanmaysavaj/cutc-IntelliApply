"""PDF Service wrapper for existing PDF extraction functionality."""

from src.services.pdf_service import PDFService


class PDFExtractor:
    """Wrapper around existing PDFService for API use."""
    
    def __init__(self):
        self._service = PDFService()
    
    def extract_text(self, pdf_path: str) -> str:
        """Extract text from PDF file.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text content
        """
        return self._service.extract_text(pdf_path)

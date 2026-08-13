"""Job API routes for processing job postings."""

import logging
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse
import requests

# Use relative imports to reach src module
import sys
from pathlib import Path as PathObj
sys.path.insert(0, str(PathObj(__file__).resolve().parents[3]))

from src.models.job import JobPosting as JobModel
from app.services.pdf_service import PDFExtractor
from app.schemas.resume import ErrorResponse

# Configure logging - use stderr to avoid exposing sensitive data
logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.INFO)

router = APIRouter(
    prefix="/api/jobs",
    tags=["Jobs"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - Invalid input"},
        422: {"model": ErrorResponse, "description": "Unprocessable Entity - Processing failed"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Maximum URL fetch size: 5MB (usually HTML is much smaller)
MAX_URL_CONTENT_SIZE = 5 * 1024 * 1024  # 5 MB


def extract_job_from_text(job_text: str) -> JobModel:
    """Extract structured job data from text using existing LLMService.
    
    Args:
        job_text: Extracted text content from job posting
        
    Returns:
        JobPosting Pydantic model with structured data
        
    Raises:
        RuntimeError: If extraction fails
    """
    # Import here to avoid circular imports
    from src.services.llm_service import LLMService
    
    extractor = LLMService()
    return extractor.extract_job(job_text)


def fetch_url_content(url: str) -> Optional[str]:
    """Fetch and extract text content from a URL.
    
    Args:
        url: URL to fetch
        
    Returns:
        Extracted text content or None if fetching/parsing fails
    """
    try:
        logger.info(f"Fetching URL: {url}")
        
        # Fetch with timeout and size limit
        response = requests.get(url, timeout=10, stream=True)
        response.raise_for_status()
        
        # Check content length before consuming
        if response.headers.get('content-length'):
            content_length = int(response.headers['content-length'])
            if content_length > MAX_URL_CONTENT_SIZE:
                logger.warning(f"URL content too large: {content_length} bytes")
                return None
        
        # Limit response content size
        content = b''
        for chunk in response.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > MAX_URL_CONTENT_SIZE:
                logger.warning(f"URL content exceeded max size limit")
                return None
        
        # Try to extract text from HTML
        try:
            from html.parser import HTMLParser
            
            class TextExtractor(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self.text = []
                
                def handle_data(self, data):
                    text = data.strip()
                    if text:
                        self.text.append(text)
            
            extractor = TextExtractor()
            extractor.feed(content.decode('utf-8', errors='ignore'))
            
            # Join text with newlines
            extracted_text = '\n'.join(extractor.text)
            
            if extracted_text.strip():
                logger.info(f"Successfully extracted {len(extracted_text)} characters from URL")
                return extracted_text
            
        except Exception as e:
            logger.warning(f"Failed to parse HTML from URL: {e}")
            return None
        
    except requests.RequestException as e:
        logger.warning(f"Failed to fetch URL: {e}")
        return None
    except Exception as e:
        logger.warning(f"Unexpected error fetching URL: {e}")
        return None


@router.post(
    "",
    response_model=JobModel,
    responses={
        200: {"description": "Job processed successfully"},
        400: {"description": "Invalid input - missing required fields"},
        422: {"description": "Unprocessable Entity - Processing failed"},
        500: {"description": "Processing error"},
    },
)
async def process_job(
    job_description_pdf: Annotated[
        Optional[UploadFile], File(description="Optional PDF containing the job description")
    ] = None,
    url: Annotated[
        Optional[str], Form(description="Optional URL to job posting")
    ] = None,
    description: Annotated[
        Optional[str], Form(description="Optional job description text")
    ] = None,
):
    """Process a job posting and extract structured information.
    
    Accepts job posting from multiple sources with automatic fallback:
    1. Job description text (highest priority)
    2. Job description PDF
    3. Job posting URL (lowest priority)
    
    At least one source must be provided. If multiple sources are provided,
    they will be tried in priority order until one succeeds.
    
    Args:
        job_description_pdf: Optional PDF file containing job description
        url: Optional URL to job posting webpage
        description: Optional job description text
        
    Returns:
        Structured job data with extracted skills, requirements, etc.
    """
    job_id = str(uuid.uuid4())
    
    # Initialize all potential job text sources (avoids UnboundLocalError)
    job_text = None
    extraction_source = None
    
    # Validate that at least one job source is provided
    if not description and not job_description_pdf and not url:
        logger.warning(f"Missing job source for job {job_id}")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="Missing job source. Provide 'description', 'job_description_pdf', or 'url'.",
                resume_id=job_id
            ).model_dump(),
        )
    
    # Priority 1: Use provided description text
    if description and description.strip():
        job_text = description.strip()
        extraction_source = "description"
        logger.info(f"Using job description text for job {job_id}")
    
    # Priority 2: Extract from job description PDF
    if not job_text and job_description_pdf:
        try:
            pdf_content = await job_description_pdf.read()
            
            if len(pdf_content) == 0:
                logger.warning(f"Empty PDF provided for job {job_id}")
            elif len(pdf_content) > MAX_FILE_SIZE:
                logger.warning(f"Job description PDF too large for job {job_id}: {len(pdf_content)} bytes")
            else:
                # Save to temporary file for PDF extraction
                temp_path = None
                try:
                    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
                        temp_file.write(pdf_content)
                        temp_path = temp_file.name
                    
                    # Extract text from PDF
                    try:
                        pdf_extractor = PDFExtractor()
                        extracted_text = pdf_extractor.extract_text(temp_path)
                        
                        if extracted_text and extracted_text.strip():
                            job_text = extracted_text.strip()
                            extraction_source = "job_description_pdf"
                            logger.info(f"Successfully extracted job description from PDF for job {job_id}")
                        else:
                            logger.warning(f"No text extracted from job description PDF for job {job_id}")
                    except Exception as e:
                        logger.warning(f"Failed to extract text from job description PDF for job {job_id}: {e}")
                finally:
                    # Clean up temp file
                    if temp_path:
                        try:
                            Path(temp_path).unlink()
                        except Exception:
                            pass
        except Exception as e:
            logger.warning(f"Error reading job description PDF for job {job_id}: {e}")
    
    # Priority 3: Fetch and extract from URL
    if not job_text and url:
        url_content = fetch_url_content(url)
        if url_content and url_content.strip():
            job_text = url_content.strip()
            extraction_source = "url"
            logger.info(f"Successfully extracted job description from URL for job {job_id}")
        else:
            logger.warning(f"Could not extract content from URL for job {job_id}")
    
    # Validate that we have job text to extract
    if not job_text:
        logger.warning(f"No job text available for extraction for job {job_id}")
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                error="Could not extract job information from any source. Verify the URL is valid and contains job description.",
                resume_id=job_id
            ).model_dump(),
        )
    
    try:
        logger.info(f"Extracting job data from {extraction_source} for job {job_id}")
        
        # Extract structured job data using LLM
        try:
            job_data = extract_job_from_text(job_text)
        except Exception as e:
            logger.error(f"Job extraction failed for job {job_id}: {str(e)}")
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error="Failed to extract structured job information",
                    resume_id=job_id
                ).model_dump(),
            )
        
        logger.info(f"Successfully processed job {job_id}")
        
        # Use actual UTC timestamp when processing completes
        extracted_at = datetime.now(timezone.utc)
        
        # Add metadata
        job_data.__dict__["extracted_at"] = extracted_at
        job_data.__dict__["job_id"] = job_id
        job_data.__dict__["extraction_source"] = extraction_source
        
        return job_data
        
    except Exception as e:
        logger.error(f"Unexpected error processing job {job_id}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="Internal server error",
                resume_id=job_id
            ).model_dump(),
        )

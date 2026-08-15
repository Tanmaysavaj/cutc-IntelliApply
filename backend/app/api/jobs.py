"""Job API routes for processing job postings."""

import logging
import tempfile
import uuid
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Optional
from urllib.parse import urlparse, parse_qs

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse
import requests

# Use relative imports to reach src module
import sys
from pathlib import Path as PathObj
sys.path.insert(0, str(PathObj(__file__).resolve().parents[3]))

from src.models.job import JobPosting as JobModel
from app.services.pdf_service import PDFExtractor
from app.schemas.resume import ErrorResponse
from app.core.auth import get_optional_user

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


@router.get("", tags=["Jobs"])
async def list_jobs(user_id: Optional[str] = Depends(get_optional_user)):
    """List jobs for the authenticated user."""
    if not user_id:
        return {"jobs": []}
    
    from app.core.supabase import get_supabase_client
    client = get_supabase_client()
    
    try:
        result = client.table("jobs").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"jobs": result.data or []}
    except Exception as e:
        logger.error(f"Failed to list jobs: {e}")
        return {"jobs": []}


class ExtractionValidationError(Exception):
    """Raised when extracted job data fails validation checks."""
    pass


def normalize_linkedin_url(url: str) -> str:
    """
    Normalize LinkedIn URLs to access direct job postings.
    
    Handles two cases:
    1. Search results URL with currentJobId parameter:
       https://www.linkedin.com/jobs/search/?currentJobId=4453319631&...
       → https://www.linkedin.com/jobs/view/4453319631/
    
    2. Direct job view URL (already normalized):
       https://www.linkedin.com/jobs/view/4453319631/
       → returns as-is
    
    Args:
        url: LinkedIn URL to normalize
        
    Returns:
        Normalized URL pointing to the actual job posting
    """
    if not url or "linkedin.com" not in url.lower():
        return url
    
    try:
        parsed = urlparse(url)
        
        # Check if this is a search-results URL with currentJobId
        if "/jobs/search" in parsed.path or "/jobs/search-results" in parsed.path:
            query_params = parse_qs(parsed.query)
            
            # Extract currentJobId if present
            if "currentJobId" in query_params:
                job_ids = query_params["currentJobId"]
                if job_ids and job_ids[0]:
                    current_job_id = job_ids[0]
                    # Construct direct job view URL
                    normalized_url = f"https://www.linkedin.com/jobs/view/{current_job_id}/"
                    logger.info(f"Normalized LinkedIn search URL to direct job URL: {normalized_url}")
                    return normalized_url
        
        # If already a direct view URL, return as-is
        if "/jobs/view/" in parsed.path:
            logger.info(f"LinkedIn URL already points to direct job view")
            return url
        
        logger.warning(f"Could not normalize LinkedIn URL: {url}")
        return url
        
    except Exception as e:
        logger.warning(f"Error normalizing LinkedIn URL: {e}")
        return url


def validate_job_extraction(job_data: JobModel, scraped_text: str) -> None:
    """
    Validate that job extraction was successful and meaningful.
    
    Raises ExtractionValidationError if:
    - job_title is missing or null
    - company_name is missing, null, or generic (e.g., "LinkedIn", "Indeed", etc.)
    - key_responsibilities is empty
    - required_skills is empty
    - scraped_text is too short (indicates page scraping failure)
    
    Args:
        job_data: Extracted JobPosting model
        scraped_text: Original scraped text content
        
    Raises:
        ExtractionValidationError: If validation fails
    """
    validation_errors = []
    
    # Generic job platform names that indicate page shell scraping
    GENERIC_COMPANY_NAMES = {
        "linkedin", "linkedin jobs", "job search", "jobs", "job board", "jobs board",
        "indeed", "indeed.com", "glassdoor", "glassdoor.com", 
        "jobvite", "lever", "ashby", "greenhouse", "workday",
        "jobs page", "career page", "careers", "career opportunities"
    }
    
    # Check job title
    if not job_data.job_title or job_data.job_title == "null" or not str(job_data.job_title).strip():
        validation_errors.append("job_title is missing or null")
    
    # Check company name
    if not job_data.company_name or job_data.company_name == "null":
        validation_errors.append("company_name is missing or null")
    elif job_data.company_name.lower() in GENERIC_COMPANY_NAMES:
        validation_errors.append(f"company_name is generic/placeholder: '{job_data.company_name}' (indicates page shell was scraped, not actual job)")
    
    # Check responsibilities
    if not job_data.key_responsibilities or len(job_data.key_responsibilities) == 0:
        validation_errors.append("key_responsibilities is empty (no job details extracted)")
    
    # Check required skills
    if not job_data.required_skills or len(job_data.required_skills) == 0:
        validation_errors.append("required_skills is empty (no job details extracted)")
    
    # Check scraped text quality
    if len(scraped_text.strip()) < 200:
        validation_errors.append(f"scraped_text is too short ({len(scraped_text)} chars) - may indicate page shell rather than actual job posting")
    
    if validation_errors:
        error_msg = "Job extraction validation failed: " + "; ".join(validation_errors)
        logger.error(error_msg)
        raise ExtractionValidationError(error_msg)
    
    logger.info(f"Job extraction validation passed for '{job_data.job_title}' at '{job_data.company_name}'")


def extract_job_from_text(job_text: str) -> JobModel:
    """Extract structured job data from text using existing LLMService.
    
    Args:
        job_text: Extracted text content from job posting
        
    Returns:
        JobPosting Pydantic model with structured data
        
    Raises:
        RuntimeError: If extraction fails
        ExtractionValidationError: If validation fails
    """
    # Import here to avoid circular imports
    from src.services.llm_service import LLMService
    
    extractor = LLMService()
    job_data = extractor.extract_job(job_text)
    
    # Validate the extraction
    validate_job_extraction(job_data, job_text)
    
    return job_data


def fetch_url_content(url: str) -> Optional[str]:
    """Fetch and extract text content from a URL.
    
    For LinkedIn URLs, normalizes search result URLs to direct job URLs.
    
    Args:
        url: URL to fetch
        
    Returns:
        Extracted text content or None if fetching/parsing fails
    """
    try:
        # Normalize LinkedIn URLs if applicable
        if "linkedin.com" in url.lower():
            url = normalize_linkedin_url(url)
            logger.info(f"Using normalized URL: {url}")
        
        logger.info(f"Fetching URL: {url}")
        
        # Fetch with timeout and size limit
        response = requests.get(url, timeout=10, stream=True)
        response.raise_for_status()
        
        logger.info(f"HTTP {response.status_code} from {url}")
        
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
                logger.debug(f"Extracted text preview (first 500 chars): {extracted_text[:500]}")
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
    user_id: Optional[str] = Depends(get_optional_user),
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
            # If URL fails and no description is available, fail
            if not description:
                logger.warning(f"URL extraction failed and no fallback description available for job {job_id}")
                return JSONResponse(
                    status_code=422,
                    content=ErrorResponse(
                        error="Could not extract job information from URL. Verify the URL is valid and publicly accessible.",
                        resume_id=job_id
                    ).model_dump(),
                )
    
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
        except ExtractionValidationError as e:
            logger.warning(f"Job extraction validation failed for job {job_id}: {str(e)}")
            
            # If validation failed and we came from URL, try falling back to description if available
            if extraction_source == "url" and description:
                logger.info(f"URL extraction validation failed, attempting fallback to provided description for job {job_id}")
                try:
                    job_text = description.strip()
                    job_data = extract_job_from_text(job_text)
                    extraction_source = "description"
                    logger.info(f"Fallback to description succeeded for job {job_id}")
                except Exception as fallback_error:
                    logger.error(f"Fallback to description also failed for job {job_id}: {str(fallback_error)}")
                    return JSONResponse(
                        status_code=422,
                        content=ErrorResponse(
                            error=f"Job extraction failed: {str(e)}. URL contained insufficient job details, and fallback extraction also failed.",
                            resume_id=job_id
                        ).model_dump(),
                    )
            else:
                # No fallback available
                return JSONResponse(
                    status_code=422,
                    content=ErrorResponse(
                        error=f"Job extraction validation failed: {str(e)}. The URL or content does not contain sufficient job details.",
                        resume_id=job_id
                    ).model_dump(),
                )
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
        
        # If authenticated, persist job to Supabase
        if user_id:
            try:
                from app.core.supabase import get_supabase_client
                client = get_supabase_client()
                
                parsed_dict = job_data.model_dump() if hasattr(job_data, 'model_dump') else job_data.dict()
                
                client.table("jobs").insert({
                    "id": job_id,
                    "user_id": user_id,
                    "url": url or None,
                    "company": getattr(job_data, 'company_name', None),
                    "title": getattr(job_data, 'job_title', None),
                    "description": (description or job_text or "")[:5000],
                    "parsed_data": parsed_dict,
                }).execute()
                
                logger.info(f"Job {job_id} persisted for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to persist job {job_id}: {e}")
                # Don't fail the request - still return parsed data
        
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

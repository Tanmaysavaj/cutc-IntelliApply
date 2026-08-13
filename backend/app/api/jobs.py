"""Job API routes for processing job postings."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.schemas.job import JobRequest, ErrorResponse, JobResponse, JobResponseData
from app.services.job_service import JobExtractor
from app.services.tavily_service import TavilyExtractor
from app.services.whois_service import WhoisExtractor

# Configure logging
logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.INFO)

router = APIRouter(
    prefix="/api/jobs",
    tags=["Jobs"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - Invalid input"},
        422: {"model": ErrorResponse, "description": "Unprocessable Entity - Validation failed"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)

# Maximum description size: 50KB
MAX_DESCRIPTION_SIZE = 50 * 1024  # 50 KB


@router.post(
    "",
    response_model=JobResponse,
    responses={
        200: {"description": "Job posting processed successfully"},
        400: {"description": "Missing or invalid input"},
        500: {"description": "Processing error"},
    },
)
async def process_job(job_request: JobRequest):
    """Process a job posting and extract structured information.
    
    Supports two input methods:
    - Direct description text
    - Job posting URL (to be scraped)
    
    At least one of description or url must be provided.
    
    Args:
        job_request: JobRequest containing description or url
        
    Returns:
        Structured job data with extracted skills, requirements, company info, etc.
    """
    job_id = str(uuid.uuid4())
    
    # Validate that at least one input is provided
    if not job_request.description and not job_request.url:
        logger.warning(f"No input provided for job {job_id}")
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                error="At least one of 'description' or 'url' must be provided",
                job_id=job_id
            ).model_dump(),
        )
    
    # Validate description size if provided
    if job_request.description and len(job_request.description) > MAX_DESCRIPTION_SIZE:
        logger.warning(f"Description too large for job {job_id}: {len(job_request.description)} bytes")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error=f"Description too large. Maximum size is {MAX_DESCRIPTION_SIZE / 1024}KB",
                job_id=job_id
            ).model_dump(),
        )
    
    # Validate URL format if provided
    if job_request.url:
        if not is_valid_url(job_request.url):
            logger.warning(f"Invalid URL format for job {job_id}: {job_request.url}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error="Invalid URL format",
                    job_id=job_id
                ).model_dump(),
            )
    
    try:
        # If URL is provided, we would scrape it here
        # For now, we'll use the description if available, or process the URL separately
        if job_request.description:
            # Process direct description
            text = job_request.description
        else:
            # For URL-only input, we would scrape the page
            # Placeholder for future implementation
            text = f"Job posting from URL: {job_request.url}\n[URL scraping not yet implemented]"
            logger.info(f"URL-only input provided for job {job_id}, using placeholder text")
        
        logger.info(f"Processing job {job_id}")
        
        # Extract structured job data using LLM
        extractor = JobExtractor()
        job_data = extractor.extract_job(text)
        
        logger.info(f"Successfully extracted job data for {job_id}")
        
        # Perform company research if company name is available
        tavily_extractor = TavilyExtractor()
        company_research = tavily_extractor.research_company(job_data.company_name)
        job_data.company_research = {
            "summary": company_research
        }
        
        # Perform WHOIS lookup if company website is available
        if job_data.company_website:
            whois_extractor = WhoisExtractor()
            whois_info = whois_extractor.lookup(job_data.company_website)
            # Note: whois_info will be empty dict if lookup fails
            job_data.company_research["whois_info"] = whois_info
        
        logger.info(f"Successfully completed company research for {job_id}")
        
        # Use actual UTC timestamp when processing completes
        processed_at = datetime.now(timezone.utc)
        
        return JobResponse(
            success=True,
            job_id=job_id,
            status="processed",
            data=JobResponseData(
                job_id=job_id,
                status="processed",
                processed_at=processed_at,
                data=job_data
            )
        )
        
    except Exception as e:
        logger.error(f"Unexpected error processing job {job_id}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="Internal server error",
                job_id=job_id
            ).model_dump(),
        )


def is_valid_url(url: str) -> bool:
    """Validate URL format.
    
    Args:
        url: URL string to validate
        
    Returns:
        True if URL appears valid, False otherwise
    """
    if not url:
        return False
    
    # Basic URL validation
    url = url.strip()
    
    # Check for valid URL pattern
    if not url.startswith(('http://', 'https://')):
        return False
    
    # Check for basic structure
    if '.' not in url.split('/')[2] if len(url.split('/')) > 2 else True:
        return False
    
    return True

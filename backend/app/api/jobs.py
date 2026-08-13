"""Job API routes for processing job postings with multipart/form-data."""
import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

# Import JobPosting model for CompanyResearch
import sys
from pathlib import Path as PathObj
sys.path.insert(0, str(PathObj(__file__).resolve().parents[3]))
from src.models.job import CompanyResearch

# Configure logging
logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.INFO)

router = APIRouter(
    prefix="/api/jobs",
    tags=["Jobs"],
    responses={
        400: {"description": "Bad Request - Invalid file or input"},
        422: {"description": "Unprocessable Entity - Processing failed"},
        500: {"description": "Internal Server Error"},
    },
)

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Maximum description size: 50KB
MAX_DESCRIPTION_SIZE = 50 * 1024  # 50 KB

# Minimum useful description length (characters)
MIN_DESCRIPTION_LENGTH = 100

# Import after router definition to avoid circular imports
from app.schemas.job import (
    ExtractionInfo,
    JobResponseFailed,
    JobResponsePartial,
    JobResponseSuccess,
    JobResponseSuccessData,
    ErrorResponse,
)
from app.services.job_service import JobExtractor
from app.services.tavily_service import TavilyExtractor
from app.services.whois_service import WhoisExtractor
from app.services.url_service import URLEncoder


def is_valid_url(url: str) -> bool:
    """Validate URL format.
    
    Args:
        url: URL string to validate
        
    Returns:
        True if URL appears valid, False otherwise
    """
    if not url:
        return False
    
    url = url.strip()
    
    if not url.startswith(('http://', 'https://')):
        return False
    
    return True


def has_usable_description(description: Optional[str]) -> bool:
    """Check if description is substantial enough to use.
    
    Args:
        description: Job description text
        
    Returns:
        True if description is usable, False otherwise
    """
    if not description:
        return False
    
    description = description.strip()
    
    if len(description) < MIN_DESCRIPTION_LENGTH:
        return False
    
    # Check if description looks like just a job title (too short)
    if len(description.split()) < 10:
        return False
    
    return True


@router.post(
    "",
    responses={
        200: {"description": "Job posting processed successfully or with partial data"},
        400: {"description": "Invalid file format or empty file"},
        422: {"description": "Unprocessable Entity - No job source provided"},
        500: {"description": "Processing error"},
    },
)
async def process_job(
    resume: Annotated[
        Optional[UploadFile], 
        File(description="Optional PDF resume file")
    ] = None,
    url: Annotated[
        Optional[str], 
        Form(description="Job posting URL to scrape and process")
    ] = None,
    description: Annotated[
        Optional[str], 
        Form(description="Job description text to process")
    ] = None,
):
    """Process a job posting and extract structured information.
    
    Supports multiple input methods via multipart/form-data:
    - URL to job posting (will be scraped)
    - Direct job description text
    - Resume PDF (optional, processed but not used for job extraction)
    - Combination of the above
    
    At least one of url or description must be provided.
    
    Args:
        resume: Optional PDF resume file
        url: Optional job posting URL
        description: Optional job description text
        
    Returns:
        Structured job data with extraction metadata
    """
    job_id = str(uuid.uuid4())
    
    # Validate that at least one job source is provided
    has_job_source = url or has_usable_description(description)
    
    if not has_job_source:
        logger.warning(f"No job source provided for job {job_id}")
        return JSONResponse(
            status_code=422,
            content=ErrorResponse(
                error="At least one of 'url' or 'description' must be provided",
                job_id=job_id
            ).model_dump(),
        )
    
    # Validate description size if provided
    if description and len(description) > MAX_DESCRIPTION_SIZE:
        logger.warning(f"Description too large for job {job_id}: {len(description)} bytes")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error=f"Description too large. Maximum size is {MAX_DESCRIPTION_SIZE / 1024}KB",
                job_id=job_id
            ).model_dump(),
        )
    
    # Validate URL format if provided
    if url and not is_valid_url(url):
        logger.warning(f"Invalid URL format for job {job_id}: {url}")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="Invalid URL format. URL must start with http:// or https://",
                job_id=job_id
            ).model_dump(),
        )
    
    # Validate resume file if provided
    if resume:
        if not resume.filename:
            logger.warning(f"Empty filename received for resume in job {job_id}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error="No resume file provided",
                    job_id=job_id
                ).model_dump(),
            )
        
        if not resume.filename.lower().endswith('.pdf'):
            logger.warning(f"Invalid file type for resume in job {job_id}: {resume.filename}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error=f"Invalid resume file type. Expected .pdf, got '{resume.filename}'",
                    job_id=job_id
                ).model_dump(),
            )
        
        # Check file size (read the content)
        resume_content = await resume.read()
        if len(resume_content) == 0:
            logger.warning(f"Empty resume file received for job {job_id}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error="Empty resume file",
                    job_id=job_id
                ).model_dump(),
            )
        
        if len(resume_content) > MAX_FILE_SIZE:
            logger.warning(f"Resume file too large for job {job_id}: {len(resume_content)} bytes")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error=f"Resume file too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024)}MB",
                    job_id=job_id
                ).model_dump(),
            )
        
        # Process resume PDF and extract text (if provided)
        # Save to temp file and extract text
        import tempfile
        from pathlib import Path
        
        temp_resume_path = None
        resume_text = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
                temp_file.write(resume_content)
                temp_resume_path = temp_file.name
            
            logger.info(f"Processing resume for job {job_id}")
            
            # Extract text from PDF using PDFExtractor
            from app.services.pdf_service import PDFExtractor
            pdf_extractor = PDFExtractor()
            resume_text = pdf_extractor.extract_text(temp_resume_path)
            
            if resume_text and resume_text.strip():
                logger.info(f"Extracted {len(resume_text)} characters from resume for {job_id}")
            else:
                logger.warning(f"No text extracted from resume for {job_id}")
                
        except Exception as e:
            logger.error(f"Resume processing failed for {job_id}: {str(e)}")
        finally:
            if temp_resume_path is not None:
                try:
                    Path(temp_resume_path).unlink()
                except Exception:
                    pass
    
    try:
        # Priority 1: Try URL first if provided
        extracted_text = ""
        extraction_source = None
        extraction_method = None
        extraction_status = "pending"
        extraction_reason = None
        
        if url:
            logger.info(f"Attempting URL extraction for job {job_id}: {url}")
            try:
                url_encoder = URLEncoder()
                extracted_text = url_encoder.fetch_url(url)
                
                if extracted_text and extracted_text.strip():
                    extraction_source = "url"
                    extraction_method = "url"
                    extraction_status = "success"
                    logger.info(f"Successfully extracted job content from URL for {job_id}")
                else:
                    extraction_status = "failed"
                    extraction_reason = "Unable to retrieve usable job content from the URL."
                    logger.warning(f"URL extraction failed for {job_id}: {extraction_reason}")
            except Exception as e:
                extraction_status = "failed"
                extraction_reason = f"URL fetching error: {str(e)}"
                logger.error(f"URL fetching error for {job_id}: {extraction_reason}")
        
        # Priority 2: Fall back to description if URL extraction failed or no URL
        if not extracted_text or not extracted_text.strip():
            if has_usable_description(description):
                extracted_text = description
                if extraction_source is None:
                    extraction_source = "description"
                if extraction_method is None:
                    extraction_method = "manual"
                if extraction_status == "pending":
                    extraction_status = "success"
                logger.info(f"Using description fallback for job {job_id}")
            elif extraction_status == "failed":
                # No usable content from URL or description
                extraction_reason = extraction_reason or "No usable job content available"
                return JSONResponse(
                    status_code=500,
                    content=JobResponseFailed(
                        success=False,
                        job_id=job_id,
                        status="extraction_failed",
                        extraction=ExtractionInfo(
                            source=extraction_source,
                            method=extraction_method,
                            status=extraction_status,
                            reason=extraction_reason
                        ),
                        data=None
                    ).model_dump(),
                )
        
        logger.info(f"Processing job {job_id}")
        
        # Extract structured job data using LLM
        try:
            extractor = JobExtractor()
            job_data = extractor.extract_job(extracted_text)
        except Exception as e:
            logger.error(f"Job extraction failed for {job_id}: {str(e)}")
            return JSONResponse(
                status_code=500,
                content=JobResponseFailed(
                    success=False,
                    job_id=job_id,
                    status="extraction_failed",
                    extraction=ExtractionInfo(
                        source=extraction_source,
                        method=extraction_method,
                        status="failed",
                        reason=f"Job extraction error: {str(e)}"
                    ),
                    data=None
                ).model_dump(),
            )
        
        logger.info(f"Successfully extracted job data for {job_id}")
        
        # Perform company research if company name is available
        company_research = None
        whois_info = None
        
        if job_data.company_name and job_data.company_name.strip():
            try:
                tavily_extractor = TavilyExtractor()
                company_research = tavily_extractor.research_company(job_data.company_name)
                
                if company_research and company_research.strip():
                    company_research = {"summary": company_research}
                    logger.info(f"Successfully completed company research for {job_id}")
                else:
                    company_research = {"summary": "Company research unavailable"}
                    logger.warning(f"Company research returned empty for {job_id}")
            except Exception as e:
                logger.error(f"Company research failed for {job_id}: {str(e)}")
                company_research = {"summary": f"Company research unavailable: {str(e)}"}
        else:
            logger.info(f"No company name available for research for {job_id}")
            company_research = {"summary": "Company research unavailable (no company name extracted)"}
        
        # Perform WHOIS lookup if company website is available
        if job_data.company_website:
            try:
                whois_extractor = WhoisExtractor()
                whois_info = whois_extractor.lookup(job_data.company_website)
            except Exception as e:
                logger.error(f"WHOIS lookup failed for {job_id}: {str(e)}")
                whois_info = {}
        
        # Add WHOIS info to company research if available
        if whois_info and whois_info.get("domain_name"):
            if isinstance(company_research, dict):
                company_research["whois_info"] = whois_info
            else:
                company_research = {"summary": company_research, "whois_info": whois_info}
        
        # Apply company research to job_data
        if isinstance(company_research, dict):
            job_data.company_research = CompanyResearch(summary=company_research.get("summary", "Company research unavailable"))
        else:
            job_data.company_research = CompanyResearch(summary=company_research)
        
        logger.info(f"Successfully completed all processing for {job_id}")
        
        # Use actual UTC timestamp when processing completes
        processed_at = datetime.now(timezone.utc)
        
        # Prepare resume data if extracted
        resume_data = None
        if resume_text and resume_text.strip():
            try:
                from app.services.llm_service import ResumeExtractor
                resume_extractor = ResumeExtractor()
                resume_data = resume_extractor.extract_resume(resume_text).model_dump()
                logger.info(f"Successfully processed resume for {job_id}")
            except Exception as e:
                logger.error(f"Resume LLM extraction failed for {job_id}: {str(e)}")
        
        return JobResponseSuccess(
            success=True,
            job_id=job_id,
            status="processed",
            extraction=ExtractionInfo(
                source=extraction_source,
                method=extraction_method,
                status=extraction_status,
                reason=extraction_reason
            ),
            data=JobResponseSuccessData(
                job_id=job_id,
                status="processed",
                processed_at=processed_at,
                data=job_data,
                resume=resume_data
            )
        )
        
    except Exception as e:
        logger.error(f"Unexpected error processing job {job_id}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=JobResponseFailed(
                success=False,
                job_id=job_id,
                status="extraction_failed",
                extraction=ExtractionInfo(
                    source=extraction_source,
                    method=extraction_method,
                    status="failed",
                    reason=f"Internal server error: {str(e)}"
                ),
                data=None
            ).model_dump(),
        )

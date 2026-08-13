"""Analysis API routes for orchestration of resume and job processing."""

import logging
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

# Use relative imports to reach src module
import sys
from pathlib import Path as PathObj
sys.path.insert(0, str(PathObj(__file__).resolve().parents[3]))

from src.models.resume import Resume as ResumeModel
from src.models.job import JobPosting as JobModel

from app.services.llm_service import ResumeExtractor
from app.services.pdf_service import PDFExtractor
from app.services.matching_service import MatchingService
from app.schemas.resume import ErrorResponse
from app.schemas.matching import MatchResult

# Configure logging - use stderr to avoid exposing sensitive data
logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.INFO)

router = APIRouter(
    prefix="/api/analysis",
    tags=["Analysis"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - Invalid input"},
        422: {"model": ErrorResponse, "description": "Unprocessable Entity - Processing failed"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def extract_resume_from_pdf(pdf_path: str) -> ResumeModel:
    """Extract structured resume data from PDF using existing services.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        Resume Pydantic model with structured data
        
    Raises:
        RuntimeError: If extraction fails
    """
    pdf_extractor = PDFExtractor()
    text = pdf_extractor.extract_text(pdf_path)
    
    if not text or not text.strip():
        raise RuntimeError("No text extracted from PDF")
    
    extractor = ResumeExtractor()
    return extractor.extract_resume(text)


def extract_job_from_text(job_text: str) -> JobModel:
    """Extract structured job data from text using existing services.
    
    Args:
        job_text: Extracted text content from job posting
        
    Returns:
        JobPosting Pydantic model with structured data
        
    Raises:
        RuntimeError: If extraction fails
    """
    from src.services.llm_service import LLMService
    
    extractor = LLMService()
    return extractor.extract_job(job_text)


def calculate_match_result(resume: ResumeModel, job: JobModel) -> MatchResult:
    """Calculate deterministic match result between resume and job.
    
    Args:
        resume: Resume model with extracted data
        job: JobPosting model with extracted data
        
    Returns:
        MatchResult with scoring and recommendations
    """
    return MatchingService.generate_match_result(resume, job)


@router.post(
    "",
    response_model=MatchResult,
    responses={
        200: {"description": "Analysis completed successfully"},
        400: {"description": "Invalid input - missing required fields"},
        422: {"description": "Unprocessable Entity - Processing failed"},
        500: {"description": "Processing error"},
    },
)
async def analyze_application(
    resume: UploadFile = File(..., description="PDF resume file to analyze"),
    url: Optional[str] = Form(None, description="URL to job posting"),
    description: Optional[str] = Form(None, description="Job description text"),
):
    """Analyze a job application by matching resume against job posting.
    
    This endpoint orchestrates:
    1. Resume PDF extraction
    2. Job posting extraction (from URL or description)
    3. Deterministic match scoring
    
    Args:
        resume: PDF resume file (required)
        url: Optional URL to job posting
        description: Optional job description text
        
    Returns:
        Complete match result with scores, strengths, and gaps
    """
    analysis_id = str(uuid.uuid4())
    
    # Validate that at least one job source is provided
    if not url and not description:
        logger.warning(f"Missing job source for analysis {analysis_id}")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="Missing job source. Provide either 'url' or 'description'.",
                resume_id=analysis_id
            ).model_dump(),
        )
    
    # Validate resume file
    if not resume.filename:
        logger.warning(f"Empty filename for resume in analysis {analysis_id}")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="No resume file provided",
                resume_id=analysis_id
            ).model_dump(),
        )
    
    if not resume.filename.lower().endswith('.pdf'):
        logger.warning(f"Invalid file type for resume in analysis {analysis_id}")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error=f"Invalid file type. Expected .pdf, got '{resume.filename}'",
                resume_id=analysis_id
            ).model_dump(),
        )
    
    # Read and validate resume content
    content = await resume.read()
    if len(content) == 0:
        logger.warning(f"Empty resume file for analysis {analysis_id}")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="Empty resume file",
                resume_id=analysis_id
            ).model_dump(),
        )
    
    if len(content) > MAX_FILE_SIZE:
        logger.warning(f"Resume file too large for analysis {analysis_id}: {len(content)} bytes")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error=f"Resume file too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024)}MB",
                resume_id=analysis_id
            ).model_dump(),
        )
    
    # Save uploaded file to temporary location
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        logger.info(f"Processing analysis {analysis_id} for resume {resume.filename}")
        
        # Extract resume data
        try:
            resume_data = extract_resume_from_pdf(temp_path)
        except Exception as e:
            logger.error(f"Resume extraction failed for analysis {analysis_id}: {str(e)}")
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error="Failed to extract resume information",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        # Extract job data
        job_text = description or ""
        if url:
            # Note: URL extraction would require HTML parsing
            logger.warning(f"URL-based extraction not supported for analysis {analysis_id}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error="URL-based extraction is not yet supported. Please provide job description text.",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        if not job_text or not job_text.strip():
            logger.warning(f"Empty job text for analysis {analysis_id}")
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    error="Job description is empty or whitespace-only.",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        try:
            job_data = extract_job_from_text(job_text)
        except Exception as e:
            logger.error(f"Job extraction failed for analysis {analysis_id}: {str(e)}")
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error="Failed to extract job information",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        # Calculate match result
        try:
            match_result = calculate_match_result(resume_data, job_data)
        except Exception as e:
            logger.error(f"Matching failed for analysis {analysis_id}: {str(e)}")
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error="Failed to calculate match score",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        logger.info(f"Successfully completed analysis {analysis_id}")
        
        return match_result
        
    except Exception as e:
        logger.error(f"Unexpected error in analysis {analysis_id}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="Internal server error",
                resume_id=analysis_id
            ).model_dump(),
        )
    finally:
        # Ensure temp file is always cleaned up
        if temp_path is not None:
            try:
                Path(temp_path).unlink()
            except Exception:
                pass  # Best effort cleanup

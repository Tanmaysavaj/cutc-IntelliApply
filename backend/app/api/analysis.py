"""Analysis API routes for orchestration of resume and job processing.

This endpoint analyzes job applications by:
1. Accepting a resume PDF (required)
2. Accepting processed job data (from /api/jobs endpoint, or raw job description)
3. Performing deterministic skill matching and score calculation
4. Returning comprehensive match analysis with strengths, gaps, and scores

Flow:
  POST /api/analysis
    ├─ Resume PDF → Extract resume data
    ├─ Job data (processed from /api/jobs OR raw description)
    └─ Match analysis → Return scoring breakdown
"""

import json
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
from src.services.llm_service import LLMService
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
    """Extract structured resume data from PDF.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        Resume Pydantic model with structured data
        
    Raises:
        RuntimeError: If extraction fails
    """
    logger.info(f"Extracting resume from PDF: {pdf_path}")
    
    try:
        pdf_extractor = PDFExtractor()
        text = pdf_extractor.extract_text(pdf_path)
        
        if not text or not text.strip():
            raise RuntimeError("No text extracted from PDF")
        
        logger.info(f"Extracted {len(text)} characters from resume PDF")
        
        # Extract structured resume data using LLM
        llm_service = LLMService()
        resume_data = llm_service.extract_resume(text)
        
        logger.info(f"Resume extraction successful: {len(resume_data.hard_skills)} hard skills, {len(resume_data.work_experience)} work experiences")
        
        return resume_data
        
    except Exception as e:
        logger.error(f"Resume extraction failed: {str(e)}")
        raise RuntimeError(f"Resume extraction failed: {str(e)}")


def extract_job_from_description(job_text: str) -> JobModel:
    """Extract structured job data from text description.
    
    Args:
        job_text: Job description text
        
    Returns:
        JobPosting Pydantic model with structured data
        
    Raises:
        RuntimeError: If extraction fails
    """
    logger.info(f"Extracting job from text ({len(job_text)} characters)")
    
    try:
        llm_service = LLMService()
        job_data = llm_service.extract_job(job_text)
        
        logger.info(f"Job extraction successful: {job_data.job_title} at {job_data.company_name}")
        
        return job_data
        
    except Exception as e:
        logger.error(f"Job extraction failed: {str(e)}")
        raise RuntimeError(f"Job extraction failed: {str(e)}")


def parse_job_data(job_data_json: Optional[str]) -> Optional[JobModel]:
    """Parse job data from JSON string (from /api/jobs endpoint).
    
    Args:
        job_data_json: JSON string containing JobPosting data
        
    Returns:
        JobPosting model instance, or None if parsing fails
        
    Raises:
        ValueError: If JSON is invalid
    """
    if not job_data_json:
        return None
    
    try:
        logger.info("Parsing job data from JSON")
        job_dict = json.loads(job_data_json)
        job_data = JobModel(**job_dict)
        logger.info(f"Successfully parsed job data: {job_data.job_title} at {job_data.company_name}")
        return job_data
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON for job data: {str(e)}")
        raise ValueError(f"Invalid JSON format for job data: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to parse job data: {str(e)}")
        raise ValueError(f"Failed to parse job data: {str(e)}")


def calculate_match_result(resume: ResumeModel, job: JobModel) -> MatchResult:
    """Calculate deterministic match result between resume and job.
    
    Args:
        resume: Resume model with extracted data
        job: JobPosting model with extracted data
        
    Returns:
        MatchResult with scoring and recommendations
    """
    logger.info(f"Calculating match between resume and job: {job.job_title} at {job.company_name}")
    
    try:
        match_result = MatchingService.generate_match_result(resume, job)
        
        logger.info(f"Match calculation complete. Overall score: {match_result.overall_score}, Status: {match_result.status}")
        
        return match_result
        
    except Exception as e:
        logger.error(f"Match calculation failed: {str(e)}")
        raise RuntimeError(f"Match calculation failed: {str(e)}")




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
    resume: UploadFile = File(..., description="PDF resume file to analyze (required)"),
    job_data: Optional[str] = Form(None, description="Processed job data as JSON (from /api/jobs endpoint, optional)"),
    job_description: Optional[str] = Form(None, description="Raw job description text (optional)"),
):
    """Analyze a job application by matching resume against job posting.
    
    This endpoint accepts:
    1. Resume PDF (required) - extracted from file
    2. Job data in TWO possible formats (at least one required):
       - JSON from /api/jobs endpoint (recommended): processed, validated job data
       - Raw job description text: will be extracted and analyzed
    
    Processing flow:
    1. ✅ Extract resume data from PDF using LLM
    2. ✅ Extract or parse job data from provided sources
    3. ✅ Perform deterministic skill matching and scoring
    4. ✅ Calculate overall fit score and analysis
    5. ✅ Return comprehensive match result with strengths and gaps
    
    Args:
        resume: PDF resume file (required)
        job_data: JSON string with JobPosting data from /api/jobs endpoint (optional)
        job_description: Raw job description text (optional)
        
    Returns:
        Complete match result with scores, matched/missing skills, strengths, and gaps
        
    Example:
        POST /api/analysis
        
        # Using job data from /api/jobs endpoint
        resume: <PDF file>
        job_data: {"job_title": "Senior Backend Engineer", "company_name": "HelloFresh", ...}
        
        # OR using raw job description
        resume: <PDF file>
        job_description: "We are hiring a Senior Backend Engineer..."
        
    Response:
        {
          "overall_score": 85,
          "score_breakdown": {
            "required_skills": {
              "score": 90,
              "matched_skills": ["Python", "AWS", "Docker"],
              "missing_skills": ["Kubernetes"]
            },
            ...
          },
          "strengths": [
            "Matched 8 required skills: Python, AWS, Docker...",
            "Experience level matches the job requirement",
            ...
          ],
          "gaps": [
            "Missing 2 required skills: Kubernetes, gRPC",
            "Limited alignment with responsibilities"
          ],
          "status": "complete"
        }
    """
    analysis_id = str(uuid.uuid4())
    
    try:
        logger.info(f"Starting analysis {analysis_id}")
        
        # Validate that at least one job source is provided
        if not job_data and not job_description:
            logger.warning(f"No job data provided for analysis {analysis_id}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error="Missing job data. Provide either 'job_data' (JSON from /api/jobs) or 'job_description' (raw text).",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        # Validate resume file
        if not resume or not resume.filename:
            logger.warning(f"No resume file provided for analysis {analysis_id}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error="No resume file provided",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        if not resume.filename.lower().endswith('.pdf'):
            logger.warning(f"Invalid file type for resume in analysis {analysis_id}: {resume.filename}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error=f"Invalid file type. Expected .pdf, got '{resume.filename}'",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        # Read and validate resume content
        resume_content = await resume.read()
        if len(resume_content) == 0:
            logger.warning(f"Empty resume file for analysis {analysis_id}")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error="Empty resume file",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        if len(resume_content) > MAX_FILE_SIZE:
            logger.warning(f"Resume file too large for analysis {analysis_id}: {len(resume_content)} bytes")
            return JSONResponse(
                status_code=400,
                content=ErrorResponse(
                    error=f"Resume file too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024):.0f}MB",
                    resume_id=analysis_id
                ).model_dump(),
            )
        
        # Save uploaded file to temporary location for processing
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
                temp_file.write(resume_content)
                temp_path = temp_file.name
            
            logger.info(f"Resume file saved to {temp_path} for analysis {analysis_id}")
            
            # Extract resume data from PDF
            try:
                logger.info(f"Extracting resume from PDF for analysis {analysis_id}")
                resume_data = extract_resume_from_pdf(temp_path)
                logger.info(f"Resume extraction successful for analysis {analysis_id}")
            except Exception as e:
                logger.error(f"Resume extraction failed for analysis {analysis_id}: {str(e)}")
                return JSONResponse(
                    status_code=422,
                    content=ErrorResponse(
                        error=f"Failed to extract resume information: {str(e)}",
                        resume_id=analysis_id
                    ).model_dump(),
                )
            
            # Extract or parse job data
            job_extracted_from = None
            
            try:
                if job_data:
                    # Try to parse job data from JSON (from /api/jobs endpoint)
                    logger.info(f"Parsing job data from JSON for analysis {analysis_id}")
                    job_posting = parse_job_data(job_data)
                    job_extracted_from = "json"
                    
                    if not job_posting:
                        raise ValueError("Failed to parse job data JSON")
                    
                    logger.info(f"Job data parsed successfully for analysis {analysis_id}")
                    
                elif job_description and job_description.strip():
                    # Extract job data from raw description text
                    logger.info(f"Extracting job from description text for analysis {analysis_id}")
                    job_posting = extract_job_from_description(job_description.strip())
                    job_extracted_from = "description"
                    logger.info(f"Job extraction successful for analysis {analysis_id}")
                    
                else:
                    raise ValueError("No valid job data or description provided")
                    
            except Exception as e:
                logger.error(f"Job processing failed for analysis {analysis_id}: {str(e)}")
                return JSONResponse(
                    status_code=422,
                    content=ErrorResponse(
                        error=f"Failed to process job information: {str(e)}",
                        resume_id=analysis_id
                    ).model_dump(),
                )
            
            # Calculate match result
            try:
                logger.info(f"Calculating match result for analysis {analysis_id}")
                match_result = calculate_match_result(resume_data, job_posting)
                logger.info(f"Match result calculated for analysis {analysis_id}: score={match_result.overall_score}, status={match_result.status}")
                
                return match_result
                
            except Exception as e:
                logger.error(f"Match calculation failed for analysis {analysis_id}: {str(e)}")
                return JSONResponse(
                    status_code=500,
                    content=ErrorResponse(
                        error="Failed to calculate match score",
                        resume_id=analysis_id
                    ).model_dump(),
                )
        
        finally:
            # Ensure temp file is always cleaned up
            if temp_path is not None:
                try:
                    Path(temp_path).unlink()
                    logger.debug(f"Cleaned up temporary file: {temp_path}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file {temp_path}: {str(e)}")
    
    except Exception as e:
        logger.error(f"Unexpected error in analysis {analysis_id}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="Internal server error during analysis",
                resume_id=analysis_id
            ).model_dump(),
        )

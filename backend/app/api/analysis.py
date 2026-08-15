"""Analysis API routes for orchestration of resume and job processing.

This endpoint analyzes job applications by:
1. Accepting a resume PDF (required)
2. Accepting processed job data (from /api/jobs endpoint, or raw job description)
3. Performing deterministic skill matching and score calculation
4. Generating AI career insights based on deterministic results
5. Returning comprehensive analysis with both deterministic and AI insights

Flow:
  POST /api/analysis
    ├─ Resume PDF → Extract resume data
    ├─ Job data (processed from /api/jobs OR raw description)
    ├─ Deterministic matching → MatchResult (source of truth)
    ├─ AI insights generation → AIInsights (explanations & recommendations)
    └─ Combined response → AnalysisResponse (match + ai_insights)
"""

import json
import logging
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
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
from app.services.ai_insights_service import AIInsightsService
from app.schemas.resume import ErrorResponse
from app.schemas.matching import MatchResult
from app.schemas.ai_insights import AnalysisResponse, AIInsights, ApplicationRecommendation
from app.core.auth import get_optional_user, get_current_user

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


@router.get("", tags=["Analysis"])
async def list_analyses(user_id: str = Depends(get_current_user)):
    """List all analyses for the authenticated user (history).
    
    Returns analyses ordered by most recent first.
    """
    from app.core.supabase import get_supabase_client
    client = get_supabase_client()
    
    try:
        result = (
            client.table("analyses")
            .select("id, match_score, created_at, result, jobs(title, company)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        return {"analyses": result.data or []}
    except Exception as e:
        logger.error(f"Failed to list analyses for user {user_id}: {e}")
        return {"analyses": []}


@router.get("/{analysis_id}", tags=["Analysis"])
async def get_analysis(analysis_id: str, user_id: str = Depends(get_current_user)):
    """Get a specific analysis by ID.
    
    Returns the full stored analysis result without regenerating.
    """
    from app.core.supabase import get_supabase_client
    client = get_supabase_client()
    
    try:
        result = (
            client.table("analyses")
            .select("*, jobs(title, company, url), resumes(file_url, parsed_data)")
            .eq("id", analysis_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data
    except Exception as e:
        logger.error(f"Failed to get analysis {analysis_id}: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Analysis not found")


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
    response_model=AnalysisResponse,
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
    resume_id: Optional[str] = Form(None, description="Resume ID from /api/resume (for persistence linking)"),
    job_id: Optional[str] = Form(None, description="Job ID from /api/jobs (for persistence linking)"),
    user_id: Optional[str] = Depends(get_optional_user),
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
    3. ✅ Perform deterministic skill matching and scoring (source of truth)
    4. ✅ Generate AI career insights based on deterministic results
    5. ✅ Return comprehensive analysis with both deterministic and AI insights
    
    Args:
        resume: PDF resume file (required)
        job_data: JSON string with JobPosting data from /api/jobs endpoint (optional)
        job_description: Raw job description text (optional)
        
    Returns:
        Complete analysis with deterministic match results and AI-generated insights
        
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
          "success": true,
          "analysis_id": "uuid",
          "status": "completed",
          "match": {
            "overall_score": 85,
            "score_breakdown": { ... },
            "strengths": [...],
            "gaps": [...],
            "status": "complete"
          },
          "ai_insights": {
            "status": "completed",
            "summary": "Strong alignment with core requirements...",
            "why_you_match": [...],
            "skill_gaps": [...],
            "resume_improvements": [...],
            "application_recommendation": {
              "recommendation": "apply",
              "reason": "Candidate meets most required technical requirements"
            },
            "interview_focus": [...]
          }
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
                
                # Generate AI insights based on deterministic match result
                try:
                    logger.info(f"Generating AI insights for analysis {analysis_id}")
                    llm_service = LLMService()
                    ai_insights_service = AIInsightsService(llm_service)
                    
                    # Use safe wrapper that never raises exceptions
                    ai_insights = ai_insights_service.generate_insights_safe(
                        resume_data, 
                        job_posting, 
                        match_result
                    )
                    
                    logger.info(f"AI insights generated for analysis {analysis_id}: status={ai_insights.status}")
                    
                except Exception as e:
                    logger.error(f"AI insights generation failed for analysis {analysis_id}: {str(e)}")
                    # Fallback to unavailable insights - deterministic match still works
                    ai_insights = AIInsights(
                        status="unavailable",
                        summary="AI insights are temporarily unavailable.",
                        why_you_match=[],
                        skill_gaps=[],
                        resume_improvements=[],
                        application_recommendation=ApplicationRecommendation(
                            recommendation="consider",
                            reason="Unable to generate AI insights. Please rely on the deterministic match results.",
                        ),
                        interview_focus=[],
                        reason=f"AI insights generation failed: {str(e)[:100]}",
                    )
                
                # Build combined analysis response
                analysis_response = AnalysisResponse(
                    success=True,
                    analysis_id=analysis_id,
                    status="completed",
                    match=match_result,
                    ai_insights=ai_insights,
                )
                
                # If authenticated, persist analysis to Supabase
                if user_id:
                    try:
                        from app.core.supabase import get_supabase_client
                        client = get_supabase_client()
                        
                        # Build result JSON with full analysis data
                        result_data = analysis_response.model_dump() if hasattr(analysis_response, 'model_dump') else analysis_response.dict()
                        
                        # Use provided resume_id/job_id or generate placeholders
                        persist_resume_id = resume_id or str(uuid.uuid4())
                        persist_job_id = job_id or str(uuid.uuid4())
                        
                        # If resume_id/job_id weren't provided, create placeholder records
                        if not resume_id:
                            try:
                                resume_dict = resume_data.model_dump() if hasattr(resume_data, 'model_dump') else resume_data.dict()
                                client.table("resumes").insert({
                                    "id": persist_resume_id,
                                    "user_id": user_id,
                                    "file_url": "",
                                    "parsed_data": resume_dict,
                                }).execute()
                            except Exception as e:
                                logger.warning(f"Failed to create resume record for analysis: {e}")
                        
                        if not job_id:
                            try:
                                job_dict = job_posting.model_dump() if hasattr(job_posting, 'model_dump') else job_posting.dict()
                                client.table("jobs").insert({
                                    "id": persist_job_id,
                                    "user_id": user_id,
                                    "url": None,
                                    "company": getattr(job_posting, 'company_name', None),
                                    "title": getattr(job_posting, 'job_title', None),
                                    "description": (job_description or "")[:5000],
                                    "parsed_data": job_dict,
                                }).execute()
                            except Exception as e:
                                logger.warning(f"Failed to create job record for analysis: {e}")
                        
                        # Insert analysis record
                        client.table("analyses").insert({
                            "id": analysis_id,
                            "user_id": user_id,
                            "resume_id": persist_resume_id,
                            "job_id": persist_job_id,
                            "match_score": match_result.overall_score,
                            "result": result_data,
                        }).execute()
                        
                        logger.info(f"Analysis {analysis_id} persisted for user {user_id}")
                    except Exception as e:
                        logger.error(f"Failed to persist analysis {analysis_id}: {e}")
                        # Don't fail the request - still return analysis results
                
                return analysis_response
                
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

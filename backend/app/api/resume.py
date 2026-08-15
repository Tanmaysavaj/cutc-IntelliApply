"""Resume API routes for processing PDF resumes.

Supports two modes:
- Authenticated: Parses resume, stores PDF in Supabase Storage, saves metadata to DB.
- Unauthenticated (demo): Parses resume and returns result without persistence.
"""

import logging
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

# Use relative imports to reach src module
import sys
from pathlib import Path as PathObj
sys.path.insert(0, str(PathObj(__file__).resolve().parents[3]))

from src.models.resume import Resume as ResumeModel

from app.services.llm_service import ResumeExtractor
from app.services.pdf_service import PDFExtractor
from app.schemas.resume import ErrorResponse, ResumeResponse, ResumeResponseData
from app.core.auth import get_optional_user

# Configure logging
logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.INFO)

router = APIRouter(
    prefix="/api/resume",
    tags=["Resume"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request - Invalid file"},
        422: {"model": ErrorResponse, "description": "Unprocessable Entity - Processing failed"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"},
    },
)

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

STORAGE_BUCKET = "resumes"


def _store_resume_in_supabase(user_id: str, resume_id: str, content: bytes, parsed_data: dict) -> str:
    """Store resume PDF in Supabase Storage and metadata in database.
    
    Args:
        user_id: Authenticated user's UUID
        resume_id: Generated resume UUID
        content: Raw PDF bytes
        parsed_data: Structured resume data as dict
        
    Returns:
        Storage file URL path
    """
    from app.core.supabase import get_supabase_client
    
    client = get_supabase_client()
    
    # Upload PDF to Supabase Storage: resumes/{user_id}/{resume_id}.pdf
    storage_path = f"{user_id}/{resume_id}.pdf"
    
    try:
        client.storage.from_(STORAGE_BUCKET).upload(
            path=storage_path,
            file=content,
            file_options={"content-type": "application/pdf"},
        )
    except Exception as e:
        # If bucket doesn't exist or upload fails, log but don't block
        logger.error(f"Storage upload failed for resume {resume_id}: {e}")
        # Try to create bucket and retry once
        try:
            client.storage.create_bucket(STORAGE_BUCKET, options={"public": False})
            client.storage.from_(STORAGE_BUCKET).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": "application/pdf"},
            )
        except Exception as retry_err:
            logger.error(f"Storage retry failed: {retry_err}")
            storage_path = ""  # Continue without storage
    
    # Insert resume record into database
    try:
        client.table("resumes").insert({
            "id": resume_id,
            "user_id": user_id,
            "file_url": storage_path,
            "parsed_data": parsed_data,
        }).execute()
    except Exception as e:
        logger.error(f"Database insert failed for resume {resume_id}: {e}")
        raise RuntimeError(f"Failed to save resume: {e}")
    
    return storage_path


@router.get("", tags=["Resume"])
async def list_resumes(user_id: str = Depends(get_optional_user)):
    """List resumes for the authenticated user."""
    if not user_id:
        return {"resumes": []}
    
    from app.core.supabase import get_supabase_client
    client = get_supabase_client()
    
    try:
        result = client.table("resumes").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"resumes": result.data or []}
    except Exception as e:
        logger.error(f"Failed to list resumes: {e}")
        return {"resumes": []}


@router.get("/{resume_id}", tags=["Resume"])
async def get_resume(resume_id: str, user_id: str = Depends(get_optional_user)):
    """Get a specific resume by ID."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    from app.core.supabase import get_supabase_client
    client = get_supabase_client()
    
    try:
        result = client.table("resumes").select("*").eq("id", resume_id).eq("user_id", user_id).single().execute()
        return result.data
    except Exception as e:
        logger.error(f"Failed to get resume {resume_id}: {e}")
        raise HTTPException(status_code=404, detail="Resume not found")


@router.post(
    "",
    response_model=ResumeResponse,
    responses={
        200: {"description": "Resume processed successfully"},
        400: {"description": "Invalid file format or empty file"},
        500: {"description": "Processing error"},
    },
)
async def process_resume(
    resume: UploadFile = File(..., description="PDF resume file to process"),
    user_id: Optional[str] = Depends(get_optional_user),
):
    """Process a PDF resume file and extract structured information.
    
    If authenticated, also stores the PDF in Supabase Storage and saves
    parsed data to the database.
    
    Args:
        resume: PDF file uploaded via multipart/form-data
        user_id: Optional authenticated user ID (from token)
        
    Returns:
        Structured resume data with extracted skills, experience, education, etc.
    """
    resume_id = str(uuid.uuid4())
    
    # Validate file type
    if not resume.filename:
        logger.warning(f"Empty filename received for resume {resume_id}")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="No file provided",
                resume_id=resume_id
            ).model_dump(),
        )
    
    if not resume.filename.lower().endswith('.pdf'):
        logger.warning(f"Invalid file type for resume {resume_id}: {resume.filename}")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error=f"Invalid file type. Expected .pdf, got '{resume.filename}'",
                resume_id=resume_id
            ).model_dump(),
        )
    
    # Check file size
    content = await resume.read()
    if len(content) == 0:
        logger.warning(f"Empty file received for resume {resume_id}")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error="Empty file",
                resume_id=resume_id
            ).model_dump(),
        )
    
    if len(content) > MAX_FILE_SIZE:
        logger.warning(f"File too large for resume {resume_id}: {len(content)} bytes")
        return JSONResponse(
            status_code=400,
            content=ErrorResponse(
                error=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024)}MB",
                resume_id=resume_id
            ).model_dump(),
        )
    
    # Save uploaded file to temporary location
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        logger.info(f"Processing resume {resume_id} from {resume.filename}")
        
        # Extract text from PDF
        try:
            pdf_extractor = PDFExtractor()
            text = pdf_extractor.extract_text(temp_path)
        except Exception as e:
            logger.error(f"PDF extraction failed for resume {resume_id}: {str(e)}")
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error="Failed to extract text from PDF",
                    resume_id=resume_id
                ).model_dump(),
            )
        
        # Validate extracted text
        if not text or not text.strip():
            logger.warning(f"No text extracted from resume {resume_id}")
            return JSONResponse(
                status_code=422,
                content=ErrorResponse(
                    error="No text extracted from PDF. File may be corrupted or image-based.",
                    resume_id=resume_id
                ).model_dump(),
            )
        
        logger.info(f"Extracted {len(text)} characters from resume {resume_id}")
        
        # Extract structured resume data using LLM
        try:
            extractor = ResumeExtractor()
            resume_data = extractor.extract_resume(text)
        except Exception as e:
            logger.error(f"Resume analysis failed for resume {resume_id}: {str(e)}")
            return JSONResponse(
                status_code=500,
                content=ErrorResponse(
                    error="Failed to analyze resume with AI",
                    resume_id=resume_id
                ).model_dump(),
            )
        
        logger.info(f"Successfully processed resume {resume_id}")
        
        # If authenticated, persist to Supabase
        if user_id:
            try:
                parsed_dict = resume_data.model_dump() if hasattr(resume_data, 'model_dump') else resume_data.dict()
                _store_resume_in_supabase(user_id, resume_id, content, parsed_dict)
                logger.info(f"Resume {resume_id} persisted for user {user_id}")
            except Exception as e:
                logger.error(f"Failed to persist resume {resume_id}: {e}")
                # Don't fail the request - still return the parsed data
        
        # Use actual UTC timestamp when processing completes
        extracted_at = datetime.now(timezone.utc)
        
        return ResumeResponse(
            success=True,
            resume_id=resume_id,
            status="processed",
            data=ResumeResponseData(
                resume_id=resume_id,
                status="processed",
                extracted_at=extracted_at,
                data=resume_data
            )
        )
        
    except Exception as e:
        logger.error(f"Unexpected error processing resume {resume_id}: {str(e)}")
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error="Internal server error",
                resume_id=resume_id
            ).model_dump(),
        )
    finally:
        # Ensure temp file is always cleaned up
        if temp_path is not None:
            try:
                Path(temp_path).unlink()
            except Exception:
                pass  # Best effort cleanup

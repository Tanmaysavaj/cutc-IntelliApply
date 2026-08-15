"""Application Hub API routes for managing saved applications.

Provides CRUD operations for application tracking:
- Create/save an application from a job + analysis
- List applications with optional status filter
- Get a single application by ID
- Update application status
- Update application notes
- Update application interview date
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Body
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.auth import get_optional_user, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
    responses={
        400: {"description": "Bad Request - Invalid input"},
        401: {"description": "Unauthorized"},
        404: {"description": "Application not found"},
        500: {"description": "Internal Server Error"},
    },
)


# ─── Request/Response Models ───


class CreateApplicationRequest(BaseModel):
    """Request body for creating a new application."""
    job_id: str = Field(..., description="ID of the job being applied to")
    analysis_id: Optional[str] = Field(None, description="ID of the analysis for this job")
    company: str = Field(..., description="Company name")
    title: str = Field(..., description="Job title")
    location: Optional[str] = Field(None, description="Job location")
    match_score: Optional[float] = Field(None, description="Match score from analysis")
    notes: Optional[str] = Field("", description="Personal notes")


class UpdateStatusRequest(BaseModel):
    """Request body for updating application status."""
    status: str = Field(
        ...,
        description="Application status",
        pattern="^(SAVED|APPLIED|SCREENING|INTERVIEW|OFFER|REJECTED|WITHDRAWN)$",
    )


class UpdateNotesRequest(BaseModel):
    """Request body for updating application notes."""
    notes: str = Field(..., description="Updated notes text")


class UpdateInterviewDateRequest(BaseModel):
    """Request body for updating interview date."""
    interview_date: Optional[str] = Field(None, description="Interview date in ISO format (YYYY-MM-DD)")


class ApplicationResponse(BaseModel):
    """Response model for a single application."""
    id: str
    job_id: str
    analysis_id: Optional[str] = None
    company: str
    title: str
    location: Optional[str] = None
    status: str
    match_score: Optional[float] = None
    applied_date: Optional[str] = None
    interview_date: Optional[str] = None
    notes: str = ""
    created_at: str
    updated_at: str


# ─── In-memory store for demo / unauthenticated usage ───
# In production, this would use Supabase persistence.
# For the hackathon demo, we support both authenticated (Supabase) and
# unauthenticated (in-memory per session) modes.

_demo_applications: dict[str, dict] = {}


def _get_app_store(user_id: Optional[str]) -> dict:
    """Get the application store. Returns the in-memory store for demo mode."""
    return _demo_applications


# ─── Endpoints ───


@router.get("", tags=["Applications"])
async def list_applications(
    status: Optional[str] = None,
    user_id: Optional[str] = Depends(get_optional_user),
):
    """List all applications for the current user.
    
    Optional query parameter:
    - status: Filter by application status (SAVED, APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED, WITHDRAWN)
    """
    store = _get_app_store(user_id)
    
    apps = list(store.values())
    
    # Filter by user if authenticated
    if user_id:
        apps = [a for a in apps if a.get("user_id") == user_id]
    
    # Filter by status if provided
    if status:
        valid_statuses = {"SAVED", "APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"}
        if status.upper() not in valid_statuses:
            return JSONResponse(
                status_code=400,
                content={"error": f"Invalid status. Must be one of: {', '.join(sorted(valid_statuses))}"},
            )
        apps = [a for a in apps if a.get("status") == status.upper()]
    
    # Sort by created_at descending (most recent first)
    apps.sort(key=lambda a: a.get("created_at", ""), reverse=True)
    
    return {"success": True, "applications": apps, "count": len(apps)}


@router.get("/{application_id}", tags=["Applications"])
async def get_application(
    application_id: str,
    user_id: Optional[str] = Depends(get_optional_user),
):
    """Get a single application by ID."""
    store = _get_app_store(user_id)
    
    app = store.get(application_id)
    if not app:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    # Check ownership if authenticated
    if user_id and app.get("user_id") != user_id:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    return {"success": True, "application": app}


@router.post("", tags=["Applications"])
async def create_application(
    request: CreateApplicationRequest,
    user_id: Optional[str] = Depends(get_optional_user),
):
    """Create a new application (save a job to the application hub).
    
    Creates a new application entry with status SAVED.
    If an application already exists for the given job_id, returns the existing one.
    """
    store = _get_app_store(user_id)
    
    # Check for duplicate (same job_id for same user)
    for existing in store.values():
        if existing.get("job_id") == request.job_id:
            if not user_id or existing.get("user_id") == user_id:
                return {
                    "success": True,
                    "application": existing,
                    "message": "Application already exists for this job",
                    "created": False,
                }
    
    now = datetime.now(timezone.utc).isoformat()
    application_id = f"app-{uuid.uuid4().hex[:12]}"
    
    application = {
        "id": application_id,
        "user_id": user_id,
        "job_id": request.job_id,
        "analysis_id": request.analysis_id,
        "company": request.company,
        "title": request.title,
        "location": request.location or "",
        "status": "SAVED",
        "match_score": request.match_score,
        "applied_date": None,
        "interview_date": None,
        "notes": request.notes or "",
        "created_at": now,
        "updated_at": now,
    }
    
    store[application_id] = application
    logger.info(f"Application created: {application_id} for job {request.job_id}")
    
    return {"success": True, "application": application, "created": True}


@router.patch("/{application_id}/status", tags=["Applications"])
async def update_application_status(
    application_id: str,
    request: UpdateStatusRequest,
    user_id: Optional[str] = Depends(get_optional_user),
):
    """Update the status of an application.
    
    Valid statuses: SAVED, APPLIED, SCREENING, INTERVIEW, OFFER, REJECTED, WITHDRAWN
    
    If status changes to APPLIED and applied_date is not set, it will be set to now.
    """
    store = _get_app_store(user_id)
    
    app = store.get(application_id)
    if not app:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    if user_id and app.get("user_id") != user_id:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    old_status = app["status"]
    app["status"] = request.status
    app["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Auto-set applied_date when marking as APPLIED
    if request.status == "APPLIED" and not app.get("applied_date"):
        app["applied_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    logger.info(f"Application {application_id} status: {old_status} → {request.status}")
    
    return {
        "success": True,
        "application": app,
        "message": f"Status updated to {request.status}",
    }


@router.patch("/{application_id}/notes", tags=["Applications"])
async def update_application_notes(
    application_id: str,
    request: UpdateNotesRequest,
    user_id: Optional[str] = Depends(get_optional_user),
):
    """Update the notes for an application."""
    store = _get_app_store(user_id)
    
    app = store.get(application_id)
    if not app:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    if user_id and app.get("user_id") != user_id:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    app["notes"] = request.notes
    app["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    return {"success": True, "application": app}


@router.patch("/{application_id}/interview-date", tags=["Applications"])
async def update_application_interview_date(
    application_id: str,
    request: UpdateInterviewDateRequest,
    user_id: Optional[str] = Depends(get_optional_user),
):
    """Update or set the interview date for an application."""
    store = _get_app_store(user_id)
    
    app = store.get(application_id)
    if not app:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    if user_id and app.get("user_id") != user_id:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    app["interview_date"] = request.interview_date
    app["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    return {"success": True, "application": app}


@router.delete("/{application_id}", tags=["Applications"])
async def delete_application(
    application_id: str,
    user_id: Optional[str] = Depends(get_optional_user),
):
    """Delete an application."""
    store = _get_app_store(user_id)
    
    app = store.get(application_id)
    if not app:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    if user_id and app.get("user_id") != user_id:
        return JSONResponse(
            status_code=404,
            content={"error": "Application not found"},
        )
    
    del store[application_id]
    logger.info(f"Application deleted: {application_id}")
    
    return {"success": True, "message": "Application deleted"}

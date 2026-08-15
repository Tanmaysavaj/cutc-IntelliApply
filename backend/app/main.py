"""IntelliApply API - FastAPI Backend for CUTC Hackathon."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import resume, jobs, analysis, company

# Initialize FastAPI application
app = FastAPI(
    title="IntelliApply API",
    description="Backend API for IntelliApply - AI-powered application optimization",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler to prevent raw errors from reaching the frontend."""
    return JSONResponse(
        status_code=500,
        content={"error": "An internal server error occurred. Please try again."},
    )


# Enable CORS for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(analysis.router)
app.include_router(company.router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint for the API."""
    return {"status": "ok", "service": "intelliapply-api"}


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "IntelliApply API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/api/health",
        "resume": "/api/resume (POST)",
        "jobs": "/api/jobs (POST)",
        "analysis": "/api/analysis (POST)",
    }

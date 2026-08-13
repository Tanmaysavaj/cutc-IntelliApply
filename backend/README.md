# IntelliApply API (FastAPI Backend)

Backend API for the IntelliApply application, built with FastAPI for the CUTC hackathon.

## Architecture Overview

This FastAPI backend serves as the API layer for IntelliApply, designed to integrate with existing Phase 1, Phase 2, and Phase 3 CLI functionality while providing a REST API for frontend consumption.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI application entry point
│   ├── config.py        # Backend configuration
│   ├── api/
│   │   ├── __init__.py
│   │   └── resume.py    # Resume processing endpoints
│   ├── models/
│   │   └── __init__.py  # Re-exports existing models
│   ├── schemas/
│   │   └── resume.py    # API response schemas
│   └── services/
│       ├── __init__.py
│       ├── pdf_service.py   # PDF text extraction wrapper
│       └── llm_service.py   # LLM resume extraction wrapper
├── tests/
│   ├── __init__.py
│   └── test_resume.py   # Automated tests
├── requirements.txt     # Python dependencies
└── .env.example         # Environment variables template
```

## Getting Started

### Prerequisites

- Python 3.10+
- pip package manager
- OpenRouter API key (for AI resume analysis)

### Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
# Required: OPENROUTER_API_KEY
```

### Running the API

Start the development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check endpoint |
| GET | `/` | API root with documentation links |
| GET | `/api/docs` | Interactive API documentation (Swagger UI) |
| GET | `/api/redoc` | ReDoc documentation |
| POST | `/api/resume` | Process a PDF resume file |

## API: Resume Processing

### POST /api/resume

Processes a PDF resume and extracts structured information.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `resume` (PDF file)

**Response:**
```json
{
  "success": true,
  "resume_id": "uuid",
  "status": "processed",
  "data": {
    "resume_id": "uuid",
    "status": "processed",
    "extracted_at": "2026-08-13T...",
    "data": {
      "hard_skills": [...],
      "soft_skills": [...],
      "work_experience": [...],
      "education": [...],
      "certifications": [...],
      "projects": [...],
      "keywords": [...]
    }
  }
}
```

**Error Responses:**
- 400: Invalid file type or empty file
- 422: Missing required file
- 500: Processing error (LLM or PDF extraction)

## Integration with CLI Implementation

The backend reuses the existing CLI functionality from `src/`:

| Backend Component | Source (src/) | Purpose |
|-------------------|---------------|---------|
| Resume model | `src/models/resume.py` | Pydantic schema |
| PDF extraction | `src/services/pdf_service.py` | Text extraction |
| LLM extraction | `src/services/llm_service.py` | Resume parsing |
| Configuration | `src/config.py` | Environment vars |

**No modifications** to the CLI implementation were required. The backend uses imports to access existing functionality.

## Running Tests

```bash
cd backend
pytest tests/ -v
```

Tests verify:
- Health endpoint returns correct status
- Root endpoint returns API information
- File validation (type, size, emptiness)
- Error handling for corrupt PDFs

## CORS Configuration

CORS is enabled by default for local development:
- `http://localhost:3000` (React)
- `http://127.0.0.1:3000`
- `http://localhost:5173` (Vite)
- `http://127.0.0.1:5173`

Modify `app/main.py` to add/remove allowed origins as needed.

## Dependencies

- **FastAPI**: Web framework
- **uvicorn**: ASGI server
- **PyMuPDF**: PDF text extraction
- **OpenAI**: LLM integration (via OpenRouter)
- **python-dotenv**: Environment configuration
- **pytest**: Testing framework

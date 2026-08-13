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
│   └── routers/         # API route handlers
│       └── __init__.py
├── requirements.txt     # Python dependencies
└── .env.example         # Environment variables template
```

## Getting Started

### Prerequisites

- Python 3.10+
- pip package manager

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
# Edit .env with your configuration if needed
```

### Running the API

Start the development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /` - API root with documentation links
- `GET /api/docs` - Interactive API documentation (Swagger UI)
- `GET /api/redoc` - ReDoc documentation

## Integration with CLI Implementation

The backend is designed to be a thin wrapper around the existing CLI functionality. Future routes will:

1. Import and call functions from `src/` CLI modules
2. Handle request/response transformation
3. Provide async wrappers where needed
4. Add authentication/authorization as needed

## CORS Configuration

CORS is enabled by default for local development:
- `http://localhost:3000` (React)
- `http://127.0.0.1:3000`
- `http://localhost:5173` (Vite)
- `http://127.0.0.1:5173`

Modify `app/main.py` to add/remove allowed origins as needed.

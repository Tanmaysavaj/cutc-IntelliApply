from pathlib import Path

from dotenv import load_dotenv
import os

from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / ".env")



BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = BASE_DIR / "reports"

JOBS_DIR = DATA_DIR / "jobs"
ANALYSIS_DIR = DATA_DIR / "analysis"
RESUME_DIR = DATA_DIR / "resume"

def _clean(name, default=None):
    """Reads an env var and strips surrounding whitespace.

    Dashboards such as Render use multi-line text areas for values, so a pasted
    API key very easily picks up a trailing newline or space. That whitespace ends
    up inside the `Authorization: Bearer ...` header, and OpenRouter rejects it with
    exactly the same "401 User not found" it returns for a key that does not
    exist -- which makes the mistake very hard to spot from the outside.

    Left unannotated deliberately: `str | None` is evaluated at definition time and
    raises TypeError before Python 3.10. This module is imported by everything, so
    it must not depend on which interpreter the host happens to provide.
    """
    value = os.getenv(name)
    if value is None:
        return default
    cleaned = value.strip()
    return cleaned if cleaned else default


OPENROUTER_API_KEY = _clean("OPENROUTER_API_KEY")
TAVILY_API_KEY = _clean("TAVILY_API_KEY")
OPENROUTER_MODEL = _clean("OPENROUTER_MODEL", "google/gemini-2.5-flash")

# Surfaced at import time so a misconfigured deployment says so in the logs rather
# than only failing later, per request, as an opaque provider error.
if not OPENROUTER_API_KEY:
    import logging

    logging.getLogger(__name__).error(
        "OPENROUTER_API_KEY is not set. Every AI feature (resume parsing, job "
        "extraction, analysis) will fail until it is configured."
    )
"""Backend configuration - imports from existing CLI config."""

from pathlib import Path
from dotenv import load_dotenv
import os

# Use ROOT_DIR from src config to ensure proper .env loading
from src.config import ROOT_DIR, OPENROUTER_API_KEY, OPENROUTER_MODEL

# Load environment variables from project root
load_dotenv(ROOT_DIR / ".env")

# Backend-specific configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

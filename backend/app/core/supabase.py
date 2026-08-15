"""Centralized Supabase client for the backend.

Uses the service role key for full admin access to:
- Database operations (bypass RLS)
- Storage operations
- Auth token verification

IMPORTANT: The service role key must NEVER be exposed to the frontend.
"""

import os
from functools import lru_cache

from supabase import create_client, Client


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Get the singleton Supabase admin client.
    
    Returns:
        Supabase Client configured with service role key.
        
    Raises:
        ValueError: If required environment variables are missing.
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. "
            "These are required for database persistence."
        )
    
    return create_client(url, key)

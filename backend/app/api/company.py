"""Company Research API with Supabase caching.

Caches company research in the company_research table to avoid
unnecessary Tavily API calls for the same company.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse

from app.core.auth import get_optional_user

logger = logging.getLogger(__name__)
logger.addHandler(logging.StreamHandler())
logger.setLevel(logging.INFO)

router = APIRouter(
    prefix="/api/company",
    tags=["Company Research"],
)

# Cache validity: 7 days
CACHE_TTL_DAYS = 7


@router.get("/{company_name}", tags=["Company Research"])
async def get_company_research(
    company_name: str,
    user_id: Optional[str] = Depends(get_optional_user),
):
    """Get company research, using cache if available.
    
    Flow:
    1. Check company_research table for existing data
    2. If valid cached data exists (< 7 days old), return it
    3. Otherwise, call Tavily, save result, return it
    """
    if not company_name or not company_name.strip():
        raise HTTPException(status_code=400, detail="Company name is required")
    
    company_name = company_name.strip()
    
    # Try to get cached research from Supabase
    try:
        from app.core.supabase import get_supabase_client
        client = get_supabase_client()
        
        result = (
            client.table("company_research")
            .select("*")
            .ilike("company_name", company_name)
            .limit(1)
            .execute()
        )
        
        if result.data and len(result.data) > 0:
            cached = result.data[0]
            updated_at = datetime.fromisoformat(cached["updated_at"].replace("Z", "+00:00"))
            
            # Check if cache is still valid
            if datetime.now(timezone.utc) - updated_at < timedelta(days=CACHE_TTL_DAYS):
                logger.info(f"Returning cached research for '{company_name}'")
                return {
                    "company_name": company_name,
                    "research_data": cached.get("research_data"),
                    "legitimacy_data": cached.get("legitimacy_data"),
                    "cached": True,
                    "updated_at": cached["updated_at"],
                }
    except Exception as e:
        logger.warning(f"Cache lookup failed for '{company_name}': {e}")
    
    # Cache miss or expired - perform fresh research
    try:
        from app.services.tavily_service import TavilyExtractor
        
        tavily = TavilyExtractor()
        research_text = tavily.research_company(company_name)
        
        research_data = {
            "summary": research_text,
            "researched_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Save to cache
        try:
            from app.core.supabase import get_supabase_client
            client = get_supabase_client()
            
            # Upsert using company_name (unique index on lower(company_name))
            client.table("company_research").upsert(
                {
                    "company_name": company_name,
                    "research_data": research_data,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="company_name",
            ).execute()
            
            logger.info(f"Cached fresh research for '{company_name}'")
        except Exception as e:
            logger.warning(f"Failed to cache research for '{company_name}': {e}")
        
        return {
            "company_name": company_name,
            "research_data": research_data,
            "legitimacy_data": None,
            "cached": False,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
    except Exception as e:
        logger.error(f"Company research failed for '{company_name}': {e}")
        return {
            "company_name": company_name,
            "research_data": {"summary": f"Research unavailable: {str(e)}"},
            "legitimacy_data": None,
            "cached": False,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

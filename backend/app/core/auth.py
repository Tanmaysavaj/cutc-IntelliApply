"""Authentication dependency for FastAPI endpoints.

Validates the Supabase access token from the Authorization header
and extracts the authenticated user's ID.

Usage:
    @router.post("/something")
    async def some_endpoint(user_id: str = Depends(get_current_user)):
        # user_id is the authenticated Supabase user's UUID
        ...
"""

import os
from typing import Optional

from fastapi import Depends, HTTPException, Header
import jwt


# Supabase JWT secret is derived from the project's JWT secret
# For service role validation, we verify the token using Supabase's JWT secret
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """Extract and validate the current user from the Authorization header.
    
    Args:
        authorization: Bearer token from the Authorization header.
        
    Returns:
        The authenticated user's UUID string.
        
    Raises:
        HTTPException 401: If the token is missing, invalid, or expired.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in.",
        )
    
    # Extract token from "Bearer <token>"
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Expected: Bearer <token>",
        )
    
    token = parts[1]
    
    try:
        # Decode and verify the JWT
        # Supabase uses HS256 with the JWT secret from the project settings
        jwt_secret = SUPABASE_JWT_SECRET or os.getenv("SUPABASE_JWT_SECRET", "")
        
        if not jwt_secret:
            # Fallback: use the service role key to verify via Supabase API
            # This is less efficient but works without the JWT secret
            return await _verify_token_via_supabase(token)
        
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing user identifier.",
            )
        
        return user_id
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Session expired. Please sign in again.",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication token: {str(e)}",
        )


async def _verify_token_via_supabase(token: str) -> str:
    """Fallback: verify token by calling Supabase auth.getUser().
    
    This uses the service role key client to verify the token.
    Less efficient than local JWT verification but always works.
    """
    from app.core.supabase import get_supabase_client
    
    try:
        client = get_supabase_client()
        # Use the token to get the user via Supabase admin API
        response = client.auth.get_user(token)
        
        if response and response.user:
            return response.user.id
        
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}",
        )


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Like get_current_user but returns None instead of raising 401.
    
    Use this for endpoints that support both authenticated and demo modes.
    """
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None

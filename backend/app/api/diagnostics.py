"""Configuration diagnostics.

Exists because a misconfigured AI-provider credential is indistinguishable from a
bad resume from the client's point of view: OpenRouter answers `401 User not found`
for a revoked key, a key that was never created, and a key that merely picked up a
trailing newline when it was pasted into a dashboard. Every one of those surfaced to
users as a failed resume upload.

This endpoint answers "is the server configured correctly?" directly.

Nothing secret is returned — no key, no prefix, and no length. Only whether a value
is present, whether it had stray whitespace, and what the provider says about it.
"""

import logging
import os
from typing import Any, Dict

import requests
from fastapi import APIRouter

from src.config import OPENROUTER_API_KEY, OPENROUTER_MODEL, TAVILY_API_KEY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/diagnostics", tags=["Diagnostics"])

OPENROUTER_KEY_URL = "https://openrouter.ai/api/v1/key"
PROVIDER_TIMEOUT_SECONDS = 15


def _raw_had_whitespace(name: str) -> bool:
    """True when the configured value has surrounding whitespace.

    This is the single most useful signal here: it is invisible in a dashboard and
    produces an authentication error identical to a non-existent key.
    """
    raw = os.getenv(name)
    return bool(raw) and raw != raw.strip()


@router.get("")
async def diagnostics() -> Dict[str, Any]:
    """Reports whether the server's credentials are present and accepted."""
    checks: Dict[str, Any] = {
        "openrouter_key_present": bool(OPENROUTER_API_KEY),
        "openrouter_key_had_surrounding_whitespace": _raw_had_whitespace("OPENROUTER_API_KEY"),
        "openrouter_model": OPENROUTER_MODEL,
        "tavily_key_present": bool(TAVILY_API_KEY),
        "supabase_url_present": bool(os.getenv("SUPABASE_URL", "").strip()),
        "supabase_service_role_key_present": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()),
        "supabase_jwt_secret_present": bool(os.getenv("SUPABASE_JWT_SECRET", "").strip()),
    }

    if not OPENROUTER_API_KEY:
        checks["openrouter"] = "not-configured"
        checks["ai_features_working"] = False
        checks["next_step"] = (
            "Set OPENROUTER_API_KEY in the backend environment. Until then every AI "
            "feature fails."
        )
        return checks

    # Ask the provider about the key itself rather than burning a model call.
    try:
        response = requests.get(
            OPENROUTER_KEY_URL,
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
            timeout=PROVIDER_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        logger.warning("Diagnostics could not reach OpenRouter: %s", exc)
        checks["openrouter"] = "unreachable"
        checks["ai_features_working"] = False
        checks["next_step"] = "Could not reach OpenRouter from the server. Check outbound network access."
        return checks

    checks["openrouter_status"] = response.status_code

    if response.status_code == 200:
        checks["openrouter"] = "ok"
        checks["ai_features_working"] = True
        checks["next_step"] = "Configuration looks correct."
        return checks

    checks["ai_features_working"] = False

    if response.status_code == 401:
        checks["openrouter"] = "rejected"
        checks["next_step"] = (
            "OpenRouter rejected the key (401). It is revoked, does not exist, or has "
            "stray whitespace — check `openrouter_key_had_surrounding_whitespace` above. "
            "Generate a fresh key at https://openrouter.ai/keys and re-enter it with no "
            "trailing newline."
        )
    elif response.status_code in (402, 429):
        checks["openrouter"] = "no-credits-or-rate-limited"
        checks["next_step"] = "The key is valid but out of credits or rate limited. Top up or wait."
    else:
        checks["openrouter"] = "unexpected-status"
        checks["next_step"] = "OpenRouter returned an unexpected status. Check the provider's status page."

    return checks

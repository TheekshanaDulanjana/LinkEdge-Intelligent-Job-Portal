"""Request authentication for FastAPI services.

Two ways in:
  * a user session token (Authorization: Bearer ...), verified by asking the
    auth-service (the same way the Node services do it);
  * a service key (X-Service-Key), used by the other back-end services.
"""
import hmac
import os
import time
from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:3001")
_CACHE: dict = {}
_CACHE_TTL = 30  # seconds; short so a logout or ban takes effect quickly


@dataclass
class Caller:
    user_id: Optional[str]
    role: Optional[str]
    is_service: bool = False


def _service_key_ok(key: Optional[str]) -> bool:
    expected = os.getenv("INTERNAL_SERVICE_KEY", "")
    return bool(key and expected and hmac.compare_digest(key.encode(), expected.encode()))


def _verify_token(token: str) -> Optional[Caller]:
    import requests  # imported here so services that only use service keys do not need it
    hit = _CACHE.get(token)
    if hit and hit[0] > time.time():
        return hit[1]
    try:
        r = requests.get(
            f"{AUTH_SERVICE_URL}/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5,
        )
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    if r.status_code != 200:
        return None
    d = (r.json() or {}).get("data") or {}
    if not d.get("id"):
        return None
    caller = Caller(user_id=d["id"], role=d.get("role"))
    if len(_CACHE) > 2000:
        _CACHE.clear()
    _CACHE[token] = (time.time() + _CACHE_TTL, caller)
    return caller


def require_caller(
    authorization: Optional[str] = Header(default=None),
    x_service_key: Optional[str] = Header(default=None),
) -> Caller:
    """Accept a valid user token or a valid service key."""
    if _service_key_ok(x_service_key):
        return Caller(user_id=None, role=None, is_service=True)
    if authorization and authorization.lower().startswith("bearer "):
        caller = _verify_token(authorization[7:].strip())
        if caller:
            return caller
    raise HTTPException(status_code=401, detail="Authentication required")


def require_user(
    authorization: Optional[str] = Header(default=None),
    x_service_key: Optional[str] = Header(default=None),
) -> Caller:
    caller = require_caller(authorization, x_service_key)
    if caller.is_service:
        raise HTTPException(status_code=403, detail="A user session is required")
    return caller


def require_service(x_service_key: Optional[str] = Header(default=None)) -> Caller:
    """Back-end services only."""
    if not _service_key_ok(x_service_key):
        raise HTTPException(status_code=401, detail="Service authentication required")
    return Caller(user_id=None, role=None, is_service=True)

from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Dict, Any
from app.core.config import settings

security = HTTPBearer(auto_error=False)
DEV_LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001"


def decode_jwt_without_verification(token: str) -> Dict[str, Any]:
    """
    Development-only helper.
    Preserves the real Supabase user id when JWT_SECRET is not configured yet.
    """
    try:
        payload = jwt.decode(
            token,
            options={
                "verify_signature": False,
                "verify_aud": False,
                "verify_exp": False,
            },
        )
        return payload if isinstance(payload, dict) else {}
    except jwt.InvalidTokenError:
        return {}

def verify_jwt(credentials: HTTPAuthorizationCredentials | None = Security(security)) -> Dict[str, Any]:
    """
    Verifies the JWT token from Supabase Auth and returns the payload.
    Used as a dependency in protected FastAPI routes.
    """
    if (not credentials) and settings and settings.DEV_BYPASS_AUTH:
        return {"sub": DEV_LOCAL_USER_ID}

    if not settings or not settings.JWT_SECRET:
        if settings and settings.DEV_BYPASS_AUTH:
            if credentials:
                payload = decode_jwt_without_verification(credentials.credentials)
                user_id = payload.get("sub")
                if user_id:
                    return payload

            return {"sub": DEV_LOCAL_USER_ID}
        raise HTTPException(status_code=500, detail="JWT_SECRET not configured")

    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization credentials were not provided")

    token = credentials.credentials
    try:
        # Legacy Supabase JWT setups commonly use HS256.
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=["HS256"], 
            options={"verify_aud": False} # audience check can be strict depending on supabase setup
        )
        return payload
    except jwt.ExpiredSignatureError:
        if settings and settings.DEV_BYPASS_AUTH:
            payload = decode_jwt_without_verification(token)
            if payload.get("sub"):
                return payload
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        if settings and settings.DEV_BYPASS_AUTH:
            payload = decode_jwt_without_verification(token)
            if payload.get("sub"):
                return payload

            return {"sub": DEV_LOCAL_USER_ID}
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

def get_current_user_id(payload: Dict[str, Any] = Security(verify_jwt)) -> str:
    """
    Extracts the user ID (UUID) from the verified JWT token payload.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    return user_id

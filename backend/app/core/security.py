from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Dict, Any
from app.core.config import settings

security = HTTPBearer()

def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    """
    Verifies the JWT token from Supabase Auth and returns the payload.
    Used as a dependency in protected FastAPI routes.
    """
    if not settings or not settings.JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT_SECRET not configured")

    token = credentials.credentials
    try:
        # Supabase JWTs use HS256 algorithm by default
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=["HS256"], 
            options={"verify_aud": False} # audience check can be strict depending on supabase setup
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

def get_current_user_id(payload: Dict[str, Any] = Security(verify_jwt)) -> str:
    """
    Extracts the user ID (UUID) from the verified JWT token payload.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    return user_id

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db.supabase import get_supabase

router = APIRouter()

AUTH_USER_LOOKUP_PAGE_SIZE = 200
AUTH_USER_LOOKUP_MAX_PAGES = 50


class EmailStatusPayload(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def email_exists_in_supabase(email: str) -> bool:
    supabase = get_supabase()
    normalized_email = normalize_email(email)

    for page in range(1, AUTH_USER_LOOKUP_MAX_PAGES + 1):
        users = supabase.auth.admin.list_users(
            page=page,
            per_page=AUTH_USER_LOOKUP_PAGE_SIZE,
        )

        for user in users:
            if getattr(user, "deleted_at", None):
                continue

            user_email = getattr(user, "email", None)
            if isinstance(user_email, str) and normalize_email(user_email) == normalized_email:
                return True

        if len(users) < AUTH_USER_LOOKUP_PAGE_SIZE:
            return False

    raise RuntimeError("Auth user lookup reached pagination limit")


@router.post("/auth/email-status")
def get_email_status(payload: EmailStatusPayload):
    email = normalize_email(payload.email)
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    try:
        exists = email_exists_in_supabase(email)
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Email lookup unavailable: {error}")

    return {
        "exists": exists,
    }

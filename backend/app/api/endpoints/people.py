from fastapi import APIRouter, Depends
from app.core.security import get_current_user_id

router = APIRouter()

@router.get("/people")
async def get_people_clusters(
    user_id: str = Depends(get_current_user_id)
):
    """
    Returns face clusters for the current user.
    """
    # 1. Query Supabase `face_clusters` where user_id == target user
    # 2. Return cluster ID, name, cover face, and associated Image_UUIDs
    
    return {
        "status": "success",
        "clusters": []
    }

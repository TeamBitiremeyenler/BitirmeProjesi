from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user_id
from app.services.search_service import SearchService, DEFAULT_MATCH_LIMIT, MAX_MATCH_LIMIT

router = APIRouter()

@router.get("/search")
async def search_images(
    q: str = Query(..., min_length=1),
    limit: int = Query(DEFAULT_MATCH_LIMIT, ge=1, le=MAX_MATCH_LIMIT),
    user_id: str = Depends(get_current_user_id)
):
    """
    Semantic search endpoint.
    Converts text query `q` to a CLIP embedding and searches Supabase/pgvector for matching photos.
    """
    try:
        response = SearchService().search_images(user_id=user_id, query=q, limit=limit)
    except ValueError as config_error:
        raise HTTPException(status_code=503, detail=str(config_error))
    except Exception as search_error:
        raise HTTPException(status_code=500, detail=f"Search failed: {search_error}")

    return {
        "query": q,
        "count": len(response.results),
        "mode": response.mode,
        "results": response.results,
    }

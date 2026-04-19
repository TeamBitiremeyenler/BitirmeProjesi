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
    Converts text query `q` to a SigLIP2 text embedding and searches image embeddings.
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


@router.delete("/search/cache")
async def clear_search_cache(
    user_id: str = Depends(get_current_user_id)
):
    try:
        summary = SearchService().clear_user_index_data(user_id=user_id)
    except Exception as clear_error:
        raise HTTPException(status_code=500, detail=f"Cache cleanup failed: {clear_error}")

    return {
        "status": "success",
        "summary": summary,
    }


@router.delete("/search/photos/{photo_id:path}")
async def delete_photo_from_search(
    photo_id: str,
    user_id: str = Depends(get_current_user_id)
):
    cleaned_photo_id = photo_id.strip()
    if not cleaned_photo_id:
        raise HTTPException(status_code=400, detail="Photo id is required")

    try:
        summary = SearchService().delete_photo_index_data(
            user_id=user_id,
            photo_id=cleaned_photo_id,
            strict=True,
        )
    except Exception as delete_error:
        raise HTTPException(status_code=500, detail=f"Photo cleanup failed: {delete_error}")

    return {
        "status": "success",
        "summary": summary,
    }

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user_id
from app.services.people_service import get_people_cluster, list_people_clusters, rename_people_cluster

router = APIRouter()


class RenamePersonPayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)


@router.get("/people")
async def get_people_clusters(
    user_id: str = Depends(get_current_user_id)
):
    """
    Returns face clusters for the current user.
    """
    clusters, source = list_people_clusters(user_id)

    return {
        "status": "success",
        "source": source,
        "clusters": clusters,
    }


@router.get("/people/{cluster_id}")
async def get_person_detail(
    cluster_id: str,
    user_id: str = Depends(get_current_user_id),
):
    cluster, source = get_people_cluster(user_id, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Person not found")

    return {
        "status": "success",
        "source": source,
        "cluster": cluster,
    }


@router.patch("/people/{cluster_id}")
async def rename_person(
    cluster_id: str,
    payload: RenamePersonPayload,
    user_id: str = Depends(get_current_user_id),
):
    try:
        cluster, source = rename_people_cluster(user_id, cluster_id, payload.name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    if not cluster:
        raise HTTPException(status_code=404, detail="Person not found")

    return {
        "status": "success",
        "source": source,
        "cluster": cluster,
    }

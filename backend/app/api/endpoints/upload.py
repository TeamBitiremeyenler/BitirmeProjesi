from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
import shutil
import os
from uuid import uuid4
from app.core.security import get_current_user_id

router = APIRouter()

TEMP_UPLOAD_DIR = "tmp/smart_gallery_uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_image(
    background_tasks: BackgroundTasks,
    photo_id: str = Form(...),
    captured_at: str | None = Form(None),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Accepts an image and photo_id from the mobile client.
    Saves to tmp and pushes the heavy AI pipeline to the background.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
        
    # 1. Ephemeral Save: Temporarily store the file
    tmp_path = os.path.join(TEMP_UPLOAD_DIR, f"{photo_id}_{file.filename}")
    image_uuid = str(uuid4())
    try:
        with open(tmp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Trigger Intelligence Pipeline in the background
        # It handles BLIP, CLIP, InsightFace, Supabase limits, and cleanup.
        from app.services.pipeline import process_image
        background_tasks.add_task(process_image, tmp_path, user_id, photo_id, image_uuid, captured_at)
        
        return {
            "status": "success", 
            "message": "Image queued for processing", 
            "photo_id": photo_id,
            "user_id": user_id,
            "image_uuid": image_uuid,
        }
    except Exception as e:
        # If it fails before enqueuing, wipe the file immediately
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

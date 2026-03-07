from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
import shutil
import os
from app.core.security import get_current_user_id
from app.services.pipeline import process_image

router = APIRouter()

TEMP_UPLOAD_DIR = "tmp/smart_gallery_uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_image(
    background_tasks: BackgroundTasks,
    photo_id: str = Form(...),
    file: UploadFile = File(...),
    # user_id: str = Depends(get_current_user_id) # TEMPORARILY DISABLED OPEN LATER
):
    """
    Accepts an image and photo_id from the mobile client.
    Saves to tmp and pushes the heavy AI pipeline to the background.
    """
    # TEMP: Hardcode user_id for testing without JWT
    user_id = "48a47b1a-49c1-412e-94fb-6adf4d416f4b" # erase later
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
        
    # 1. Ephemeral Save: Temporarily store the file
    tmp_path = os.path.join(TEMP_UPLOAD_DIR, f"{photo_id}_{file.filename}")
    try:
        with open(tmp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Trigger Intelligence Pipeline in the background
        # It handles BLIP, CLIP, InsightFace, Supabase limits, and cleanup.
        background_tasks.add_task(process_image, tmp_path, user_id, photo_id)
        
        return {
            "status": "success", 
            "message": "Image queued for processing", 
            "photo_id": photo_id
        }
    except Exception as e:
        # If it fails before enqueuing, wipe the file immediately
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

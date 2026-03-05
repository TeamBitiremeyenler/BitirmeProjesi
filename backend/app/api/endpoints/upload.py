from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
import shutil
import os
from app.core.security import get_current_user_id

router = APIRouter()

TEMP_UPLOAD_DIR = "/tmp/smart_gallery_uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_image(
    image_uuid: str = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """
    Accepts an image and UUID from the mobile client.
    Enforces Ephemeral Processing: Saves to tmp, processes, then deletes.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
        
    # 1. Ephemeral Save: Temporarily store the file
    tmp_path = os.path.join(TEMP_UPLOAD_DIR, f"{image_uuid}_{file.filename}")
    try:
        with open(tmp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Extract Intelligence (To be implemented in Phase 3)
        # - YOLO object detection
        # - CLIP embedding generation
        # - InsightFace encoding
        
        # 3. Save metadata to DB
        # supabase.table("images").insert(...)
        # qdrant.upsert("images", vectors=...)
        
        return {
            "status": "success", 
            "message": "Image processed successfully", 
            "image_uuid": image_uuid
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    finally:
        # 4. Ephemeral Discard: ALWAYS delete the binary file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

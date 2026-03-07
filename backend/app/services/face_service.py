import cv2
import numpy as np
from insightface.app import FaceAnalysis

# Initialize InsightFace model
# 'buffalo_l' is the standard model pack. It provides 512D embeddings out of the box.
app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0, det_size=(640, 640)) # ctx_id=0 for GPU, -1 for CPU

def detect_and_encode_faces(image_path: str):
    """
    Analyzes an image to find faces.
    Returns a list of dicts containing:
    - 'bbox': [x1, y1, x2, y2]
    - 'embedding': list of 512 floats
    """
    try:
        # cv2 reads images in BGR format which insightface expects
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image at {image_path}")

        faces = app.get(img)
        
        results = []
        for face in faces:
            results.append({
                "bbox": face.bbox.tolist(), # [x1, y1, x2, y2]
                "embedding": face.embedding.tolist() # 512 dimensions for buffalo_l
            })
            
        return results
    except Exception as e:
        print(f"Face Analysis Error for {image_path}: {e}")
        return []

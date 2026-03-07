import os
import numpy as np
from app.db.supabase import get_supabase
from app.services.blip_service import generate_caption
from app.services.embedding_service import generate_text_embedding
from app.services.face_service import detect_and_encode_faces

def cosine_similarity(vec1, vec2):
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

def process_image(image_path: str, user_id: str, photo_id: str):
    """
    Background Task pipeline.
    Runs BLIP -> Embedding -> Faces -> Inserts into DB -> Deletes file.
    """
    supabase = get_supabase()
    
    try:
        # 1. Image Captioning
        print(f"[{photo_id}] Generating caption...")
        caption = generate_caption(image_path)
        
        # 2. Text to Vector
        print(f"[{photo_id}] Vectorizing caption...")
        embedding = generate_text_embedding(caption)
        
        # 3. Face Detection & Recognition
        print(f"[{photo_id}] Detecting faces...")
        faces = detect_and_encode_faces(image_path)
        
        # We need to figure out who these faces are
        # Fetch existing clusters for this user to compare
        #//res = supabase.table('face_clusters').select('*').eq('user_id', user_id).execute()
        #existing_clusters = res.data
        
        detected_persons = []
        face_records = []
        
        for face in faces:
            face_emb = face['embedding']
            bbox = face['bbox']
            
            matched_cluster_id = None
            best_sim = -1
            best_cluster_name = None
            
            # Naive 1-to-1 comparison with cluster centroids/examples
            # For a real app, you'd use pgvector or DBSCAN here, but for now we do naive iteration
            # We'll just fetch a few detections from each cluster to compare, or assume 
            # we do it later. For Phase 3, let's do a simple threshold check.
            
            # Since face_clusters doesn't store the average embedding yet in our schema, 
            # we will just insert it as a new cluster for now or leave it generic until Phase 5.
            # Let's create a generic "Person" cluster for every face if it's not matched.
            
            # TODO: Advanced clustering in Phase 5
            # For now, create a new cluster "Unknown Person" and add the detection
            
            #// CONTROL
            cluster_res = supabase.table('face_clusters').insert({
                "user_id": user_id,
                "name": "Unknown Person"
            }).execute()
            
            if cluster_res.data:
                matched_cluster_id = cluster_res.data[0]['id']
                # detected_persons.append("Unknown Person") # Omit pushing Unknown to tags
                
                face_records.append({
                    "cluster_id": matched_cluster_id,
                    "bounding_box": bbox,
                    "embedding": face_emb # We'll need to add this column to face_detections soon
                })

        # 4. Insert Image Record into DB
        print(f"[{photo_id}] Saving to Supabase...")
        img_res = supabase.table('images').insert({
            "user_id": user_id,
            "photo_id": photo_id,
            "embedding": embedding,
            "persons": detected_persons
        }).execute()
        
        image_uuid = img_res.data[0]['uuid']
        
        # 5. Insert Face Detections
        for fr in face_records:
            supabase.table('face_detections').insert({
                "image_uuid": image_uuid,
                "cluster_id": fr['cluster_id'],
                "bounding_box": fr['bounding_box'] #// CONTROL - DO WE REALLY NEED THAT?
            }).execute()

        print(f"[{photo_id}] Pipeline completed successfully!")
        
    except Exception as e:
        print(f"Pipeline Failed for {photo_id}: {e}")
        
    finally:
        # Guarantee Ephemeral Deletion
        if os.path.exists(image_path):
            os.remove(image_path)
            print(f"[{photo_id}] Temporary file deleted.")

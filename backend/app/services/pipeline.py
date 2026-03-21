import os

from app.db.supabase import get_supabase
from app.services.blip_service import generate_caption
from app.services.embedding_service import generate_text_embedding
from app.services.local_index_store import save_index_record


def build_caption_tags(caption: str) -> list[str]:
    stopwords = {
        "a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "or",
        "the", "to", "with",
    }
    cleaned = (
        caption.lower()
        .replace(",", " ")
        .replace(".", " ")
        .replace(":", " ")
        .replace(";", " ")
    )
    tokens: list[str] = []
    for token in cleaned.split():
        normalized = token.strip()
        if len(normalized) < 3 or normalized in stopwords or normalized in tokens:
            continue
        tokens.append(normalized)
        if len(tokens) >= 12:
            break
    return tokens


def process_image(
    image_path: str,
    user_id: str,
    photo_id: str,
    image_uuid: str,
    captured_at: str | None = None,
):
    """
    Background Task pipeline.
    Runs BLIP -> Embedding -> optional face analysis -> persistence -> cleanup.
    """
    supabase = get_supabase()

    try:
        print(f"[{photo_id}] Generating caption...")
        caption = generate_caption(image_path)
        tags = build_caption_tags(caption)

        print(f"[{photo_id}] Vectorizing caption...")
        embedding = generate_text_embedding(caption)

        try:
            from app.services.face_service import detect_and_encode_faces

            print(f"[{photo_id}] Detecting faces...")
            faces = detect_and_encode_faces(image_path)
        except Exception as face_error:
            print(f"[{photo_id}] Face pipeline skipped: {face_error}")
            faces = []

        detected_persons: list[str] = []
        face_records: list[dict[str, object]] = []

        for face in faces:
            bbox = face["bbox"]

            try:
                cluster_res = supabase.table("face_clusters").insert({
                    "user_id": user_id,
                    "name": "Unknown Person",
                }).execute()
            except Exception as cluster_error:
                print(f"[{photo_id}] Skipping face cluster insert: {cluster_error}")
                continue

            if cluster_res.data:
                face_records.append({
                    "cluster_id": cluster_res.data[0]["id"],
                    "bounding_box": bbox,
                })

        record = {
            "uuid": image_uuid,
            "user_id": user_id,
            "photo_id": photo_id,
            "caption": caption,
            "tags": tags,
            "embedding": embedding,
            "persons": detected_persons,
            "captured_at": captured_at,
        }

        print(f"[{photo_id}] Saving local dev index...")
        save_index_record(record)

        print(f"[{photo_id}] Saving to Supabase...")
        try:
            img_res = supabase.table("images").upsert(
                record,
                on_conflict="user_id,photo_id",
            ).execute()

            stored_image_uuid = img_res.data[0]["uuid"]

            for fr in face_records:
                try:
                    supabase.table("face_detections").insert({
                        "image_uuid": stored_image_uuid,
                        "cluster_id": fr["cluster_id"],
                        "bounding_box": fr["bounding_box"],
                    }).execute()
                except Exception as face_detection_error:
                    print(f"[{photo_id}] Skipping face detection insert: {face_detection_error}")
        except Exception as db_error:
            print(f"[{photo_id}] Supabase persistence skipped: {db_error}")

        print(f"[{photo_id}] Pipeline completed successfully!")

    except Exception as e:
        print(f"Pipeline Failed for {photo_id}: {e}")

    finally:
        if os.path.exists(image_path):
            os.remove(image_path)
            print(f"[{photo_id}] Temporary file deleted.")

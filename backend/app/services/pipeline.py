import os
import time
import hashlib

from app.services.caption_terms import (
    build_caption_tags,
    choose_preferred_human_caption,
    is_weak_human_caption,
)
from app.services.blip_service import generate_caption
from app.services.embedding_service import generate_text_embedding
from app.services.local_index_store import save_index_record
from app.services.people_service import assign_faces_to_clusters, looks_like_people_photo

PRIMARY_SINGLE_PERSON_PROMPT = "a photo of a person"
PRIMARY_MULTI_PERSON_PROMPT = "a photo of people"
PRIMARY_GENERIC_PROMPT = "a photo of"
RETRY_SINGLE_PERSON_PROMPT = "a portrait of a person"
RETRY_MULTI_PERSON_PROMPT = "a group photo of people"


def build_content_hash(image_path: str) -> str:
    digest = hashlib.sha256()

    with open(image_path, "rb") as image_file:
        for chunk in iter(lambda: image_file.read(1024 * 1024), b""):
            digest.update(chunk)

    return digest.hexdigest()


def select_caption_prompt(face_count: int, *, retry: bool = False) -> str:
    normalized_face_count = max(0, int(face_count))

    if normalized_face_count >= 2:
        return RETRY_MULTI_PERSON_PROMPT if retry else PRIMARY_MULTI_PERSON_PROMPT

    if normalized_face_count == 1:
        return RETRY_SINGLE_PERSON_PROMPT if retry else PRIMARY_SINGLE_PERSON_PROMPT

    return PRIMARY_GENERIC_PROMPT


def process_image(
    image_path: str,
    user_id: str,
    photo_id: str,
    image_uuid: str,
    captured_at: str | None = None,
):
    """
    Background task pipeline.
    Runs fast face detection -> prompt-conditioned BLIP -> embedding -> optional
    face fallback -> persistence -> cleanup.
    """
    supabase = None

    try:
        from app.db.supabase import get_supabase

        supabase = get_supabase()
    except Exception as config_error:
        print(f"[{photo_id}] Supabase unavailable, using local-only persistence: {config_error}")

    try:
        pipeline_started_at = time.perf_counter()
        content_hash = build_content_hash(image_path)
        faces: list[dict[str, object]] = []
        face_attempt: str | None = None
        detect_faces_with_attempt = None

        try:
            from app.services.face_service import detect_and_encode_faces_with_attempt as detect_faces_with_attempt

            print(f"[{photo_id}] Detecting faces (fast pass)...")
            fast_face_started_at = time.perf_counter()
            faces, face_attempt = detect_faces_with_attempt(
                image_path,
                detection_mode="fast",
            )
            print(
                f"[{photo_id}] Fast face detection completed in "
                f"{time.perf_counter() - fast_face_started_at:.2f}s "
                f"({len(faces)} faces, attempt={face_attempt or 'none'})"
            )
        except Exception as face_error:
            print(f"[{photo_id}] Fast face pipeline skipped: {face_error}")
            faces = []
            face_attempt = None

        face_count = len(faces)
        primary_prompt = select_caption_prompt(face_count)

        print(f"[{photo_id}] Generating caption...")
        caption_started_at = time.perf_counter()
        primary_caption = generate_caption(image_path, prompt=primary_prompt)
        caption = primary_caption

        if face_count > 0 and is_weak_human_caption(primary_caption):
            retry_prompt = select_caption_prompt(face_count, retry=True)
            retry_caption = generate_caption(image_path, prompt=retry_prompt)
            caption = choose_preferred_human_caption(primary_caption, retry_caption)
            print(
                f"[{photo_id}] Human caption retry evaluated "
                f"(primary_prompt={primary_prompt!r}, retry_prompt={retry_prompt!r})"
            )

        tags = build_caption_tags(caption)
        print(f"[{photo_id}] Caption completed in {time.perf_counter() - caption_started_at:.2f}s")

        print(f"[{photo_id}] Vectorizing caption...")
        embedding_started_at = time.perf_counter()
        embedding = generate_text_embedding(caption)
        print(f"[{photo_id}] Embedding completed in {time.perf_counter() - embedding_started_at:.2f}s")

        human_like_metadata = looks_like_people_photo(caption=caption, tags=tags)

        if faces and not human_like_metadata:
            print(
                f"[{photo_id}] Fast face pass found faces despite non-human caption/tags; "
                "keeping detector result."
            )
        elif not faces and human_like_metadata and detect_faces_with_attempt is not None:
            print(f"[{photo_id}] Fast face pass found 0 faces; enabling human-guided retries...")
            fallback_face_started_at = time.perf_counter()
            faces, face_attempt = detect_faces_with_attempt(
                image_path,
                detection_mode="fallback",
                enable_hard_portrait_fallback=True,
            )
            print(
                f"[{photo_id}] Fallback face detection completed in "
                f"{time.perf_counter() - fallback_face_started_at:.2f}s "
                f"({len(faces)} faces, attempt={face_attempt or 'none'})"
            )
            if not faces:
                print(
                    f"[{photo_id}] Human-looking image produced 0 faces after all attempts. "
                    f"caption={caption!r} tags={tags}"
                )
        elif not faces and human_like_metadata:
            print(
                f"[{photo_id}] Human-looking image skipped fallback because "
                "the face detector was unavailable."
            )
        elif not faces:
            print(
                f"[{photo_id}] Fast face pass found 0 faces; "
                "skipping expensive retries for non-human caption/tags"
            )

        face_records, _cluster_records = assign_faces_to_clusters(
            user_id=user_id,
            image_uuid=image_uuid,
            photo_id=photo_id,
            faces=faces,
            captured_at=captured_at,
        )
        detected_persons = list(dict.fromkeys([
            str(face_record["cluster_name"])
            for face_record in face_records
            if face_record.get("cluster_name")
        ]))
        face_cluster_refs = list(dict.fromkeys([
            (
                str(face_record["cluster_id"]),
                str(face_record["cluster_name"]),
            )
            for face_record in face_records
            if face_record.get("cluster_id") and face_record.get("cluster_name")
        ]))

        record = {
            "uuid": image_uuid,
            "user_id": user_id,
            "photo_id": photo_id,
            "caption": caption,
            "tags": tags,
            "embedding": embedding,
            "persons": detected_persons,
            "content_hash": content_hash,
            "face_clusters": [
                {
                    "id": cluster_id,
                    "name": cluster_name,
                }
                for cluster_id, cluster_name in face_cluster_refs
            ],
            "captured_at": captured_at,
        }
        supabase_record = {
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

        if supabase is not None:
            print(f"[{photo_id}] Saving to Supabase...")
            try:
                img_res = supabase.table("images").upsert(
                    supabase_record,
                    on_conflict="user_id,photo_id",
                ).execute()

                stored_image_uuid = img_res.data[0]["uuid"]

                if face_cluster_refs:
                    cluster_payload = [
                        {
                            "id": cluster_id,
                            "user_id": user_id,
                            "name": cluster_name,
                        }
                        for cluster_id, cluster_name in face_cluster_refs
                    ]
                    try:
                        supabase.table("face_clusters").upsert(
                            cluster_payload,
                            on_conflict="id",
                        ).execute()
                    except Exception as cluster_error:
                        print(f"[{photo_id}] Skipping face cluster upsert: {cluster_error}")

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

        print(f"[{photo_id}] Pipeline completed successfully in {time.perf_counter() - pipeline_started_at:.2f}s")

    except Exception as e:
        print(f"Pipeline Failed for {photo_id}: {e}")

    finally:
        if os.path.exists(image_path):
            os.remove(image_path)
            print(f"[{photo_id}] Temporary file deleted.")

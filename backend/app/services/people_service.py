from __future__ import annotations

import json
import math
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.config import settings
from app.db.supabase import get_supabase
from app.services.local_index_store import (
    get_all_index_records,
    get_index_records_for_user,
    rename_face_cluster_references,
)

PEOPLE_STORE_PATH = Path(__file__).resolve().parents[2] / "tmp" / "local_people_index.json"
PEOPLE_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)

_LOCK = threading.Lock()
FACE_MATCH_THRESHOLD = 0.40
FACE_MATCH_THRESHOLD_SAME_IMAGE = 0.68
PERSON_HINTS = {
    "person",
    "people",
    "man",
    "men",
    "woman",
    "women",
    "boy",
    "girl",
    "guy",
    "lady",
    "male",
    "female",
    "player",
    "speaker",
    "microphone",
    "microphones",
    "meeting",
    "president",
    "portrait",
    "selfie",
    "face",
    "beard",
    "glasses",
    "athlete",
    "team",
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_store() -> dict[str, list[dict[str, Any]]]:
    if not PEOPLE_STORE_PATH.exists():
        return {"clusters": [], "detections": []}

    try:
        with PEOPLE_STORE_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {"clusters": [], "detections": []}

    if not isinstance(data, dict):
        return {"clusters": [], "detections": []}

    clusters = data.get("clusters")
    detections = data.get("detections")

    return {
        "clusters": clusters if isinstance(clusters, list) else [],
        "detections": detections if isinstance(detections, list) else [],
    }


def _write_store(store: dict[str, list[dict[str, Any]]]) -> None:
    with PEOPLE_STORE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(store, handle, ensure_ascii=True, indent=2)


def _parse_embedding(value: Any) -> list[float]:
    if not isinstance(value, list):
        return []

    parsed: list[float] = []
    for item in value:
        try:
            parsed.append(float(item))
        except (TypeError, ValueError):
            return []
    return parsed


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    dot_product = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))

    if left_norm == 0 or right_norm == 0:
        return 0.0

    return dot_product / (left_norm * right_norm)


def _blend_embeddings(current: list[float], incoming: list[float], sample_count: int) -> list[float]:
    if not current:
        return incoming

    total = max(1, sample_count)
    return [
        ((current[index] * total) + incoming[index]) / (total + 1)
        for index in range(min(len(current), len(incoming)))
    ]


def _build_default_cluster_name(user_clusters: list[dict[str, Any]]) -> str:
    return f"Person {len(user_clusters) + 1}"


def _normalize_cluster(cluster: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(cluster.get("id") or uuid4()),
        "user_id": str(cluster.get("user_id") or ""),
        "name": str(cluster.get("name") or "Unnamed Person"),
        "centroid": _parse_embedding(cluster.get("centroid")),
        "sample_count": max(1, int(cluster.get("sample_count") or 1)),
        "cover_image_uuid": cluster.get("cover_image_uuid"),
        "cover_photo_id": cluster.get("cover_photo_id"),
        "updated_at": str(cluster.get("updated_at") or _utc_now_iso()),
    }


def _normalize_detection(detection: dict[str, Any]) -> dict[str, Any]:
    bbox = detection.get("bounding_box")
    if not isinstance(bbox, list):
        bbox = []

    return {
        "id": str(detection.get("id") or uuid4()),
        "user_id": str(detection.get("user_id") or ""),
        "cluster_id": str(detection.get("cluster_id") or ""),
        "image_uuid": detection.get("image_uuid"),
        "photo_id": detection.get("photo_id"),
        "bounding_box": bbox,
        "captured_at": detection.get("captured_at"),
        "created_at": str(detection.get("created_at") or _utc_now_iso()),
    }


def _build_image_signature(image_row: dict[str, Any]) -> str:
    content_hash = image_row.get("content_hash")
    if isinstance(content_hash, str) and content_hash:
        return f"hash:{content_hash}"

    photo_id = image_row.get("photo_id")
    if isinstance(photo_id, str) and photo_id:
        return f"photo:{photo_id}"

    image_uuid = image_row.get("image_uuid") or image_row.get("uuid")
    if isinstance(image_uuid, str) and image_uuid:
        return f"image:{image_uuid}"

    caption = str(image_row.get("caption") or "").strip().lower()
    tags = image_row.get("tags")
    normalized_tags = ",".join(sorted(str(tag).strip().lower() for tag in tags if tag)) if isinstance(tags, list) else ""

    return f"caption:{caption}|tags:{normalized_tags}"


def looks_like_people_photo(*, caption: Any = None, tags: Any = None) -> bool:
    caption_text = str(caption or "").lower()
    tag_tokens = {str(tag).strip().lower() for tag in tags if tag} if isinstance(tags, list) else set()
    metadata = {token for token in re.split(r"\W+", caption_text) if token}

    return bool(PERSON_HINTS.intersection(metadata.union(tag_tokens)))


def _image_has_face_evidence(image_row: dict[str, Any]) -> bool:
    persons = image_row.get("persons")
    if isinstance(persons, list) and any(str(person).strip() for person in persons):
        return True

    face_clusters = image_row.get("face_clusters")
    if not isinstance(face_clusters, list):
        return False

    for cluster in face_clusters:
        if isinstance(cluster, dict):
            if cluster.get("id") or cluster.get("name"):
                return True
            continue

        if str(cluster).strip():
            return True

    return False


def _image_looks_human(image_row: dict[str, Any]) -> bool:
    if _image_has_face_evidence(image_row):
        return True

    return looks_like_people_photo(
        caption=image_row.get("caption"),
        tags=image_row.get("tags"),
    )


def assign_faces_to_clusters(
    *,
    user_id: str,
    image_uuid: str,
    photo_id: str,
    faces: list[dict[str, Any]],
    captured_at: str | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    assigned_faces: list[dict[str, Any]] = []

    with _LOCK:
        store = _read_store()
        clusters = [
            _normalize_cluster(cluster)
            for cluster in store["clusters"]
            if cluster.get("user_id") == user_id
        ]
        untouched_clusters = [
            _normalize_cluster(cluster)
            for cluster in store["clusters"]
            if cluster.get("user_id") != user_id
        ]
        detections = [
            _normalize_detection(detection)
            for detection in store["detections"]
        ]

        new_clusters: list[dict[str, Any]] = []
        assigned_cluster_ids_in_photo: set[str] = set()

        for face in faces:
            embedding = _parse_embedding(face.get("embedding"))
            bbox = face.get("bbox")
            if not embedding or not isinstance(bbox, list):
                continue

            best_cluster: dict[str, Any] | None = None
            best_score = -1.0

            for cluster in clusters:
                score = _cosine_similarity(embedding, cluster["centroid"])
                cluster_id = str(cluster.get("id") or "")

                # Avoid collapsing different people from the same image into one
                # cluster after lowering the global threshold for cross-photo matching.
                if (
                    cluster_id in assigned_cluster_ids_in_photo
                    and score < FACE_MATCH_THRESHOLD_SAME_IMAGE
                ):
                    continue

                if score > best_score:
                    best_score = score
                    best_cluster = cluster

            if not best_cluster or best_score < FACE_MATCH_THRESHOLD:
                best_cluster = {
                    "id": str(uuid4()),
                    "user_id": user_id,
                    "name": _build_default_cluster_name(clusters),
                    "centroid": embedding,
                    "sample_count": 1,
                    "cover_image_uuid": image_uuid,
                    "cover_photo_id": photo_id,
                    "updated_at": _utc_now_iso(),
                }
                clusters.append(best_cluster)
                new_clusters.append(best_cluster.copy())
            else:
                best_cluster["centroid"] = _blend_embeddings(
                    best_cluster["centroid"],
                    embedding,
                    int(best_cluster["sample_count"]),
                )
                best_cluster["sample_count"] = int(best_cluster["sample_count"]) + 1
                best_cluster["cover_image_uuid"] = image_uuid
                best_cluster["cover_photo_id"] = photo_id
                best_cluster["updated_at"] = _utc_now_iso()

            assigned_faces.append({
                "cluster_id": best_cluster["id"],
                "cluster_name": best_cluster["name"],
                "bounding_box": bbox,
                "image_uuid": image_uuid,
                "photo_id": photo_id,
                "captured_at": captured_at,
            })
            assigned_cluster_ids_in_photo.add(str(best_cluster["id"]))

            detections.append({
                "id": str(uuid4()),
                "user_id": user_id,
                "cluster_id": best_cluster["id"],
                "image_uuid": image_uuid,
                "photo_id": photo_id,
                "bounding_box": bbox,
                "captured_at": captured_at,
                "created_at": _utc_now_iso(),
            })

        store["clusters"] = untouched_clusters + clusters
        store["detections"] = detections
        _write_store(store)

    return assigned_faces, new_clusters


def _build_cluster_payload(
    cluster: dict[str, Any],
    detections: list[dict[str, Any]],
    image_rows: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    ordered_detections = sorted(
        detections,
        key=lambda detection: (
            detection.get("captured_at") or "",
            detection.get("created_at") or "",
        ),
        reverse=True,
    )

    photo_ids: list[str] = []
    image_uuids: list[str] = []
    last_seen_at: str | None = None
    seen_signatures: set[str] = set()

    for detection in ordered_detections:
        image_uuid = detection.get("image_uuid")
        image_row = image_rows.get(str(image_uuid), {})
        if image_row and not _image_looks_human(image_row):
            continue

        signature = _build_image_signature(image_row or {"image_uuid": image_uuid, "photo_id": detection.get("photo_id")})
        if signature in seen_signatures:
            continue
        seen_signatures.add(signature)

        photo_id = image_row.get("photo_id") or detection.get("photo_id")
        captured_at = image_row.get("captured_at") or detection.get("captured_at")

        if photo_id and photo_id not in photo_ids:
            photo_ids.append(str(photo_id))
        if image_uuid and image_uuid not in image_uuids:
            image_uuids.append(str(image_uuid))
        if not last_seen_at and captured_at:
            last_seen_at = str(captured_at)

    cover_photo_id = photo_ids[0] if photo_ids else cluster.get("cover_photo_id")
    cover_image_uuid = image_uuids[0] if image_uuids else cluster.get("cover_image_uuid")

    return {
        "id": cluster["id"],
        "name": cluster["name"],
        "photo_count": len(photo_ids),
        "cover_photo_id": cover_photo_id,
        "cover_image_uuid": cover_image_uuid,
        "photo_ids": photo_ids,
        "image_uuids": image_uuids,
        "last_seen_at": last_seen_at or cluster.get("updated_at"),
    }


def _fetch_clusters_from_supabase(user_id: str) -> list[dict[str, Any]]:
    supabase = get_supabase()

    clusters_response = supabase.table("face_clusters").select("id,name").eq("user_id", user_id).execute()
    cluster_rows = getattr(clusters_response, "data", None) or []
    if not cluster_rows:
        return []

    cluster_ids = [str(row["id"]) for row in cluster_rows if row.get("id")]
    if not cluster_ids:
        return []

    detections_response = (
        supabase.table("face_detections")
        .select("cluster_id,image_uuid,bounding_box")
        .in_("cluster_id", cluster_ids)
        .execute()
    )
    detection_rows = getattr(detections_response, "data", None) or []

    image_uuids = list({str(row["image_uuid"]) for row in detection_rows if row.get("image_uuid")})
    image_rows_by_uuid: dict[str, dict[str, Any]] = {}

    if image_uuids:
        images_response = (
            supabase.table("images")
            .select("uuid,photo_id,captured_at,caption,tags,persons")
            .eq("user_id", user_id)
            .in_("uuid", image_uuids)
            .execute()
        )
        image_rows = getattr(images_response, "data", None) or []
        image_rows_by_uuid = {
            str(row["uuid"]): row
            for row in image_rows
            if row.get("uuid")
        }

    payloads: list[dict[str, Any]] = []
    for cluster_row in cluster_rows:
        cluster_detections = [
            row for row in detection_rows
            if str(row.get("cluster_id")) == str(cluster_row.get("id"))
        ]
        payload = _build_cluster_payload(
            {
                "id": str(cluster_row.get("id")),
                "name": str(cluster_row.get("name") or "Unnamed Person"),
                "cover_photo_id": None,
                "cover_image_uuid": None,
                "updated_at": None,
            },
            cluster_detections,
            image_rows_by_uuid,
        )
        if payload["photo_count"] > 0:
            payloads.append(payload)

    return sorted(
        payloads,
        key=lambda item: (item["photo_count"], item.get("last_seen_at") or ""),
        reverse=True,
    )


def _fetch_clusters_from_local_store(user_id: str) -> list[dict[str, Any]]:
    with _LOCK:
        store = _read_store()
        clusters = [
            _normalize_cluster(cluster)
            for cluster in store["clusters"]
            if cluster.get("user_id") == user_id
        ]
        detections = [
            _normalize_detection(detection)
            for detection in store["detections"]
            if detection.get("user_id") == user_id
        ]

    image_rows = (
        get_all_index_records()
        if settings and settings.DEV_BYPASS_AUTH
        else get_index_records_for_user(user_id)
    )
    image_rows_by_uuid = {}
    for image_row in image_rows:
        if not isinstance(image_row, dict):
            continue

        row_uuid = image_row.get("uuid") or image_row.get("image_uuid")
        if row_uuid:
            image_rows_by_uuid[str(row_uuid)] = image_row

    payloads: list[dict[str, Any]] = []
    for cluster in clusters:
        cluster_detections = [
            detection for detection in detections
            if detection.get("cluster_id") == cluster["id"]
        ]
        payload = _build_cluster_payload(cluster, cluster_detections, image_rows_by_uuid)
        if payload["photo_count"] > 0:
            payloads.append(payload)

    return sorted(
        payloads,
        key=lambda item: (item["photo_count"], item.get("last_seen_at") or ""),
        reverse=True,
    )


def list_people_clusters(user_id: str) -> tuple[list[dict[str, Any]], str]:
    local_clusters = _fetch_clusters_from_local_store(user_id)
    if settings and settings.DEV_BYPASS_AUTH and local_clusters:
        return local_clusters, "local_store"

    try:
        clusters = _fetch_clusters_from_supabase(user_id)
        if clusters:
            return clusters, "supabase"

        if local_clusters:
            return local_clusters, "local_store"

        return [], "supabase"
    except Exception as error:
        print(f"People list fallback -> local store: {error}")
        return _fetch_clusters_from_local_store(user_id), "local_store"


def get_people_cluster(user_id: str, cluster_id: str) -> tuple[dict[str, Any] | None, str]:
    clusters, source = list_people_clusters(user_id)
    for cluster in clusters:
        if cluster["id"] == cluster_id:
            return cluster, source
    return None, source


def rename_people_cluster(user_id: str, cluster_id: str, new_name: str) -> tuple[dict[str, Any] | None, str]:
    cleaned_name = new_name.strip()
    if not cleaned_name:
        raise ValueError("Name cannot be empty")

    renamed_locally = False

    with _LOCK:
        store = _read_store()
        changed = False

        for cluster in store["clusters"]:
            if cluster.get("user_id") == user_id and str(cluster.get("id")) == cluster_id:
                cluster["name"] = cleaned_name
                cluster["updated_at"] = _utc_now_iso()
                changed = True
                renamed_locally = True

        if changed:
            _write_store(store)

    rename_face_cluster_references(user_id=user_id, cluster_id=cluster_id, new_name=cleaned_name)

    try:
        supabase = get_supabase()
        (
            supabase.table("face_clusters")
            .update({"name": cleaned_name})
            .eq("user_id", user_id)
            .eq("id", cluster_id)
            .execute()
        )
        cluster, _ = get_people_cluster(user_id, cluster_id)
        return cluster, "supabase"
    except Exception as error:
        print(f"People rename fallback -> local store: {error}")

    if renamed_locally:
        cluster, _ = get_people_cluster(user_id, cluster_id)
        return cluster, "local_store"

    return None, "unknown"


def clear_people_records_for_user(user_id: str) -> dict[str, int]:
    with _LOCK:
        store = _read_store()

        clusters = store.get("clusters", [])
        detections = store.get("detections", [])

        kept_clusters = [cluster for cluster in clusters if cluster.get("user_id") != user_id]
        kept_detections = [detection for detection in detections if detection.get("user_id") != user_id]

        deleted_clusters = len(clusters) - len(kept_clusters)
        deleted_detections = len(detections) - len(kept_detections)

        if deleted_clusters > 0 or deleted_detections > 0:
            _write_store({
                "clusters": kept_clusters,
                "detections": kept_detections,
            })

    return {
        "clusters_deleted": deleted_clusters,
        "detections_deleted": deleted_detections,
    }

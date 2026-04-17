from __future__ import annotations

import json
import math
from dataclasses import dataclass
from typing import Any

from app.core.config import settings
from app.services.embedding_service import generate_query_embedding
from app.services.local_index_store import (
    delete_index_records_for_user,
    get_index_records_for_user,
)
from app.services.people_service import clear_people_records_for_user

DEFAULT_MATCH_LIMIT = 24
MAX_MATCH_LIMIT = 60
FALLBACK_SCAN_LIMIT = 300
MIN_VECTOR_SCORE = 0.05
SUPABASE_DELETE_CHUNK_SIZE = 200


@dataclass
class SearchResponse:
    results: list[dict[str, Any]]
    mode: str


def clamp_similarity(value: float) -> float:
    return max(0.0, min(1.0, value))


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0

    dot_product = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))

    if left_norm == 0 or right_norm == 0:
        return 0.0

    return dot_product / (left_norm * right_norm)


def normalize_people(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if item]
    return []


def parse_embedding(value: Any) -> list[float]:
    if isinstance(value, list):
        try:
            return [float(item) for item in value]
        except (TypeError, ValueError):
            return []

    if isinstance(value, str):
        try:
            decoded = json.loads(value)
        except json.JSONDecodeError:
            return []
        return parse_embedding(decoded)

    return []


def build_result_signature(row: dict[str, Any]) -> str:
    content_hash = row.get("content_hash")
    if isinstance(content_hash, str) and content_hash:
        return f"hash:{content_hash}"

    photo_id = row.get("photo_id")
    if isinstance(photo_id, str) and photo_id:
        return f"photo:{photo_id}"

    image_uuid = row.get("image_uuid") or row.get("uuid")
    if isinstance(image_uuid, str) and image_uuid:
        return f"image:{image_uuid}"

    return json.dumps(row, sort_keys=True, default=str)


def sort_key_for_row(row: dict[str, Any]) -> tuple[float, str]:
    try:
        score = float(row.get("score") or 0.0)
    except (TypeError, ValueError):
        score = 0.0

    captured_at = str(row.get("captured_at") or "")
    return (score, captured_at)


def merge_priority_for_row(row: dict[str, Any]) -> tuple[int, float, str]:
    try:
        score = float(row.get("score") or 0.0)
    except (TypeError, ValueError):
        score = 0.0

    local_bias = 1 if row.get("content_hash") or row.get("face_clusters") else 0
    captured_at = str(row.get("captured_at") or "")
    return (local_bias, score, captured_at)


def chunked(values: list[str], chunk_size: int) -> list[list[str]]:
    return [values[index:index + chunk_size] for index in range(0, len(values), chunk_size)]


class SearchService:
    def __init__(self) -> None:
        self.supabase = None

        try:
            from app.db.supabase import get_supabase

            self.supabase = get_supabase()
        except Exception as config_error:
            print(f"SearchService using local-only mode: {config_error}")

    def search_images(self, user_id: str, query: str, limit: int = DEFAULT_MATCH_LIMIT) -> SearchResponse:
        cleaned_query = query.strip()
        if not cleaned_query:
            return SearchResponse(results=[], mode="empty_query")

        normalized_limit = max(1, min(limit, MAX_MATCH_LIMIT))
        query_embedding = generate_query_embedding(cleaned_query)

        if not any(query_embedding):
            return SearchResponse(results=[], mode="embedding_unavailable")

        rpc_results = self._search_with_rpc(
            user_id=user_id,
            query_embedding=query_embedding,
            limit=normalized_limit,
        )
        local_results = self._search_with_local_store(
            user_id=user_id,
            query_embedding=query_embedding,
            limit=normalized_limit,
        )
        if rpc_results:
            return SearchResponse(
                results=self._merge_ranked_results(rpc_results, local_results, normalized_limit),
                mode="pgvector_rpc",
            )

        fallback_results = self._search_with_python_scan(
            user_id=user_id,
            query_embedding=query_embedding,
            limit=normalized_limit,
        )
        if fallback_results:
            return SearchResponse(
                results=self._merge_ranked_results(fallback_results, local_results, normalized_limit),
                mode="python_scan",
            )

        return SearchResponse(results=local_results, mode="local_dev_store")

    def clear_user_index_data(self, user_id: str) -> dict[str, Any]:
        image_uuids: list[str] = []
        deleted_face_detections = 0
        deleted_images = 0
        deleted_face_clusters = 0

        if self.supabase is not None:
            try:
                image_rows = (
                    self.supabase.table("images")
                    .select("uuid")
                    .eq("user_id", user_id)
                    .limit(10000)
                    .execute()
                )
                image_uuids = [
                    str(row.get("uuid"))
                    for row in (getattr(image_rows, "data", None) or [])
                    if row.get("uuid")
                ]
            except Exception as fetch_error:
                print(f"Could not fetch user images for cleanup: {fetch_error}")

            if image_uuids:
                for image_uuid_chunk in chunked(image_uuids, SUPABASE_DELETE_CHUNK_SIZE):
                    try:
                        deleted_rows = (
                            self.supabase.table("face_detections")
                            .delete()
                            .in_("image_uuid", image_uuid_chunk)
                            .execute()
                        )
                        deleted_face_detections += len(getattr(deleted_rows, "data", None) or [])
                    except Exception as detections_error:
                        print(f"Could not delete face detections for chunk: {detections_error}")

            try:
                deleted_images_response = (
                    self.supabase.table("images")
                    .delete()
                    .eq("user_id", user_id)
                    .execute()
                )
                deleted_images = len(getattr(deleted_images_response, "data", None) or [])
            except Exception as images_error:
                print(f"Could not delete user images: {images_error}")

            try:
                deleted_clusters_response = (
                    self.supabase.table("face_clusters")
                    .delete()
                    .eq("user_id", user_id)
                    .execute()
                )
                deleted_face_clusters = len(getattr(deleted_clusters_response, "data", None) or [])
            except Exception as clusters_error:
                print(f"Could not delete face clusters: {clusters_error}")

        local_search_deleted = delete_index_records_for_user(user_id)
        local_people_deleted = clear_people_records_for_user(user_id)

        return {
            "user_id": user_id,
            "supabase": {
                "images_deleted": deleted_images,
                "face_detections_deleted": deleted_face_detections,
                "face_clusters_deleted": deleted_face_clusters,
            },
            "local": {
                "search_records_deleted": local_search_deleted,
                **local_people_deleted,
            },
        }

    def _search_with_rpc(
        self,
        *,
        user_id: str,
        query_embedding: list[float],
        limit: int,
    ) -> list[dict[str, Any]] | None:
        if self.supabase is None:
            return None

        try:
            response = self.supabase.rpc(
                "match_images",
                {
                    "query_embedding": query_embedding,
                    "filter_user_id": user_id,
                    "match_count": limit,
                },
            ).execute()
        except Exception as rpc_error:
            print(f"match_images RPC unavailable, using Python scan fallback: {rpc_error}")
            return None

        rows = getattr(response, "data", None)
        if not isinstance(rows, list):
            return []

        return [self._serialize_result(row) for row in self._filter_vector_rows(rows, limit=limit)]

    def _search_with_python_scan(
        self,
        *,
        user_id: str,
        query_embedding: list[float],
        limit: int,
    ) -> list[dict[str, Any]]:
        if self.supabase is None:
            return []

        try:
            response = self.supabase.table("images").select(
                "uuid, photo_id, persons, captured_at, embedding"
            ).eq("user_id", user_id).limit(FALLBACK_SCAN_LIMIT).execute()
        except Exception as scan_error:
            print(f"Python scan fallback failed: {scan_error}")
            return []

        rows = getattr(response, "data", None) or []
        return self._rank_results(rows, query_embedding, limit)

    def _search_with_local_store(
        self,
        *,
        user_id: str,
        query_embedding: list[float],
        limit: int,
    ) -> list[dict[str, Any]]:
        rows = get_index_records_for_user(user_id)
        return self._rank_results(rows, query_embedding, limit)

    def _merge_ranked_results(
        self,
        primary_results: list[dict[str, Any]],
        secondary_results: list[dict[str, Any]],
        limit: int,
    ) -> list[dict[str, Any]]:
        merged: dict[str, dict[str, Any]] = {}

        for row in [*primary_results, *secondary_results]:
            if not isinstance(row, dict):
                continue

            signature = build_result_signature(row)
            existing = merged.get(signature)

            if existing is None or merge_priority_for_row(row) > merge_priority_for_row(existing):
                merged[signature] = row

        ordered = sorted(
            merged.values(),
            key=sort_key_for_row,
            reverse=True,
        )

        return ordered[:limit]

    def _rank_results(
        self,
        rows: list[dict[str, Any]],
        query_embedding: list[float],
        limit: int,
    ) -> list[dict[str, Any]]:
        candidates: list[dict[str, Any]] = []

        for row in rows:
            if not isinstance(row, dict):
                continue

            candidate_embedding = parse_embedding(row.get("embedding"))
            vector_score = clamp_similarity(cosine_similarity(query_embedding, candidate_embedding))
            if vector_score <= MIN_VECTOR_SCORE:
                continue

            candidates.append({
                **row,
                "score": vector_score,
                "match_reason": "siglip2_vector",
            })

        candidates.sort(key=sort_key_for_row, reverse=True)
        return [self._serialize_result(row) for row in candidates[:limit]]

    def _filter_vector_rows(self, rows: list[dict[str, Any]], *, limit: int) -> list[dict[str, Any]]:
        candidates: list[dict[str, Any]] = []

        for row in rows:
            if not isinstance(row, dict):
                continue

            try:
                vector_score = clamp_similarity(float(row.get("score") or 0.0))
            except (TypeError, ValueError):
                vector_score = 0.0

            if vector_score <= MIN_VECTOR_SCORE:
                continue

            candidates.append({
                **row,
                "score": vector_score,
                "match_reason": row.get("match_reason") or "siglip2_vector",
            })

        candidates.sort(key=sort_key_for_row, reverse=True)
        return candidates[:limit]

    def _serialize_result(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "image_uuid": row.get("image_uuid") or row.get("uuid"),
            "photo_id": row.get("photo_id"),
            "score": clamp_similarity(float(row.get("score") or 0.0)),
            "persons": normalize_people(row.get("persons")),
            "captured_at": row.get("captured_at"),
            "match_reason": row.get("match_reason") or "siglip2_vector",
        }

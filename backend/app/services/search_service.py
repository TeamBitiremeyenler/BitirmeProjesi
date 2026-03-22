from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from typing import Any

from app.core.config import settings
from app.services.caption_terms import extract_caption_terms, normalize_term
from app.services.embedding_service import generate_text_embedding
from app.services.local_index_store import (
    delete_index_records_for_user,
    get_all_index_records,
    get_index_records_for_user,
)
from app.services.people_service import clear_people_records_for_user, looks_like_people_photo

DEFAULT_MATCH_LIMIT = 24
MAX_MATCH_LIMIT = 60
FALLBACK_SCAN_LIMIT = 300
SEMANTIC_TOP_BAND_DELTA = 0.03
MAX_SEMANTIC_ONLY_RESULTS = 4
MIN_SEMANTIC_ONLY_SCORE = 0.82
MIN_PEOPLE_SEMANTIC_ONLY_SCORE = 0.58
SUPABASE_DELETE_CHUNK_SIZE = 200

QUERY_SYNONYMS: dict[str, tuple[str, ...]] = {
    "football": ("soccer", "futbol"),
    "futbol": ("soccer", "football"),
    "soccer": ("football", "futbol"),
    "ball": ("soccer", "football", "sports"),
    "bike": ("bicycle", "cycle"),
    "bicycle": ("bike", "cycle"),
    "cycle": ("bike", "bicycle"),
    "naked": ("shirtless", "topless", "barechested"),
    "shirtless": ("naked", "topless", "barechested"),
    "topless": ("naked", "shirtless", "barechested"),
    "barechested": ("naked", "shirtless", "topless"),
}
PEOPLE_QUERY_HINTS = {
    "beard",
    "glasses",
    "face",
    "man",
    "woman",
    "person",
    "people",
    "portrait",
    "selfie",
    "smile",
}


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


def build_metadata_terms(row: dict[str, Any]) -> set[str]:
    terms: set[str] = set()

    caption = row.get("caption")
    if isinstance(caption, str) and caption.strip():
        terms.update(extract_caption_terms(caption))
    else:
        tags = row.get("tags")
        if isinstance(tags, list):
            terms.update(
                normalized_tag
                for tag in tags
                if isinstance(tag, str)
                for normalized_tag in [normalize_term(tag)]
                if normalized_tag
            )

    persons = normalize_people(row.get("persons"))
    for person in persons:
        full_name = normalize_term(person)
        if full_name:
            terms.add(full_name)

        for token in re.split(r"\s+", person.lower()):
            normalized_token = normalize_term(token)
            if normalized_token:
                terms.add(normalized_token)

    for key in ("photo_id", "captured_at"):
        value = row.get(key)
        if not isinstance(value, str):
            continue

        for token in re.split(r"[\W_]+", value.lower()):
            normalized_token = normalize_term(token)
            if normalized_token:
                terms.add(normalized_token)

    return terms


def build_result_signature(row: dict[str, Any]) -> str:
    content_hash = row.get("content_hash")
    if isinstance(content_hash, str) and content_hash:
        return f"hash:{content_hash}"

    caption = str(row.get("caption") or "").strip().lower()
    tags = row.get("tags")
    normalized_tags = ",".join(sorted(str(tag).strip().lower() for tag in tags if tag)) if isinstance(tags, list) else ""

    return f"caption:{caption}|tags:{normalized_tags}"


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


def tokenize_query(value: str) -> list[str]:
    return [
        normalized_token
        for token in re.split(r"\s+", value.lower().strip())
        for normalized_token in [normalize_term(token)]
        if len(normalized_token) >= 2
    ]


def expand_query_tokens(tokens: list[str]) -> list[str]:
    expanded = set(tokens)
    for token in tokens:
        expanded.update(QUERY_SYNONYMS.get(token, ()))
    return list(expanded)


def query_focuses_on_people(tokens: list[str]) -> bool:
    return any(token in PEOPLE_QUERY_HINTS for token in tokens)


def semantic_minimum_for_tokens(tokens: list[str]) -> float:
    if query_focuses_on_people(tokens):
        return MIN_PEOPLE_SEMANTIC_ONLY_SCORE
    return MIN_SEMANTIC_ONLY_SCORE


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
        fast_lexical_results = self._search_with_lexical_fast_path(
            user_id=user_id,
            query=cleaned_query,
            limit=normalized_limit,
        )
        if fast_lexical_results:
            return SearchResponse(results=fast_lexical_results, mode="lexical_fast_path")

        query_embedding = generate_text_embedding(cleaned_query)

        if not any(query_embedding):
            return SearchResponse(results=[], mode="embedding_unavailable")

        rpc_results = self._search_with_rpc(
            user_id=user_id,
            query=cleaned_query,
            query_embedding=query_embedding,
            limit=normalized_limit,
        )
        local_results = self._search_with_local_store(
            user_id=user_id,
            query=query,
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
            query=query,
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
        query: str,
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

        filtered_rows = self._filter_rpc_rows(rows, query=query, limit=limit)
        return [self._serialize_result(row) for row in filtered_rows]

    def _search_with_python_scan(
        self,
        *,
        user_id: str,
        query: str,
        query_embedding: list[float],
        limit: int,
    ) -> list[dict[str, Any]]:
        if self.supabase is None:
            return []

        try:
            response = self.supabase.table("images").select(
                "uuid, photo_id, caption, tags, persons, captured_at, embedding"
            ).eq("user_id", user_id).limit(FALLBACK_SCAN_LIMIT).execute()
        except Exception as scan_error:
            print(f"Python scan fallback failed: {scan_error}")
            return []

        rows = getattr(response, "data", None) or []
        return self._rank_results(rows, query, query_embedding, limit)

    def _search_with_local_store(
        self,
        *,
        user_id: str,
        query: str,
        query_embedding: list[float],
        limit: int,
    ) -> list[dict[str, Any]]:
        rows = (
            get_all_index_records()
            if settings and settings.DEV_BYPASS_AUTH
            else get_index_records_for_user(user_id)
        )

        ranked_rows = self._rank_results(rows, query, query_embedding, limit)
        return ranked_rows

    def _load_combined_rows_for_user(self, user_id: str) -> list[dict[str, Any]]:
        combined_rows: dict[tuple[str | None, str | None], dict[str, Any]] = {}

        if self.supabase is not None:
            try:
                response = self.supabase.table("images").select(
                    "uuid, photo_id, caption, tags, persons, captured_at, embedding"
                ).eq("user_id", user_id).limit(FALLBACK_SCAN_LIMIT).execute()
                for row in getattr(response, "data", None) or []:
                    if not isinstance(row, dict):
                        continue
                    key = (
                        str(row.get("photo_id")) if row.get("photo_id") else None,
                        str(row.get("uuid")) if row.get("uuid") else None,
                    )
                    combined_rows[key] = row
            except Exception as scan_error:
                print(f"Combined-row Supabase scan failed: {scan_error}")

        local_rows = (
            get_all_index_records()
            if settings and settings.DEV_BYPASS_AUTH
            else get_index_records_for_user(user_id)
        )
        for row in local_rows:
            if not isinstance(row, dict):
                continue

            key = (
                str(row.get("photo_id")) if row.get("photo_id") else None,
                str(row.get("uuid") or row.get("image_uuid")) if row.get("uuid") or row.get("image_uuid") else None,
            )

            if key in combined_rows:
                combined_rows[key] = {**combined_rows[key], **row}
            else:
                combined_rows[key] = row

        return list(combined_rows.values())

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

    def _search_with_lexical_fast_path(
        self,
        *,
        user_id: str,
        query: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        tokens = tokenize_query(query)
        if not tokens:
            return []

        expanded_tokens = expand_query_tokens(tokens)
        rows = self._load_combined_rows_for_user(user_id)
        candidates: list[dict[str, Any]] = []

        for row in rows:
            if not isinstance(row, dict):
                continue

            metadata_terms = build_metadata_terms(row)
            lexical_hits = sum(1 for token in expanded_tokens if token in metadata_terms)
            if lexical_hits <= 0:
                continue

            candidates.append({
                "row": row,
                "lexical_hits": lexical_hits,
            })

        if not candidates:
            return []

        candidates.sort(
            key=lambda item: (
                item["lexical_hits"],
                str(item["row"].get("captured_at") or ""),
            ),
            reverse=True,
        )

        return [
            self._serialize_result(
                {
                    **item["row"],
                    "score": clamp_similarity(min(0.99, 0.45 + item["lexical_hits"] * 0.15)),
                    "match_reason": "lexical_fast_path",
                }
            )
            for item in candidates[:limit]
        ]

    def _rank_results(
        self,
        rows: list[dict[str, Any]],
        query: str,
        query_embedding: list[float],
        limit: int,
    ) -> list[dict[str, Any]]:
        tokens = tokenize_query(query)
        if not tokens:
            return []

        expanded_tokens = expand_query_tokens(tokens)
        candidates: list[dict[str, Any]] = []

        for row in rows:
            if not isinstance(row, dict):
                continue

            candidate_embedding = parse_embedding(row.get("embedding"))
            semantic_score = clamp_similarity(cosine_similarity(query_embedding, candidate_embedding))
            metadata_terms = build_metadata_terms(row)
            lexical_hits = sum(1 for token in expanded_tokens if token in metadata_terms)

            if semantic_score <= 0 and lexical_hits <= 0:
                continue

            candidates.append({
                "row": row,
                "semantic_score": semantic_score,
                "lexical_hits": lexical_hits,
            })

        if not candidates:
            return []

        has_lexical_matches = any(item["lexical_hits"] > 0 for item in candidates)
        if has_lexical_matches:
            lexical_candidates = [item for item in candidates if item["lexical_hits"] > 0]
            lexical_candidates.sort(
                key=lambda item: (item["lexical_hits"], item["semantic_score"]),
                reverse=True,
            )

            return [
                self._serialize_result(
                    {
                        **item["row"],
                        "score": clamp_similarity(
                            item["semantic_score"] + min(0.35, item["lexical_hits"] * 0.15)
                        ),
                        "match_reason": "semantic+lexical",
                    }
                )
                for item in lexical_candidates[:limit]
            ]

        semantic_candidates = sorted(candidates, key=lambda item: item["semantic_score"], reverse=True)
        if query_focuses_on_people(tokens):
            human_semantic_candidates = [
                item
                for item in semantic_candidates
                if looks_like_people_photo(
                    caption=item["row"].get("caption"),
                    tags=item["row"].get("tags"),
                )
            ]
            if human_semantic_candidates:
                semantic_candidates = human_semantic_candidates

        semantic_min_score = semantic_minimum_for_tokens(tokens)
        semantic_candidates = [
            item for item in semantic_candidates
            if item["semantic_score"] >= semantic_min_score
        ]
        if not semantic_candidates:
            return []

        top_semantic_score = semantic_candidates[0]["semantic_score"]
        semantic_cutoff = max(0.0, top_semantic_score - SEMANTIC_TOP_BAND_DELTA)
        narrowed_candidates = [
            item for item in semantic_candidates if item["semantic_score"] >= semantic_cutoff
        ][: min(limit, MAX_SEMANTIC_ONLY_RESULTS)]

        return [
            self._serialize_result(
                {
                    **item["row"],
                    "score": item["semantic_score"],
                    "match_reason": "semantic_top_band",
                }
            )
            for item in narrowed_candidates
        ]

    def _filter_rpc_rows(
        self,
        rows: list[dict[str, Any]],
        *,
        query: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        tokens = tokenize_query(query)
        if not tokens:
            return []

        expanded_tokens = expand_query_tokens(tokens)
        candidates: list[dict[str, Any]] = []

        for row in rows:
            if not isinstance(row, dict):
                continue

            try:
                semantic_score = clamp_similarity(float(row.get("score") or 0.0))
            except (TypeError, ValueError):
                semantic_score = 0.0

            metadata_terms = build_metadata_terms(row)
            lexical_hits = sum(1 for token in expanded_tokens if token in metadata_terms)

            if semantic_score <= 0 and lexical_hits <= 0:
                continue

            candidates.append({
                "row": row,
                "semantic_score": semantic_score,
                "lexical_hits": lexical_hits,
            })

        if not candidates:
            return []

        has_lexical_matches = any(item["lexical_hits"] > 0 for item in candidates)
        if has_lexical_matches:
            lexical_candidates = [item for item in candidates if item["lexical_hits"] > 0]
            lexical_candidates.sort(
                key=lambda item: (item["lexical_hits"], item["semantic_score"]),
                reverse=True,
            )

            return [
                {
                    **item["row"],
                    "score": clamp_similarity(
                        item["semantic_score"] + min(0.35, item["lexical_hits"] * 0.15)
                    ),
                    "match_reason": "semantic+lexical",
                }
                for item in lexical_candidates[:limit]
            ]

        semantic_candidates = sorted(candidates, key=lambda item: item["semantic_score"], reverse=True)
        if query_focuses_on_people(tokens):
            human_semantic_candidates = [
                item
                for item in semantic_candidates
                if looks_like_people_photo(
                    caption=item["row"].get("caption"),
                    tags=item["row"].get("tags"),
                )
            ]
            if human_semantic_candidates:
                semantic_candidates = human_semantic_candidates

        semantic_min_score = semantic_minimum_for_tokens(tokens)
        semantic_candidates = [
            item for item in semantic_candidates
            if item["semantic_score"] >= semantic_min_score
        ]
        if not semantic_candidates:
            return []

        top_semantic_score = semantic_candidates[0]["semantic_score"]
        semantic_cutoff = max(0.0, top_semantic_score - SEMANTIC_TOP_BAND_DELTA)
        narrowed_candidates = [
            item for item in semantic_candidates if item["semantic_score"] >= semantic_cutoff
        ][: min(limit, MAX_SEMANTIC_ONLY_RESULTS)]

        return [
            {
                **item["row"],
                "score": item["semantic_score"],
                "match_reason": "semantic_top_band",
            }
            for item in narrowed_candidates
        ]

    def _serialize_result(self, row: dict[str, Any]) -> dict[str, Any]:
        persons = normalize_people(row.get("persons"))
        tags = row.get("tags")

        return {
            "image_uuid": row.get("image_uuid") or row.get("uuid"),
            "photo_id": row.get("photo_id"),
            "score": clamp_similarity(float(row.get("score") or 0.0)),
            "caption": row.get("caption"),
            "tags": tags if isinstance(tags, list) else [],
            "persons": persons,
            "captured_at": row.get("captured_at"),
            "match_reason": row.get("match_reason") or "semantic",
        }

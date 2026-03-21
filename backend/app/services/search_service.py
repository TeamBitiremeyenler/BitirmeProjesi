from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from typing import Any

from app.core.config import settings
from app.db.supabase import get_supabase
from app.services.embedding_service import generate_text_embedding
from app.services.local_index_store import get_all_index_records, get_index_records_for_user

DEFAULT_MATCH_LIMIT = 24
MAX_MATCH_LIMIT = 60
FALLBACK_SCAN_LIMIT = 300
SEMANTIC_TOP_BAND_DELTA = 0.03
MAX_SEMANTIC_ONLY_RESULTS = 4

QUERY_SYNONYMS: dict[str, tuple[str, ...]] = {
    "football": ("soccer", "futbol"),
    "futbol": ("soccer", "football"),
    "soccer": ("football", "futbol"),
    "ball": ("soccer", "football", "sports"),
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


def build_metadata_text(row: dict[str, Any]) -> str:
    pieces: list[str] = []
    for key in ("caption", "photo_id", "captured_at"):
        value = row.get(key)
        if isinstance(value, str):
            pieces.append(value)

    persons = normalize_people(row.get("persons"))
    if persons:
        pieces.extend(persons)

    tags = row.get("tags")
    if isinstance(tags, list):
        pieces.extend(str(tag) for tag in tags if tag)

    return " ".join(pieces).lower()


def tokenize_query(value: str) -> list[str]:
    return [token for token in re.split(r"\s+", value.lower().strip()) if len(token) >= 2]


def expand_query_tokens(tokens: list[str]) -> list[str]:
    expanded = set(tokens)
    for token in tokens:
        expanded.update(QUERY_SYNONYMS.get(token, ()))
    return list(expanded)


class SearchService:
    def __init__(self) -> None:
        self.supabase = get_supabase()

    def search_images(self, user_id: str, query: str, limit: int = DEFAULT_MATCH_LIMIT) -> SearchResponse:
        cleaned_query = query.strip()
        if not cleaned_query:
            return SearchResponse(results=[], mode="empty_query")

        normalized_limit = max(1, min(limit, MAX_MATCH_LIMIT))
        query_embedding = generate_text_embedding(cleaned_query)

        if not any(query_embedding):
            return SearchResponse(results=[], mode="embedding_unavailable")

        rpc_results = self._search_with_rpc(
            user_id=user_id,
            query=cleaned_query,
            query_embedding=query_embedding,
            limit=normalized_limit,
        )
        if rpc_results:
            return SearchResponse(results=rpc_results, mode="pgvector_rpc")

        fallback_results = self._search_with_python_scan(
            user_id=user_id,
            query=query,
            query_embedding=query_embedding,
            limit=normalized_limit,
        )
        if fallback_results:
            return SearchResponse(results=fallback_results, mode="python_scan")

        local_results = self._search_with_local_store(
            user_id=user_id,
            query=query,
            query_embedding=query_embedding,
            limit=normalized_limit,
        )
        return SearchResponse(results=local_results, mode="local_dev_store")

    def _search_with_rpc(
        self,
        *,
        user_id: str,
        query: str,
        query_embedding: list[float],
        limit: int,
    ) -> list[dict[str, Any]] | None:
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
            metadata_text = build_metadata_text(row)
            lexical_hits = sum(1 for token in expanded_tokens if token in metadata_text)

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

            metadata_text = build_metadata_text(row)
            lexical_hits = sum(1 for token in expanded_tokens if token in metadata_text)

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

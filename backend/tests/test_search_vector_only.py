from __future__ import annotations

import unittest
from unittest.mock import patch

from app.services.search_service import SearchService


class SearchVectorOnlyTests(unittest.TestCase):
    def test_local_search_ranks_by_vector_similarity_only(self) -> None:
        rows = [
            {
                "uuid": "image-match",
                "photo_id": "photo-match",
                "user_id": "user-1",
                "embedding": [1.0, 0.0],
                "persons": [],
                "captured_at": "2026-04-17T00:00:00Z",
            },
            {
                "uuid": "image-other",
                "photo_id": "photo-other",
                "user_id": "user-1",
                "embedding": [0.0, 1.0],
                "persons": [],
                "captured_at": "2026-04-16T00:00:00Z",
            },
        ]

        with patch("app.db.supabase.get_supabase", side_effect=Exception("disabled")), \
             patch("app.services.search_service.generate_query_embedding", return_value=[1.0, 0.0]), \
             patch("app.services.search_service.get_index_records_for_user", return_value=rows):
            response = SearchService().search_images(
                user_id="user-1",
                query="bicycle",
                limit=10,
            )

        self.assertEqual(response.mode, "local_dev_store")
        self.assertEqual(len(response.results), 1)
        self.assertEqual(response.results[0]["image_uuid"], "image-match")
        self.assertEqual(response.results[0]["match_reason"], "siglip2_vector")
        self.assertNotIn("caption", response.results[0])
        self.assertNotIn("tags", response.results[0])


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from app.services import people_service


class _FakeClusterTable:
    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows
        self.user_id: str | None = None

    def select(self, _columns: str) -> "_FakeClusterTable":
        return self

    def eq(self, column: str, value: str) -> "_FakeClusterTable":
        if column == "user_id":
            self.user_id = value
        return self

    def execute(self) -> SimpleNamespace:
        rows = [
            row for row in self.rows
            if self.user_id is None or row.get("user_id") == self.user_id
        ]
        return SimpleNamespace(data=rows)


class _FakeSupabase:
    def __init__(self, clusters: list[dict]) -> None:
        self.clusters = clusters

    def table(self, name: str) -> _FakeClusterTable:
        if name != "face_clusters":
            raise AssertionError(f"Unexpected table: {name}")
        return _FakeClusterTable(self.clusters)


class PeopleServiceClusteringTests(unittest.TestCase):
    def test_assign_faces_matches_supabase_centroid(self) -> None:
        supabase = _FakeSupabase([
            {
                "id": "cluster-1",
                "user_id": "user-1",
                "name": "Alice",
                "centroid": "[1.0, 0.0]",
                "sample_count": 2,
            }
        ])

        with tempfile.TemporaryDirectory() as tmp_dir, \
             patch.object(people_service, "PEOPLE_STORE_PATH", Path(tmp_dir) / "people.json"), \
             patch("app.services.people_service.get_supabase", return_value=supabase):
            assigned_faces, touched_clusters = people_service.assign_faces_to_clusters(
                user_id="user-1",
                image_uuid="image-1",
                photo_id="photo-1",
                faces=[
                    {
                        "bbox": [1.0, 2.0, 3.0, 4.0],
                        "embedding": [0.95, 0.05],
                    }
                ],
            )

        self.assertEqual(len(assigned_faces), 1)
        self.assertEqual(assigned_faces[0]["cluster_id"], "cluster-1")
        self.assertEqual(assigned_faces[0]["cluster_name"], "Alice")
        self.assertEqual(len(touched_clusters), 1)
        self.assertEqual(touched_clusters[0]["id"], "cluster-1")
        self.assertEqual(touched_clusters[0]["sample_count"], 3)
        self.assertGreater(touched_clusters[0]["centroid"][0], 0.98)

    def test_build_face_cluster_upsert_payload_includes_centroid(self) -> None:
        payload = people_service.build_face_cluster_upsert_payload(
            {
                "id": "cluster-1",
                "user_id": "user-1",
                "name": "Person 1",
                "centroid": [0.1, 0.2],
                "sample_count": 4,
            },
            cover_image_uuid="image-1",
            cover_photo_id="photo-1",
        )

        self.assertEqual(payload["id"], "cluster-1")
        self.assertEqual(payload["user_id"], "user-1")
        self.assertEqual(payload["centroid"], [0.1, 0.2])
        self.assertEqual(payload["sample_count"], 4)
        self.assertEqual(payload["cover_image_uuid"], "image-1")
        self.assertEqual(payload["cover_photo_id"], "photo-1")


if __name__ == "__main__":
    unittest.main()

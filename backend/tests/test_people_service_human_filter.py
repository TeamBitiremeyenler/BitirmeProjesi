from __future__ import annotations

import unittest

from app.services.people_service import _image_looks_human


class PeopleServiceHumanFilterTests(unittest.TestCase):
    def test_image_without_face_evidence_does_not_pass_gate(self) -> None:
        self.assertFalse(
            _image_looks_human({})
        )

    def test_assigned_person_makes_image_human(self) -> None:
        self.assertTrue(
            _image_looks_human(
                {
                    "persons": ["Person 1"],
                }
            )
        )

    def test_face_cluster_reference_makes_image_human(self) -> None:
        self.assertTrue(
            _image_looks_human(
                {
                    "face_clusters": [{"id": "cluster-1", "name": "Person 1"}],
                }
            )
        )


if __name__ == "__main__":
    unittest.main()

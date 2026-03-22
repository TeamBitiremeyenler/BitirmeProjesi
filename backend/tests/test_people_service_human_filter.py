from __future__ import annotations

import unittest

from app.services.people_service import _image_looks_human, looks_like_people_photo


class PeopleServiceHumanFilterTests(unittest.TestCase):
    def test_name_only_caption_does_not_pass_metadata_gate(self) -> None:
        self.assertFalse(
            looks_like_people_photo(
                caption="conor conor murphy",
                tags=["conor", "murphy"],
            )
        )

    def test_assigned_person_makes_image_human_even_with_name_only_caption(self) -> None:
        self.assertTrue(
            _image_looks_human(
                {
                    "caption": "conor conor murphy",
                    "tags": ["conor", "murphy"],
                    "persons": ["Person 1"],
                }
            )
        )

    def test_face_cluster_reference_makes_image_human_even_with_name_only_caption(self) -> None:
        self.assertTrue(
            _image_looks_human(
                {
                    "caption": "the mio is the new champion of the ufc championship",
                    "tags": ["mio", "champion", "ufc"],
                    "face_clusters": [{"id": "cluster-1", "name": "Person 1"}],
                }
            )
        )


if __name__ == "__main__":
    unittest.main()

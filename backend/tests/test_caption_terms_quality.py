from __future__ import annotations

import unittest

from app.services.caption_terms import (
    choose_preferred_human_caption,
    is_weak_human_caption,
    score_human_caption_quality,
)


class CaptionTermsQualityTests(unittest.TestCase):
    def test_name_only_human_caption_is_weak(self) -> None:
        self.assertTrue(is_weak_human_caption("conor conor murphy"))

    def test_descriptive_human_caption_is_not_weak(self) -> None:
        self.assertFalse(is_weak_human_caption("a man with a beard and no shirt"))

    def test_retry_caption_wins_when_quality_score_is_higher(self) -> None:
        primary_caption = "conor conor murphy"
        retry_caption = "a bearded man posing shirtless for a photo"

        self.assertGreater(
            score_human_caption_quality(retry_caption),
            score_human_caption_quality(primary_caption),
        )
        self.assertEqual(
            choose_preferred_human_caption(primary_caption, retry_caption),
            retry_caption,
        )


if __name__ == "__main__":
    unittest.main()

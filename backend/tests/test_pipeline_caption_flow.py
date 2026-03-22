from __future__ import annotations

import unittest
from unittest.mock import patch

from app.services import pipeline


class PipelineCaptionFlowTests(unittest.TestCase):
    def test_prompt_selection_by_face_count(self) -> None:
        self.assertEqual(pipeline.select_caption_prompt(0), pipeline.PRIMARY_GENERIC_PROMPT)
        self.assertEqual(pipeline.select_caption_prompt(1), pipeline.PRIMARY_SINGLE_PERSON_PROMPT)
        self.assertEqual(pipeline.select_caption_prompt(3), pipeline.PRIMARY_MULTI_PERSON_PROMPT)

    def test_retry_prompt_selection_by_face_count(self) -> None:
        self.assertEqual(pipeline.select_caption_prompt(1, retry=True), pipeline.RETRY_SINGLE_PERSON_PROMPT)
        self.assertEqual(pipeline.select_caption_prompt(2, retry=True), pipeline.RETRY_MULTI_PERSON_PROMPT)

    def test_weak_human_caption_retries_with_stronger_prompt(self) -> None:
        fast_faces = [{"bbox": [0.0, 0.0, 10.0, 10.0], "embedding": [0.1, 0.2]}]

        with patch("app.db.supabase.get_supabase", side_effect=Exception("disabled")), \
             patch("app.services.face_service.detect_and_encode_faces_with_attempt", return_value=(fast_faces, "default")) as mocked_detect, \
             patch("app.services.pipeline.build_content_hash", return_value="hash"), \
             patch("app.services.pipeline.generate_caption", side_effect=[
                 "conor conor murphy",
                 "a bearded man posing shirtless for a photo",
             ]) as mocked_generate_caption, \
             patch("app.services.pipeline.generate_text_embedding", return_value=[0.1, 0.2]), \
             patch("app.services.pipeline.assign_faces_to_clusters", return_value=([], [])), \
             patch("app.services.pipeline.save_index_record") as mocked_save_index_record, \
             patch("app.services.pipeline.os.path.exists", return_value=False):
            pipeline.process_image(
                image_path="ignored.jpg",
                user_id="user-1",
                photo_id="photo-1",
                image_uuid="image-1",
            )

        self.assertEqual(mocked_detect.call_count, 1)
        self.assertEqual(
            mocked_generate_caption.call_args_list[0].kwargs["prompt"],
            pipeline.PRIMARY_SINGLE_PERSON_PROMPT,
        )
        self.assertEqual(
            mocked_generate_caption.call_args_list[1].kwargs["prompt"],
            pipeline.RETRY_SINGLE_PERSON_PROMPT,
        )
        saved_record = mocked_save_index_record.call_args.args[0]
        self.assertEqual(saved_record["caption"], "a bearded man posing shirtless for a photo")

    def test_fast_face_hit_does_not_run_expensive_fallback(self) -> None:
        fast_faces = [{"bbox": [0.0, 0.0, 10.0, 10.0], "embedding": [0.1, 0.2]}]

        with patch("app.db.supabase.get_supabase", side_effect=Exception("disabled")), \
             patch("app.services.face_service.detect_and_encode_faces_with_attempt", return_value=(fast_faces, "default")) as mocked_detect, \
             patch("app.services.pipeline.build_content_hash", return_value="hash"), \
             patch("app.services.pipeline.generate_caption", return_value="a man with a beard and no shirt"), \
             patch("app.services.pipeline.generate_text_embedding", return_value=[0.1, 0.2]), \
             patch("app.services.pipeline.assign_faces_to_clusters", return_value=([], [])), \
             patch("app.services.pipeline.save_index_record"), \
             patch("app.services.pipeline.os.path.exists", return_value=False):
            pipeline.process_image(
                image_path="ignored.jpg",
                user_id="user-1",
                photo_id="photo-1",
                image_uuid="image-1",
            )

        self.assertEqual(mocked_detect.call_count, 1)
        self.assertEqual(mocked_detect.call_args.kwargs["detection_mode"], "fast")

    def test_fast_face_miss_with_human_caption_runs_fallback(self) -> None:
        fallback_faces = [{"bbox": [1.0, 1.0, 12.0, 12.0], "embedding": [0.3, 0.4]}]

        with patch("app.db.supabase.get_supabase", side_effect=Exception("disabled")), \
             patch(
                 "app.services.face_service.detect_and_encode_faces_with_attempt",
                 side_effect=[([], None), (fallback_faces, "high_detail")],
             ) as mocked_detect, \
             patch("app.services.pipeline.build_content_hash", return_value="hash"), \
             patch("app.services.pipeline.generate_caption", return_value="a man with a beard"), \
             patch("app.services.pipeline.generate_text_embedding", return_value=[0.1, 0.2]), \
             patch("app.services.pipeline.assign_faces_to_clusters", return_value=([], [])) as mocked_assign_faces, \
             patch("app.services.pipeline.save_index_record"), \
             patch("app.services.pipeline.os.path.exists", return_value=False):
            pipeline.process_image(
                image_path="ignored.jpg",
                user_id="user-1",
                photo_id="photo-1",
                image_uuid="image-1",
            )

        self.assertEqual(mocked_detect.call_count, 2)
        self.assertEqual(mocked_detect.call_args_list[0].kwargs["detection_mode"], "fast")
        self.assertEqual(mocked_detect.call_args_list[1].kwargs["detection_mode"], "fallback")
        self.assertTrue(mocked_detect.call_args_list[1].kwargs["enable_hard_portrait_fallback"])
        self.assertEqual(mocked_assign_faces.call_args.kwargs["faces"], fallback_faces)

    def test_fast_face_miss_with_non_human_caption_skips_fallback(self) -> None:
        with patch("app.db.supabase.get_supabase", side_effect=Exception("disabled")), \
             patch("app.services.face_service.detect_and_encode_faces_with_attempt", return_value=([], None)) as mocked_detect, \
             patch("app.services.pipeline.build_content_hash", return_value="hash"), \
             patch("app.services.pipeline.generate_caption", return_value="a white car parked on the side of a road"), \
             patch("app.services.pipeline.generate_text_embedding", return_value=[0.1, 0.2]), \
             patch("app.services.pipeline.assign_faces_to_clusters", return_value=([], [])), \
             patch("app.services.pipeline.save_index_record"), \
             patch("app.services.pipeline.os.path.exists", return_value=False):
            pipeline.process_image(
                image_path="ignored.jpg",
                user_id="user-1",
                photo_id="photo-1",
                image_uuid="image-1",
            )

        self.assertEqual(mocked_detect.call_count, 1)


if __name__ == "__main__":
    unittest.main()

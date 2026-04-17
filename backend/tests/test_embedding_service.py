from __future__ import annotations

import unittest
from types import SimpleNamespace

import torch

from app.services.embedding_service import normalize_feature_vector


class EmbeddingServiceTests(unittest.TestCase):
    def test_normalize_feature_vector_accepts_pooling_output(self) -> None:
        output = SimpleNamespace(pooler_output=torch.tensor([[3.0, 4.0]]))

        normalized = normalize_feature_vector(output)

        self.assertAlmostEqual(normalized[0], 0.6, places=6)
        self.assertAlmostEqual(normalized[1], 0.8, places=6)


if __name__ == "__main__":
    unittest.main()

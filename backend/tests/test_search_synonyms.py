from __future__ import annotations

import unittest

from app.services.search_service import expand_query_tokens


class SearchSynonymTests(unittest.TestCase):
    def test_bicycle_expands_to_bike(self) -> None:
        expanded = set(expand_query_tokens(["bicycle"]))
        self.assertIn("bike", expanded)
        self.assertIn("bicycle", expanded)

    def test_bike_expands_to_bicycle(self) -> None:
        expanded = set(expand_query_tokens(["bike"]))
        self.assertIn("bicycle", expanded)
        self.assertIn("bike", expanded)


if __name__ == "__main__":
    unittest.main()

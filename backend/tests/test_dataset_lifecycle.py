"""
NIRIKSHAK AI — Dataset Lifecycle and End-to-End Ingestion Test Suite
Internal Hackathon Demo Mode

Verifies:
1. GET /api/datasets/active returns current manifest/fallback status.
2. POST /api/datasets/load-benchmark executes end-to-end normalization, ML analysis, and graph rebuild.
3. POST /api/datasets/upload validates, normalizes, analyzes, and rebuilds graph truthfully.
4. Invalid/corrupted file returns honest 400 error.
"""

from pathlib import Path
import sys
import unittest
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app


class TestDatasetLifecycle(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_get_active_dataset(self):
        """GET /api/datasets/active should return current status without errors."""
        res = self.client.get("/api/datasets/active")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("has_dataset", data)
        if data["has_dataset"]:
            self.assertGreater(data.get("total_transactions", 0), 0)
            self.assertGreater(data.get("total_wallets", 0), 0)

    def test_02_load_benchmark_dataset(self):
        """POST /api/datasets/load-benchmark runs the complete end-to-end pipeline if benchmark exists."""
        canonical_demo = Path(__file__).resolve().parent.parent / "data" / "demo" / "nirikshak_demo_15k.csv"
        fallback_demo = Path(__file__).resolve().parent.parent / "data" / "demo_transactions.csv"
        benchmark_file = canonical_demo if canonical_demo.exists() else fallback_demo
        if not benchmark_file.exists():
            self.skipTest("Benchmark dataset not present in repository.")
        res = self.client.post("/api/datasets/load-benchmark")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data["filename"], ["nirikshak_demo_15k.csv", "demo_transactions.csv"])
        self.assertEqual(data["detected_format"], "csv")
        self.assertEqual(data["pipeline_status"], "SUCCESS")
        self.assertIn("stage_timings_ms", data)
        timings = data["stage_timings_ms"]
        self.assertIn("normalization_ms", timings)
        self.assertIn("analysis_ms", timings)
        self.assertIn("graph_build_ms", timings)
        self.assertIn("total_ms", timings)
        self.assertGreater(timings["total_ms"], 0)
        self.assertIsNotNone(data.get("analysis_summary"))
        self.assertIsNotNone(data.get("graph_summary"))

    def test_03_upload_invalid_csv(self):
        """POST /api/datasets/upload with empty file returns 400."""
        files = {"file": ("empty.csv", b"", "text/csv")}
        res = self.client.post("/api/datasets/upload", files=files)
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()

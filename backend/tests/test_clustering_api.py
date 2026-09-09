"""
NIRIKSHAK AI — Behavioral Clustering API Test Suite (Phase 9 Step 3)

Verifies:
1. GET /api/clusters returns 200, 6 clusters, and valid schema structure.
2. GET /api/clusters/{cluster_id} returns 200 with valid profile and member wallets.
3. Pagination on cluster detail (limit, offset, returned_count, total_wallets).
4. Invalid cluster ID returns clean 404.
5. GET /api/clusters/wallet/{wallet_id} returns 200 with coordinates and attached profile.
6. Prefix normalization ('wallet:<addr>') works identically to raw address.
7. Unknown wallet returns 404.
8. Malformed wallet returns 400.
9. GET /api/clusters/similar/{wallet_id} returns 200 with top N similarities.
10. Self-exclusion: target wallet never appears in similar candidates.
11. Query boundary validation: top_n=0 and top_n=51 rejected with 422.
12. Route order: /wallet/... and /similar/... resolve to specialized endpoints, not /{cluster_id}.
13. Zero ground-truth leakage: no accusatory/criminal labels or hidden fields exposed.
14. Sorting: sort_by=distance ascending and sort_by=address lexicographical.
15. Invalid sort_by returns 400.
"""

from pathlib import Path
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.schemas.clustering import (
    ClusterDetailResponse,
    ClusterProfilesResponse,
    SimilarWalletsResponse,
    WalletClusterDetailResponse,
)

KNOWN_LEAD_WALLET = "bc1qa0fa87eac1de3da717bcfdc46ebb04276a"
UNKNOWN_WALLET = "bc1q00000000000000000000000000000000000000"


class TestClusteringAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    # 1. test_get_all_clusters_success
    def test_get_all_clusters_success(self):
        """Verify GET /api/clusters returns 200, 6 clusters, and valid schema structure."""
        response = self.client.get("/api/clusters")
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}: {response.text}")
        data = response.json()

        validated = ClusterProfilesResponse(**data)
        self.assertEqual(validated.total_clusters, 6)
        self.assertEqual(len(validated.clusters), 6)
        self.assertEqual(validated.diagnostics.selected_k, 6)
        self.assertGreater(validated.diagnostics.selected_k_silhouette, 0.5)
        self.assertGreater(validated.total_wallets, 0)

        # Confirm cluster IDs 0 to 5 exist
        cluster_ids = {c.cluster_id for c in validated.clusters}
        self.assertEqual(cluster_ids, {0, 1, 2, 3, 4, 5})

    # 2. test_get_cluster_detail_success
    def test_get_cluster_detail_success(self):
        """Verify GET /api/clusters/{cluster_id} returns 200 with valid profile and member wallets."""
        response = self.client.get("/api/clusters/0")
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}: {response.text}")
        data = response.json()

        validated = ClusterDetailResponse(**data)
        self.assertEqual(validated.cluster.cluster_id, 0)
        self.assertGreater(validated.total_wallets, 0)
        self.assertGreater(validated.returned_count, 0)
        self.assertEqual(len(validated.wallets), validated.returned_count)

        first_wallet = validated.wallets[0]
        self.assertEqual(first_wallet.cluster_id, 0)
        self.assertTrue(len(first_wallet.wallet_address) > 0)
        self.assertGreaterEqual(first_wallet.distance_to_centroid, 0.0)

    # 3. test_get_cluster_detail_pagination
    def test_get_cluster_detail_pagination(self):
        """Verify limit, offset, and returned_count pagination metadata."""
        limit = 10
        offset = 5
        response = self.client.get(f"/api/clusters/0?limit={limit}&offset={offset}")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        validated = ClusterDetailResponse(**data)
        self.assertEqual(validated.limit, limit)
        self.assertEqual(validated.offset, offset)
        self.assertLessEqual(validated.returned_count, limit)
        self.assertEqual(len(validated.wallets), validated.returned_count)

    # 4. test_get_cluster_detail_invalid_id_returns_404
    def test_get_cluster_detail_invalid_id_returns_404(self):
        """Verify non-existent cluster IDs return HTTP 404."""
        for invalid_id in [999, -1, 42]:
            response = self.client.get(f"/api/clusters/{invalid_id}")
            self.assertEqual(
                response.status_code,
                404,
                f"Expected 404 for cluster_id={invalid_id}, got {response.status_code}"
            )
            self.assertIn("not found", response.json()["detail"].lower())

    # 5. test_get_wallet_cluster_success
    def test_get_wallet_cluster_success(self):
        """Verify known wallet lookup returns correct cluster assignment and coordinates."""
        response = self.client.get(f"/api/clusters/wallet/{KNOWN_LEAD_WALLET}")
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}: {response.text}")
        data = response.json()

        validated = WalletClusterDetailResponse(**data)
        self.assertEqual(validated.wallet_address, KNOWN_LEAD_WALLET)
        self.assertIn(validated.cluster_id, range(6))
        self.assertGreater(len(validated.cluster_label), 0)
        self.assertGreaterEqual(validated.distance_to_centroid, 0.0)
        self.assertIsInstance(validated.pca_x, float)
        self.assertIsInstance(validated.pca_y, float)
        self.assertEqual(validated.cluster_profile.cluster_id, validated.cluster_id)

    # 6. test_get_wallet_cluster_prefix_normalization
    def test_get_wallet_cluster_prefix_normalization(self):
        """Verify 'wallet:<addr>' prefix is transparently stripped and normalized."""
        response = self.client.get(f"/api/clusters/wallet/wallet:{KNOWN_LEAD_WALLET}")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["wallet_address"], KNOWN_LEAD_WALLET)
        self.assertIn("cluster_id", data)

    # 7. test_get_wallet_cluster_unknown_returns_404
    def test_get_wallet_cluster_unknown_returns_404(self):
        """Verify querying an unknown wallet returns clean HTTP 404."""
        response = self.client.get(f"/api/clusters/wallet/{UNKNOWN_WALLET}")
        self.assertEqual(response.status_code, 404)
        self.assertIn("not found", response.json()["detail"].lower())

    # 8. test_get_wallet_cluster_malformed_returns_400
    def test_get_wallet_cluster_malformed_returns_400(self):
        """Verify malformed or injection wallet identifiers return clean HTTP 400."""
        malformed_identifiers = [
            "abc",                              # Too short (< 5 chars)
            "bc1q 12345 invalid spaces",        # Contains spaces
            "bc1q;DROP TABLE wallets;--",       # SQL injection characters
            "bc1q'--",                          # SQL quote
            "wallet:   ",                       # Empty after prefix
        ]
        for malformed in malformed_identifiers:
            response = self.client.get(f"/api/clusters/wallet/{malformed}")
            self.assertEqual(
                response.status_code,
                400,
                f"Expected 400 for '{malformed}', got {response.status_code}"
            )
            self.assertIn("invalid wallet identifier", response.json()["detail"].lower())

    # 9. test_get_similar_wallets_success
    def test_get_similar_wallets_success(self):
        """Verify GET /api/clusters/similar/{wallet_id} returns top N similar wallets."""
        top_n = 5
        response = self.client.get(f"/api/clusters/similar/{KNOWN_LEAD_WALLET}?top_n={top_n}")
        self.assertEqual(response.status_code, 200, f"Expected 200, got {response.status_code}: {response.text}")
        data = response.json()

        validated = SimilarWalletsResponse(**data)
        self.assertEqual(validated.target_wallet, KNOWN_LEAD_WALLET)
        self.assertEqual(validated.returned_count, top_n)
        self.assertEqual(len(validated.similar_wallets), top_n)

        # Check similarity ordering (descending similarity_score)
        scores = [w.similarity_score for w in validated.similar_wallets]
        self.assertEqual(scores, sorted(scores, reverse=True))

        for w in validated.similar_wallets:
            self.assertGreaterEqual(w.similarity_percent, 0.0)
            self.assertLessEqual(w.similarity_percent, 100.0)
            self.assertTrue(len(w.shared_behavioral_traits) > 0)

    # 10. test_get_similar_wallets_self_exclusion
    def test_get_similar_wallets_self_exclusion(self):
        """Verify the queried target wallet NEVER appears in the similarity candidates."""
        response = self.client.get(f"/api/clusters/similar/{KNOWN_LEAD_WALLET}?top_n=20")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        similar_addrs = [w["wallet_address"] for w in data["similar_wallets"]]
        self.assertNotIn(KNOWN_LEAD_WALLET, similar_addrs)

    # 11. test_get_similar_wallets_bounds
    def test_get_similar_wallets_bounds(self):
        """Verify FastAPI Query validation enforces 1 <= top_n <= 50."""
        # top_n = 0 rejected with 422
        res_low = self.client.get(f"/api/clusters/similar/{KNOWN_LEAD_WALLET}?top_n=0")
        self.assertEqual(res_low.status_code, 422)

        # top_n = 51 rejected with 422
        res_high = self.client.get(f"/api/clusters/similar/{KNOWN_LEAD_WALLET}?top_n=51")
        self.assertEqual(res_high.status_code, 422)

        # top_n = -5 rejected with 422
        res_neg = self.client.get(f"/api/clusters/similar/{KNOWN_LEAD_WALLET}?top_n=-5")
        self.assertEqual(res_neg.status_code, 422)

    # 12. test_cluster_route_order
    def test_cluster_route_order(self):
        """Verify /wallet/... and /similar/... resolve to their dedicated handlers, not /{cluster_id}."""
        # /wallet/... must return WalletClusterDetailResponse, not a 422 int parsing error for {cluster_id}
        res_wallet = self.client.get(f"/api/clusters/wallet/{KNOWN_LEAD_WALLET}")
        self.assertEqual(res_wallet.status_code, 200)
        self.assertIn("cluster_profile", res_wallet.json())

        # /similar/... must return SimilarWalletsResponse
        res_sim = self.client.get(f"/api/clusters/similar/{KNOWN_LEAD_WALLET}")
        self.assertEqual(res_sim.status_code, 200)
        self.assertIn("similar_wallets", res_sim.json())

    # 13. test_zero_ground_truth_leakage
    def test_zero_ground_truth_leakage(self):
        """Verify no ground-truth, criminal, or accusatory labels leak into clustering API payloads."""
        forbidden_terms = [
            "criminal", "illicit", "ground_truth", "terrorist",
            "darknet", "stolen", "ransomware", "laundering", "fraud"
        ]

        # Check /api/clusters
        resp_all = self.client.get("/api/clusters")
        text_all = resp_all.text.lower()
        for term in forbidden_terms:
            self.assertNotIn(term, text_all, f"Forbidden term '{term}' leaked into /api/clusters")

        # Check /api/clusters/0
        resp_c0 = self.client.get("/api/clusters/0")
        text_c0 = resp_c0.text.lower()
        for term in forbidden_terms:
            self.assertNotIn(term, text_c0, f"Forbidden term '{term}' leaked into /api/clusters/0")

        # Check /api/clusters/wallet/...
        resp_w = self.client.get(f"/api/clusters/wallet/{KNOWN_LEAD_WALLET}")
        text_w = resp_w.text.lower()
        for term in forbidden_terms:
            self.assertNotIn(term, text_w, f"Forbidden term '{term}' leaked into /api/clusters/wallet/...")

        # Check /api/clusters/similar/...
        resp_s = self.client.get(f"/api/clusters/similar/{KNOWN_LEAD_WALLET}")
        text_s = resp_s.text.lower()
        for term in forbidden_terms:
            self.assertNotIn(term, text_s, f"Forbidden term '{term}' leaked into /api/clusters/similar/...")

    # 14. test_sort_by_distance_and_address
    def test_sort_by_distance_and_address(self):
        """Verify sort_by=distance (ascending) and sort_by=address (lexicographical)."""
        # Sort by distance
        res_dist = self.client.get("/api/clusters/0?sort_by=distance&limit=20")
        self.assertEqual(res_dist.status_code, 200)
        wallets_dist = res_dist.json()["wallets"]
        distances = [w["distance_to_centroid"] for w in wallets_dist]
        self.assertEqual(distances, sorted(distances))

        # Sort by address
        res_addr = self.client.get("/api/clusters/0?sort_by=address&limit=20")
        self.assertEqual(res_addr.status_code, 200)
        wallets_addr = res_addr.json()["wallets"]
        addresses = [w["wallet_address"] for w in wallets_addr]
        self.assertEqual(addresses, sorted(addresses))

    # 15. test_invalid_sort_by_returns_400
    def test_invalid_sort_by_returns_400(self):
        """Verify invalid sort_by parameter returns HTTP 400."""
        res = self.client.get("/api/clusters/0?sort_by=unsupported_sort")
        self.assertEqual(res.status_code, 400)
        self.assertIn("invalid sort_by", res.json()["detail"].lower())

    # 16. test_similar_wallets_prefix_normalization
    def test_similar_wallets_prefix_normalization(self):
        """Verify similar wallets endpoint normalizes 'wallet:<addr>' prefix."""
        response = self.client.get(f"/api/clusters/similar/wallet:{KNOWN_LEAD_WALLET}?top_n=3")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["target_wallet"], KNOWN_LEAD_WALLET)

    # 17. test_similar_wallets_unknown_and_malformed
    def test_similar_wallets_unknown_and_malformed(self):
        """Verify similar wallets handles unknown (404) and malformed (400) wallets."""
        res_404 = self.client.get(f"/api/clusters/similar/{UNKNOWN_WALLET}")
        self.assertEqual(res_404.status_code, 404)

        res_400 = self.client.get("/api/clusters/similar/bad addr with spaces")
        self.assertEqual(res_400.status_code, 400)


if __name__ == "__main__":
    unittest.main()

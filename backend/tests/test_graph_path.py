"""
NIRIKSHAK AI — Phase 8A Graph Path API Test Suite

Verifies:
- GET /api/graph/path returns HTTP 200 with structured PathStep explanations
- Bounded traversal: max_hops parameter (default 10, range 1-20, bounds checks)
- Clean HTTP 400 for max_hops < 1, max_hops > 20, or empty source/target
- Path properties: path_sequence, traversal_mode ('directed' | 'undirected')
- Sequential steps: each step connects consecutive path_sequence nodes
- Edge explanations: human-readable, non-accusatory, accurate semantics
- Backward compatibility: nodes and links arrays populated with path elements
"""

from pathlib import Path
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure backend directory is in path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
from app.graph.builder import load_or_build_graph
from app.schemas.graph import GraphPathResponse


class TestGraphPathAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        try:
            cls.graph = load_or_build_graph()
            if cls.graph.number_of_nodes() == 0:
                raise unittest.SkipTest("Graph path tests require a populated graph dataset.")
        except FileNotFoundError:
            raise unittest.SkipTest("Normalized dataset not found in clean reset state.")
        # Canonical test entities - dynamically discover connected entities from the active graph
        cls.known_wallet = "bc1qa0fa87eac1de3da717bcfdc46ebb04276a"
        cls.known_tx = "13fa68e47f1ec590fb6a6f544cdd9330911a80b952bc3eb6f4bcd61032da3b1b"
        cls.known_ip = "198.51.100.172"
        cls.known_asn = "AS16509"
        cls.known_country = "US"
        cls.target_wallet = "bc1q09f6c67078e65d63b40f3c61896493a6ce"

        for u, v, d in cls.graph.edges(data=True):
            if u.startswith("wallet:") and v.startswith("tx:") and d.get("type") == "input":
                tx_node = v
                ip_neighbors = [n for n in cls.graph.neighbors(tx_node) if n.startswith("ip:")]
                out_wallets = [n for _, n, ed in cls.graph.out_edges(tx_node, data=True) if n.startswith("wallet:") and ed.get("type") == "output"]
                if ip_neighbors and out_wallets:
                    ip_node = ip_neighbors[0]
                    asns = [n.replace("asn:", "") for n in cls.graph.neighbors(ip_node) if n.startswith("asn:")]
                    countries = [n.replace("country:", "") for n in cls.graph.neighbors(ip_node) if n.startswith("country:")]
                    if asns and countries:
                        cls.known_wallet = u.replace("wallet:", "")
                        cls.known_tx = tx_node.replace("tx:", "")
                        cls.target_wallet = out_wallets[0].replace("wallet:", "")
                        cls.known_ip = ip_node.replace("ip:", "")
                        cls.known_asn = asns[0]
                        cls.known_country = countries[0]
                        break

    def test_valid_wallet_to_transaction_path(self):
        """Verify wallet -> transaction path (Criteria B, L, M, N, O, P, Q, R, S, T)."""
        res = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=tx:{self.known_tx}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        validated = GraphPathResponse(**data)

        self.assertTrue(validated.found)
        self.assertEqual(validated.source, f"wallet:{self.known_wallet}")
        self.assertEqual(validated.target, f"tx:{self.known_tx}")
        self.assertIsNotNone(validated.path_length)
        self.assertLessEqual(validated.path_length, 10)

        # Path sequence checks
        self.assertEqual(validated.path_sequence[0], f"wallet:{self.known_wallet}")
        self.assertEqual(validated.path_sequence[-1], f"tx:{self.known_tx}")
        self.assertEqual(len(validated.path_sequence), validated.path_length + 1)
        self.assertEqual(len(validated.steps), validated.path_length)
        self.assertEqual(len(validated.links), validated.path_length)
        self.assertIn(validated.traversal_mode, ["directed", "undirected"])

        # Step consistency checks
        for i, step in enumerate(validated.steps):
            self.assertEqual(step.step_index, i + 1)
            self.assertEqual(step.from_node, validated.path_sequence[i])
            self.assertEqual(step.to_node, validated.path_sequence[i + 1])
            self.assertTrue(len(step.edge_type) > 0)
            self.assertTrue(len(step.explanation) > 0)
            # Verify link exists in graph
            if step.direction_reversed:
                self.assertTrue(self.graph.has_edge(step.to_node, step.from_node))
            else:
                self.assertTrue(self.graph.has_edge(step.from_node, step.to_node))

    def test_wallet_to_asn_and_country_paths(self):
        """Verify wallet -> ASN and country paths when connected (Criteria C)."""
        # Wallet to ASN
        res_asn = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=asn:{self.known_asn}")
        self.assertEqual(res_asn.status_code, 200)
        data_asn = res_asn.json()
        self.assertTrue(data_asn["found"])
        self.assertEqual(data_asn["path_sequence"][-1], f"asn:{self.known_asn}")

        # Wallet to Country
        res_geo = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=country:{self.known_country}")
        self.assertEqual(res_geo.status_code, 200)
        data_geo = res_geo.json()
        self.assertTrue(data_geo["found"])
        self.assertEqual(data_geo["path_sequence"][-1], f"country:{self.known_country}")

    def test_wallet_to_wallet_path(self):
        """Verify wallet -> wallet path (Criteria A)."""
        target_wallet = self.target_wallet
        res = self.client.get(f"/api/graph/path?source={self.known_wallet}&target={target_wallet}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["found"])
        self.assertEqual(data["source"], f"wallet:{self.known_wallet}")
        self.assertEqual(data["target"], f"wallet:{target_wallet}")
        self.assertGreaterEqual(data["path_length"], 1)

    def test_no_path_case(self):
        """Verify no-path case between disconnected or nonexistent entities (Criteria D)."""
        res = self.client.get("/api/graph/path?source=wallet:bc1qnonexistentwallet999&target=country:US")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["found"])
        self.assertIsNone(data["path_length"])
        self.assertEqual(data["nodes"], [])
        self.assertEqual(data["links"], [])
        self.assertEqual(data["path_sequence"], [])
        self.assertEqual(data["steps"], [])
        self.assertIsNone(data["traversal_mode"])
        self.assertIn("not constitute proof", data["disclaimer"].lower())

    def test_empty_source_and_target_validation(self):
        """Verify empty or whitespace source/target returns HTTP 400 (Criteria E, F)."""
        res_empty_src = self.client.get(f"/api/graph/path?source=%20&target=country:{self.known_country}")
        self.assertEqual(res_empty_src.status_code, 400)

        res_empty_tgt = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=%20")
        self.assertEqual(res_empty_tgt.status_code, 400)

    def test_max_hops_bounds_validation(self):
        """Verify max_hops valid ranges and boundary rejections (Criteria G, H, I, J, K)."""
        # G. max_hops = 1 (valid)
        r_1 = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=tx:{self.known_tx}&max_hops=1")
        self.assertEqual(r_1.status_code, 200)
        if r_1.json()["found"]:
            self.assertLessEqual(r_1.json()["path_length"], 1)

        # H. max_hops = 10 (default, valid)
        r_10 = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=tx:{self.known_tx}&max_hops=10")
        self.assertEqual(r_10.status_code, 200)

        # I. max_hops = 20 (valid)
        r_20 = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=tx:{self.known_tx}&max_hops=20")
        self.assertEqual(r_20.status_code, 200)

        # J. max_hops = 0 -> 400
        r_0 = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=tx:{self.known_tx}&max_hops=0")
        self.assertEqual(r_0.status_code, 400)

        # K. max_hops = 21 -> 400
        r_21 = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=tx:{self.known_tx}&max_hops=21")
        self.assertEqual(r_21.status_code, 400)

    def test_traversal_mode_accuracy(self):
        """Verify traversal_mode accurately reflects directed vs undirected fallback (Criteria T)."""
        # Forward: wallet -> tx -> ip -> asn (directed)
        r_fwd = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=asn:{self.known_asn}")
        self.assertEqual(r_fwd.status_code, 200)
        self.assertEqual(r_fwd.json()["traversal_mode"], "directed")

        # Reverse: asn -> wallet (undirected fallback, since no directed edge flows from asn to tx)
        r_rev = self.client.get(f"/api/graph/path?source=asn:{self.known_asn}&target={self.known_wallet}")
        self.assertEqual(r_rev.status_code, 200)
        self.assertTrue(r_rev.json()["found"])
        self.assertEqual(r_rev.json()["traversal_mode"], "undirected")
        # Reverse path must have direction_reversed = True for its steps
        rev_steps = r_rev.json()["steps"]
        self.assertTrue(any(s["direction_reversed"] is True for s in rev_steps))

    def test_zero_ground_truth_or_accusatory_labels(self):
        """Verify explanations avoid accusatory terms and no ground truth leaks."""
        res = self.client.get(f"/api/graph/path?source={self.known_wallet}&target=asn:{self.known_asn}")
        data = res.json()
        forbidden = ["criminal", "hacker", "stolen", "fraudster", "malicious", "ground_truth"]
        raw_text = str(data).lower()
        for term in forbidden:
            self.assertNotIn(term, raw_text, f"Forbidden term '{term}' found in path response payload")


if __name__ == "__main__":
    unittest.main()

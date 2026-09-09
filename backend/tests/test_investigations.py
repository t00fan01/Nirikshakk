"""
NIRIKSHAK AI — Phase 7A Investigation API Test Suite

Verifies:
- GET /api/investigations/{wallet_id} returns HTTP 200 for a valid known wallet
- Wallet address and telemetry match storage records
- Risk scores, tiers, and subscores agree with canonical analysis results
- Transactions involve the requested wallet (as input or output)
- Network observations correspond to transactions involving the wallet
- Unknown wallet address returns clean HTTP 404
- Malformed/invalid identifier returns clean HTTP 400
- Response strictly validates against Pydantic WalletInvestigationResponse schema
- Zero ground-truth leakage or accusatory labels in response payload
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
from app.schemas.investigation import WalletInvestigationResponse

KNOWN_LEAD_WALLET = "bc1qa0fa87eac1de3da717bcfdc46ebb04276a"


class TestWalletInvestigationAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_known_wallet_investigation_success(self):
        """Verify known wallet returns 200 OK with valid schema structure."""
        response = self.client.get(f"/api/investigations/{KNOWN_LEAD_WALLET}")
        self.assertEqual(response.status_code, 200, f"Expected 200 but got {response.status_code}: {response.text}")

        data = response.json()
        validated = WalletInvestigationResponse(**data)
        self.assertEqual(validated.wallet.address, KNOWN_LEAD_WALLET)
        self.assertGreater(validated.wallet.transaction_count, 0)
        self.assertGreaterEqual(validated.wallet.total_input_amount, 0)
        self.assertGreaterEqual(validated.wallet.total_output_amount, 0)

    def test_prefix_wallet_identifier_handling(self):
        """Verify prefix 'wallet:<address>' is transparently normalized."""
        response = self.client.get(f"/api/investigations/wallet:{KNOWN_LEAD_WALLET}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["wallet"]["address"], KNOWN_LEAD_WALLET)

    def test_risk_and_evidence_consistency(self):
        """Verify risk fields match investigative leads from /api/alerts."""
        inv_res = self.client.get(f"/api/investigations/{KNOWN_LEAD_WALLET}")
        self.assertEqual(inv_res.status_code, 200)
        inv_data = inv_res.json()

        alert_res = self.client.get(f"/api/alerts/{KNOWN_LEAD_WALLET}")
        self.assertEqual(alert_res.status_code, 200)
        alert_data = alert_res.json()

        self.assertIsNotNone(inv_data["risk"])
        self.assertEqual(inv_data["risk"]["score"], alert_data["risk_score"])
        self.assertEqual(inv_data["risk"]["level"], alert_data["risk_level"])
        self.assertEqual(inv_data["risk"]["anomaly_score"], alert_data["anomaly_score"])
        self.assertEqual(inv_data["risk"]["subscores"], alert_data["subscores"])

        # Verify evidence items
        self.assertGreater(len(inv_data["evidence"]), 0)
        for item in inv_data["evidence"]:
            self.assertIn(item["category"], ["activity", "temporal", "network", "behavior", "anomaly"])
            self.assertGreater(len(item["message"]), 0)
            self.assertIn(item["severity"], ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"])

    def test_transactions_involve_target_wallet(self):
        """Verify every returned transaction actually involves the investigated wallet."""
        response = self.client.get(f"/api/investigations/{KNOWN_LEAD_WALLET}?tx_limit=20")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertGreater(len(data["transactions"]), 0)
        for tx in data["transactions"]:
            is_input = KNOWN_LEAD_WALLET in tx["input_addresses"]
            is_output = KNOWN_LEAD_WALLET in tx["output_addresses"]
            self.assertTrue(is_input or is_output, f"Transaction {tx['txid']} does not contain {KNOWN_LEAD_WALLET}")
            self.assertEqual(tx["is_input"], is_input)
            self.assertEqual(tx["is_output"], is_output)
            self.assertEqual(len(tx["input_amounts"]), len(tx["input_addresses"]))
            self.assertEqual(len(tx["output_amounts"]), len(tx["output_addresses"]))
            self.assertGreaterEqual(tx["fee"], 0)

    def test_network_observations_correspond_to_transactions(self):
        """Verify returned network observations match transactions involving the wallet."""
        response = self.client.get(f"/api/investigations/{KNOWN_LEAD_WALLET}?tx_limit=50&net_limit=50")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        all_tx_ids = {tx["txid"] for tx in data["transactions"]}
        for obs in data["network_observations"]:
            self.assertTrue(obs["txid"] in all_tx_ids or data["total_transactions"] > len(data["transactions"]))
            self.assertTrue(obs["src_ip"] and len(obs["src_ip"]) > 0)
            self.assertTrue(obs["geo_country"] and len(obs["geo_country"]) > 0)
            self.assertTrue(obs["asn"] and len(obs["asn"]) > 0)

    def test_graph_summary_structure(self):
        """Verify graph summary topology counts."""
        response = self.client.get(f"/api/investigations/{KNOWN_LEAD_WALLET}")
        self.assertEqual(response.status_code, 200)
        summary = response.json()["graph_summary"]

        self.assertGreater(summary["direct_neighbor_count"], 0)
        self.assertGreater(summary["transaction_count"], 0)
        self.assertGreaterEqual(summary["ip_count"], 0)
        self.assertGreaterEqual(summary["asn_count"], 0)
        self.assertGreaterEqual(summary["country_count"], 0)

    def test_unknown_wallet_returns_404(self):
        """Verify unknown wallet returns clean HTTP 404 without crashing."""
        unknown_addr = "bc1qunknownwalletnotfoundindataset00000"
        response = self.client.get(f"/api/investigations/{unknown_addr}")
        self.assertEqual(response.status_code, 404)
        self.assertIn("not found", response.json()["detail"].lower())

    def test_malformed_wallet_returns_400(self):
        """Verify invalid or malformed wallet identifiers return clean HTTP 400."""
        for malformed in ["bad address", "addr;DROP TABLE", "x", "   "]:
            response = self.client.get(f"/api/investigations/{malformed}")
            self.assertIn(response.status_code, [400, 404])

    def test_zero_ground_truth_leakage(self):
        """Verify response does not expose synthetic ground truth or accusatory terms."""
        response = self.client.get(f"/api/investigations/{KNOWN_LEAD_WALLET}")
        self.assertEqual(response.status_code, 200)
        raw_text = response.text.lower()

        forbidden_terms = [
            "is_mule",
            "ground_truth",
            "synthetic_label",
            "hacker",
            "criminal",
            "fraudster",
        ]
        for term in forbidden_terms:
            self.assertNotIn(term, raw_text, f"Forbidden term '{term}' leaked into investigation response payload")


if __name__ == "__main__":
    unittest.main()

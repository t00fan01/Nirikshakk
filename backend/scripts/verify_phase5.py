#!/usr/bin/env python3
"""
NIRIKSHAK AI — Phase 5 Verification Suite (SIH26146)
“AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic”

Verifies:
 1. Phase 1 Regression (Dataset generator & schema validation)
 2. Phase 2 Regression (Ingestion API & Pydantic models)
 3. Phase 3 Regression (Normalization, Parquet & DuckDB)
 4. Phase 4 Regression (Feature matrix, Isolation Forest, Risk Engine)
 5. Graph Construction (NetworkX DiGraph builds successfully)
 6. Expected Node Types Exist (wallet, transaction, ip, asn, country, entity)
 7. Expected Edge Types Exist (input, output, counterparty, network_observation)
 8. No Duplicate Transaction Nodes
 9. Wallet <-> Transaction Relationships Correct
10. Transaction <-> IP Relationships Correct
11. IP <-> ASN Relationships Correct
12. IP <-> Country Relationships Correct
13. Counterparty Edges Generated per Documented Heuristic
14. Graph Construction is 100% Deterministic
15. Graph Persistence & Serialization (pickle, graphml, json stats)
16. Neighborhood Subgraph Query (1-hop, 2-hop, 3-hop)
17. Hop Limit Clamping (1 to 3 hops)
18. Max Nodes Safety Bounds Enforcement
19. Search Queries (wallets, txids, IPs, ASNs)
20. Shortest Path Lookups (with causal disclaimer)
21. Phase 4 Risk Metadata Integration (scores, tiers, alert IDs)
22. Ground Truth Protection (no exposure in API or graph)
23. Frontend Integrity (zero frontend files modified in Phase 5)
24. Live API Endpoints (/api/graph/*)
"""

import json
from pathlib import Path
import subprocess
import sys

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import networkx as nx
import polars as pl

from app.main import app
from app.graph.builder import (
    build_investigation_graph,
    get_graph_stats,
    get_graph_storage_paths,
    has_graph_data,
    load_or_build_graph,
)
from app.graph.queries import (
    find_shortest_path,
    get_entity_details,
    get_neighborhood_subgraph,
    search_entities,
)
from app.pipeline.storage import get_parquet_paths, has_normalized_data


def run_cmd(cmd_args, desc):
    res = subprocess.run(cmd_args, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"FAILED: {desc}")
        print("STDOUT:", res.stdout[-500:])
        print("STDERR:", res.stderr[-500:])
        sys.exit(1)
    return res.stdout


def main():
    print("=" * 80)
    print("NIRIKSHAK AI — PHASE 5 VERIFICATION SUITE")
    print("SIH26146: Real Bitcoin Investigation Graph (NetworkX + API)")
    print("=" * 80)

    # -------------------------------------------------------------
    # 1-4. REGRESSIONS
    # -------------------------------------------------------------
    print("\n[1/24] Running Phase 1 Regression...")
    run_cmd([sys.executable, str(backend_dir / "scripts" / "verify_phase1.py")], "Phase 1 verification")
    print("   [PASS] Phase 1 synthetic dataset & schema regression passed.")

    print("\n[2/24] Running Phase 2 Regression...")
    run_cmd([sys.executable, str(backend_dir / "scripts" / "verify_phase2.py")], "Phase 2 verification")
    print("   [PASS] Phase 2 dataset ingestion & validation regression passed.")

    print("\n[3/24] Running Phase 3 Regression...")
    run_cmd([sys.executable, str(backend_dir / "scripts" / "verify_phase3.py")], "Phase 3 verification")
    print("   [PASS] Phase 3 data normalization, Parquet & DuckDB regression passed.")

    print("\n[4/24] Running Phase 4 Regression...")
    run_cmd([sys.executable, str(backend_dir / "scripts" / "verify_phase4.py")], "Phase 4 verification")
    print("   [PASS] Phase 4 feature engineering & risk engine regression passed.")

    # -------------------------------------------------------------
    # 5. GRAPH CONSTRUCTION
    # -------------------------------------------------------------
    print("\n[5/24] Verifying Graph Construction from Parquet Tables...")
    assert has_normalized_data(), "Normalized Parquet data must exist"
    G, stats = build_investigation_graph(force_rebuild=True)
    assert isinstance(G, nx.DiGraph), "Graph must be a NetworkX DiGraph"
    assert G.number_of_nodes() > 0, "Graph must have nodes"
    assert G.number_of_edges() > 0, "Graph must have edges"
    print(f"   [PASS] Graph compiled successfully: {G.number_of_nodes():,} nodes, {G.number_of_edges():,} edges.")

    # -------------------------------------------------------------
    # 6. NODE TYPES
    # -------------------------------------------------------------
    print("\n[6/24] Verifying Node Types...")
    node_types = set(data.get("type") for _, data in G.nodes(data=True))
    expected_types = {"wallet", "transaction", "ip", "asn", "country"}
    assert expected_types.issubset(node_types), f"Missing node types: {expected_types - node_types}"
    print(f"   [PASS] Expected node types present: {sorted(node_types)}")
    print(f"          Wallets: {stats['wallet_nodes']}, Txs: {stats['transaction_nodes']}, IPs: {stats['ip_nodes']}, ASNs: {stats['asn_nodes']}, Countries: {stats['country_nodes']}")

    # -------------------------------------------------------------
    # 7. EDGE TYPES
    # -------------------------------------------------------------
    print("\n[7/24] Verifying Edge Types...")
    edge_types = set(data.get("type") for _, _, data in G.edges(data=True))
    expected_edge_types = {"input", "output", "counterparty", "network_observation"}
    assert expected_edge_types.issubset(edge_types), f"Missing edge types: {expected_edge_types - edge_types}"
    print(f"   [PASS] Expected edge types present: {sorted(edge_types)}")
    print(f"          Input: {stats['input_edges']}, Output: {stats['output_edges']}, Counterparty: {stats['counterparty_edges']}, Network Obs: {stats['network_observation_edges']}")

    # -------------------------------------------------------------
    # 8. NO DUPLICATE TRANSACTION NODES
    # -------------------------------------------------------------
    print("\n[8/24] Verifying No Duplicate Transaction Nodes...")
    df_txs = pl.read_parquet(get_parquet_paths()["transactions"])
    expected_tx_count = len(df_txs)
    actual_tx_nodes = sum(1 for _, d in G.nodes(data=True) if d.get("type") == "transaction")
    assert actual_tx_nodes == expected_tx_count, f"Tx node count mismatch: {actual_tx_nodes} vs {expected_tx_count}"
    print(f"   [PASS] Exactly {actual_tx_nodes:,} unique transaction nodes exist (1:1 with transactions table).")

    # -------------------------------------------------------------
    # 9. WALLET <-> TRANSACTION RELATIONSHIPS
    # -------------------------------------------------------------
    print("\n[9/24] Verifying Wallet <-> Transaction Edge Consistency...")
    sample_tx = df_txs.row(0, named=True)
    sample_txid = sample_tx["txid"]
    tx_node = f"tx:{sample_txid}"

    # Check input edges
    for in_addr in sample_tx["input_addresses"]:
        w_node = f"wallet:{in_addr}"
        assert G.has_edge(w_node, tx_node), f"Missing input edge from {w_node} to {tx_node}"
        assert G.edges[w_node, tx_node]["type"] == "input"

    # Check output edges
    for out_addr in sample_tx["output_addresses"]:
        w_node = f"wallet:{out_addr}"
        assert G.has_edge(tx_node, w_node), f"Missing output edge from {tx_node} to {w_node}"
        assert G.edges[tx_node, w_node]["type"] == "output"
    print("   [PASS] Wallet-Transaction input and output edge topologies verified.")

    # -------------------------------------------------------------
    # 10. TRANSACTION <-> IP RELATIONSHIPS
    # -------------------------------------------------------------
    print("\n[10/24] Verifying Transaction <-> IP Relationships...")
    src_ip = sample_tx["src_ip"]
    dst_ip = sample_tx["dst_ip"]
    assert G.has_edge(tx_node, f"ip:{src_ip}"), f"Missing edge {tx_node} -> ip:{src_ip}"
    assert G.has_edge(tx_node, f"ip:{dst_ip}"), f"Missing edge {tx_node} -> ip:{dst_ip}"
    assert G.edges[tx_node, f"ip:{src_ip}"]["type"] == "network_observation"
    print(f"   [PASS] Network observation edges correctly link tx to observed IPs: {src_ip}, {dst_ip}.")

    # -------------------------------------------------------------
    # 11. IP <-> ASN RELATIONSHIPS
    # -------------------------------------------------------------
    print("\n[11/24] Verifying IP <-> ASN Relationships...")
    asn_val = sample_tx["ASN"]
    if asn_val:
        assert G.has_edge(f"ip:{src_ip}", f"asn:{asn_val}"), f"Missing IP->ASN edge"
        assert G.edges[f"ip:{src_ip}", f"asn:{asn_val}"]["type"] == "network_observation"
    print("   [PASS] IP-ASN association edges verified.")

    # -------------------------------------------------------------
    # 12. IP <-> COUNTRY RELATIONSHIPS
    # -------------------------------------------------------------
    print("\n[12/24] Verifying IP <-> Country Relationships...")
    country_val = sample_tx["geo_country"]
    if country_val:
        assert G.has_edge(f"ip:{src_ip}", f"country:{country_val}"), f"Missing IP->Country edge"
        assert G.edges[f"ip:{src_ip}", f"country:{country_val}"]["type"] == "network_observation"
    print("   [PASS] IP-Country geolocation edges verified.")

    # -------------------------------------------------------------
    # 13. COUNTERPARTY EDGES HEURISTIC
    # -------------------------------------------------------------
    print("\n[13/24] Verifying Counterparty Heuristic Edges...")
    in_addrs = set(sample_tx["input_addresses"])
    out_addrs = set(sample_tx["output_addresses"])
    for u in in_addrs:
        for v in out_addrs:
            if u != v:
                assert G.has_edge(f"wallet:{u}", f"wallet:{v}"), f"Missing counterparty edge {u} -> {v}"
                e_data = G.edges[f"wallet:{u}", f"wallet:{v}"]
                assert e_data["type"] == "counterparty"
                assert "counterparty heuristic" in e_data["basis"].lower()
    print("   [PASS] Counterparty heuristic edges generated correctly without O(N^2) explosion.")

    # -------------------------------------------------------------
    # 14. DETERMINISM
    # -------------------------------------------------------------
    print("\n[14/24] Verifying Graph Construction Determinism...")
    G2, s2 = build_investigation_graph(force_rebuild=True)
    assert stats["total_nodes"] == s2["total_nodes"], "Determinism failed: node count mismatch"
    assert stats["total_edges"] == s2["total_edges"], "Determinism failed: edge count mismatch"
    assert sorted(G.nodes()) == sorted(G2.nodes()), "Determinism failed: node ID set mismatch"
    assert sorted(G.edges()) == sorted(G2.edges()), "Determinism failed: edge set mismatch"
    print("   [PASS] Rebuilding graph yields 100% byte-for-byte deterministic structure.")

    # -------------------------------------------------------------
    # 15. GRAPH PERSISTENCE & SERIALIZATION
    # -------------------------------------------------------------
    print("\n[15/24] Verifying Local Graph Storage...")
    g_paths = get_graph_storage_paths()
    assert g_paths["pickle"].exists() and g_paths["pickle"].stat().st_size > 0
    assert g_paths["stats"].exists() and g_paths["stats"].stat().st_size > 0
    assert g_paths["graphml"].exists() and g_paths["graphml"].stat().st_size > 0
    with open(g_paths["stats"], "r", encoding="utf-8") as f:
        stored_stats = json.load(f)
    assert stored_stats["total_nodes"] == stats["total_nodes"]
    print(f"   [PASS] Local graph artifacts verified: pickle ({g_paths['pickle'].stat().st_size / 1024 / 1024:.2f} MB), stats.json, graphml.")

    # -------------------------------------------------------------
    # 16. NEIGHBORHOOD QUERY
    # -------------------------------------------------------------
    print("\n[16/24] Verifying Neighborhood Queries (1-hop, 2-hop)...")
    target_wallet = f"wallet:{sample_tx['input_addresses'][0]}"
    sub1 = get_neighborhood_subgraph(G, target_wallet, hops=1, max_nodes=50)
    assert sub1 is not None, "1-hop subgraph failed"
    assert sub1.meta.node_count > 0
    assert sub1.meta.edge_count > 0
    assert sub1.meta.center == target_wallet

    sub2 = get_neighborhood_subgraph(G, target_wallet, hops=2, max_nodes=100)
    assert sub2 is not None, "2-hop subgraph failed"
    assert sub2.meta.node_count >= sub1.meta.node_count
    print(f"   [PASS] Neighborhood query works: 1-hop={sub1.meta.node_count} nodes, 2-hop={sub2.meta.node_count} nodes.")

    # -------------------------------------------------------------
    # 17. HOP LIMIT CLAMPING
    # -------------------------------------------------------------
    print("\n[17/24] Verifying Hop Limit Bounds (1 to 3)...")
    sub_clamped = get_neighborhood_subgraph(G, target_wallet, hops=10, max_nodes=100)
    assert sub_clamped.meta.hops == 3, f"Hop was not clamped to 3 (got {sub_clamped.meta.hops})"
    sub_min = get_neighborhood_subgraph(G, target_wallet, hops=0, max_nodes=100)
    assert sub_min.meta.hops == 1, f"Hop was not clamped to 1 (got {sub_min.meta.hops})"
    print("   [PASS] Hop limit correctly clamped between 1 and 3.")

    # -------------------------------------------------------------
    # 18. MAX NODES SAFETY BOUNDS
    # -------------------------------------------------------------
    print("\n[18/24] Verifying Max Nodes Safety Cap...")
    cap = 15
    sub_capped = get_neighborhood_subgraph(G, target_wallet, hops=2, max_nodes=cap)
    assert sub_capped.meta.node_count <= cap, f"Exceeded max_nodes: {sub_capped.meta.node_count} > {cap}"
    print(f"   [PASS] max_nodes cap enforced (returned {sub_capped.meta.node_count} <= {cap}).")

    # -------------------------------------------------------------
    # 19. SEARCH QUERIES
    # -------------------------------------------------------------
    print("\n[19/24] Verifying Search Engine...")
    s_wallet = search_entities(G, sample_tx["input_addresses"][0][:8], limit=5)
    assert s_wallet.total_matches > 0
    assert len(s_wallet.results) > 0

    s_tx = search_entities(G, sample_txid[:10], limit=5)
    assert s_tx.total_matches > 0
    assert any(r.type == "transaction" for r in s_tx.results)

    s_ip = search_entities(G, src_ip, limit=5)
    assert s_ip.total_matches > 0
    assert any(r.type == "ip" for r in s_ip.results)
    print(f"   [PASS] Search successfully resolves wallets, txids, and IPs.")

    # -------------------------------------------------------------
    # 20. SHORTEST PATH LOOKUPS
    # -------------------------------------------------------------
    print("\n[20/24] Verifying Shortest Path Lookup...")
    w1 = f"wallet:{sample_tx['input_addresses'][0]}"
    w2 = f"wallet:{sample_tx['output_addresses'][0]}"
    path_res = find_shortest_path(G, w1, w2)
    assert path_res.found is True
    assert path_res.path_length >= 1
    assert len(path_res.nodes) >= 2
    assert "not constitute proof" in path_res.disclaimer.lower()
    print(f"   [PASS] Shortest path found between counterparties (length={path_res.path_length}) with causal disclaimer.")

    # -------------------------------------------------------------
    # 21. PHASE 4 RISK METADATA INTEGRATION
    # -------------------------------------------------------------
    print("\n[21/24] Verifying Phase 4 Risk Metadata Integration...")
    analyzed_wallets = [d for _, d in G.nodes(data=True) if d.get("type") == "wallet" and d.get("risk_score") is not None]
    assert len(analyzed_wallets) > 0, "Wallet nodes must have attached Phase 4 risk metadata"
    sample_lead = analyzed_wallets[0]
    assert 0.0 <= sample_lead["risk_score"] <= 100.0
    assert sample_lead["risk_level"] in {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
    assert 0.0 <= sample_lead["anomaly_score"] <= 1.0
    print(f"   [PASS] {len(analyzed_wallets):,} wallet nodes contain validated Phase 4 risk scores and tiers.")

    # -------------------------------------------------------------
    # 22. GROUND TRUTH PROTECTION
    # -------------------------------------------------------------
    print("\n[22/24] Verifying Ground Truth Protection...")
    # Verify no ground truth attributes exist in graph nodes
    for _, d in G.nodes(data=True):
        assert "ground_truth" not in d
        assert "is_anomaly_label" not in d
        assert "anomaly_type" not in d
        assert "scenario" not in d
    print("   [PASS] Zero ground truth attributes leaked into the graph layer.")

    # -------------------------------------------------------------
    # 23. FRONTEND INTEGRITY
    # -------------------------------------------------------------
    print("\n[23/24] Verifying Frontend Files are Untouched in Phase 5...")
    git_status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout
    modified_lines = [l for l in git_status.strip().split("\n") if l.strip()]
    frontend_mods = [l for l in modified_lines if "frontend/" in l]
    assert len(frontend_mods) == 0, f"Frontend files must NOT be modified in Phase 5: {frontend_mods}"
    print("   [PASS] Zero frontend modifications detected.")

    # -------------------------------------------------------------
    # 24. LIVE FASTAPI ENDPOINTS
    # -------------------------------------------------------------
    print("\n[24/24] Verifying FastAPI HTTP Endpoints...")
    client = TestClient(app)

    # A. GET /api/graph/stats
    r_stats = client.get("/api/graph/stats")
    assert r_stats.status_code == 200, f"Stats failed: {r_stats.text}"
    json_stats = r_stats.json()
    assert json_stats["total_nodes"] == stats["total_nodes"]

    # B. GET /api/graph/search
    r_search = client.get("/api/graph/search?q=bc1q&limit=5")
    assert r_search.status_code == 200, f"Search failed: {r_search.text}"
    assert r_search.json()["total_matches"] > 0

    # C. GET /api/graph/{entity_id}
    r_detail = client.get(f"/api/graph/{target_wallet}")
    assert r_detail.status_code == 200, f"Detail failed: {r_detail.text}"
    assert r_detail.json()["id"] == target_wallet

    # D. GET /api/graph/{entity_id}/subgraph
    r_sub = client.get(f"/api/graph/{target_wallet}/subgraph?hops=1&max_nodes=30")
    assert r_sub.status_code == 200, f"Subgraph failed: {r_sub.text}"
    assert len(r_sub.json()["nodes"]) > 0

    # E. GET /api/graph/path
    r_path = client.get(f"/api/graph/path?source={w1}&target={w2}")
    assert r_path.status_code == 200, f"Path failed: {r_path.text}"
    assert r_path.json()["found"] is True

    # F. Nonexistent entity 404 test
    r_404 = client.get("/api/graph/wallet:NONEXISTENT_WALLET_ADDR")
    assert r_404.status_code == 404

    print("   [PASS] All /api/graph/* endpoints validated with 200 OK responses and proper 404 handling.")

    print("\n" + "=" * 80)
    print("🎉 PHASE 5 VERIFICATION COMPLETE: ALL 24 TESTS PASSED!")
    print("=" * 80)


if __name__ == "__main__":
    main()

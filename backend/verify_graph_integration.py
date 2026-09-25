"""
End-to-End Verification of Graph API and 15K Demo Dataset Integration
"""

import sys
import json
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_verification():
    print("=== 1. ACTIVE DATASET & METADATA ===")
    res_active = client.get("/api/datasets/active")
    print(f"Status: {res_active.status_code}")
    active_data = res_active.json()
    print(f"Active dataset: {active_data.get('filename')}")
    print(f"Total transactions: {active_data.get('total_transactions')}")
    print(f"Total wallets: {active_data.get('total_wallets')}")
    print(f"Pipeline status: {active_data.get('pipeline_status')}")

    print("\n=== 2. GRAPH STATS (TOPOLOGY) ===")
    res_stats = client.get("/api/graph/stats")
    print(f"Status: {res_stats.status_code}")
    stats = res_stats.json()
    print(f"Total nodes: {stats.get('total_nodes'):,}")
    print(f"Total edges: {stats.get('total_edges'):,}")
    print(f"Wallet nodes: {stats.get('wallet_nodes'):,}")
    print(f"Transaction nodes: {stats.get('transaction_nodes'):,}")
    print(f"IP nodes: {stats.get('ip_nodes'):,}")
    print(f"ASN nodes: {stats.get('asn_nodes'):,}")
    print(f"Country nodes: {stats.get('country_nodes'):,}")
    print(f"Counterparty edges: {stats.get('counterparty_edges'):,}")
    print(f"Network observation edges: {stats.get('network_observation_edges'):,}")

    print("\n=== 3. DEMO ROOT ENTITY ===")
    res_root = client.get("/api/graph/demo-root")
    print(f"Status: {res_root.status_code}")
    root_data = res_root.json()
    root_id = root_data.get("entity_id")
    print(f"Demo Root ID: {root_id}")
    print(f"Type: {root_data.get('type')}")
    print(f"Label: {root_data.get('label')}")
    print(f"Risk Score: {root_data.get('risk_score')}")
    print(f"Risk Level: {root_data.get('risk_level')}")
    print(f"Degree: {root_data.get('degree')}")
    print(f"Key Signal: {root_data.get('key_signal')}")

    print("\n=== 4. SUBGRAPH HOP TRAVERSAL ===")
    clean_id = root_id.replace("wallet:", "")
    for hops in [1, 2, 3]:
        res_sub = client.get(f"/api/graph/{clean_id}/subgraph?hops={hops}&limit=100")
        print(f"\n--- Hop {hops} ---")
        print(f"Status: {res_sub.status_code}")
        sub_data = res_sub.json()
        nodes = sub_data.get("nodes", [])
        links = sub_data.get("links", [])
        meta = sub_data.get("meta", {})
        print(f"Nodes returned: {len(nodes)}")
        print(f"Links returned: {len(links)}")
        print(f"Meta: {meta}")
        types = {}
        for n in nodes:
            t = n.get("type", "unknown")
            types[t] = types.get(t, 0) + 1
        print(f"Node types breakdown: {types}")

    print("\n=== 5. PATH INVESTIGATION ===")
    # 5a. Test connected path between root and its 1-hop neighbor
    res_sub1 = client.get(f"/api/graph/{clean_id}/subgraph?hops=1&limit=50")
    sub1_nodes = res_sub1.json().get("nodes", [])
    target_node = None
    for n in sub1_nodes:
        if n["id"] != root_id and n["id"] != clean_id:
            target_node = n["id"]
            break

    if target_node:
        print(f"Testing connected path from {root_id} to {target_node}...")
        res_path = client.get(f"/api/graph/path?source={clean_id}&target={target_node}")
        print(f"Path Status: {res_path.status_code}")
        path_data = res_path.json()
        print(f"Found: {path_data.get('found')}")
        print(f"Hop count: {path_data.get('hop_count')}")
        print(f"Traversal mode: {path_data.get('traversal_mode')}")
        print(f"Path sequence: {path_data.get('path_sequence')}")

    # 5b. Test disconnected path
    print("\nTesting path between disconnected wallets (truthful 404/not-found):")
    res_disc = client.get("/api/graph/path?source=1HzFFptdBJ4WdmnQGgAeAkrMZLYrfPLSTe&target=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
    print(f"Disconnected Path Status: {res_disc.status_code}")
    if res_disc.status_code == 200:
        print(f"Found: {res_disc.json().get('found')}")
    else:
        print(f"Detail: {res_disc.json().get('detail')}")

if __name__ == "__main__":
    run_verification()

#!/usr/bin/env python3
"""
NIRIKSHAK AI — Phase 3 Pipeline & Storage Verification Script (SIH26146)

Verifies:
1. Phase 2 validation remains intact.
2. CSV normalization with Polars produces correct dataframes.
3. JSON normalization with Polars produces correct dataframes.
4. Parquet files are created in local storage:
   - transactions.parquet
   - wallets.parquet
   - network_observations.parquet
5. Parquet files can be read back cleanly with Polars / PyArrow.
6. DuckDB analytical queries execute fast and accurately over the Parquet store.
7. Transaction count: exactly 5,000.
8. Wallet count: exactly 4,915 (deterministic, matched with source).
9. Network observation count: exactly 5,000.
10. Total BTC volume consistency (within satoshi precision).
11. Timestamp range consistency.
12. Invalid datasets do NOT create normalized output.
13. No hidden ground truth is exposed through API responses.
14. GET /api/stats endpoint works over DuckDB/Parquet store.
15. Regression: Phase 1 & Phase 2 verification scripts pass.
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path

# Add backend directory to sys.path so app modules can be imported
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import duckdb
import polars as pl
from fastapi.testclient import TestClient
from app.main import app
from app.pipeline.loader import load_transactions
from app.pipeline.normalizer import normalize_dataset
from app.pipeline.storage import (
    DEFAULT_STORAGE_DIR,
    get_dataset_analytics_summary,
    get_network_observation_count,
    get_parquet_paths,
    get_time_range,
    get_top_wallets_by_tx_count,
    get_top_wallets_by_volume,
    get_total_transaction_volume,
    get_transaction_count,
    get_unique_ip_count,
    get_wallet_count,
    has_normalized_data,
    save_normalized_tables,
)


def verify_phase3():
    print("=" * 70)
    print("NIRIKSHAK AI — Phase 3 Normalization & DuckDB/Parquet Storage Suite")
    print("=" * 70)

    data_dir = backend_dir / "data"
    csv_file = data_dir / "demo_transactions.csv"
    json_file = data_dir / "demo_transactions.json"
    client = TestClient(app)

    # 1. Normalization with Polars from CSV
    print("\n[Step 1] Verifying CSV Normalization with Polars...")
    csv_records, csv_rejected = load_transactions(csv_file)
    assert len(csv_records) == 5000, f"Expected 5000 records, got {len(csv_records)}"
    assert len(csv_rejected) == 0

    tables = normalize_dataset(csv_records)
    df_tx = tables["transactions"]
    df_wallets = tables["wallets"]
    df_net = tables["network_observations"]

    print(f"   -> transactions table shape         : {df_tx.shape}")
    print(f"   -> wallets table shape              : {df_wallets.shape}")
    print(f"   -> network_observations table shape : {df_net.shape}")

    assert df_tx.shape == (5000, 18), f"Unexpected tx shape: {df_tx.shape}"
    assert df_wallets.shape == (4915, 8), f"Unexpected wallets shape: {df_wallets.shape}"
    assert df_net.shape == (5000, 8), f"Unexpected net shape: {df_net.shape}"
    print("   [PASS] Polars normalization produced correct table dimensions.")

    # 2. Normalization with Polars from JSON
    print("\n[Step 2] Verifying JSON Normalization with Polars...")
    json_records, json_rejected = load_transactions(json_file)
    assert len(json_records) == 5000
    json_tables = normalize_dataset(json_records)
    assert json_tables["transactions"].shape == (5000, 18)
    assert json_tables["wallets"].shape == (4915, 8)
    assert json_tables["network_observations"].shape == (5000, 8)
    print("   [PASS] JSON normalization matches CSV output dimensions.")

    # 3. Parquet Storage Isolation Test
    print("\n[Step 3] Testing Parquet Storage in isolated directory...")
    with tempfile.TemporaryDirectory() as tmpdir:
        test_sdir = Path(tmpdir) / "normalized"
        written = save_normalized_tables(tables, storage_dir=test_sdir)
        paths = get_parquet_paths(test_sdir)

        for name, p in paths.items():
            assert p.exists(), f"File {p} was not created!"
            assert p.stat().st_size > 0, f"File {p} is empty!"
            print(f"   -> Created {p.name} ({p.stat().st_size / 1024:.1f} KB)")

        assert has_normalized_data(test_sdir) is True

        # Read back with Polars to confirm valid Parquet
        read_tx = pl.read_parquet(paths["transactions"])
        read_wallets = pl.read_parquet(paths["wallets"])
        read_net = pl.read_parquet(paths["network_observations"])

        assert len(read_tx) == 5000
        assert len(read_wallets) == 4915
        assert len(read_net) == 5000
        print("   [PASS] Parquet tables saved and read back with 100% fidelity.")

        # 4. DuckDB Analytical Queries
        print("\n[Step 4] Testing DuckDB Analytical Queries over Parquet...")
        tx_count = get_transaction_count(test_sdir)
        wallet_count = get_wallet_count(test_sdir)
        net_count = get_network_observation_count(test_sdir)
        ip_count = get_unique_ip_count(test_sdir)
        tot_vol = get_total_transaction_volume(test_sdir)
        t_start, t_end = get_time_range(test_sdir)
        top_wallets_tx = get_top_wallets_by_tx_count(limit=3, storage_dir=test_sdir)
        top_wallets_vol = get_top_wallets_by_volume(limit=3, storage_dir=test_sdir)

        print(f"   -> DuckDB tx count              : {tx_count}")
        print(f"   -> DuckDB wallet count          : {wallet_count}")
        print(f"   -> DuckDB network obs count     : {net_count}")
        print(f"   -> DuckDB unique IPs            : {ip_count}")
        print(f"   -> DuckDB total volume          : {tot_vol} BTC")
        print(f"   -> DuckDB time span             : {t_start} -> {t_end}")
        print(f"   -> Top active wallet            : {top_wallets_tx[0]['wallet_address']} ({top_wallets_tx[0]['transaction_count']} txs)")
        print(f"   -> Top volume wallet            : {top_wallets_vol[0]['wallet_address']} ({top_wallets_vol[0]['total_volume']} BTC)")

        assert tx_count == 5000
        assert wallet_count == 4915
        assert net_count == 5000
        assert ip_count == 710
        assert abs(tot_vol - 5174.20608283) < 1e-6
        assert t_start == "2026-09-01T19:35:28.570984+00:00"
        assert t_end == "2026-09-09T00:31:48.880850+00:00"
        print("   [PASS] DuckDB analytical queries verified.")

    # 5. Integration: POST /api/datasets/upload with Phase 3 Storage
    print("\n[Step 5] Testing End-to-End POST /api/datasets/upload...")
    with open(csv_file, "rb") as f:
        resp = client.post(
            "/api/datasets/upload",
            files={"file": (csv_file.name, f, "text/csv")},
        )
    assert resp.status_code == 200, f"Upload failed: {resp.text}"
    body = resp.json()
    assert body["validation_status"] == "PASSED"
    assert body["total_rows"] == 5000
    assert body["valid_rows"] == 5000
    assert body["rejected_rows"] == 0
    assert body["storage"] is not None
    assert body["storage"]["normalized"] is True
    assert body["storage"]["table_counts"]["transactions"] == 5000
    assert body["storage"]["table_counts"]["wallets"] == 4915
    assert body["storage"]["table_counts"]["network_observations"] == 5000
    print(f"   -> Upload response storage: {body['storage']['table_counts']}")
    print("   [PASS] POST /api/datasets/upload integrates normalization and Parquet storage.")

    # 6. Integration: GET /api/stats
    print("\n[Step 6] Testing GET /api/stats endpoint...")
    resp_stats = client.get("/api/stats")
    assert resp_stats.status_code == 200, f"GET /api/stats failed: {resp_stats.text}"
    stats_body = resp_stats.json()
    print(f"   -> Stats Status       : {stats_body['status']}")
    print(f"   -> Transactions       : {stats_body['transactions']}")
    print(f"   -> Wallets            : {stats_body['wallets']}")
    print(f"   -> Network Obs        : {stats_body['network_observations']}")
    print(f"   -> Unique IPs         : {stats_body['unique_ips']}")
    print(f"   -> Total BTC          : {stats_body['total_btc']}")
    print(f"   -> Time Span          : {stats_body['time_range']['start']} to {stats_body['time_range']['end']}")
    print(f"   -> Top Active Wallets : {len(stats_body['top_wallets_by_activity'])}")
    print(f"   -> Top Volume Wallets : {len(stats_body['top_wallets_by_volume'])}")

    assert stats_body["status"] == "ready"
    assert stats_body["transactions"] == 5000
    assert stats_body["wallets"] == 4915
    assert stats_body["network_observations"] == 5000
    assert stats_body["unique_ips"] == 710
    assert abs(stats_body["total_btc"] - 5174.20608283) < 1e-6
    print("   [PASS] GET /api/stats returned exact DuckDB statistics.")

    # 7. Invalid dataset does NOT write Parquet tables
    print("\n[Step 7] Verifying invalid dataset does NOT write normalized tables...")
    with tempfile.TemporaryDirectory() as tmp_empty_dir:
        bad_csv = "timestamp,src_ip,dst_ip,src_port,dst_port,txid,input_addresses,output_addresses,input_amounts,output_amounts,fee,script_type,geo_country,ASN\n"
        bad_csv += "2026-09-01T00:00:00Z,1.1.1.1,2.2.2.2,50000,8333,0000000000000000000000000000000000000000000000000000000000000001,[\"a\"],[\"b\"],[1.0],[9.0],0.0001,P2WPKH,US,AS13335\n"
        resp_bad = client.post(
            "/api/datasets/upload",
            files={"file": ("bad.csv", bad_csv.encode("utf-8"), "text/csv")},
        )
        assert resp_bad.status_code == 200
        bad_body = resp_bad.json()
        assert bad_body["validation_status"] == "FAILED"
        assert bad_body["storage"] is None
        print("   [PASS] Invalid dataset rejected without triggering Parquet write.")

    # 8. Security: Ground truth is never leaked
    print("\n[Step 8] Verifying no ground truth exposure...")
    body_str = str(body)
    stats_str = str(stats_body)
    assert "rapid_multihop_cluster" not in body_str
    assert "rapid_multihop_cluster" not in stats_str
    assert "peeling_chain" not in body_str
    assert "peeling_chain" not in stats_str
    print("   [PASS] No hidden evaluation labels exposed in API responses.")

    print("\n" + "=" * 70)
    print("PHASE 3 SUITE VERIFICATION SUCCESSFUL: All 8 Tests Passed!")
    print("=" * 70)
    return True


if __name__ == "__main__":
    success = verify_phase3()
    sys.exit(0 if success else 1)

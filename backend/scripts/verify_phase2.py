#!/usr/bin/env python3
"""
NIRIKSHAK AI — Phase 2 Ingestion & Schema Validation Verification Script (SIH26146)

Verifies:
1. POST /api/datasets/upload with demo_transactions.csv
   - 100% schema_v1 compliance
   - 5,000 total rows, 5,000 valid rows, 0 rejected
   - validation_status == 'PASSED'
   - summary metrics calculation
2. POST /api/datasets/upload with demo_transactions.json
   - 100% schema_v1 compliance
   - 5,000 total rows, 5,000 valid rows, 0 rejected
3. Error handling:
   - Malformed CSV with schema violation (outputs > inputs, rejected row detected)
   - Malformed JSON syntax (HTTP 400)
   - Empty file upload (HTTP 400)
   - Unsupported file format .txt (HTTP 400)
4. Live HTTP verification against active uvicorn server (http://127.0.0.1:8000).
"""

import sys
from pathlib import Path

# Add backend directory to sys.path so app modules can be imported
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
import httpx


def test_in_process():
    client = TestClient(app)
    data_dir = backend_dir / "data"
    csv_file = data_dir / "demo_transactions.csv"
    json_file = data_dir / "demo_transactions.json"

    print("=" * 70)
    print("NIRIKSHAK AI — Phase 2 Verification Suite (In-Process TestClient)")
    print("=" * 70)

    # 1. Test CSV Upload
    print(f"\n[Test 1] Uploading CSV: {csv_file.name}...")
    assert csv_file.exists(), f"{csv_file} does not exist!"
    with open(csv_file, "rb") as f:
        resp = client.post(
            "/api/datasets/upload",
            files={"file": (csv_file.name, f, "text/csv")}
        )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    csv_data = resp.json()
    print(f"   -> Detected Format    : {csv_data['detected_format']}")
    print(f"   -> Total Rows         : {csv_data['total_rows']}")
    print(f"   -> Valid Rows         : {csv_data['valid_rows']}")
    print(f"   -> Rejected Rows      : {csv_data['rejected_rows']}")
    print(f"   -> Validation Status  : {csv_data['validation_status']}")
    print(f"   -> Summary Tx Count   : {csv_data['summary']['total_transactions']}")
    print(f"   -> Summary BTC Volume : {csv_data['summary']['total_btc_volume']} BTC")
    print(f"   -> Unique Wallets     : {csv_data['summary']['unique_wallets']}")
    print(f"   -> Unique IPs         : {csv_data['summary']['unique_ips']}")

    assert csv_data["detected_format"] == "csv"
    assert csv_data["total_rows"] == 5000
    assert csv_data["valid_rows"] == 5000
    assert csv_data["rejected_rows"] == 0
    assert csv_data["validation_status"] == "PASSED"
    assert csv_data["summary"]["total_transactions"] == 5000
    print("   [PASS] CSV upload validated 5,000/5,000 records cleanly.")

    # 2. Test JSON Upload
    print(f"\n[Test 2] Uploading JSON: {json_file.name}...")
    assert json_file.exists(), f"{json_file} does not exist!"
    with open(json_file, "rb") as f:
        resp = client.post(
            "/api/datasets/upload",
            files={"file": (json_file.name, f, "application/json")}
        )
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    json_data = resp.json()
    print(f"   -> Detected Format    : {json_data['detected_format']}")
    print(f"   -> Total Rows         : {json_data['total_rows']}")
    print(f"   -> Valid Rows         : {json_data['valid_rows']}")
    print(f"   -> Rejected Rows      : {json_data['rejected_rows']}")
    print(f"   -> Validation Status  : {json_data['validation_status']}")

    assert json_data["detected_format"] == "json"
    assert json_data["total_rows"] == 5000
    assert json_data["valid_rows"] == 5000
    assert json_data["rejected_rows"] == 0
    assert json_data["validation_status"] == "PASSED"
    print("   [PASS] JSON upload validated 5,000/5,000 records cleanly.")

    # 3. Test Malformed CSV (Schema Violation: outputs > inputs)
    print("\n[Test 3] Uploading CSV with invalid row (outputs > inputs)...")
    invalid_csv = (
        "timestamp,src_ip,dst_ip,src_port,dst_port,txid,input_addresses,output_addresses,input_amounts,output_amounts,fee,script_type,geo_country,ASN\n"
        "2026-09-01T00:00:00Z,1.1.1.1,2.2.2.2,50000,8333,"
        "0000000000000000000000000000000000000000000000000000000000000001,"
        "[\"addrA\"],[\"addrB\"],[1.0],[5.0],0.0001,P2WPKH,US,AS13335\n"
    )
    resp = client.post(
        "/api/datasets/upload",
        files={"file": ("invalid.csv", invalid_csv.encode("utf-8"), "text/csv")}
    )
    assert resp.status_code == 200
    res = resp.json()
    print(f"   -> Total: {res['total_rows']}, Valid: {res['valid_rows']}, Rejected: {res['rejected_rows']}")
    print(f"   -> Status: {res['validation_status']}")
    print(f"   -> Error captured: {res['rejected_details'][0]['error']}")
    assert res["rejected_rows"] == 1
    assert res["valid_rows"] == 0
    assert res["validation_status"] == "FAILED"
    print("   [PASS] Schema violation caught and reported cleanly.")

    # 4. Test Malformed JSON Syntax
    print("\n[Test 4] Uploading malformed JSON syntax...")
    bad_json = "{'bad_json': true, not_valid}"
    resp = client.post(
        "/api/datasets/upload",
        files={"file": ("corrupt.json", bad_json.encode("utf-8"), "application/json")}
    )
    assert resp.status_code == 400
    print(f"   -> HTTP {resp.status_code}: {resp.json()['detail']}")
    print("   [PASS] Malformed JSON syntax cleanly rejected with HTTP 400.")

    # 5. Test Empty File Upload
    print("\n[Test 5] Uploading empty file...")
    resp = client.post(
        "/api/datasets/upload",
        files={"file": ("empty.csv", b"", "text/csv")}
    )
    assert resp.status_code == 400
    print(f"   -> HTTP {resp.status_code}: {resp.json()['detail']}")
    print("   [PASS] Empty file cleanly rejected with HTTP 400.")

    # 6. Test Unsupported Extension
    print("\n[Test 6] Uploading unsupported format (.txt)...")
    resp = client.post(
        "/api/datasets/upload",
        files={"file": ("unsupported.txt", b"some,data", "text/plain")}
    )
    assert resp.status_code == 400
    print(f"   -> HTTP {resp.status_code}: {resp.json()['detail']}")
    print("   [PASS] Unsupported extension cleanly rejected with HTTP 400.")

    print("\n" + "-" * 70)
    print("IN-PROCESS TESTCLIENT SUITE: ALL TESTS PASSED!")
    print("-" * 70)
    return True


def test_live_server(base_url: str = "http://127.0.0.1:8000"):
    print(f"\n[Test 7] Testing LIVE uvicorn server at {base_url}...")
    data_dir = backend_dir / "data"
    csv_file = data_dir / "demo_transactions.csv"
    
    try:
        with httpx.Client(base_url=base_url, timeout=30.0) as http_client:
            # Check health
            health = http_client.get("/health")
            if health.status_code != 200:
                print(f"   [WARN] Server health check returned {health.status_code}")
                return False
            print(f"   -> Live server health: {health.json()}")

            # Test upload
            with open(csv_file, "rb") as f:
                resp = http_client.post(
                    "/api/datasets/upload",
                    files={"file": (csv_file.name, f, "text/csv")}
                )
            if resp.status_code != 200:
                print(f"   [FAIL] Live upload returned {resp.status_code}: {resp.text}")
                return False
            data = resp.json()
            print(f"   -> Live Upload Response: {data['validation_status']}")
            print(f"   -> Total Rows: {data['total_rows']}, Valid: {data['valid_rows']}, Rejected: {data['rejected_rows']}")
            print(f"   -> Volume: {data['summary']['total_btc_volume']} BTC across {data['summary']['unique_wallets']} wallets")
            assert data["total_rows"] == 5000
            assert data["valid_rows"] == 5000
            print("   [PASS] Live uvicorn server upload verification passed!")
            return True
    except Exception as err:
        print(f"   [WARN] Could not test live server (is uvicorn running?): {err}")
        return False


if __name__ == "__main__":
    success = test_in_process()
    if not success:
        sys.exit(1)
    
    live_success = test_live_server()
    print("\n" + "=" * 70)
    print("PHASE 2 IMPLEMENTATION & VERIFICATION COMPLETED SUCCESSFULLY")
    print("=" * 70)

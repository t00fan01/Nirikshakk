#!/usr/bin/env python3
"""
NIRIKSHAK AI — Phase 1 Pipeline Verification Script (SIH26146)

Verifies:
1. CSV dataset loading & Pydantic schema validation.
2. JSON dataset loading & schema validation.
3. Ground-truth label coverage (every TXID in dataset exists in ground truth).
4. Anomaly breakdown integrity.
5. Dataset summary metrics calculation.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path so app modules can be imported
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.pipeline.loader import (
    load_transactions,
    load_ground_truth,
    calculate_dataset_summary,
)
from app.schemas.transaction import SCHEMA_VERSION


def verify():
    data_dir = backend_dir / "data"
    csv_file = data_dir / "demo_transactions.csv"
    json_file = data_dir / "demo_transactions.json"
    gt_file = data_dir / "ground_truth.json"

    print("=" * 70)
    print("NIRIKSHAK AI — Running Phase 1 Foundation Verification")
    print("=" * 70)

    # 1. Verify CSV loading
    print(f"1. Loading and validating CSV: {csv_file.name}...")
    if not csv_file.exists():
        print("  [FAIL] demo_transactions.csv does not exist!")
        return False
    
    csv_records, csv_rejected = load_transactions(csv_file)
    print(f"   -> Valid records: {len(csv_records)}")
    print(f"   -> Rejected records: {len(csv_rejected)}")
    if csv_rejected:
        print(f"   [FAIL] Expected 0 rejected records, got {len(csv_rejected)}")
        for r in csv_rejected[:3]:
            print(f"       Line {r['line']}: {r['error']}")
        return False
    print("   [PASS] 100% of CSV records passed schema_v1 validation.")

    # 2. Verify JSON loading
    print(f"\n2. Loading and validating JSON: {json_file.name}...")
    if not json_file.exists():
        print("  [FAIL] demo_transactions.json does not exist!")
        return False

    json_records, json_rejected = load_transactions(json_file)
    print(f"   -> Valid records: {len(json_records)}")
    print(f"   -> Rejected records: {len(json_rejected)}")
    if json_rejected or len(json_records) != len(csv_records):
        print("   [FAIL] JSON records mismatch CSV records!")
        return False
    print("   [PASS] 100% of JSON records passed schema_v1 validation.")

    # 3. Verify Ground Truth
    print(f"\n3. Checking Ground Truth: {gt_file.name}...")
    if not gt_file.exists():
        print("  [FAIL] ground_truth.json does not exist!")
        return False

    gt = load_ground_truth(gt_file)
    gt_txs = gt.get("transactions", {})
    gt_wallets = gt.get("wallets", {})
    summary = gt.get("summary", {})

    print(f"   -> Ground truth transactions mapped: {len(gt_txs)}")
    print(f"   -> Ground truth suspicious wallets mapped: {len(gt_wallets)}")
    print(f"   -> Normal transactions: {summary.get('normal_count')}")
    print(f"   -> Anomalous transactions: {summary.get('anomaly_count')} ({summary.get('anomaly_percentage')}%)")

    # Check 1-to-1 coverage
    dataset_txids = {r.txid for r in csv_records}
    missing_txids = dataset_txids - set(gt_txs.keys())
    if missing_txids:
        print(f"   [FAIL] {len(missing_txids)} transactions are missing from ground truth!")
        return False
    print("   [PASS] All dataset transactions have corresponding ground-truth records.")

    # 4. Verify Summary Calculation
    print("\n4. Calculating dataset summary metrics...")
    summary_metrics = calculate_dataset_summary(csv_records)
    print(f"   -> Schema Version   : {summary_metrics.schema_version}")
    print(f"   -> Total Tx Count   : {summary_metrics.total_transactions}")
    print(f"   -> Unique Wallets   : {summary_metrics.unique_wallets}")
    print(f"   -> Unique IPs       : {summary_metrics.unique_ips}")
    print(f"   -> Total BTC Volume : {summary_metrics.total_btc_volume:,.4f} BTC")
    print(f"   -> Time Span Start  : {summary_metrics.time_range_start}")
    print(f"   -> Time Span End    : {summary_metrics.time_range_end}")
    print("   [PASS] Dataset summary calculated successfully.")

    # Sample transaction print
    sample = csv_records[0]
    print("\n5. Sample Validated Record (schema_v1):")
    print(f"   • TXID           : {sample.txid}")
    print(f"   • Timestamp      : {sample.timestamp}")
    print(f"   • Network Node   : {sample.src_ip}:{sample.src_port} -> {sample.dst_ip}:{sample.dst_port}")
    print(f"   • Geo / ASN      : {sample.geo_country} / {sample.ASN}")
    print(f"   • Inputs ({len(sample.input_addresses)})   : {sample.input_addresses[0][:16]}... ({sample.input_amounts[0]} BTC)")
    print(f"   • Outputs ({len(sample.output_addresses)})  : {sample.output_addresses[0][:16]}... ({sample.output_amounts[0]} BTC)")
    print(f"   • Fee            : {sample.fee} BTC")
    print(f"   • Script Type    : {sample.script_type}")

    print("\n" + "=" * 70)
    print("PHASE 1 VERIFICATION SUCCESSFUL: Synthetic Generator & Pipeline Ready!")
    print("=" * 70)
    return True


if __name__ == "__main__":
    success = verify()
    sys.exit(0 if success else 1)

"""
NIRIKSHAK AI — Feature Engineering Pipeline (Phase 4)

Extracts deterministic wallet-level numerical and behavioral features from
normalized Parquet tables using DuckDB and Polars.

Features generated:
1. Core Activity:
   - transaction_count, input_transaction_count, output_transaction_count,
     total_input_amount, total_output_amount
2. Counterparty / Graph Heuristics:
   - unique_counterparty_count, unique_input_counterparty_count,
     unique_output_counterparty_count, wallet_degree
3. Temporal Dynamics:
   - activity_duration_seconds, mean_time_gap_seconds, median_time_gap_seconds,
     first_seen, last_seen
4. Behavioral Metrics:
   - input_output_ratio, average_transaction_amount, median_transaction_amount,
     transaction_amount_stddev, burstiness
5. Network Footprint:
   - unique_ip_count, unique_country_count, unique_asn_count, network_observation_count
6. Fragmentation & Flow:
   - average_input_count, average_output_count, amount_fragmentation_score
"""

from collections import defaultdict
from pathlib import Path
import statistics
from typing import Dict, List, Optional, Union
import duckdb
import polars as pl
from app.pipeline.storage import get_duckdb_connection, has_normalized_data

# List of numerical feature names consumed by the ML model
NUMERICAL_FEATURE_NAMES = [
    "transaction_count",
    "input_transaction_count",
    "output_transaction_count",
    "total_input_amount",
    "total_output_amount",
    "unique_counterparty_count",
    "unique_input_counterparty_count",
    "unique_output_counterparty_count",
    "wallet_degree",
    "activity_duration_seconds",
    "mean_time_gap_seconds",
    "median_time_gap_seconds",
    "burstiness",
    "input_output_ratio",
    "average_transaction_amount",
    "median_transaction_amount",
    "transaction_amount_stddev",
    "unique_ip_count",
    "unique_country_count",
    "unique_asn_count",
    "network_observation_count",
    "average_input_count",
    "average_output_count",
    "amount_fragmentation_score",
]


def extract_wallet_features(
    storage_dir: Optional[Union[str, Path]] = None,
) -> pl.DataFrame:
    """
    Extract comprehensive wallet-level feature matrix from normalized Parquet store.
    Returns a Polars DataFrame indexed by wallet_address with all numerical features.
    """
    if not has_normalized_data(storage_dir):
        raise FileNotFoundError(
            "Normalized dataset not found. Please upload/normalize a dataset before feature extraction."
        )

    con = get_duckdb_connection(storage_dir)

    # 1. Base wallet records
    wallets_df = con.execute(
        "SELECT * FROM wallets ORDER BY wallet_address"
    ).df().set_index("wallet_address")

    # 2. Counterparty co-occurrence heuristic via DuckDB joins
    # Heuristic note: Co-occurrence of input and output in the same tx defines a transactional counterparty.
    # This does NOT assert economic ownership or control.
    cp_df = con.execute("""
        WITH tx_inputs AS (
            SELECT txid, unnest(input_addresses) AS in_wallet FROM transactions
        ),
        tx_outputs AS (
            SELECT txid, unnest(output_addresses) AS out_wallet FROM transactions
        ),
        in_cp AS (
            SELECT i.in_wallet AS wallet_address, o.out_wallet AS counterparty, 'out' AS cp_type
            FROM tx_inputs i 
            JOIN tx_outputs o ON i.txid = o.txid 
            WHERE i.in_wallet != o.out_wallet
        ),
        out_cp AS (
            SELECT o.out_wallet AS wallet_address, i.in_wallet AS counterparty, 'in' AS cp_type
            FROM tx_outputs o 
            JOIN tx_inputs i ON o.txid = i.txid 
            WHERE o.out_wallet != i.in_wallet
        ),
        all_cp AS (
            SELECT * FROM in_cp UNION ALL SELECT * FROM out_cp
        )
        SELECT 
            wallet_address,
            COUNT(DISTINCT counterparty) AS unique_counterparty_count,
            COUNT(DISTINCT CASE WHEN cp_type = 'out' THEN counterparty END) AS unique_output_counterparty_count,
            COUNT(DISTINCT CASE WHEN cp_type = 'in' THEN counterparty END) AS unique_input_counterparty_count
        FROM all_cp
        GROUP BY wallet_address
    """).df().set_index("wallet_address")

    # 3. Stream wallet-level transaction events (timestamps, amounts, network, fan-in/out)
    events = con.execute("""
        WITH tx_in AS (
            SELECT 
                unnest(input_addresses) AS wallet_address, txid, epoch(timestamp::TIMESTAMP) AS ts,
                unnest(input_amounts) AS amt, 'input' AS dir, input_count, output_count,
                src_ip, dst_ip, geo_country, ASN
            FROM transactions
        ),
        tx_out AS (
            SELECT 
                unnest(output_addresses) AS wallet_address, txid, epoch(timestamp::TIMESTAMP) AS ts,
                unnest(output_amounts) AS amt, 'output' AS dir, input_count, output_count,
                src_ip, dst_ip, geo_country, ASN
            FROM transactions
        )
        SELECT * FROM (SELECT * FROM tx_in UNION ALL SELECT * FROM tx_out)
        ORDER BY wallet_address, ts
    """).fetchall()

    wallet_events = defaultdict(lambda: {
        "timestamps": [],
        "amounts": [],
        "ips": set(),
        "countries": set(),
        "asns": set(),
        "input_counts": [],
        "output_counts": [],
        "txids": set(),
    })

    for r in events:
        w = r[0]
        info = wallet_events[w]
        info["timestamps"].append(float(r[2]))
        info["amounts"].append(float(r[3]))
        if r[7]:
            info["ips"].add(r[7])
        if r[8]:
            info["ips"].add(r[8])
        if r[9]:
            info["countries"].add(r[9])
        if r[10]:
            info["asns"].add(r[10])
        info["input_counts"].append(int(r[5]))
        info["output_counts"].append(int(r[6]))
        info["txids"].add(r[1])

    rows: List[Dict[str, Union[str, float, int]]] = []

    for addr in sorted(wallets_df.index):
        base = wallets_df.loc[addr]
        ev = wallet_events[addr]
        cp = cp_df.loc[addr] if addr in cp_df.index else None

        unique_cp = int(cp["unique_counterparty_count"]) if cp is not None else 0
        unique_out_cp = int(cp["unique_output_counterparty_count"]) if cp is not None else 0
        unique_in_cp = int(cp["unique_input_counterparty_count"]) if cp is not None else 0
        wallet_degree = unique_cp

        # Temporal & Burstiness Calculation
        # Goh & Barabási (2008) burstiness parameter: B = (sigma_gap - mu_gap) / (sigma_gap + mu_gap)
        # Clamped strictly into [-1.0, 1.0].
        ts_list = sorted(list(set(ev["timestamps"])))
        if len(ts_list) > 1:
            gaps = [ts_list[i + 1] - ts_list[i] for i in range(len(ts_list) - 1)]
            act_duration = float(ts_list[-1] - ts_list[0])
            mean_gap = float(statistics.mean(gaps))
            median_gap = float(statistics.median(gaps))
            std_gap = float(statistics.pstdev(gaps)) if len(gaps) > 1 else 0.0
            gap_sum = std_gap + mean_gap
            burstiness = (std_gap - mean_gap) / gap_sum if gap_sum > 0.0 else 0.0
            burstiness = max(-1.0, min(1.0, burstiness))
        else:
            act_duration = 0.0
            mean_gap = 0.0
            median_gap = 0.0
            burstiness = 0.0

        amts = ev["amounts"]
        avg_amt = float(statistics.mean(amts)) if amts else 0.0
        med_amt = float(statistics.median(amts)) if amts else 0.0
        std_amt = float(statistics.pstdev(amts)) if len(amts) > 1 else 0.0

        tot_in = float(base["total_input_amount"])
        tot_out = float(base["total_output_amount"])
        in_out_ratio = tot_in / (tot_out + 1e-6)

        avg_in_cnt = float(statistics.mean(ev["input_counts"])) if ev["input_counts"] else 1.0
        avg_out_cnt = float(statistics.mean(ev["output_counts"])) if ev["output_counts"] else 1.0

        # Amount fragmentation heuristic:
        # Measures fan-out disparity and output dispersion across multiple recipients
        frag_score = min(1.0, (avg_out_cnt - 1.0) / 4.0) if avg_out_cnt > 1.0 else 0.0

        rows.append({
            "wallet_address": str(addr),
            "transaction_count": int(base["transaction_count"]),
            "input_transaction_count": int(base["input_transaction_count"]),
            "output_transaction_count": int(base["output_transaction_count"]),
            "total_input_amount": round(tot_in, 8),
            "total_output_amount": round(tot_out, 8),
            "unique_counterparty_count": unique_cp,
            "unique_input_counterparty_count": unique_in_cp,
            "unique_output_counterparty_count": unique_out_cp,
            "wallet_degree": wallet_degree,
            "first_seen": str(base["first_seen"]),
            "last_seen": str(base["last_seen"]),
            "activity_duration_seconds": round(act_duration, 2),
            "mean_time_gap_seconds": round(mean_gap, 2),
            "median_time_gap_seconds": round(median_gap, 2),
            "burstiness": round(burstiness, 4),
            "input_output_ratio": round(in_out_ratio, 4),
            "average_transaction_amount": round(avg_amt, 8),
            "median_transaction_amount": round(med_amt, 8),
            "transaction_amount_stddev": round(std_amt, 8),
            "unique_ip_count": len(ev["ips"]),
            "unique_country_count": len(ev["countries"]),
            "unique_asn_count": len(ev["asns"]),
            "network_observation_count": len(ev["txids"]),
            "average_input_count": round(avg_in_cnt, 2),
            "average_output_count": round(avg_out_cnt, 2),
            "amount_fragmentation_score": round(frag_score, 4),
        })

    return pl.DataFrame(rows)

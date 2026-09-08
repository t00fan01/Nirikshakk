"""
NIRIKSHAK AI — Data Normalization Pipeline (Phase 3)

Converts validated BitcoinTransactionRecord objects into three core normalized Polars DataFrames:
1. transactions: Transaction-level facts, amounts, aggregated volumes, and counts.
2. wallets: Aggregated wallet entity metrics (transactions, in/out volume, first/last seen).
3. network_observations: Network-layer broadcast observations tied to txids.
"""

from collections import defaultdict
from typing import Dict, List
import polars as pl
from app.schemas.transaction import BitcoinTransactionRecord


def normalize_transactions(records: List[BitcoinTransactionRecord]) -> pl.DataFrame:
    """
    Build normalized transactions DataFrame from validated records.
    """
    rows = []
    for r in records:
        rows.append({
            "txid": r.txid,
            "timestamp": r.timestamp,
            "fee": float(r.fee),
            "script_type": r.script_type,
            "input_addresses": r.input_addresses,
            "output_addresses": r.output_addresses,
            "input_amounts": [float(x) for x in r.input_amounts],
            "output_amounts": [float(x) for x in r.output_amounts],
            "total_input_amount": round(sum(r.input_amounts), 8),
            "total_output_amount": round(sum(r.output_amounts), 8),
            "input_count": len(r.input_addresses),
            "output_count": len(r.output_addresses),
            "src_ip": r.src_ip,
            "dst_ip": r.dst_ip,
            "src_port": int(r.src_port),
            "dst_port": int(r.dst_port),
            "geo_country": r.geo_country,
            "ASN": r.ASN,
        })

    schema = {
        "txid": pl.Utf8,
        "timestamp": pl.Utf8,
        "fee": pl.Float64,
        "script_type": pl.Utf8,
        "input_addresses": pl.List(pl.Utf8),
        "output_addresses": pl.List(pl.Utf8),
        "input_amounts": pl.List(pl.Float64),
        "output_amounts": pl.List(pl.Float64),
        "total_input_amount": pl.Float64,
        "total_output_amount": pl.Float64,
        "input_count": pl.Int64,
        "output_count": pl.Int64,
        "src_ip": pl.Utf8,
        "dst_ip": pl.Utf8,
        "src_port": pl.Int64,
        "dst_port": pl.Int64,
        "geo_country": pl.Utf8,
        "ASN": pl.Utf8,
    }
    return pl.DataFrame(rows, schema=schema)


def normalize_wallets(records: List[BitcoinTransactionRecord]) -> pl.DataFrame:
    """
    Derive wallet/address-level analytical DataFrame.
    Calculates transaction counts, in/out volumes, and observation time spans.
    """
    wallets_info = defaultdict(lambda: {
        "input_txs": set(),
        "output_txs": set(),
        "total_input_amount": 0.0,
        "total_output_amount": 0.0,
        "timestamps": [],
    })

    for r in records:
        for addr, amt in zip(r.input_addresses, r.input_amounts):
            wallets_info[addr]["input_txs"].add(r.txid)
            wallets_info[addr]["total_input_amount"] += amt
            wallets_info[addr]["timestamps"].append(r.timestamp)
        for addr, amt in zip(r.output_addresses, r.output_amounts):
            wallets_info[addr]["output_txs"].add(r.txid)
            wallets_info[addr]["total_output_amount"] += amt
            wallets_info[addr]["timestamps"].append(r.timestamp)

    wallet_rows = []
    for addr in sorted(wallets_info.keys()):
        info = wallets_info[addr]
        all_txs = info["input_txs"] | info["output_txs"]
        wallet_rows.append({
            "wallet_address": addr,
            "transaction_count": len(all_txs),
            "input_transaction_count": len(info["input_txs"]),
            "output_transaction_count": len(info["output_txs"]),
            "total_input_amount": round(info["total_input_amount"], 8),
            "total_output_amount": round(info["total_output_amount"], 8),
            "first_seen": min(info["timestamps"]),
            "last_seen": max(info["timestamps"]),
        })

    schema = {
        "wallet_address": pl.Utf8,
        "transaction_count": pl.Int64,
        "input_transaction_count": pl.Int64,
        "output_transaction_count": pl.Int64,
        "total_input_amount": pl.Float64,
        "total_output_amount": pl.Float64,
        "first_seen": pl.Utf8,
        "last_seen": pl.Utf8,
    }
    return pl.DataFrame(wallet_rows, schema=schema)


def normalize_network_observations(records: List[BitcoinTransactionRecord]) -> pl.DataFrame:
    """
    Build network-layer observations DataFrame correlated by txid.
    """
    rows = []
    for r in records:
        rows.append({
            "timestamp": r.timestamp,
            "txid": r.txid,
            "src_ip": r.src_ip,
            "dst_ip": r.dst_ip,
            "src_port": int(r.src_port),
            "dst_port": int(r.dst_port),
            "geo_country": r.geo_country,
            "ASN": r.ASN,
        })

    schema = {
        "timestamp": pl.Utf8,
        "txid": pl.Utf8,
        "src_ip": pl.Utf8,
        "dst_ip": pl.Utf8,
        "src_port": pl.Int64,
        "dst_port": pl.Int64,
        "geo_country": pl.Utf8,
        "ASN": pl.Utf8,
    }
    return pl.DataFrame(rows, schema=schema)


def normalize_dataset(records: List[BitcoinTransactionRecord]) -> Dict[str, pl.DataFrame]:
    """
    Convert validated BitcoinTransactionRecords into normalized analytical Polars DataFrames:
    - transactions
    - wallets
    - network_observations
    """
    return {
        "transactions": normalize_transactions(records),
        "wallets": normalize_wallets(records),
        "network_observations": normalize_network_observations(records),
    }

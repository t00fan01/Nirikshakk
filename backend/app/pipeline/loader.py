import csv
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple, Union
from pydantic import ValidationError

from app.schemas.transaction import (
    SCHEMA_VERSION,
    BitcoinTransactionRecord,
    DatasetSummary,
)


def parse_list_field(value: Any, item_type: type = str) -> List[Any]:
    """Safely parse list fields from CSV (which may be JSON-encoded or already lists)."""
    if isinstance(value, list):
        return [item_type(x) for x in value]
    if isinstance(value, str):
        v = value.strip()
        if (v.startswith("[") and v.endswith("]")) or (v.startswith("(") and v.endswith(")")):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [item_type(x) for x in parsed]
            except Exception:
                pass
        # Fallback: delimiter-separated (comma, semicolon, or pipe)
        for sep in [";", "|", ","]:
            if sep in v:
                return [item_type(x.strip()) for x in v.split(sep) if x.strip()]
        if v:
            return [item_type(v)]
    return []


def load_transactions_from_csv(filepath: Union[str, Path]) -> Tuple[List[BitcoinTransactionRecord], List[Dict[str, Any]]]:
    """
    Load and validate Bitcoin transaction records from a CSV file.
    Returns: (valid_records, rejected_records_info)
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Dataset file not found: {filepath}")

    valid_records: List[BitcoinTransactionRecord] = []
    rejected_records: List[Dict[str, Any]] = []

    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for line_num, row in enumerate(reader, start=2):
            try:
                raw_record = {
                    "timestamp": row.get("timestamp", "").strip(),
                    "src_ip": row.get("src_ip", "").strip(),
                    "dst_ip": row.get("dst_ip", "").strip(),
                    "src_port": int(row.get("src_port", 0)),
                    "dst_port": int(row.get("dst_port", 8333)),
                    "txid": row.get("txid", "").strip(),
                    "input_addresses": parse_list_field(row.get("input_addresses", "[]"), str),
                    "output_addresses": parse_list_field(row.get("output_addresses", "[]"), str),
                    "input_amounts": parse_list_field(row.get("input_amounts", "[]"), float),
                    "output_amounts": parse_list_field(row.get("output_amounts", "[]"), float),
                    "fee": float(row.get("fee", 0.0)),
                    "script_type": row.get("script_type", "P2WPKH").strip(),
                    "geo_country": row.get("geo_country", "US").strip(),
                    "ASN": row.get("ASN", "").strip(),
                }
                record = BitcoinTransactionRecord.model_validate(raw_record)
                valid_records.append(record)
            except (ValidationError, ValueError, TypeError) as err:
                rejected_records.append({
                    "line": line_num,
                    "txid": row.get("txid", f"unknown_line_{line_num}"),
                    "error": str(err),
                })

    return valid_records, rejected_records


def load_transactions_from_json(filepath: Union[str, Path]) -> Tuple[List[BitcoinTransactionRecord], List[Dict[str, Any]]]:
    """
    Load and validate Bitcoin transaction records from a JSON file.
    Accepts either a JSON array of records or a dict with a 'transactions' key.
    """
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Dataset file not found: {filepath}")

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    raw_list = data if isinstance(data, list) else data.get("transactions", [])
    valid_records: List[BitcoinTransactionRecord] = []
    rejected_records: List[Dict[str, Any]] = []

    for index, item in enumerate(raw_list):
        try:
            record = BitcoinTransactionRecord.model_validate(item)
            valid_records.append(record)
        except ValidationError as err:
            rejected_records.append({
                "index": index,
                "txid": item.get("txid", f"unknown_index_{index}"),
                "error": str(err),
            })

    return valid_records, rejected_records


def load_transactions(filepath: Union[str, Path]) -> Tuple[List[BitcoinTransactionRecord], List[Dict[str, Any]]]:
    """Generic dataset loader supporting both .csv and .json formats."""
    path = Path(filepath)
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return load_transactions_from_csv(path)
    elif suffix == ".json":
        return load_transactions_from_json(path)
    else:
        raise ValueError(f"Unsupported file format '{suffix}'. Supported: .csv, .json")


def load_ground_truth(filepath: Union[str, Path]) -> Dict[str, Any]:
    """Load hidden ground-truth file for offline model evaluation."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Ground truth file not found: {filepath}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def calculate_dataset_summary(records: List[BitcoinTransactionRecord]) -> DatasetSummary:
    """Compute high-level summary metrics from a list of validated records."""
    if not records:
        return DatasetSummary(
            schema_version=SCHEMA_VERSION,
            total_transactions=0,
            unique_wallets=0,
            unique_ips=0,
            total_btc_volume=0.0,
            time_range_start="N/A",
            time_range_end="N/A",
        )

    wallets = set()
    ips = set()
    total_volume = 0.0
    timestamps = []

    for r in records:
        wallets.update(r.input_addresses)
        wallets.update(r.output_addresses)
        ips.add(r.src_ip)
        ips.add(r.dst_ip)
        total_volume += sum(r.output_amounts)
        timestamps.append(r.timestamp)

    timestamps.sort()

    return DatasetSummary(
        schema_version=SCHEMA_VERSION,
        total_transactions=len(records),
        unique_wallets=len(wallets),
        unique_ips=len(ips),
        total_btc_volume=round(total_volume, 8),
        time_range_start=timestamps[0],
        time_range_end=timestamps[-1],
    )

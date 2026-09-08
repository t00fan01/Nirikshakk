"""
NIRIKSHAK AI — Local Analytical Storage & DuckDB Engine (Phase 3)

Manages local Parquet storage and provides DuckDB analytical query access
over the normalized analytical tables:
- transactions.parquet
- wallets.parquet
- network_observations.parquet
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import duckdb
import polars as pl

# Path to normalized storage directory inside backend/data/normalized
DEFAULT_STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "normalized"


def get_storage_dir(custom_dir: Optional[Union[str, Path]] = None) -> Path:
    """Return storage directory Path, creating it if it does not exist."""
    target_dir = Path(custom_dir) if custom_dir else DEFAULT_STORAGE_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir


def get_parquet_paths(storage_dir: Optional[Union[str, Path]] = None) -> Dict[str, Path]:
    """Get file paths for all three core analytical Parquet tables."""
    sdir = get_storage_dir(storage_dir)
    return {
        "transactions": sdir / "transactions.parquet",
        "wallets": sdir / "wallets.parquet",
        "network_observations": sdir / "network_observations.parquet",
    }


def save_normalized_tables(
    tables: Dict[str, pl.DataFrame],
    storage_dir: Optional[Union[str, Path]] = None,
) -> Dict[str, str]:
    """
    Save normalized Polars DataFrames as Parquet files in local storage.
    Overwrites previous version cleanly.
    """
    paths = get_parquet_paths(storage_dir)
    written = {}
    for table_name, df in tables.items():
        if table_name in paths:
            target_path = paths[table_name]
            df.write_parquet(target_path, compression="zstd")
            written[table_name] = str(target_path)
    return written


def has_normalized_data(storage_dir: Optional[Union[str, Path]] = None) -> bool:
    """Check if all required Parquet tables exist on disk and have content."""
    paths = get_parquet_paths(storage_dir)
    for p in paths.values():
        if not p.exists() or p.stat().st_size == 0:
            return False
    return True


def get_duckdb_connection(storage_dir: Optional[Union[str, Path]] = None) -> duckdb.DuckDBPyConnection:
    """
    Create an in-memory DuckDB connection with views pointing directly
    to the local Parquet files.
    """
    if not has_normalized_data(storage_dir):
        raise FileNotFoundError(
            f"Normalized Parquet files not found in {get_storage_dir(storage_dir)}. "
            "Please upload or normalize a dataset first."
        )

    paths = get_parquet_paths(storage_dir)
    con = duckdb.connect(":memory:")
    con.execute(f"CREATE VIEW transactions AS SELECT * FROM '{paths['transactions']}'")
    con.execute(f"CREATE VIEW wallets AS SELECT * FROM '{paths['wallets']}'")
    con.execute(f"CREATE VIEW network_observations AS SELECT * FROM '{paths['network_observations']}'")
    return con


def get_transaction_count(storage_dir: Optional[Union[str, Path]] = None) -> int:
    con = get_duckdb_connection(storage_dir)
    res = con.execute("SELECT COUNT(*) FROM transactions").fetchone()
    return int(res[0]) if res else 0


def get_wallet_count(storage_dir: Optional[Union[str, Path]] = None) -> int:
    con = get_duckdb_connection(storage_dir)
    res = con.execute("SELECT COUNT(*) FROM wallets").fetchone()
    return int(res[0]) if res else 0


def get_network_observation_count(storage_dir: Optional[Union[str, Path]] = None) -> int:
    con = get_duckdb_connection(storage_dir)
    res = con.execute("SELECT COUNT(*) FROM network_observations").fetchone()
    return int(res[0]) if res else 0


def get_unique_ip_count(storage_dir: Optional[Union[str, Path]] = None) -> int:
    con = get_duckdb_connection(storage_dir)
    res = con.execute("""
        SELECT COUNT(DISTINCT ip) FROM (
            SELECT src_ip AS ip FROM network_observations
            UNION
            SELECT dst_ip AS ip FROM network_observations
        )
    """).fetchone()
    return int(res[0]) if res else 0


def get_total_transaction_volume(storage_dir: Optional[Union[str, Path]] = None) -> float:
    con = get_duckdb_connection(storage_dir)
    res = con.execute("SELECT ROUND(SUM(total_output_amount), 8) FROM transactions").fetchone()
    return float(res[0]) if res and res[0] is not None else 0.0


def get_time_range(storage_dir: Optional[Union[str, Path]] = None) -> Tuple[Optional[str], Optional[str]]:
    con = get_duckdb_connection(storage_dir)
    res = con.execute("SELECT MIN(timestamp), MAX(timestamp) FROM transactions").fetchone()
    if res and res[0] is not None and res[1] is not None:
        return str(res[0]), str(res[1])
    return None, None


def get_top_wallets_by_tx_count(
    limit: int = 10,
    storage_dir: Optional[Union[str, Path]] = None,
) -> List[Dict[str, Any]]:
    con = get_duckdb_connection(storage_dir)
    df = con.execute(f"""
        SELECT 
            wallet_address, 
            transaction_count, 
            input_transaction_count, 
            output_transaction_count,
            total_input_amount,
            total_output_amount
        FROM wallets 
        ORDER BY transaction_count DESC, total_output_amount DESC 
        LIMIT {limit}
    """).fetch_df()
    return df.to_dict(orient="records")


def get_top_wallets_by_volume(
    limit: int = 10,
    storage_dir: Optional[Union[str, Path]] = None,
) -> List[Dict[str, Any]]:
    con = get_duckdb_connection(storage_dir)
    df = con.execute(f"""
        SELECT 
            wallet_address, 
            transaction_count, 
            total_input_amount,
            total_output_amount,
            ROUND(total_input_amount + total_output_amount, 8) as total_volume
        FROM wallets 
        ORDER BY (total_input_amount + total_output_amount) DESC 
        LIMIT {limit}
    """).fetch_df()
    return df.to_dict(orient="records")


def get_dataset_analytics_summary(
    storage_dir: Optional[Union[str, Path]] = None,
) -> Dict[str, Any]:
    """
    High-level analytics summary calculated via DuckDB queries over the Parquet store.
    """
    if not has_normalized_data(storage_dir):
        return {
            "status": "no_data",
            "message": "No normalized dataset available. Please upload a dataset first.",
            "transactions": 0,
            "wallets": 0,
            "network_observations": 0,
            "unique_ips": 0,
            "total_btc": 0.0,
            "time_range": {"start": None, "end": None},
            "top_wallets_by_activity": [],
            "top_wallets_by_volume": [],
        }

    t_start, t_end = get_time_range(storage_dir)
    return {
        "status": "ready",
        "transactions": get_transaction_count(storage_dir),
        "wallets": get_wallet_count(storage_dir),
        "network_observations": get_network_observation_count(storage_dir),
        "unique_ips": get_unique_ip_count(storage_dir),
        "total_btc": get_total_transaction_volume(storage_dir),
        "time_range": {
            "start": t_start,
            "end": t_end,
        },
        "top_wallets_by_activity": get_top_wallets_by_tx_count(limit=5, storage_dir=storage_dir),
        "top_wallets_by_volume": get_top_wallets_by_volume(limit=5, storage_dir=storage_dir),
    }

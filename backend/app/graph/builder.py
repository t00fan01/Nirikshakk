"""
NIRIKSHAK AI — Deterministic Investigation Graph Builder (Phase 5)

Constructs a multi-layer NetworkX directed graph from normalized analytical tables:
- Wallets: Address nodes with volume, activity, and Phase 4 risk/anomaly scores.
- Transactions: UTXO transaction nodes.
- Network Observations: IP, ASN, and Country observation nodes.
- Edges: input, output, counterparty heuristic, and network_observation relationships.
"""

from collections import defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import pickle
from typing import Any, Dict, List, Optional, Set, Tuple, Union
import duckdb
import networkx as nx
import polars as pl

from app.pipeline.storage import (
    DEFAULT_STORAGE_DIR,
    get_parquet_paths,
    get_storage_dir,
    has_normalized_data,
)

DEFAULT_ANALYSIS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "analysis"


def get_analysis_dir(custom_dir: Optional[Union[str, Path]] = None) -> Path:
    """Return analysis directory Path."""
    return Path(custom_dir) if custom_dir else DEFAULT_ANALYSIS_DIR


def has_analysis_data(analysis_dir: Optional[Union[str, Path]] = None) -> bool:
    """Check if compiled Phase 4 analysis results exist on disk."""
    adir = get_analysis_dir(analysis_dir)
    leads_path = adir / "investigative_leads.parquet"
    summary_path = adir / "analysis_summary.json"
    return leads_path.exists() and leads_path.stat().st_size > 0 and summary_path.exists()

DEFAULT_GRAPH_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "graph"

# In-memory singleton cache to prevent rebuilding/reloading graph on every API call
_MEMORY_GRAPH_CACHE: Optional[nx.DiGraph] = None
_MEMORY_STATS_CACHE: Optional[Dict[str, Any]] = None


def invalidate_graph_cache() -> None:
    """Clear in-memory cached graph and stats singletons to force fresh reload/rebuild."""
    global _MEMORY_GRAPH_CACHE, _MEMORY_STATS_CACHE
    _MEMORY_GRAPH_CACHE = None
    _MEMORY_STATS_CACHE = None


def get_graph_dir(custom_dir: Optional[Union[str, Path]] = None) -> Path:
    """Return graph directory Path, creating it if it does not exist."""
    target_dir = Path(custom_dir) if custom_dir else DEFAULT_GRAPH_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir


def get_graph_storage_paths(graph_dir: Optional[Union[str, Path]] = None) -> Dict[str, Path]:
    """Return paths to serialized graph representations and metadata."""
    gdir = get_graph_dir(graph_dir)
    return {
        "pickle": gdir / "bitcoin_graph.pickle",
        "stats": gdir / "graph_stats.json",
        "graphml": gdir / "bitcoin_graph.graphml",
    }


def has_graph_data(graph_dir: Optional[Union[str, Path]] = None) -> bool:
    """Check if compiled graph exists on disk."""
    paths = get_graph_storage_paths(graph_dir)
    return paths["pickle"].exists() and paths["stats"].exists() and paths["pickle"].stat().st_size > 0


def build_investigation_graph(
    storage_dir: Optional[Union[str, Path]] = None,
    analysis_dir: Optional[Union[str, Path]] = None,
    graph_dir: Optional[Union[str, Path]] = None,
    force_rebuild: bool = False,
) -> Tuple[nx.DiGraph, Dict[str, Any]]:
    """
    Build the multi-layer Bitcoin investigation graph deterministically
    from local Parquet tables and optional Phase 4 ML analysis.
    """
    global _MEMORY_GRAPH_CACHE, _MEMORY_STATS_CACHE

    if not force_rebuild and _MEMORY_GRAPH_CACHE is not None and _MEMORY_STATS_CACHE is not None:
        return _MEMORY_GRAPH_CACHE, _MEMORY_STATS_CACHE

    if not has_normalized_data(storage_dir):
        raise FileNotFoundError(
            "Normalized dataset not found. Please upload or normalize data before building the graph."
        )

    paths_norm = get_parquet_paths(storage_dir)
    df_txs = pl.read_parquet(paths_norm["transactions"])
    df_wallets = pl.read_parquet(paths_norm["wallets"])
    df_net = pl.read_parquet(paths_norm["network_observations"])

    # Load Phase 4 analysis data if present (investigative_leads.parquet)
    analysis_by_wallet: Dict[str, Dict[str, Any]] = {}
    if has_analysis_data(analysis_dir):
        try:
            leads_path = get_analysis_dir(analysis_dir) / "investigative_leads.parquet"
            df_leads = pl.read_parquet(leads_path)
            for row in df_leads.iter_rows(named=True):
                w_addr = str(row["wallet_address"])
                analysis_by_wallet[w_addr] = {
                    "risk_score": round(float(row["risk_score"]), 2),
                    "risk_level": str(row["risk_level"]),
                    "anomaly_score": round(float(row["anomaly_score"]), 4),
                    "anomaly_percentile": round(float(row["anomaly_percentile"]), 2),
                    "is_outlier": bool(row["is_outlier"]),
                    "alert_id": str(row["alert_id"]),
                    "rank": int(row["rank"]),
                }
        except Exception:
            analysis_by_wallet = {}

    G = nx.DiGraph()

    # -------------------------------------------------------------
    # 1. WALLET NODES
    # -------------------------------------------------------------
    for row in df_wallets.sort("wallet_address").iter_rows(named=True):
        addr = str(row["wallet_address"])
        node_id = f"wallet:{addr}"

        ml_info = analysis_by_wallet.get(addr, {})

        G.add_node(
            node_id,
            id=node_id,
            type="wallet",
            label=addr,
            wallet_address=addr,
            transaction_count=int(row["transaction_count"]),
            input_transaction_count=int(row["input_transaction_count"]),
            output_transaction_count=int(row["output_transaction_count"]),
            total_input_amount=round(float(row["total_input_amount"]), 8),
            total_output_amount=round(float(row["total_output_amount"]), 8),
            first_seen=str(row["first_seen"]),
            last_seen=str(row["last_seen"]),
            risk_score=ml_info.get("risk_score"),
            risk_level=ml_info.get("risk_level"),
            anomaly_score=ml_info.get("anomaly_score"),
            anomaly_percentile=ml_info.get("anomaly_percentile"),
            is_outlier=ml_info.get("is_outlier"),
            alert_id=ml_info.get("alert_id"),
            rank=ml_info.get("rank"),
        )

    # -------------------------------------------------------------
    # 2. TRANSACTION NODES & WALLET <-> TX EDGES & COUNTERPARTY EDGES
    # -------------------------------------------------------------
    seen_ips: Set[str] = set()
    seen_asns: Set[str] = set()
    seen_countries: Set[str] = set()

    for row in df_txs.sort("txid").iter_rows(named=True):
        txid = str(row["txid"])
        tx_node_id = f"tx:{txid}"

        # Transaction Node
        G.add_node(
            tx_node_id,
            id=tx_node_id,
            type="transaction",
            label=txid,
            txid=txid,
            timestamp=str(row["timestamp"]),
            fee=round(float(row["fee"]), 8),
            script_type=str(row["script_type"]),
            total_input_amount=round(float(row["total_input_amount"]), 8),
            total_output_amount=round(float(row["total_output_amount"]), 8),
            input_count=int(row["input_count"]),
            output_count=int(row["output_count"]),
        )

        in_addrs = [str(a) for a in row["input_addresses"]]
        out_addrs = [str(a) for a in row["output_addresses"]]
        in_amts = [float(amt) for amt in row["input_amounts"]]
        out_amts = [float(amt) for amt in row["output_amounts"]]

        # Wallet -> TX (input)
        for addr, amt in zip(in_addrs, in_amts):
            w_id = f"wallet:{addr}"
            if not G.has_node(w_id):
                G.add_node(w_id, id=w_id, type="wallet", label=addr, wallet_address=addr)
            G.add_edge(
                w_id,
                tx_node_id,
                type="input",
                amount=round(amt, 8),
                txid=txid,
                timestamp=str(row["timestamp"]),
            )

        # TX -> Wallet (output)
        for addr, amt in zip(out_addrs, out_amts):
            w_id = f"wallet:{addr}"
            if not G.has_node(w_id):
                G.add_node(w_id, id=w_id, type="wallet", label=addr, wallet_address=addr)
            G.add_edge(
                tx_node_id,
                w_id,
                type="output",
                amount=round(amt, 8),
                txid=txid,
                timestamp=str(row["timestamp"]),
            )

        # Wallet -> Wallet (counterparty heuristic)
        # Bounded to unique in -> out pairs within the transaction
        unique_in = sorted(set(in_addrs))
        unique_out = sorted(set(out_addrs))
        for u in unique_in:
            for v in unique_out:
                if u != v:
                    src_id = f"wallet:{u}"
                    tgt_id = f"wallet:{v}"
                    if not G.has_edge(src_id, tgt_id):
                        G.add_edge(
                            src_id,
                            tgt_id,
                            type="counterparty",
                            txid=txid,
                            timestamp=str(row["timestamp"]),
                            basis="Observed transaction input-output counterparty heuristic",
                        )

    # -------------------------------------------------------------
    # 3. NETWORK OBSERVATIONS (TX -> IP, IP -> ASN, IP -> Country)
    # -------------------------------------------------------------
    for row in df_net.sort(["txid", "timestamp"]).iter_rows(named=True):
        txid = str(row["txid"])
        tx_node_id = f"tx:{txid}"
        src_ip = str(row["src_ip"])
        dst_ip = str(row["dst_ip"])
        asn_val = str(row["ASN"])
        country_val = str(row["geo_country"])
        ts = str(row["timestamp"])

        for ip_addr, direction in [(src_ip, "src"), (dst_ip, "dst")]:
            if not ip_addr or ip_addr == "None":
                continue

            ip_node_id = f"ip:{ip_addr}"
            if ip_addr not in seen_ips:
                G.add_node(
                    ip_node_id,
                    id=ip_node_id,
                    type="ip",
                    label=ip_addr,
                    ip=ip_addr,
                    asn=asn_val,
                    country=country_val,
                )
                seen_ips.add(ip_addr)

            # TX -> IP edge
            if G.has_node(tx_node_id):
                G.add_edge(
                    tx_node_id,
                    ip_node_id,
                    type="network_observation",
                    direction=direction,
                    src_port=int(row["src_port"]),
                    dst_port=int(row["dst_port"]),
                    timestamp=ts,
                    description="Network broadcast observation associated with transaction",
                )

            # IP -> ASN node & edge
            if asn_val and asn_val != "None":
                asn_node_id = f"asn:{asn_val}"
                if asn_val not in seen_asns:
                    G.add_node(
                        asn_node_id,
                        id=asn_node_id,
                        type="asn",
                        label=asn_val,
                        asn=asn_val,
                    )
                    seen_asns.add(asn_val)

                if not G.has_edge(ip_node_id, asn_node_id):
                    G.add_edge(
                        ip_node_id,
                        asn_node_id,
                        type="network_observation",
                        relation="associated_asn",
                        description="Observed routing autonomous system",
                    )

            # IP -> Country node & edge
            if country_val and country_val != "None":
                country_node_id = f"country:{country_val}"
                if country_val not in seen_countries:
                    G.add_node(
                        country_node_id,
                        id=country_node_id,
                        type="country",
                        label=country_val,
                        country=country_val,
                    )
                    seen_countries.add(country_val)

                if not G.has_edge(ip_node_id, country_node_id):
                    G.add_edge(
                        ip_node_id,
                        country_node_id,
                        type="network_observation",
                        relation="associated_country",
                        description="Observed geolocation country",
                    )

    # -------------------------------------------------------------
    # 4. COMPUTE STRUCTURAL METRICS & SERIALIZE
    # -------------------------------------------------------------
    node_type_counts: Dict[str, int] = defaultdict(int)
    for _, data in G.nodes(data=True):
        node_type_counts[data.get("type", "unknown")] += 1

    edge_type_counts: Dict[str, int] = defaultdict(int)
    for _, _, data in G.edges(data=True):
        edge_type_counts[data.get("type", "unknown")] += 1

    total_nodes = G.number_of_nodes()
    total_edges = G.number_of_edges()
    density = round(nx.density(G), 6) if total_nodes > 1 else 0.0

    stats = {
        "status": "SUCCESS",
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "wallet_nodes": node_type_counts["wallet"],
        "transaction_nodes": node_type_counts["transaction"],
        "ip_nodes": node_type_counts["ip"],
        "asn_nodes": node_type_counts["asn"],
        "country_nodes": node_type_counts["country"],
        "entity_nodes": node_type_counts["entity"],
        "input_edges": edge_type_counts["input"],
        "output_edges": edge_type_counts["output"],
        "counterparty_edges": edge_type_counts["counterparty"],
        "network_observation_edges": edge_type_counts["network_observation"],
        "density": density,
        "is_deterministic": True,
        "built_at": datetime.now(timezone.utc).isoformat(),
        "source_dataset_records": len(df_txs),
    }

    # Save to local storage
    g_paths = get_graph_storage_paths(graph_dir)
    with open(g_paths["pickle"], "wb") as f:
        pickle.dump(G, f, protocol=pickle.HIGHEST_PROTOCOL)

    with open(g_paths["stats"], "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    # Export GraphML for open standard interop (sanitize nulls)
    try:
        clean_G = nx.DiGraph()
        for n, data in G.nodes(data=True):
            clean_data = {k: ("" if v is None else v) for k, v in data.items()}
            clean_G.add_node(n, **clean_data)
        for u, v, data in G.edges(data=True):
            clean_data = {k: ("" if val is None else val) for k, val in data.items()}
            clean_G.add_edge(u, v, **clean_data)
        nx.write_graphml(clean_G, str(g_paths["graphml"]))
    except Exception:
        pass

    _MEMORY_GRAPH_CACHE = G
    _MEMORY_STATS_CACHE = stats

    return G, stats


def load_or_build_graph(
    storage_dir: Optional[Union[str, Path]] = None,
    analysis_dir: Optional[Union[str, Path]] = None,
    graph_dir: Optional[Union[str, Path]] = None,
) -> nx.DiGraph:
    """Load cached in-memory graph, load from local disk, or build on demand."""
    global _MEMORY_GRAPH_CACHE, _MEMORY_STATS_CACHE

    if _MEMORY_GRAPH_CACHE is not None:
        return _MEMORY_GRAPH_CACHE

    paths = get_graph_storage_paths(graph_dir)
    if paths["pickle"].exists() and paths["stats"].exists():
        try:
            with open(paths["pickle"], "rb") as f:
                G = pickle.load(f)
            with open(paths["stats"], "r", encoding="utf-8") as f:
                stats = json.load(f)
            _MEMORY_GRAPH_CACHE = G
            _MEMORY_STATS_CACHE = stats
            return G
        except Exception:
            pass

    G, _ = build_investigation_graph(
        storage_dir=storage_dir,
        analysis_dir=analysis_dir,
        graph_dir=graph_dir,
        force_rebuild=True,
    )
    return G


def get_graph_stats(graph_dir: Optional[Union[str, Path]] = None) -> Dict[str, Any]:
    """Retrieve precompiled graph statistics."""
    global _MEMORY_STATS_CACHE
    if _MEMORY_STATS_CACHE is not None:
        return _MEMORY_STATS_CACHE

    paths = get_graph_storage_paths(graph_dir)
    if paths["stats"].exists():
        try:
            with open(paths["stats"], "r", encoding="utf-8") as f:
                stats = json.load(f)
            _MEMORY_STATS_CACHE = stats
            return stats
        except Exception:
            pass

    _, stats = build_investigation_graph(graph_dir=graph_dir)
    return stats

"""
NIRIKSHAK AI — Bitcoin Wallet Investigation Router (Phase 7A)

Provides a unified, explainable Bitcoin wallet investigation dossier:
- Identity and transaction volume telemetry
- AI risk score, priority tier, and Isolation Forest anomaly indicators
- Why-Flagged evidence breakdown explaining feature deviations
- Real UTXO transactions (inputs, outputs, amounts, fees, scripts)
- Associated network broadcast observations (IPs, ASNs, countries, ports)
- Graph topological neighborhood summary

Endpoint:
- GET /api/investigations/{wallet_id}
"""

import json
from typing import Any, Dict, List, Optional
import duckdb
from fastapi import APIRouter, HTTPException, Query, status

from app.ml.analyzer import get_analysis_paths, has_analysis_data
from app.pipeline.storage import get_parquet_paths, has_normalized_data
from app.schemas.investigation import (
    EvidenceItem,
    InvestigationGraphSummary,
    InvestigationNetworkObservation,
    InvestigationTransaction,
    RiskDossier,
    WalletInvestigationResponse,
    WalletSummary,
)

router = APIRouter()


@router.get(
    "/{wallet_id}",
    response_model=WalletInvestigationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get comprehensive Bitcoin wallet investigation dossier",
    description="Retrieves telemetry, risk scores, Why-Flagged evidence, UTXO transaction flow, "
                "correlated network observations, and graph neighborhood summary for a specific wallet."
)
def get_wallet_investigation(
    wallet_id: str,
    tx_limit: int = Query(50, ge=1, le=200, description="Maximum transaction records to return (ordered newest first)"),
    net_limit: int = Query(50, ge=1, le=200, description="Maximum network observations to return (ordered newest first)"),
):
    """
    Retrieve an explainable investigation dossier for the specified Bitcoin wallet address.
    """
    clean_id = wallet_id.strip()
    if clean_id.startswith("wallet:"):
        clean_id = clean_id[7:].strip()

    # Basic identifier validation
    if not clean_id or len(clean_id) < 5 or any(c in clean_id for c in [" ", "\t", "\n", ";", "'", '"', "\0"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid wallet identifier format: '{wallet_id}'."
        )

    if not has_normalized_data():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No normalized Bitcoin dataset available. Ingest data first."
        )

    paths = get_parquet_paths()
    wallets_path = paths["wallets"].resolve().as_posix()
    tx_path = paths["transactions"].resolve().as_posix()
    net_path = paths["network_observations"].resolve().as_posix()

    con = duckdb.connect()

    # 1. Look up wallet in normalized wallets table
    try:
        w_df = con.execute(
            f"SELECT * FROM '{wallets_path}' WHERE wallet_address = ? LIMIT 1",
            [clean_id]
        ).fetch_df()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying wallet storage: {str(e)}"
        )

    if w_df.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wallet '{clean_id}' was not found in the transaction records."
        )

    w_row = w_df.iloc[0].to_dict()
    wallet_summary = WalletSummary(
        address=clean_id,
        first_seen=str(w_row["first_seen"]) if w_row.get("first_seen") else None,
        last_seen=str(w_row["last_seen"]) if w_row.get("last_seen") else None,
        transaction_count=int(w_row.get("transaction_count", 0)),
        input_transaction_count=int(w_row.get("input_transaction_count", 0)),
        output_transaction_count=int(w_row.get("output_transaction_count", 0)),
        total_input_amount=round(float(w_row.get("total_input_amount", 0.0)), 8),
        total_output_amount=round(float(w_row.get("total_output_amount", 0.0)), 8),
    )

    # 2. Risk & Why-Flagged evidence from investigative leads
    risk_dossier: Optional[RiskDossier] = None
    evidence_items: List[EvidenceItem] = []

    if has_analysis_data():
        try:
            leads_path = get_analysis_paths()["leads"].resolve().as_posix()
            lead_df = con.execute(
                f"SELECT * FROM '{leads_path}' WHERE wallet_address = ? LIMIT 1",
                [clean_id]
            ).fetch_df()

            if not lead_df.empty:
                l_row = lead_df.iloc[0].to_dict()
                subscores = {
                    "anomaly": float(l_row.get("sub_anomaly_score", 0.0)),
                    "activity": float(l_row.get("sub_activity_score", 0.0)),
                    "network": float(l_row.get("sub_network_score", 0.0)),
                    "behavior": float(l_row.get("sub_behavior_score", 0.0)),
                }
                risk_level_val = str(l_row.get("risk_level", "LOW"))
                risk_dossier = RiskDossier(
                    score=round(float(l_row.get("risk_score", 0.0)), 2),
                    level=risk_level_val,
                    anomaly_score=round(float(l_row.get("anomaly_score", 0.0)), 4),
                    anomaly_percentile=round(float(l_row.get("anomaly_percentile", 0.0)), 2),
                    is_outlier=bool(l_row.get("is_outlier", False)),
                    subscores=subscores,
                )

                reasons_raw = json.loads(l_row.get("reasons_json", "[]")) if l_row.get("reasons_json") else []
                for r in reasons_raw:
                    cat = r.get("category", "activity")
                    if risk_level_val == "CRITICAL" and cat in ["anomaly", "network"]:
                        sev = "CRITICAL"
                    elif risk_level_val in ["CRITICAL", "HIGH"]:
                        sev = "HIGH"
                    elif risk_level_val == "MEDIUM":
                        sev = "MEDIUM"
                    else:
                        sev = "LOW"

                    evidence_items.append(EvidenceItem(
                        category=cat,
                        message=r.get("explanation", f"Deviating {cat} pattern detected."),
                        severity=sev,
                        metric=r.get("value"),
                        baseline=r.get("baseline"),
                        feature=r.get("feature"),
                    ))
        except Exception:
            # If leads table is unreadable, proceed gracefully without failing the entire dossier
            risk_dossier = None
            evidence_items = []

    # 3. Query transactions involving this wallet
    try:
        total_tx_count = int(con.execute(
            f"""
            SELECT COUNT(*) FROM '{tx_path}'
            WHERE list_contains(input_addresses, ?) OR list_contains(output_addresses, ?)
            """,
            [clean_id, clean_id]
        ).fetchone()[0])

        tx_query = f"""
            SELECT txid, timestamp, input_addresses, output_addresses, input_amounts, output_amounts,
                   fee, script_type, total_input_amount, total_output_amount
            FROM '{tx_path}'
            WHERE list_contains(input_addresses, ?) OR list_contains(output_addresses, ?)
            ORDER BY timestamp DESC
            LIMIT {tx_limit}
        """
        tx_df = con.execute(tx_query, [clean_id, clean_id]).fetch_df()

        transactions: List[InvestigationTransaction] = []
        for _, tr in tx_df.iterrows():
            in_addrs = [str(a) for a in tr["input_addresses"]] if tr["input_addresses"] is not None else []
            out_addrs = [str(a) for a in tr["output_addresses"]] if tr["output_addresses"] is not None else []
            in_amts = [round(float(a), 8) for a in tr["input_amounts"]] if tr["input_amounts"] is not None else []
            out_amts = [round(float(a), 8) for a in tr["output_amounts"]] if tr["output_amounts"] is not None else []

            transactions.append(InvestigationTransaction(
                txid=str(tr["txid"]),
                timestamp=str(tr["timestamp"]),
                input_addresses=in_addrs,
                output_addresses=out_addrs,
                input_amounts=in_amts,
                output_amounts=out_amts,
                fee=round(float(tr.get("fee", 0.0)), 8),
                script_type=str(tr.get("script_type", "unknown")),
                total_input_amount=round(float(tr["total_input_amount"]), 8) if tr.get("total_input_amount") is not None else None,
                total_output_amount=round(float(tr["total_output_amount"]), 8) if tr.get("total_output_amount") is not None else None,
                is_input=(clean_id in in_addrs),
                is_output=(clean_id in out_addrs),
            ))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying transaction records: {str(e)}"
        )

    # 4. Query correlated network observations for transactions involving this wallet
    try:
        total_net_count = int(con.execute(
            f"""
            SELECT COUNT(*) FROM '{net_path}'
            WHERE txid IN (
                SELECT txid FROM '{tx_path}'
                WHERE list_contains(input_addresses, ?) OR list_contains(output_addresses, ?)
            )
            """,
            [clean_id, clean_id]
        ).fetchone()[0])

        net_query = f"""
            SELECT txid, timestamp, src_ip, dst_ip, src_port, dst_port, geo_country, ASN
            FROM '{net_path}'
            WHERE txid IN (
                SELECT txid FROM '{tx_path}'
                WHERE list_contains(input_addresses, ?) OR list_contains(output_addresses, ?)
            )
            ORDER BY timestamp DESC
            LIMIT {net_limit}
        """
        net_df = con.execute(net_query, [clean_id, clean_id]).fetch_df()

        network_obs: List[InvestigationNetworkObservation] = []
        for _, nr in net_df.iterrows():
            network_obs.append(InvestigationNetworkObservation(
                txid=str(nr["txid"]),
                timestamp=str(nr["timestamp"]),
                src_ip=str(nr["src_ip"]),
                dst_ip=str(nr["dst_ip"]),
                src_port=int(nr["src_port"]),
                dst_port=int(nr["dst_port"]),
                geo_country=str(nr["geo_country"]),
                asn=str(nr["ASN"]),
            ))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying network telemetry: {str(e)}"
        )

    # 5. Graph topology summary
    try:
        from app.graph.builder import load_or_build_graph
        graph = load_or_build_graph()
        node_id = f"wallet:{clean_id}"

        if graph.has_node(node_id):
            undirected = graph.to_undirected(as_view=True)
            neighbors = list(undirected.neighbors(node_id))
            direct_neighbor_count = len(neighbors)
            tx_nodes = [n for n in neighbors if n.startswith("tx:")]

            ip_nodes = set()
            asn_nodes = set()
            country_nodes = set()
            for tx in tx_nodes:
                for tx_nbr in undirected.neighbors(tx):
                    if tx_nbr.startswith("ip:"):
                        ip_nodes.add(tx_nbr)
                        for ip_nbr in undirected.neighbors(tx_nbr):
                            if ip_nbr.startswith("asn:"):
                                asn_nodes.add(ip_nbr)
                            elif ip_nbr.startswith("country:"):
                                country_nodes.add(ip_nbr)

            graph_summary = InvestigationGraphSummary(
                direct_neighbor_count=direct_neighbor_count,
                transaction_count=len(tx_nodes),
                ip_count=len(ip_nodes),
                asn_count=len(asn_nodes),
                country_count=len(country_nodes),
            )
        else:
            graph_summary = InvestigationGraphSummary(
                direct_neighbor_count=wallet_summary.transaction_count,
                transaction_count=wallet_summary.transaction_count,
                ip_count=0,
                asn_count=0,
                country_count=0,
            )
    except Exception:
        # Graceful fallback to table telemetry if graph layer is uninitialized
        graph_summary = InvestigationGraphSummary(
            direct_neighbor_count=wallet_summary.transaction_count,
            transaction_count=wallet_summary.transaction_count,
            ip_count=0,
            asn_count=0,
            country_count=0,
        )

    return WalletInvestigationResponse(
        wallet=wallet_summary,
        risk=risk_dossier,
        evidence=evidence_items,
        transactions=transactions,
        network_observations=network_obs,
        graph_summary=graph_summary,
        total_transactions=total_tx_count,
        total_network_observations=total_net_count,
    )

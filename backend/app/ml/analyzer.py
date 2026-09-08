"""
NIRIKSHAK AI — Analysis Orchestration Service (Phase 4)

Orchestrates the complete ML analysis lifecycle:
1. Validates presence of normalized Parquet tables.
2. Generates comprehensive wallet feature matrix.
3. Trains unsupervised Isolation Forest and derives normalized anomaly scores.
4. Executes multi-dimensional risk engine.
5. Generates concrete evidence / Why-Flagged explanations.
6. Ranks prioritized investigative leads deterministically.
7. Persists analysis Parquet tables to backend/data/analysis/.
8. Saves serialized model artifacts and metadata to backend/models/.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Union
import polars as pl
from pydantic import BaseModel, Field

from app.ml.anomaly import (
    AnomalyModel,
    IsolationForestConfig,
    train_anomaly_model,
)
from app.ml.evidence import (
    WhyFlaggedEvidence,
    compute_dataset_baselines,
    generate_wallet_evidence,
)
from app.ml.features import extract_wallet_features
from app.ml.risk import (
    RiskThresholds,
    RiskWeights,
    compute_risk_scores,
)
from app.pipeline.storage import (
    DEFAULT_STORAGE_DIR,
    get_duckdb_connection,
    has_normalized_data,
)

DEFAULT_ANALYSIS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "analysis"


class AnalysisSummary(BaseModel):
    """Execution summary returned after running ML analysis."""
    status: str = Field(..., description="'SUCCESS' or 'FAILED'")
    analyzed_at: str
    wallets_analyzed: int
    anomalies_detected: int
    critical_risk_leads: int
    high_risk_leads: int
    medium_risk_leads: int
    low_risk_leads: int
    model_type: str = "IsolationForest"
    analysis_duration_seconds: float
    output_files: Dict[str, str]


class AnalysisStatusResponse(BaseModel):
    """Status metadata for existing analysis results on disk."""
    has_analysis: bool
    analyzed_at: Optional[str] = None
    wallets_analyzed: int = 0
    anomalies_detected: int = 0
    high_risk_leads: int = 0
    critical_risk_leads: int = 0
    model_type: Optional[str] = None


def get_analysis_dir(custom_dir: Optional[Union[str, Path]] = None) -> Path:
    target = Path(custom_dir) if custom_dir else DEFAULT_ANALYSIS_DIR
    target.mkdir(parents=True, exist_ok=True)
    return target


def get_analysis_paths(analysis_dir: Optional[Union[str, Path]] = None) -> Dict[str, Path]:
    adir = get_analysis_dir(analysis_dir)
    return {
        "features": adir / "wallet_features.parquet",
        "anomalies": adir / "wallet_anomalies.parquet",
        "leads": adir / "investigative_leads.parquet",
        "summary": adir / "analysis_summary.json",
    }


def has_analysis_data(analysis_dir: Optional[Union[str, Path]] = None) -> bool:
    paths = get_analysis_paths(analysis_dir)
    return (
        paths["leads"].exists()
        and paths["leads"].stat().st_size > 0
        and paths["summary"].exists()
    )


def run_full_analysis(
    storage_dir: Optional[Union[str, Path]] = None,
    analysis_dir: Optional[Union[str, Path]] = None,
    model_config: Optional[IsolationForestConfig] = None,
    risk_weights: Optional[RiskWeights] = None,
    risk_thresholds: Optional[RiskThresholds] = None,
) -> AnalysisSummary:
    """
    Execute end-to-end ML feature extraction, Isolation Forest anomaly scoring,
    risk ranking, evidence synthesis, and artifact persistence.
    """
    t_start = time.time()

    if not has_normalized_data(storage_dir):
        raise FileNotFoundError(
            "Normalized dataset not found. Please upload/normalize a dataset before running analysis."
        )

    # 1. Feature Engineering
    df_features = extract_wallet_features(storage_dir=storage_dir)

    # 2. Anomaly Detection via Isolation Forest
    model, df_anomalies = train_anomaly_model(df_features, config=model_config)
    model.save()

    # 3. Multi-Dimensional Risk Scoring
    df_scored = compute_risk_scores(
        df_features=df_features,
        df_anomalies=df_anomalies,
        weights=risk_weights,
        thresholds=risk_thresholds,
    )

    # 4. Evidence Generation & Lead Ranking
    baselines = compute_dataset_baselines(df_scored)

    # Sort deterministically by risk_score desc, then anomaly_score desc, then wallet_address asc
    df_sorted = df_scored.sort(["risk_score", "anomaly_score", "wallet_address"], descending=[True, True, False])

    rows = df_sorted.to_dicts()
    leads_rows: List[Dict[str, Any]] = []

    for rank_idx, r in enumerate(rows, start=1):
        w_addr = str(r["wallet_address"])
        alert_id = f"ALT-{rank_idx:04d}-{w_addr[:8]}"

        evidence = generate_wallet_evidence(r, baselines)
        reasons_json = json.dumps([res.model_dump() for res in evidence.reasons])

        leads_rows.append({
            "alert_id": alert_id,
            "rank": rank_idx,
            "wallet_address": w_addr,
            "risk_score": float(r["risk_score"]),
            "risk_level": str(r["risk_level"]),
            "anomaly_score": float(r["anomaly_score"]),
            "anomaly_percentile": float(r["anomaly_percentile"]),
            "is_outlier": bool(r["is_outlier"]),
            "sub_anomaly_score": float(r["sub_anomaly_score"]),
            "sub_activity_score": float(r["sub_activity_score"]),
            "sub_network_score": float(r["sub_network_score"]),
            "sub_behavior_score": float(r["sub_behavior_score"]),
            "transaction_count": int(r["transaction_count"]),
            "input_transaction_count": int(r["input_transaction_count"]),
            "output_transaction_count": int(r["output_transaction_count"]),
            "total_input_amount": float(r["total_input_amount"]),
            "total_output_amount": float(r["total_output_amount"]),
            "unique_counterparty_count": int(r["unique_counterparty_count"]),
            "wallet_degree": int(r["wallet_degree"]),
            "first_seen": str(r["first_seen"]),
            "last_seen": str(r["last_seen"]),
            "burstiness": float(r["burstiness"]),
            "unique_ip_count": int(r["unique_ip_count"]),
            "unique_country_count": int(r["unique_country_count"]),
            "unique_asn_count": int(r["unique_asn_count"]),
            "amount_fragmentation_score": float(r["amount_fragmentation_score"]),
            "reasons_json": reasons_json,
        })

    df_leads = pl.DataFrame(leads_rows)

    # 5. Persist Parquet Analysis Artifacts
    paths = get_analysis_paths(analysis_dir)
    df_features.write_parquet(paths["features"], compression="zstd")
    df_anomalies.write_parquet(paths["anomalies"], compression="zstd")
    df_leads.write_parquet(paths["leads"], compression="zstd")

    duration = round(time.time() - t_start, 3)
    now_iso = datetime.now(timezone.utc).isoformat()

    crit_cnt = int((df_leads["risk_level"] == "CRITICAL").sum())
    high_cnt = int((df_leads["risk_level"] == "HIGH").sum())
    med_cnt = int((df_leads["risk_level"] == "MEDIUM").sum())
    low_cnt = int((df_leads["risk_level"] == "LOW").sum())
    anom_cnt = int((df_leads["is_outlier"]).sum())

    summary = AnalysisSummary(
        status="SUCCESS",
        analyzed_at=now_iso,
        wallets_analyzed=len(df_leads),
        anomalies_detected=anom_cnt,
        critical_risk_leads=crit_cnt,
        high_risk_leads=high_cnt,
        medium_risk_leads=med_cnt,
        low_risk_leads=low_cnt,
        model_type="IsolationForest",
        analysis_duration_seconds=duration,
        output_files={k: str(v) for k, v in paths.items() if k != "summary"},
    )

    with open(paths["summary"], "w", encoding="utf-8") as f:
        json.dump(summary.model_dump(), f, indent=2)

    return summary


def get_analysis_status(analysis_dir: Optional[Union[str, Path]] = None) -> AnalysisStatusResponse:
    """Retrieve metadata describing current analysis status."""
    paths = get_analysis_paths(analysis_dir)
    if not has_analysis_data(analysis_dir):
        return AnalysisStatusResponse(has_analysis=False)

    try:
        with open(paths["summary"], "r", encoding="utf-8") as f:
            summary = json.load(f)
        return AnalysisStatusResponse(
            has_analysis=True,
            analyzed_at=summary.get("analyzed_at"),
            wallets_analyzed=summary.get("wallets_analyzed", 0),
            anomalies_detected=summary.get("anomalies_detected", 0),
            high_risk_leads=summary.get("high_risk_leads", 0),
            critical_risk_leads=summary.get("critical_risk_leads", 0),
            model_type=summary.get("model_type", "IsolationForest"),
        )
    except Exception:
        return AnalysisStatusResponse(has_analysis=False)

"""
NIRIKSHAK AI — Explainable Evidence & Why-Flagged Generator (Phase 4)

Produces concrete, data-backed human-readable explanations for prioritized
investigative leads. Directly binds numerical feature deviations to plain-language
investigator evidence.

Adheres strictly to SIH trust and legal standards:
- Never asserts criminal guilt or identity.
- Never asserts IP ownership ("network observation associated with transaction activity").
- Only generates reasons supported by empirical feature deviations.
"""

from typing import Any, Dict, List, Optional
import polars as pl
from pydantic import BaseModel, Field


class EvidenceReason(BaseModel):
    """Specific feature attribution supporting an investigative lead."""
    category: str = Field(..., description="Category: activity, temporal, network, behavior, or anomaly")
    feature: str = Field(..., description="Underlying feature name")
    value: Any = Field(..., description="Observed feature value for this wallet")
    baseline: Any = Field(..., description="Typical baseline value across the analyzed dataset")
    explanation: str = Field(..., description="Human-readable explanation for investigators")


class WhyFlaggedEvidence(BaseModel):
    """Complete structured explainability package for a prioritized wallet."""
    wallet_address: str
    risk_score: float
    risk_level: str
    anomaly_score: float
    reasons: List[EvidenceReason] = Field(default_factory=list)


def compute_dataset_baselines(df_scored: pl.DataFrame) -> Dict[str, float]:
    """Calculate mean/median baseline values across the dataset for feature comparison."""
    return {
        "avg_tx_count": float(df_scored["transaction_count"].mean() or 1.0),
        "avg_ip_count": float(df_scored["unique_ip_count"].mean() or 1.0),
        "avg_country_count": float(df_scored["unique_country_count"].mean() or 1.0),
        "avg_volume": float((df_scored["total_input_amount"] + df_scored["total_output_amount"]).mean() or 1.0),
        "avg_time_gap": float(df_scored.filter(pl.col("mean_time_gap_seconds") > 0)["mean_time_gap_seconds"].mean() or 3600.0),
        "avg_burstiness": float(df_scored["burstiness"].mean() or 0.0),
        "avg_fragmentation": float(df_scored["amount_fragmentation_score"].mean() or 0.0),
    }


def generate_wallet_evidence(
    row: Dict[str, Any],
    baselines: Dict[str, float],
) -> WhyFlaggedEvidence:
    """
    Generate structured Why-Flagged evidence for a single wallet entity based on
    deviations from dataset baselines.
    """
    reasons: List[EvidenceReason] = []
    w_addr = str(row["wallet_address"])
    risk_score = float(row.get("risk_score", 0.0))
    risk_level = str(row.get("risk_level", "LOW"))
    anomaly_score = float(row.get("anomaly_score", 0.0))

    # 1. High Activity / Volume
    tx_cnt = int(row.get("transaction_count", 1))
    avg_tx = baselines.get("avg_tx_count", 1.0)
    if tx_cnt >= max(avg_tx * 2.0, 4.0):
        reasons.append(EvidenceReason(
            category="activity",
            feature="transaction_count",
            value=tx_cnt,
            baseline=round(avg_tx, 1),
            explanation=f"Wallet participated in {tx_cnt} transactions, significantly exceeding the dataset average of {avg_tx:.1f} transactions."
        ))

    tot_vol = float(row.get("total_input_amount", 0.0)) + float(row.get("total_output_amount", 0.0))
    avg_vol = baselines.get("avg_volume", 1.0)
    if tot_vol >= max(avg_vol * 3.0, 10.0):
        reasons.append(EvidenceReason(
            category="activity",
            feature="total_volume",
            value=round(tot_vol, 4),
            baseline=round(avg_vol, 4),
            explanation=f"Observed total throughput volume of {tot_vol:,.4f} BTC substantially exceeds average entity volume of {avg_vol:,.4f} BTC."
        ))

    # 2. Network Footprint & Cross-Border Correlation
    ip_cnt = int(row.get("unique_ip_count", 1))
    avg_ip = baselines.get("avg_ip_count", 1.0)
    if ip_cnt >= 3:
        reasons.append(EvidenceReason(
            category="network",
            feature="unique_ip_count",
            value=ip_cnt,
            baseline=round(avg_ip, 1),
            explanation=f"Transaction broadcasts associated with this wallet are correlated across {ip_cnt} distinct network IP observations."
        ))

    c_cnt = int(row.get("unique_country_count", 1))
    if c_cnt >= 2:
        reasons.append(EvidenceReason(
            category="network",
            feature="unique_country_count",
            value=c_cnt,
            baseline=1.0,
            explanation=f"Network broadcast activity spans {c_cnt} distinct geographic jurisdictions/countries within a short operational window."
        ))

    # 3. Temporal Dynamics & Cadence
    mean_gap = float(row.get("mean_time_gap_seconds", 0.0))
    if tx_cnt > 1 and mean_gap > 0 and mean_gap < 600.0:
        reasons.append(EvidenceReason(
            category="temporal",
            feature="mean_time_gap_seconds",
            value=round(mean_gap, 1),
            baseline=round(baselines.get("avg_time_gap", 3600.0), 1),
            explanation=f"Rapid transaction cadence observed with an average inter-transaction gap of {mean_gap:.1f} seconds, indicative of programmatic flow."
        ))

    burst = float(row.get("burstiness", 0.0))
    if burst >= 0.35 and tx_cnt > 2:
        reasons.append(EvidenceReason(
            category="behavior",
            feature="burstiness",
            value=round(burst, 3),
            baseline=round(baselines.get("avg_burstiness", 0.0), 3),
            explanation=f"Activity shows elevated temporal burstiness (B = {burst:.2f}), indicating surge clustering rather than uniform activity."
        ))

    # 4. Amount Fragmentation / Flow Dispersion
    frag = float(row.get("amount_fragmentation_score", 0.0))
    if frag >= 0.25:
        reasons.append(EvidenceReason(
            category="behavior",
            feature="amount_fragmentation_score",
            value=round(frag, 3),
            baseline=round(baselines.get("avg_fragmentation", 0.0), 3),
            explanation=f"Transaction patterns display high fan-out dispersion (fragmentation score: {frag:.2f}), distributing values across multiple destination addresses."
        ))

    # 5. Isolation Forest Unsupervised Outlier Detection
    if anomaly_score >= 0.60:
        percentile = float(row.get("anomaly_percentile", 50.0))
        reasons.append(EvidenceReason(
            category="anomaly",
            feature="anomaly_score",
            value=round(anomaly_score, 4),
            baseline=0.50,
            explanation=f"Isolation Forest identified significant multivariate feature divergence (anomaly score: {anomaly_score:.2f}, percentile: {percentile:.1f}%)."
        ))

    # Fallback if no specific threshold triggered (e.g. moderate tier)
    if not reasons:
        reasons.append(EvidenceReason(
            category="activity",
            feature="risk_score",
            value=round(risk_score, 2),
            baseline=25.0,
            explanation=f"Entity assessed at {risk_level} risk priority ({risk_score:.1f}/100) based on cumulative multi-dimensional indicators."
        ))

    return WhyFlaggedEvidence(
        wallet_address=w_addr,
        risk_score=round(risk_score, 2),
        risk_level=risk_level,
        anomaly_score=round(anomaly_score, 4),
        reasons=reasons,
    )

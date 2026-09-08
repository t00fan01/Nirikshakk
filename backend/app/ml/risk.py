"""
NIRIKSHAK AI — Weighted Risk Scoring Engine (Phase 4)

Computes prioritized multi-dimensional risk scores (0–100) and discrete risk levels:
- anomaly_score: Outlier detection from unsupervised Isolation Forest.
- activity_score: High frequency and high total transactional volume.
- network_score: Dispersed network topology (multiple IPs, countries, ASNs).
- behavior_score: Burstiness, fragmentation, and rapid flow indicators.

IMPORTANT:
Risk score is a PRIORITIZATION score for investigative workflow, NOT a probability of guilt.
"""

from typing import Dict, List, Optional
import numpy as np
import polars as pl
from pydantic import BaseModel, Field


class RiskWeights(BaseModel):
    """Configurable weights for risk scoring dimensions. Must sum to 1.0."""
    w_anomaly: float = Field(0.40, description="Weight for Isolation Forest anomaly score")
    w_activity: float = Field(0.25, description="Weight for transaction volume & counterparty degree")
    w_network: float = Field(0.20, description="Weight for IP/country/ASN footprint")
    w_behavior: float = Field(0.15, description="Weight for burstiness and amount fragmentation")


class RiskThresholds(BaseModel):
    """Configurable cutoffs for categorized risk tiers."""
    critical: float = Field(75.0, description="Threshold for CRITICAL risk tier")
    high: float = Field(50.0, description="Threshold for HIGH risk tier")
    medium: float = Field(25.0, description="Threshold for MEDIUM risk tier")


def calculate_subscores(df_joined: pl.DataFrame) -> Dict[str, np.ndarray]:
    """
    Calculate normalized 0–100 sub-scores for activity, network, and behavior.
    """
    # 1. Activity score (0 - 100)
    tx_count = df_joined["transaction_count"].to_numpy().astype(float)
    degree = df_joined["wallet_degree"].to_numpy().astype(float)
    tot_vol = (df_joined["total_input_amount"] + df_joined["total_output_amount"]).to_numpy().astype(float)

    # Robust scaling relative to dataset medians / 95th percentiles
    p95_tx = float(np.percentile(tx_count, 95)) if len(tx_count) > 0 else 5.0
    p95_deg = float(np.percentile(degree, 95)) if len(degree) > 0 else 5.0
    p95_vol = float(np.percentile(tot_vol, 95)) if len(tot_vol) > 0 else 10.0

    score_tx = np.clip((tx_count / max(p95_tx, 1.0)) * 100.0, 0.0, 100.0)
    score_deg = np.clip((degree / max(p95_deg, 1.0)) * 100.0, 0.0, 100.0)
    score_vol = np.clip((tot_vol / max(p95_vol, 0.1)) * 100.0, 0.0, 100.0)
    activity_score = 0.45 * score_tx + 0.35 * score_deg + 0.20 * score_vol

    # 2. Network score (0 - 100)
    ips = df_joined["unique_ip_count"].to_numpy().astype(float)
    countries = df_joined["unique_country_count"].to_numpy().astype(float)
    asns = df_joined["unique_asn_count"].to_numpy().astype(float)

    p95_ips = float(np.percentile(ips, 95)) if len(ips) > 0 else 5.0
    p95_c = float(np.percentile(countries, 95)) if len(countries) > 0 else 3.0
    p95_a = float(np.percentile(asns, 95)) if len(asns) > 0 else 3.0

    score_ips = np.clip((ips / max(p95_ips, 1.0)) * 100.0, 0.0, 100.0)
    score_c = np.clip((countries / max(p95_c, 1.0)) * 100.0, 0.0, 100.0)
    score_a = np.clip((asns / max(p95_a, 1.0)) * 100.0, 0.0, 100.0)
    network_score = 0.40 * score_ips + 0.30 * score_c + 0.30 * score_a

    # 3. Behavior score (0 - 100)
    burst = df_joined["burstiness"].to_numpy().astype(float)
    frag = df_joined["amount_fragmentation_score"].to_numpy().astype(float)
    in_out = df_joined["input_output_ratio"].to_numpy().astype(float)

    # Burstiness B is in [-1, 1]. Positive burstiness indicates rapid cluster bursts.
    score_burst = np.clip(((burst + 1.0) / 2.0) * 100.0, 0.0, 100.0)
    score_frag = np.clip(frag * 100.0, 0.0, 100.0)
    # Asymmetric ratio penalty (fan-in or rapid drain)
    ratio_dev = np.abs(np.log10(np.clip(in_out, 0.01, 100.0)))
    score_ratio = np.clip((ratio_dev / 2.0) * 100.0, 0.0, 100.0)

    behavior_score = 0.40 * score_burst + 0.40 * score_frag + 0.20 * score_ratio

    # 4. Anomaly score (0 - 100)
    anomaly_raw = df_joined["anomaly_score"].to_numpy().astype(float)
    anomaly_score = np.clip(anomaly_raw * 100.0, 0.0, 100.0)

    return {
        "anomaly_score": np.round(anomaly_score, 2),
        "activity_score": np.round(activity_score, 2),
        "network_score": np.round(network_score, 2),
        "behavior_score": np.round(behavior_score, 2),
    }


def compute_risk_scores(
    df_features: pl.DataFrame,
    df_anomalies: pl.DataFrame,
    weights: Optional[RiskWeights] = None,
    thresholds: Optional[RiskThresholds] = None,
) -> pl.DataFrame:
    """
    Combine features and anomaly scores into final multi-dimensional risk scores.
    """
    w = weights if weights else RiskWeights()
    t = thresholds if thresholds else RiskThresholds()

    # Join features with anomaly outputs on wallet_address
    df_joined = df_features.join(df_anomalies, on="wallet_address", how="inner")

    sub = calculate_subscores(df_joined)

    # Weighted risk calculation
    raw_risk = (
        sub["anomaly_score"] * w.w_anomaly
        + sub["activity_score"] * w.w_activity
        + sub["network_score"] * w.w_network
        + sub["behavior_score"] * w.w_behavior
    )
    final_risk = np.clip(raw_risk, 0.0, 100.0)

    # Classify risk level
    risk_levels: List[str] = []
    for r in final_risk:
        if r >= t.critical:
            risk_levels.append("CRITICAL")
        elif r >= t.high:
            risk_levels.append("HIGH")
        elif r >= t.medium:
            risk_levels.append("MEDIUM")
        else:
            risk_levels.append("LOW")

    return df_joined.with_columns([
        pl.Series("sub_anomaly_score", sub["anomaly_score"]),
        pl.Series("sub_activity_score", sub["activity_score"]),
        pl.Series("sub_network_score", sub["network_score"]),
        pl.Series("sub_behavior_score", sub["behavior_score"]),
        pl.Series("risk_score", np.round(final_risk, 2)),
        pl.Series("risk_level", risk_levels),
    ])

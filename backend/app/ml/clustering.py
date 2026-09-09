"""
NIRIKSHAK AI — Unsupervised Behavioral Clustering Engine (Phase 9)

Implements deterministic, offline, explainable behavioral clustering of Bitcoin wallets:
- Selects 22 independent behavioral and network features (excluding redundant features).
- Applies safe log1p / bounded logarithmic transforms and RobustScaler.
- Evaluates clustering diagnostics across K in [4, 5, 6, 7, 8] (inertia, silhouette).
- Fits deterministic KMeans (K=6) with k-means++ initialization (random_state=42).
- Fits 2D PCA for visual projection coordinates.
- Computes Euclidean distances to assigned cluster centroids.
- Synthesizes evidence-safe cluster profiles and dominant differentiating traits.
- Provides a fast, deterministic cosine-similarity engine for nearest-neighbor wallet matching.
- Persists Zstandard Parquet assignments, JSON profiles, and serialized joblib model artifacts.

ABSOLUTE RULES OBSERVED:
- Never reads hidden ground-truth labels.
- Never uses suspicious/legitimate labels as clustering input.
- Never uses risk_score or anomaly_score as clustering features.
- Never infers wallet ownership or criminal intent.
- Clusters represent statistical and behavioral similarity only.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
import time
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import polars as pl
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import RobustScaler

from app.ml.features import NUMERICAL_FEATURE_NAMES
from app.schemas.clustering import (
    ClusterDetailResponse,
    ClusterProfile,
    ClusterProfilesResponse,
    ClusteringDiagnostics,
    SimilarWallet,
    SimilarWalletsResponse,
    WalletClusterAssignment,
)

# 1. Feature Selection: exclude redundant collinear dimensions
EXCLUDED_FEATURE_NAMES = [
    "wallet_degree",              # Exactly duplicates unique_counterparty_count
    "amount_fragmentation_score", # Deterministic linear function of average_output_count
]

CLUSTER_FEATURE_NAMES: List[str] = [
    f for f in NUMERICAL_FEATURE_NAMES if f not in EXCLUDED_FEATURE_NAMES
]

DEFAULT_MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"
DEFAULT_ANALYSIS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "analysis"


def get_clustering_paths(
    analysis_dir: Optional[Union[str, Path]] = None,
    models_dir: Optional[Union[str, Path]] = None,
) -> Dict[str, Path]:
    adir = Path(analysis_dir) if analysis_dir else DEFAULT_ANALYSIS_DIR
    mdir = Path(models_dir) if models_dir else DEFAULT_MODELS_DIR
    adir.mkdir(parents=True, exist_ok=True)
    mdir.mkdir(parents=True, exist_ok=True)
    return {
        "clusters": adir / "wallet_clusters.parquet",
        "profiles": adir / "cluster_profiles.json",
        "model": mdir / "kmeans_clusters.joblib",
    }


def prepare_clustering_matrix(
    df_features: pl.DataFrame,
    feature_names: Optional[List[str]] = None,
) -> Tuple[List[str], np.ndarray, List[str]]:
    """
    Extract wallet addresses and transform numerical feature matrix.
    Applies non-linear compression to handle heavy right-skewed counts and amounts safely:
    - log1p(x) for non-negative counts, amounts, and durations.
    - log10(clip(x, 0.001, 1000.0)) for the asymmetric input_output_ratio.
    - Preserves bounded burstiness in [-1.0, 1.0].
    - Safely replaces non-finite values (zero NaN, zero Inf).
    """
    cols = feature_names if feature_names else CLUSTER_FEATURE_NAMES
    addresses = df_features["wallet_address"].to_list()

    matrix_raw = df_features.select(cols).to_numpy()
    matrix_raw = np.nan_to_num(matrix_raw, nan=0.0, posinf=1e6, neginf=-1e6)

    matrix_trans = np.zeros_like(matrix_raw, dtype=np.float64)

    for j, col_name in enumerate(cols):
        col_vals = matrix_raw[:, j]
        if col_name == "burstiness":
            # Already bounded strictly within [-1.0, 1.0]
            matrix_trans[:, j] = np.clip(col_vals, -1.0, 1.0)
        elif col_name == "input_output_ratio":
            # Safe bounded logarithmic transform: handles 0 and massive values without NaN/Inf
            clipped = np.clip(col_vals, 0.001, 1000.0)
            matrix_trans[:, j] = np.log10(clipped)
        else:
            # Non-negative count/amount/time features: log1p
            matrix_trans[:, j] = np.log1p(np.clip(col_vals, 0.0, None))

    matrix_trans = np.nan_to_num(matrix_trans, nan=0.0, posinf=1e6, neginf=-1e6)
    return addresses, matrix_trans, cols


def calculate_clustering_diagnostics(
    X_scaled: np.ndarray,
    k_values: Optional[List[int]] = None,
) -> ClusteringDiagnostics:
    """
    Analytical evaluation across tested K values in [4, 5, 6, 7, 8].
    Calculates inertia and silhouette score deterministically.
    """
    if k_values is None:
        k_values = [4, 5, 6, 7, 8]

    inertias: Dict[str, float] = {}
    silhouettes: Dict[str, float] = {}

    for k in k_values:
        km = KMeans(n_clusters=k, init="k-means++", n_init=10, random_state=42).fit(X_scaled)
        inertias[str(k)] = round(float(km.inertia_), 2)
        sil = float(silhouette_score(X_scaled, km.labels_))
        silhouettes[str(k)] = round(sil, 4)

    selected_k_silhouette = silhouettes.get("6", 0.0)

    return ClusteringDiagnostics(
        k_values=k_values,
        inertias=inertias,
        silhouette_scores=silhouettes,
        selected_k=6,
        selected_k_silhouette=selected_k_silhouette,
    )


def generate_cluster_label_and_desc(
    c_means: Dict[str, float],
    g_means: Dict[str, float],
) -> Tuple[str, str]:
    """
    Derives deterministic, evidence-safe profile naming based on measured dominant features.
    Avoids speculative labels (criminal, hacker, darknet, whale, vault) and adheres strictly
    to neutral behavioral and observational terminology.
    """
    if c_means.get("average_transaction_amount", 0.0) > 15.0 or c_means.get("total_input_amount", 0.0) > 20.0:
        return (
            "High-Volume Transaction Group",
            "Entities characterized by very high transaction values and settlement throughput substantially exceeding dataset baselines."
        )
    elif c_means.get("output_transaction_count", 0.0) < 0.2 and c_means.get("total_input_amount", 0.0) > 0.0:
        return (
            "Inflow Accumulation Behavioral Group",
            "Entities displaying strong fund accumulation patterns where incoming transactions dominate with minimal observed outflows."
        )
    elif c_means.get("median_time_gap_seconds", 0.0) > 40000.0 and c_means.get("burstiness", 0.0) < -0.1:
        return (
            "Periodic Persistent Activity Group",
            "Entities displaying spaced, recurring transaction intervals across an extended active observation window."
        )
    elif c_means.get("unique_output_counterparty_count", 0.0) > 5.0 or c_means.get("unique_counterparty_count", 0.0) > 10.0:
        return (
            "High Fan-Out Behavioral Group",
            "Entities exhibiting multi-counterparty distribution and fan-out transaction structures across multiple counterparties."
        )
    elif c_means.get("average_transaction_amount", 0.0) > 2.0 and c_means.get("output_transaction_count", 0.0) >= 0.5:
        return (
            "High-Value Outflow Spending Group",
            "Entities actively dispatching above-average transaction amounts to counterparties."
        )
    else:
        return (
            "Low-Velocity Baseline Group",
            "Entities exhibiting single-event or low-frequency baseline transaction behavior."
        )


def extract_top_differentiating_features(
    c_means: Dict[str, float],
    g_means: Dict[str, float],
    cols: List[str],
    top_n: int = 3,
) -> List[str]:
    """
    Identifies the strongest measured differences between cluster centroid and global population.
    Handles input_output_ratio safely to prevent small-denominator division artifacts from
    distorting feature ranking or displaying misleading multi-million ratio numbers.
    """
    diffs = []
    for col in cols:
        cm = c_means.get(col, 0.0)
        gm = g_means.get(col, 0.0)
        if col == "input_output_ratio":
            # Compare bounded log10 values to prevent division-by-1e-6 artifact from distorting rankings
            cm_log = float(np.log10(np.clip(cm, 0.001, 1000.0)))
            gm_log = float(np.log10(np.clip(gm, 0.001, 1000.0)))
            r = cm_log - gm_log
        else:
            r = (cm - gm) / (gm + 1e-6)
        diffs.append((col, cm, gm, r))

    # Sort by absolute relative deviation from global mean
    diffs.sort(key=lambda x: abs(x[3]), reverse=True)

    formatted = []
    for col, cm, gm, r in diffs[:top_n]:
        clean_name = col.replace("_", " ").title()
        if col == "input_output_ratio":
            if cm > 10.0:
                formatted.append("Observed Inflow/Outflow Imbalance: Dominant net incoming volume")
            elif cm < 0.1:
                formatted.append("Observed Inflow/Outflow Imbalance: Dominant outbound transfers")
            else:
                formatted.append(f"Observed Inflow/Outflow Imbalance: Balanced ({cm:.2f})")
        elif abs(r) >= 1.0:
            formatted.append(f"{clean_name}: {cm:,.2f} (vs baseline {gm:,.2f}, {r:+,.1f}x)")
        else:
            pct = r * 100.0
            formatted.append(f"{clean_name}: {cm:,.2f} (vs baseline {gm:,.2f}, {pct:+,.1f}%)")

    return formatted


def run_behavioral_clustering(
    df_features: pl.DataFrame,
    df_scored: Optional[pl.DataFrame] = None,
    df_anomalies: Optional[pl.DataFrame] = None,
    analysis_dir: Optional[Union[str, Path]] = None,
    models_dir: Optional[Union[str, Path]] = None,
    n_clusters: int = 6,
    random_state: int = 42,
) -> Tuple[ClusterProfilesResponse, pl.DataFrame]:
    """
    Execute end-to-end unsupervised behavioral clustering:
    1. Preprocesses 22 independent features with RobustScaler.
    2. Runs K diagnostics (inertia, silhouette) for K in [4, 5, 6, 7, 8].
    3. Fits deterministic KMeans (K=6).
    4. Computes 2D PCA projection coordinates for visualization.
    5. Computes Euclidean centroid distances.
    6. Generates evidence-safe cluster profiles and dominant differentiating traits.
    7. Persists wallet_clusters.parquet, cluster_profiles.json, and kmeans_clusters.joblib.
    """
    t_start = time.time()
    paths = get_clustering_paths(analysis_dir, models_dir)

    # 1. Feature Preprocessing
    addresses, X_trans, cols = prepare_clustering_matrix(df_features)
    scaler = RobustScaler(quantile_range=(5.0, 95.0))
    X_scaled = scaler.fit_transform(X_trans)

    # Clean any potential non-finite remnants
    X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=1e6, neginf=-1e6)

    # 2. Analytical Diagnostics across K values
    diagnostics = calculate_clustering_diagnostics(X_scaled, k_values=[4, 5, 6, 7, 8])

    # 3. Model Training (K=6)
    kmeans = KMeans(
        n_clusters=n_clusters,
        init="k-means++",
        n_init=10,
        random_state=random_state,
    ).fit(X_scaled)

    labels = kmeans.labels_
    cluster_centers = kmeans.cluster_centers_

    # 4. PCA for 2D Visualization
    pca = PCA(n_components=2, random_state=random_state)
    pca_coords = pca.fit_transform(X_scaled)
    pca_x = pca_coords[:, 0]
    pca_y = pca_coords[:, 1]

    # 5. Centroid Distances
    centroid_distances = np.zeros(len(addresses), dtype=np.float64)
    for i in range(len(addresses)):
        assigned_c = labels[i]
        centroid_distances[i] = float(np.linalg.norm(X_scaled[i] - cluster_centers[assigned_c]))

    # 6. Global Baselines (unscaled raw feature means)
    matrix_raw = df_features.select(cols).to_numpy()
    matrix_raw = np.nan_to_num(matrix_raw, nan=0.0, posinf=1e6, neginf=-1e6)
    global_means = {name: float(np.mean(matrix_raw[:, j])) for j, name in enumerate(cols)}

    # Map addresses to downstream risk and anomaly metrics if available (strictly post-hoc!)
    risk_map: Dict[str, float] = {}
    anomaly_map: Dict[str, bool] = {}
    if df_scored is not None and "wallet_address" in df_scored.columns and "risk_score" in df_scored.columns:
        for r in df_scored.select(["wallet_address", "risk_score"]).to_dicts():
            risk_map[str(r["wallet_address"])] = float(r["risk_score"])
    if df_anomalies is not None and "wallet_address" in df_anomalies.columns and "is_outlier" in df_anomalies.columns:
        for r in df_anomalies.select(["wallet_address", "is_outlier"]).to_dicts():
            anomaly_map[str(r["wallet_address"])] = bool(r["is_outlier"])

    # 7. Cluster Profiles Synthesis
    cluster_profiles: List[ClusterProfile] = []
    cluster_label_map: Dict[int, str] = {}

    for c_id in range(n_clusters):
        c_mask = (labels == c_id)
        c_count = int(c_mask.sum())
        c_raw = matrix_raw[c_mask]
        c_dists = centroid_distances[c_mask]

        c_means = {name: float(np.mean(c_raw[:, j])) for j, name in enumerate(cols)}
        label, description = generate_cluster_label_and_desc(c_means, global_means)
        cluster_label_map[c_id] = label

        c_addrs = [addresses[i] for i in range(len(addresses)) if labels[i] == c_id]
        c_risks = [risk_map.get(addr, 0.0) for addr in c_addrs]
        c_anoms = [anomaly_map.get(addr, False) for addr in c_addrs]

        avg_risk = round(float(np.mean(c_risks)), 1) if c_risks else 0.0
        anom_rate = round(float(np.mean(c_anoms)), 4) if c_anoms else 0.0

        top_traits = extract_top_differentiating_features(c_means, global_means, cols, top_n=3)

        # Centroid summary (round unscaled mean values)
        summary_dict = {name: round(val, 4) for name, val in c_means.items()}

        profile = ClusterProfile(
            cluster_id=c_id,
            label=label,
            description=description,
            wallet_count=c_count,
            average_risk_score=avg_risk,
            anomaly_rate=anom_rate,
            centroid_distance_mean=round(float(np.mean(c_dists)), 3),
            centroid_distance_median=round(float(np.median(c_dists)), 3),
            top_differentiating_features=top_traits,
            centroid_summary=summary_dict,
        )
        cluster_profiles.append(profile)

    # 8. Construct Output DataFrame for Parquet Persistence
    wallet_cluster_labels = [cluster_label_map[labels[i]] for i in range(len(addresses))]

    df_clusters = pl.DataFrame({
        "wallet_address": addresses,
        "cluster_id": labels.astype(int),
        "cluster_label": wallet_cluster_labels,
        "distance_to_centroid": np.round(centroid_distances, 4),
        "pca_x": np.round(pca_x, 4),
        "pca_y": np.round(pca_y, 4),
    })

    # 9. Persist Artifacts
    df_clusters.write_parquet(paths["clusters"], compression="zstd")

    profiles_response = ClusterProfilesResponse(
        total_clusters=n_clusters,
        total_wallets=len(addresses),
        clustering_algorithm="KMeans",
        diagnostics=diagnostics,
        clusters=cluster_profiles,
    )

    with open(paths["profiles"], "w", encoding="utf-8") as f:
        json.dump(profiles_response.model_dump(), f, indent=2)

    # Save serialized joblib artifact for future out-of-sample prediction and similarity queries
    model_artifact = {
        "kmeans": kmeans,
        "scaler": scaler,
        "pca": pca,
        "feature_names": cols,
        "cluster_profiles": [p.model_dump() for p in cluster_profiles],
        "diagnostics": diagnostics.model_dump(),
        "fitted_at": datetime.now(timezone.utc).isoformat(),
        "wallets_clustered": len(addresses),
    }
    joblib.dump(model_artifact, paths["model"])

    return profiles_response, df_clusters


def load_cluster_assignments(
    analysis_dir: Optional[Union[str, Path]] = None,
) -> pl.DataFrame:
    """Load persisted wallet cluster assignments from Zstandard Parquet."""
    paths = get_clustering_paths(analysis_dir)
    if not paths["clusters"].exists() or paths["clusters"].stat().st_size == 0:
        raise FileNotFoundError(f"Cluster assignments not found at: {paths['clusters']}")
    return pl.read_parquet(paths["clusters"])


def load_cluster_profiles(
    analysis_dir: Optional[Union[str, Path]] = None,
) -> ClusterProfilesResponse:
    """Load persisted cluster profiles and analytical diagnostics from JSON."""
    paths = get_clustering_paths(analysis_dir)
    if not paths["profiles"].exists():
        raise FileNotFoundError(f"Cluster profiles not found at: {paths['profiles']}")
    with open(paths["profiles"], "r", encoding="utf-8") as f:
        data = json.load(f)
    return ClusterProfilesResponse(**data)


def get_wallet_cluster(
    wallet_address: str,
    analysis_dir: Optional[Union[str, Path]] = None,
) -> Optional[WalletClusterAssignment]:
    """Retrieve cluster assignment and PCA coordinates for a single wallet."""
    df_clusters = load_cluster_assignments(analysis_dir)
    wallet_row = df_clusters.filter(pl.col("wallet_address") == wallet_address)
    if len(wallet_row) == 0:
        return None
    r = wallet_row.to_dicts()[0]
    return WalletClusterAssignment(
        wallet_address=str(r["wallet_address"]),
        cluster_id=int(r["cluster_id"]),
        cluster_label=str(r["cluster_label"]),
        distance_to_centroid=float(r["distance_to_centroid"]),
        pca_x=float(r["pca_x"]),
        pca_y=float(r["pca_y"]),
    )


def find_similar_wallets(
    target_wallet: str,
    top_n: int = 5,
    analysis_dir: Optional[Union[str, Path]] = None,
    models_dir: Optional[Union[str, Path]] = None,
) -> SimilarWalletsResponse:
    """
    Find top N behaviorally similar wallets using cosine similarity on RobustScaled feature vectors.
    Strictly excludes the queried wallet itself from results.
    Does NOT use risk scores, anomaly indicators, graph distance, or ground truth.
    """
    paths = get_clustering_paths(analysis_dir, models_dir)
    features_path = (Path(analysis_dir) if analysis_dir else DEFAULT_ANALYSIS_DIR) / "wallet_features.parquet"
    clusters_path = paths["clusters"]

    if not features_path.exists() or not clusters_path.exists():
        raise FileNotFoundError("Clustering artifacts not found. Please run ML analysis first.")

    df_features = pl.read_parquet(features_path)
    df_clusters = pl.read_parquet(clusters_path)

    # Join features with cluster assignments
    df_joined = df_features.join(df_clusters.select(["wallet_address", "cluster_id", "cluster_label", "distance_to_centroid"]), on="wallet_address", how="inner")

    addresses = df_joined["wallet_address"].to_list()
    clean_target = target_wallet.strip()

    if clean_target not in addresses:
        raise ValueError(f"Wallet address '{target_wallet}' not found in clustered dataset.")

    target_idx = addresses.index(clean_target)

    # Extract and scale feature matrix
    _, X_trans, cols = prepare_clustering_matrix(df_joined)
    scaler = RobustScaler(quantile_range=(5.0, 95.0))
    X_scaled = scaler.fit_transform(X_trans)
    X_scaled = np.nan_to_num(X_scaled, nan=0.0, posinf=1e6, neginf=-1e6)

    target_vec = X_scaled[target_idx:target_idx + 1]

    # Cosine similarity across entire population
    sims = cosine_similarity(target_vec, X_scaled)[0]

    # Strictly exclude the queried target wallet
    sims[target_idx] = -2.0

    # Top N nearest neighbors
    top_indices = np.argsort(sims)[::-1][:top_n]

    target_row = df_joined.row(target_idx, named=True)
    target_cluster_id = int(target_row["cluster_id"])
    target_cluster_label = str(target_row["cluster_label"])

    similar_list: List[SimilarWallet] = []

    for idx in top_indices:
        cand_row = df_joined.row(int(idx), named=True)
        cand_addr = str(cand_row["wallet_address"])
        score = float(sims[idx])

        # Normalize cosine [-1, 1] to percent [0, 100]
        pct = max(0.0, min(100.0, round(float(score) * 100.0, 1)))

        # Derive shared behavioral traits
        shared_traits: List[str] = []
        if cand_row.get("transaction_count") == target_row.get("transaction_count"):
            shared_traits.append(f"Identical transaction count ({cand_row['transaction_count']} txs)")
        elif abs(int(cand_row.get("transaction_count", 0)) - int(target_row.get("transaction_count", 0))) <= 2:
            shared_traits.append(f"Comparable transaction frequency (~{cand_row['transaction_count']} txs)")

        cand_vol = float(cand_row.get("total_input_amount", 0.0)) + float(cand_row.get("total_output_amount", 0.0))
        targ_vol = float(target_row.get("total_input_amount", 0.0)) + float(target_row.get("total_output_amount", 0.0))
        if max(cand_vol, targ_vol) > 0 and abs(cand_vol - targ_vol) / max(cand_vol, targ_vol) < 0.3:
            shared_traits.append(f"Similar transaction volume (~{cand_vol:,.2f} BTC)")

        if cand_row.get("unique_ip_count") == target_row.get("unique_ip_count"):
            shared_traits.append(f"Identical network IP diversity ({cand_row['unique_ip_count']} IPs)")

        if not shared_traits:
            shared_traits.append(f"Shared behavioral archetype ({cand_row['cluster_label']})")

        similar_list.append(SimilarWallet(
            wallet_address=cand_addr,
            similarity_score=round(score, 4),
            similarity_percent=pct,
            cluster_id=int(cand_row["cluster_id"]),
            cluster_label=str(cand_row["cluster_label"]),
            distance_to_centroid=round(float(cand_row["distance_to_centroid"]), 4),
            shared_behavioral_traits=shared_traits[:3],
        ))

    return SimilarWalletsResponse(
        target_wallet=clean_target,
        target_cluster_id=target_cluster_id,
        target_cluster_label=target_cluster_label,
        total_candidates=len(addresses) - 1,
        returned_count=len(similar_list),
        similar_wallets=similar_list,
    )

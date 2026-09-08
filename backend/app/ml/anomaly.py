"""
NIRIKSHAK AI — Isolation Forest Anomaly Detection Engine (Phase 4)

Provides unsupervised anomaly scoring for wallet entities:
- Trains scikit-learn IsolationForest on standardized numerical features.
- Converts raw decision function into normalized anomaly score [0.0, 1.0].
- Computes anomaly percentile ranks.
- Persists and loads serialized model artifacts with comprehensive metadata.
"""

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import joblib
import numpy as np
import polars as pl
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest

from app.ml.features import NUMERICAL_FEATURE_NAMES

DEFAULT_MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"


class IsolationForestConfig(BaseModel):
    """Configuration parameters for Isolation Forest model training."""
    n_estimators: int = Field(100, description="Number of base estimators in the ensemble")
    contamination: float = Field(0.05, description="Expected proportion of outliers in the dataset")
    random_state: int = Field(42, description="Seed for deterministic reproducibility")
    n_jobs: int = Field(-1, description="Number of parallel CPU jobs (-1 = all available cores)")


def get_models_dir(custom_dir: Optional[Union[str, Path]] = None) -> Path:
    target = Path(custom_dir) if custom_dir else DEFAULT_MODELS_DIR
    target.mkdir(parents=True, exist_ok=True)
    return target


def prepare_feature_matrix(
    df_features: pl.DataFrame,
    feature_names: Optional[List[str]] = None,
) -> Tuple[List[str], np.ndarray, List[str]]:
    """
    Extract entity addresses and clean numerical feature matrix.
    Replaces any NaN or infinite values safely to prevent model distortion.
    """
    cols = feature_names if feature_names else NUMERICAL_FEATURE_NAMES
    addresses = df_features["wallet_address"].to_list()

    # Extract numerical matrix as numpy float64
    matrix = df_features.select(cols).to_numpy()

    # Replace NaN and Inf with zero and finite limits
    matrix = np.nan_to_num(matrix, nan=0.0, posinf=1e6, neginf=-1e6)

    return addresses, matrix, cols


class AnomalyModel:
    """Wrapper around trained Isolation Forest with normalization and serialization."""

    def __init__(
        self,
        model: IsolationForest,
        config: IsolationForestConfig,
        feature_names: List[str],
        score_min: float,
        score_max: float,
        trained_at: str,
        dataset_size: int,
    ):
        self.model = model
        self.config = config
        self.feature_names = feature_names
        self.score_min = score_min
        self.score_max = score_max
        self.trained_at = trained_at
        self.dataset_size = dataset_size

    def score(self, matrix: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute normalized anomaly scores [0.0, 1.0] and percentile rankings [0.0, 100.0].
        0.0 = completely consistent with dataset baseline.
        1.0 = highly unusual/deviant outlier.
        """
        raw_scores = -self.model.score_samples(matrix)

        denom = (self.score_max - self.score_min)
        if denom <= 0:
            denom = 1e-8

        normalized = (raw_scores - self.score_min) / denom
        normalized = np.clip(normalized, 0.0, 1.0)

        # Percentile rank: relative positioning within the analyzed population
        order = raw_scores.argsort()
        ranks = np.empty_like(order)
        ranks[order] = np.arange(len(raw_scores))
        percentiles = (ranks / (len(raw_scores) + 1e-8)) * 100.0
        percentiles = np.clip(percentiles, 0.0, 100.0)

        return np.round(normalized, 4), np.round(percentiles, 2)

    def save(self, models_dir: Optional[Union[str, Path]] = None) -> Tuple[Path, Path]:
        """Save joblib model and metadata JSON."""
        mdir = get_models_dir(models_dir)
        model_path = mdir / "isolation_forest.joblib"
        meta_path = mdir / "model_metadata.json"

        joblib.dump(self.model, model_path)

        metadata = {
            "model_type": "IsolationForest",
            "trained_at": self.trained_at,
            "feature_names": self.feature_names,
            "dataset_size": self.dataset_size,
            "score_min": float(self.score_min),
            "score_max": float(self.score_max),
            "parameters": {
                "n_estimators": self.config.n_estimators,
                "contamination": self.config.contamination,
                "random_state": self.config.random_state,
                "n_jobs": self.config.n_jobs,
            },
        }

        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        return model_path, meta_path

    @classmethod
    def load(cls, models_dir: Optional[Union[str, Path]] = None) -> "AnomalyModel":
        """Load persisted Isolation Forest model and metadata."""
        mdir = get_models_dir(models_dir)
        model_path = mdir / "isolation_forest.joblib"
        meta_path = mdir / "model_metadata.json"

        if not model_path.exists() or not meta_path.exists():
            raise FileNotFoundError(f"Model artifacts not found in {mdir}")

        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)

        model = joblib.load(model_path)
        params = meta.get("parameters", {})
        config = IsolationForestConfig(
            n_estimators=params.get("n_estimators", 100),
            contamination=params.get("contamination", 0.05),
            random_state=params.get("random_state", 42),
            n_jobs=params.get("n_jobs", -1),
        )

        return cls(
            model=model,
            config=config,
            feature_names=meta["feature_names"],
            score_min=meta["score_min"],
            score_max=meta["score_max"],
            trained_at=meta["trained_at"],
            dataset_size=meta["dataset_size"],
        )


def train_anomaly_model(
    df_features: pl.DataFrame,
    config: Optional[IsolationForestConfig] = None,
) -> Tuple[AnomalyModel, pl.DataFrame]:
    """
    Train Isolation Forest model on wallet features and generate anomaly scores.
    Returns:
    - AnomalyModel instance
    - pl.DataFrame containing wallet_address, anomaly_score, anomaly_percentile, is_outlier
    """
    cfg = config if config else IsolationForestConfig()
    addresses, matrix, cols = prepare_feature_matrix(df_features)

    clf = IsolationForest(
        n_estimators=cfg.n_estimators,
        contamination=cfg.contamination,
        random_state=cfg.random_state,
        n_jobs=cfg.n_jobs,
    )

    clf.fit(matrix)

    # Determine baseline min/max for normalization
    raw_scores = -clf.score_samples(matrix)
    score_min = float(np.min(raw_scores))
    score_max = float(np.max(raw_scores))

    now_iso = datetime.now(timezone.utc).isoformat()
    model_wrapper = AnomalyModel(
        model=clf,
        config=cfg,
        feature_names=cols,
        score_min=score_min,
        score_max=score_max,
        trained_at=now_iso,
        dataset_size=len(addresses),
    )

    norm_scores, percentiles = model_wrapper.score(matrix)
    predictions = clf.predict(matrix)  # -1 for anomaly, 1 for inlier
    is_outlier = [bool(p == -1) for p in predictions]

    df_anomalies = pl.DataFrame({
        "wallet_address": addresses,
        "anomaly_score": norm_scores,
        "anomaly_percentile": percentiles,
        "is_outlier": is_outlier,
    })

    return model_wrapper, df_anomalies

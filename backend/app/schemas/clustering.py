"""
NIRIKSHAK AI — Behavioral Clustering Schemas (Phase 9)

Pydantic schemas representing unsupervised wallet clusters, cluster profiles,
clustering diagnostics, and behavioral similarity responses.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ClusterProfile(BaseModel):
    """Forensic behavioral archetype profile derived from cluster centroids."""
    cluster_id: int = Field(..., description="Deterministic integer cluster index (0 to K-1)")
    label: str = Field(..., description="Evidence-safe descriptive behavioral label")
    description: str = Field(..., description="Detailed explanation of measured behavioral characteristics")
    wallet_count: int = Field(..., description="Number of wallets assigned to this cluster")
    average_risk_score: float = Field(..., description="Mean multi-dimensional risk score of member wallets")
    anomaly_rate: float = Field(..., description="Proportion of wallets flagged by Isolation Forest (0.0 to 1.0)")
    centroid_distance_mean: float = Field(..., description="Mean Euclidean distance of members to centroid")
    centroid_distance_median: float = Field(..., description="Median Euclidean distance of members to centroid")
    top_differentiating_features: List[str] = Field(..., description="Top measured features distinguishing this cluster")
    centroid_summary: Dict[str, float] = Field(..., description="Representative feature values for the cluster centroid")


class ClusteringDiagnostics(BaseModel):
    """Analytical evaluation metrics across tested K values."""
    k_values: List[int] = Field(default_factory=list)
    inertias: Dict[str, float] = Field(default_factory=dict)
    silhouette_scores: Dict[str, float] = Field(default_factory=dict)
    selected_k: int = 6
    selected_k_silhouette: float = 0.0


class ClusterProfilesResponse(BaseModel):
    """Complete collection of behavioral cluster profiles and model diagnostics."""
    total_clusters: int
    total_wallets: int
    clustering_algorithm: str = "KMeans"
    diagnostics: ClusteringDiagnostics
    clusters: List[ClusterProfile]


class WalletClusterAssignment(BaseModel):
    """Single wallet's behavioral cluster membership and spatial coordinates."""
    wallet_address: str
    cluster_id: int
    cluster_label: str
    distance_to_centroid: float
    pca_x: float
    pca_y: float


class ClusterDetailResponse(BaseModel):
    """Deep inspection of a specific cluster archetype and its member wallets."""
    cluster: ClusterProfile
    total_wallets: int
    wallets: List[WalletClusterAssignment]


class SimilarWallet(BaseModel):
    """A behaviorally similar wallet identified via cosine similarity on scaled features."""
    wallet_address: str
    similarity_score: float = Field(..., description="Cosine similarity score [-1.0, 1.0]")
    similarity_percent: float = Field(..., description="Normalized similarity percentage [0.0, 100.0]")
    cluster_id: int
    cluster_label: str
    distance_to_centroid: float
    shared_behavioral_traits: List[str] = Field(default_factory=list)


class SimilarWalletsResponse(BaseModel):
    """Ranked list of behaviorally similar wallets for investigative cross-referencing."""
    target_wallet: str
    target_cluster_id: int
    target_cluster_label: str
    total_candidates: int
    returned_count: int
    similar_wallets: List[SimilarWallet]

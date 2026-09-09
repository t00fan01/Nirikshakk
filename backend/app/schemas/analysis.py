"""
NIRIKSHAK AI — Analysis & Alert Schemas (Phase 4)

Pydantic models representing ML analysis orchestration, alert ranking,
and explainable lead inspection payloads.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.ml.evidence import EvidenceReason


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
    # Phase 9 extensions:
    clustering_enabled: bool = True
    cluster_count: int = 6
    clustered_wallets: int = 0
    silhouette_score_k6: float = 0.0
    clustering_runtime_ms: float = 0.0


class AnalysisStatusResponse(BaseModel):
    """Status metadata for existing analysis results on disk."""
    has_analysis: bool
    analyzed_at: Optional[str] = None
    wallets_analyzed: int = 0
    anomalies_detected: int = 0
    high_risk_leads: int = 0
    critical_risk_leads: int = 0
    model_type: Optional[str] = None
    cluster_count: Optional[int] = None


class AlertItem(BaseModel):
    """Concise representation of an investigative lead in the alert review queue."""
    alert_id: str = Field(..., description="Deterministic unique identifier (e.g. ALT-0001-bc1qa0fa)")
    rank: int = Field(..., description="Global priority rank within the analyzed population")
    wallet_address: str = Field(..., description="Target wallet address")
    risk_score: float = Field(..., description="Prioritization risk score (0.0 to 100.0)")
    risk_level: str = Field(..., description="Priority tier: 'CRITICAL', 'HIGH', 'MEDIUM', or 'LOW'")
    anomaly_score: float = Field(..., description="Normalized Isolation Forest anomaly score (0.0 to 1.0)")
    anomaly_percentile: float = Field(..., description="Percentile rank (0.0 to 100.0%)")
    transaction_count: int
    total_volume: float
    unique_ip_count: int
    unique_country_count: int
    primary_reason: str


class AlertsListResponse(BaseModel):
    """Paginated or filtered list of ranked investigative leads."""
    total_leads: int
    filtered_count: int
    returned_count: int
    leads: List[AlertItem]


class AlertDetailResponse(BaseModel):
    """In-depth dossier for investigating a flagged wallet lead."""
    alert_id: str
    rank: int
    wallet_address: str
    risk_score: float
    risk_level: str
    anomaly_score: float
    anomaly_percentile: float
    subscores: Dict[str, float]
    reasons: List[EvidenceReason]
    feature_metrics: Dict[str, Any]
    transaction_summary: Dict[str, Any]
    network_summary: Dict[str, Any]

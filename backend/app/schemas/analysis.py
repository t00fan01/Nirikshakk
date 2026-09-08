"""
NIRIKSHAK AI — Analysis & Alert Schemas (Phase 4)

Pydantic models representing ML analysis orchestration, alert ranking,
and explainable lead inspection payloads.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.ml.analyzer import AnalysisStatusResponse, AnalysisSummary
from app.ml.evidence import EvidenceReason


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

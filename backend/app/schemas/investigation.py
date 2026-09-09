"""
NIRIKSHAK AI — Investigation Dossier Schemas (Phase 7A)

Pydantic models representing a comprehensive, explainable Bitcoin wallet investigation dossier.
Strictly offline, self-hosted, deterministic, and grounded in real Parquet tables and ML results.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class WalletSummary(BaseModel):
    """Core summary telemetry for the investigated wallet entity."""
    address: str = Field(..., description="Bitcoin wallet address identifier")
    first_seen: Optional[str] = Field(None, description="ISO timestamp of earliest observed transaction")
    last_seen: Optional[str] = Field(None, description="ISO timestamp of most recent observed transaction")
    transaction_count: int = Field(..., description="Total transactions involving this wallet")
    input_transaction_count: int = Field(..., description="Number of transactions where wallet spent funds (input)")
    output_transaction_count: int = Field(..., description="Number of transactions where wallet received funds (output)")
    total_input_amount: float = Field(..., description="Total BTC spent as transaction input")
    total_output_amount: float = Field(..., description="Total BTC received as transaction output")


class RiskDossier(BaseModel):
    """Multi-dimensional risk scoring and Isolation Forest anomaly indicators."""
    score: float = Field(..., description="Prioritization risk score (0.0 to 100.0)")
    level: str = Field(..., description="Risk tier: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'")
    anomaly_score: float = Field(..., description="Normalized Isolation Forest anomaly score (0.0 to 1.0)")
    anomaly_percentile: float = Field(..., description="Percentile rank within analyzed population (0.0 to 100.0%)")
    is_outlier: Optional[bool] = Field(None, description="Whether Isolation Forest flagged this entity as an outlier")
    subscores: Dict[str, float] = Field(
        default_factory=dict,
        description="Sub-component scores: anomaly, activity, network, behavior (each 0.0 to 100.0)"
    )


class EvidenceItem(BaseModel):
    """Explainable reason backing the prioritized risk classification."""
    category: str = Field(..., description="Evidence category: activity, temporal, network, behavior, or anomaly")
    message: str = Field(..., description="Investigator-readable explanation of the empirical signal")
    severity: str = Field(..., description="Signal severity tier: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', or 'INFO'")
    metric: Optional[Any] = Field(None, description="Observed feature value for this wallet entity")
    baseline: Optional[Any] = Field(None, description="Typical baseline value across the analyzed dataset")
    feature: Optional[str] = Field(None, description="Underlying feature identifier")


class InvestigationTransaction(BaseModel):
    """Real UTXO Bitcoin transaction involving the investigated wallet."""
    txid: str = Field(..., description="Transaction hash identifier")
    timestamp: str = Field(..., description="Transaction broadcast / block timestamp")
    input_addresses: List[str] = Field(default_factory=list, description="List of input wallet addresses")
    output_addresses: List[str] = Field(default_factory=list, description="List of output wallet addresses")
    input_amounts: List[float] = Field(default_factory=list, description="Amounts in BTC spent from each input")
    output_amounts: List[float] = Field(default_factory=list, description="Amounts in BTC sent to each output")
    fee: float = Field(..., description="Transaction fee in BTC")
    script_type: str = Field(..., description="Observed script type (e.g., p2wpkh, p2pkh, p2sh, p2tr)")
    total_input_amount: Optional[float] = Field(None, description="Sum of input amounts in BTC")
    total_output_amount: Optional[float] = Field(None, description="Sum of output amounts in BTC")
    is_input: bool = Field(False, description="Whether the investigated wallet was a sender (input)")
    is_output: bool = Field(False, description="Whether the investigated wallet was a recipient (output)")


class InvestigationNetworkObservation(BaseModel):
    """Empirical network broadcast telemetry associated with transactions of this wallet."""
    txid: str = Field(..., description="Transaction hash associated with this network observation")
    timestamp: str = Field(..., description="Observation timestamp")
    src_ip: str = Field(..., description="Observed source IP address")
    dst_ip: str = Field(..., description="Observed destination IP address (e.g. Bitcoin peer node)")
    src_port: int = Field(..., description="Observed source port")
    dst_port: int = Field(..., description="Observed destination port")
    geo_country: str = Field(..., description="Observed geolocation country code (ISO 3166-1 alpha-2)")
    asn: str = Field(..., description="Observed Autonomous System Number (ASN)")


class InvestigationGraphSummary(BaseModel):
    """Summary topology metrics from the compiled Bitcoin investigation graph."""
    direct_neighbor_count: int = Field(..., description="Total 1-hop adjacent nodes in the graph")
    transaction_count: int = Field(..., description="Transaction nodes connected directly to this wallet")
    ip_count: int = Field(..., description="Observed IP nodes associated with transactions of this wallet")
    asn_count: int = Field(..., description="Autonomous systems associated with observed IPs")
    country_count: int = Field(..., description="Geographic countries associated with observed IPs")


class WalletInvestigationResponse(BaseModel):
    """Complete explainable investigation dossier for a Bitcoin wallet entity."""
    wallet: WalletSummary = Field(..., description="Wallet identity and activity metrics")
    risk: Optional[RiskDossier] = Field(None, description="Prioritization risk scores and anomaly indicators")
    evidence: List[EvidenceItem] = Field(default_factory=list, description="Structured Why-Flagged evidence items")
    transactions: List[InvestigationTransaction] = Field(default_factory=list, description="Real transaction records")
    network_observations: List[InvestigationNetworkObservation] = Field(
        default_factory=list,
        description="Network broadcast observations correlated with transaction activity"
    )
    graph_summary: InvestigationGraphSummary = Field(..., description="Graph structural summary metrics")
    total_transactions: int = Field(..., description="Total transactions found for this wallet")
    total_network_observations: int = Field(..., description="Total network observations found for this wallet")

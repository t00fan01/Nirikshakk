"""
NIRIKSHAK AI — Graph Schemas (Phase 5)

Pydantic models representing the multi-layer Bitcoin investigation graph,
node/link topologies, neighborhood subgraphs, statistics, and path lookups.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    """Normalized graph node entity (wallet, transaction, IP, ASN, country, or entity)."""
    id: str = Field(..., description="Prefixed unique identifier, e.g. wallet:bc1q..., tx:abc..., ip:1.2.3.4")
    type: str = Field(..., description="Node category: 'wallet', 'transaction', 'ip', 'asn', 'country', 'entity'")
    label: str = Field(..., description="Human-readable display label")
    risk_score: Optional[float] = Field(None, description="Analytical risk score (0.0 to 100.0) if analyzed")
    risk_level: Optional[str] = Field(None, description="Priority tier: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'")
    anomaly_score: Optional[float] = Field(None, description="Isolation Forest anomaly score (0.0 to 1.0) if analyzed")
    anomaly_percentile: Optional[float] = Field(None, description="Anomaly percentile rank if analyzed")
    is_outlier: Optional[bool] = Field(None, description="Outlier classification flag")
    alert_id: Optional[str] = Field(None, description="Associated investigative lead alert ID if generated")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Domain-specific analytical attributes")


class GraphLink(BaseModel):
    """Directed or relationship edge between graph entities."""
    source: str = Field(..., description="Origin node prefixed ID")
    target: str = Field(..., description="Destination node prefixed ID")
    type: str = Field(..., description="Relationship type: 'input', 'output', 'counterparty', 'network_observation'")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Relationship metadata (amounts, timestamps, ports)")


class GraphMeta(BaseModel):
    """Metadata describing a returned graph or subgraph slice."""
    center: Optional[str] = None
    hops: Optional[int] = None
    node_count: int
    edge_count: int
    truncated: bool = False
    query_time_ms: Optional[float] = None
    filter_applied: Optional[Dict[str, Any]] = None


class GraphSubgraphResponse(BaseModel):
    """Frontend-ready graph representation compatible with ForceGraph and 2D/3D renderers."""
    nodes: List[GraphNode]
    links: List[GraphLink]
    meta: GraphMeta


class GraphStatsResponse(BaseModel):
    """Comprehensive structural metrics for the compiled Bitcoin investigation graph."""
    status: str = "SUCCESS"
    total_nodes: int
    total_edges: int
    wallet_nodes: int
    transaction_nodes: int
    ip_nodes: int
    asn_nodes: int
    country_nodes: int
    entity_nodes: int
    input_edges: int
    output_edges: int
    counterparty_edges: int
    network_observation_edges: int
    density: float
    is_deterministic: bool = True
    built_at: Optional[str] = None
    source_dataset_records: Optional[int] = None


class SearchResultItem(BaseModel):
    """Single match from entity search."""
    id: str
    type: str
    label: str
    match_field: str
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphSearchResponse(BaseModel):
    """Results returned from graph entity search."""
    query: str
    total_matches: int
    results: List[SearchResultItem]


class GraphPathResponse(BaseModel):
    """Shortest observed transactional or network trajectory between two entities."""
    found: bool
    source: str
    target: str
    path_length: Optional[int] = None
    nodes: List[GraphNode] = Field(default_factory=list)
    links: List[GraphLink] = Field(default_factory=list)
    disclaimer: str = (
        "Observed shortest graph path represents transactional or network connectivity; "
        "it does not constitute proof of causality, common ownership, or direct intent."
    )

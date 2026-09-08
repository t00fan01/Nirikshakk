"""
NIRIKSHAK AI — Graph Serializer Service (Phase 5)

Transforms internal NetworkX graph structures into frontend-ready,
validated Pydantic payloads for ForceGraph3D and 2D visualizers.
"""

from typing import Any, Dict, List, Optional, Set
import networkx as nx

from app.schemas.graph import (
    GraphLink,
    GraphMeta,
    GraphNode,
    GraphSubgraphResponse,
)


def node_to_schema(node_id: str, data: Dict[str, Any]) -> GraphNode:
    """Convert NetworkX node data dictionary into GraphNode schema."""
    n_type = data.get("type", "unknown")
    label = data.get("label") or node_id

    # Filter out top-level fields from domain metadata
    reserved = {
        "id", "type", "label", "risk_score", "risk_level",
        "anomaly_score", "anomaly_percentile", "is_outlier", "alert_id",
    }
    meta = {k: v for k, v in data.items() if k not in reserved and v is not None}

    return GraphNode(
        id=node_id,
        type=n_type,
        label=label,
        risk_score=data.get("risk_score"),
        risk_level=data.get("risk_level"),
        anomaly_score=data.get("anomaly_score"),
        anomaly_percentile=data.get("anomaly_percentile"),
        is_outlier=data.get("is_outlier"),
        alert_id=data.get("alert_id"),
        metadata=meta,
    )


def edge_to_schema(source: str, target: str, data: Dict[str, Any]) -> GraphLink:
    """Convert NetworkX edge data into GraphLink schema."""
    e_type = data.get("type", "related")
    reserved = {"source", "target", "type"}
    meta = {k: v for k, v in data.items() if k not in reserved and v is not None}

    return GraphLink(
        source=source,
        target=target,
        type=e_type,
        metadata=meta,
    )


def subgraph_to_response_payload(
    subgraph: nx.DiGraph,
    center_id: Optional[str] = None,
    hops: Optional[int] = None,
    truncated: bool = False,
    query_time_ms: Optional[float] = None,
    filter_applied: Optional[Dict[str, Any]] = None,
) -> GraphSubgraphResponse:
    """
    Serialize a NetworkX subgraph into a validated GraphSubgraphResponse.
    Ensures all links strictly reference nodes present in the nodes list.
    """
    node_schemas: List[GraphNode] = []
    valid_node_ids: Set[str] = set()

    for n_id, data in subgraph.nodes(data=True):
        node_schemas.append(node_to_schema(n_id, data))
        valid_node_ids.add(n_id)

    # Sort nodes deterministically: center first if specified, then by type, then by id
    def sort_key(n: GraphNode):
        is_center = 0 if n.id == center_id else 1
        return (is_center, n.type, n.id)

    node_schemas.sort(key=sort_key)

    link_schemas: List[GraphLink] = []
    for u, v, data in subgraph.edges(data=True):
        if u in valid_node_ids and v in valid_node_ids:
            link_schemas.append(edge_to_schema(u, v, data))

    # Sort links deterministically
    link_schemas.sort(key=lambda l: (l.source, l.target, l.type))

    meta = GraphMeta(
        center=center_id,
        hops=hops,
        node_count=len(node_schemas),
        edge_count=len(link_schemas),
        truncated=truncated,
        query_time_ms=query_time_ms,
        filter_applied=filter_applied,
    )

    return GraphSubgraphResponse(
        nodes=node_schemas,
        links=link_schemas,
        meta=meta,
    )

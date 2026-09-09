"""
NIRIKSHAK AI — Graph Investigation API Router (Phase 5)

Endpoints:
- GET /api/graph/stats: Structural graph statistics & node/edge counts.
- GET /api/graph/search: Entity discovery across wallets, txids, IPs, and ASNs.
- GET /api/graph/path: Shortest observed transactional/network path between entities.
- GET /api/graph/{entity_id}: Detailed entity node inspection.
- GET /api/graph/{entity_id}/subgraph: Bounded N-hop neighborhood subgraph for visualization.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.graph.builder import get_graph_stats, load_or_build_graph
from app.graph.queries import (
    find_shortest_path,
    get_entity_details,
    get_neighborhood_subgraph,
    search_entities,
)
from app.schemas.graph import (
    GraphPathResponse,
    GraphSearchResponse,
    GraphStatsResponse,
    GraphSubgraphResponse,
)

router = APIRouter()


@router.get("/stats", response_model=GraphStatsResponse, status_code=status.HTTP_200_OK)
def graph_statistics():
    """
    Retrieve structural statistics, node category distributions,
    and edge classification metrics for the compiled Bitcoin investigation graph.
    """
    try:
        stats_dict = get_graph_stats()
        return GraphStatsResponse(**stats_dict)
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile graph statistics: {str(e)}",
        )


@router.get("/search", response_model=GraphSearchResponse, status_code=status.HTTP_200_OK)
def search_graph(
    q: str = Query(..., min_length=1, description="Search term (wallet address, txid, IP, ASN, country)"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of search results to return"),
):
    """
    Search graph nodes matching a wallet, transaction ID, IP address, or ASN.
    Returns categorized, ranked matches with analytical risk metadata.
    """
    try:
        graph = load_or_build_graph()
        return search_entities(graph, query=q, limit=limit)
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search query failed: {str(e)}",
        )


@router.get("/path", response_model=GraphPathResponse, status_code=status.HTTP_200_OK)
def graph_shortest_path(
    source: str = Query(..., min_length=1, description="Origin entity ID or raw identifier"),
    target: str = Query(..., min_length=1, description="Destination entity ID or raw identifier"),
    max_hops: int = Query(10, description="Maximum traversal depth (1 to 20)"),
):
    """
    Find the shortest observed transactional or network trajectory between two entities.
    Returns ordered node sequences, sequential step explanations, and traversal mode.
    """
    clean_source = source.strip()
    clean_target = target.strip()

    if not clean_source or not clean_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and target entity identifiers must be non-empty strings.",
        )

    if max_hops < 1 or max_hops > 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"max_hops must be between 1 and 20 (received {max_hops}).",
        )

    try:
        graph = load_or_build_graph()
        result = find_shortest_path(graph, source_id=clean_source, target_id=clean_target, max_hops=max_hops)
        return result
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Path computation failed: {str(e)}",
        )


@router.get("/{entity_id}/subgraph", response_model=GraphSubgraphResponse, status_code=status.HTTP_200_OK)
def entity_subgraph(
    entity_id: str,
    hops: int = Query(1, ge=1, le=3, description="Neighborhood traversal depth (1 to 3 hops)"),
    max_nodes: int = Query(100, ge=5, le=500, description="Maximum nodes cap to prevent visual overload"),
    min_risk_score: Optional[float] = Query(None, ge=0.0, le=100.0, description="Filter neighboring wallets by minimum risk score"),
    risk_level: Optional[str] = Query(None, description="Filter neighboring wallets by tier: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'"),
):
    """
    Extract a bounded N-hop neighborhood subgraph centered around a specific entity.
    Returns ForceGraph-ready nodes, directed links, and query metadata.
    """
    try:
        graph = load_or_build_graph()
        subgraph = get_neighborhood_subgraph(
            graph=graph,
            entity_id=entity_id,
            hops=hops,
            max_nodes=max_nodes,
            min_risk_score=min_risk_score,
            risk_level=risk_level,
        )
        if not subgraph:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Entity '{entity_id}' not found in the investigation graph.",
            )
        return subgraph
    except HTTPException:
        raise
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Neighborhood extraction failed: {str(e)}",
        )


@router.get("/{entity_id}", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def entity_detail(entity_id: str):
    """
    Inspect a single graph entity's comprehensive attributes, connectivity metrics,
    and associated analytical risk scores.
    """
    try:
        graph = load_or_build_graph()
        details = get_entity_details(graph, entity_id=entity_id)
        if not details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Entity '{entity_id}' not found in the investigation graph.",
            )
        return details
    except HTTPException:
        raise
    except FileNotFoundError as fnf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fnf),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Entity lookup failed: {str(e)}",
        )

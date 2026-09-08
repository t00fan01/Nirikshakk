"""
NIRIKSHAK AI — Graph Module (Phase 5)

Core multi-layer graph representation, graph builder, local persistence,
query engine, and serialization services using NetworkX.
"""

from app.graph.builder import (
    build_investigation_graph,
    get_graph_stats,
    load_or_build_graph,
)
from app.graph.queries import (
    find_shortest_path,
    get_entity_details,
    get_neighborhood_subgraph,
    search_entities,
)
from app.graph.serializers import (
    subgraph_to_response_payload,
)

__all__ = [
    "build_investigation_graph",
    "load_or_build_graph",
    "get_graph_stats",
    "search_entities",
    "get_entity_details",
    "get_neighborhood_subgraph",
    "find_shortest_path",
    "subgraph_to_response_payload",
]

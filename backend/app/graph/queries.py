"""
NIRIKSHAK AI — Graph Query Engine (Phase 5)

Provides high-performance analytical queries over the in-memory NetworkX graph:
- Search: Entity discovery across wallets, txids, IPs, and ASNs.
- Entity Detail: Detailed single-node dossier and direct connectivity.
- Neighborhood: Bounded N-hop expansion with risk filtering.
- Shortest Path: Investigative connectivity tracing with causal disclaimers.
"""

from collections import deque
import time
from typing import Any, Dict, List, Optional, Set, Tuple
import networkx as nx

from app.graph.serializers import node_to_schema, subgraph_to_response_payload
from app.schemas.graph import (
    GraphLink,
    GraphPathResponse,
    GraphSearchResponse,
    GraphSubgraphResponse,
    PathStep,
    SearchResultItem,
)


def resolve_node_id(graph: nx.DiGraph, query: str) -> Optional[str]:
    """
    Resolve raw or prefixed user input to a canonical node_id in the graph.
    Tries direct lookup, then checks type prefixes (wallet, tx, ip, asn, country).
    """
    clean_q = query.strip()
    if graph.has_node(clean_q):
        return clean_q

    # Check common prefixes
    for prefix in ["wallet:", "tx:", "ip:", "asn:", "country:", "entity:"]:
        candidate = f"{prefix}{clean_q}"
        if graph.has_node(candidate):
            return candidate

    # Case-insensitive search on label
    lower_q = clean_q.lower()
    for n, data in graph.nodes(data=True):
        if n.lower() == lower_q or str(data.get("label", "")).lower() == lower_q:
            return n

    return None


def search_entities(
    graph: nx.DiGraph,
    query: str,
    limit: int = 20,
) -> GraphSearchResponse:
    """
    Search graph nodes matching a wallet, txid, IP, ASN, or country query.
    Performs prefix, exact, and substring matching.
    """
    clean_q = query.strip().lower()
    if not clean_q:
        return GraphSearchResponse(query=query, total_matches=0, results=[])

    exact_matches: List[SearchResultItem] = []
    prefix_matches: List[SearchResultItem] = []
    sub_matches: List[SearchResultItem] = []

    for n_id, data in graph.nodes(data=True):
        n_type = data.get("type", "unknown")
        label = str(data.get("label", ""))
        label_lower = label.lower()
        id_lower = n_id.lower()

        match_field = None
        if label_lower == clean_q or id_lower == clean_q:
            match_field = "exact"
        elif label_lower.startswith(clean_q) or id_lower.startswith(clean_q):
            match_field = "prefix"
        elif clean_q in label_lower or clean_q in id_lower:
            match_field = "substring"

        if match_field:
            item = SearchResultItem(
                id=n_id,
                type=n_type,
                label=label,
                match_field=match_field,
                risk_score=data.get("risk_score"),
                risk_level=data.get("risk_level"),
                metadata={
                    k: v for k, v in data.items()
                    if k not in {"id", "type", "label", "risk_score", "risk_level"} and v is not None
                },
            )
            if match_field == "exact":
                exact_matches.append(item)
            elif match_field == "prefix":
                prefix_matches.append(item)
            else:
                sub_matches.append(item)

    # Sort each tier deterministically (risk_score desc if present, then label asc)
    def sort_key(item: SearchResultItem):
        r_score = item.risk_score if item.risk_score is not None else -1.0
        return (-r_score, item.label)

    exact_matches.sort(key=sort_key)
    prefix_matches.sort(key=sort_key)
    sub_matches.sort(key=sort_key)

    combined = exact_matches + prefix_matches + sub_matches
    total_matches = len(combined)
    results = combined[:limit]

    return GraphSearchResponse(
        query=query,
        total_matches=total_matches,
        results=results,
    )


def get_entity_details(graph: nx.DiGraph, entity_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve complete metadata and connection metrics for a single entity."""
    canonical_id = resolve_node_id(graph, entity_id)
    if not canonical_id or not graph.has_node(canonical_id):
        return None

    data = graph.nodes[canonical_id]
    in_edges = list(graph.in_edges(canonical_id, data=True))
    out_edges = list(graph.out_edges(canonical_id, data=True))

    return {
        "id": canonical_id,
        "type": data.get("type", "unknown"),
        "label": data.get("label", canonical_id),
        "risk_score": data.get("risk_score"),
        "risk_level": data.get("risk_level"),
        "anomaly_score": data.get("anomaly_score"),
        "anomaly_percentile": data.get("anomaly_percentile"),
        "is_outlier": data.get("is_outlier"),
        "alert_id": data.get("alert_id"),
        "in_degree": len(in_edges),
        "out_degree": len(out_edges),
        "total_degree": len(in_edges) + len(out_edges),
        "attributes": {
            k: v for k, v in data.items()
            if k not in {"id", "type", "label", "risk_score", "risk_level", "anomaly_score", "alert_id"}
        },
    }


def get_neighborhood_subgraph(
    graph: nx.DiGraph,
    entity_id: str,
    hops: int = 1,
    max_nodes: int = 100,
    min_risk_score: Optional[float] = None,
    risk_level: Optional[str] = None,
) -> Optional[GraphSubgraphResponse]:
    """
    Perform a bounded BFS traversal around entity_id up to `hops` (clamped to 1–3).
    Applies max_nodes bounds and optional risk score/tier filtering on wallet nodes.
    """
    t0 = time.time()
    canonical_id = resolve_node_id(graph, entity_id)
    if not canonical_id or not graph.has_node(canonical_id):
        return None

    # Clamp parameters safely
    safe_hops = max(1, min(int(hops), 3))
    safe_max_nodes = max(5, min(int(max_nodes), 500))

    clean_risk_level = risk_level.strip().upper() if risk_level else None

    # Undirected view for neighborhood navigation so in-edges and out-edges are both explored
    undirected_view = graph.to_undirected(as_view=True)

    visited_nodes: Set[str] = {canonical_id}
    queue: deque = deque([(canonical_id, 0)])

    while queue and len(visited_nodes) < safe_max_nodes:
        curr_node, curr_dist = queue.popleft()
        if curr_dist >= safe_hops:
            continue

        neighbors = sorted(undirected_view.neighbors(curr_node))
        for nbr in neighbors:
            if nbr not in visited_nodes:
                nbr_data = graph.nodes[nbr]
                nbr_type = nbr_data.get("type")

                # Apply risk filter to wallet nodes (non-center wallets only)
                if nbr_type == "wallet":
                    w_risk = nbr_data.get("risk_score")
                    w_level = nbr_data.get("risk_level")

                    if min_risk_score is not None:
                        if w_risk is None or w_risk < min_risk_score:
                            continue

                    if clean_risk_level is not None:
                        if not w_level or w_level.upper() != clean_risk_level:
                            continue

                visited_nodes.add(nbr)
                queue.append((nbr, curr_dist + 1))
                if len(visited_nodes) >= safe_max_nodes:
                    break

    truncated = len(visited_nodes) >= safe_max_nodes and len(queue) > 0

    sub_G = graph.subgraph(visited_nodes).copy()
    query_time = round((time.time() - t0) * 1000, 2)

    filter_info = {}
    if min_risk_score is not None:
        filter_info["min_risk_score"] = min_risk_score
    if clean_risk_level is not None:
        filter_info["risk_level"] = clean_risk_level

    return subgraph_to_response_payload(
        subgraph=sub_G,
        center_id=canonical_id,
        hops=safe_hops,
        truncated=truncated,
        query_time_ms=query_time,
        filter_applied=filter_info if filter_info else None,
    )


def generate_edge_explanation(
    u: str,
    v: str,
    edge_type: str,
    direction_reversed: bool,
    edge_data: Dict[str, Any],
    graph: nx.DiGraph,
) -> str:
    """Generate a deterministic human-readable explanation of an edge transition in the path."""
    u_data = graph.nodes.get(u, {})
    v_data = graph.nodes.get(v, {})
    u_type = u_data.get("type", "")
    v_type = v_data.get("type", "")

    if edge_type == "input":
        if not direction_reversed:
            return "Wallet appears in the input set of this transaction."
        else:
            return "Transaction receives input funds from this wallet."

    elif edge_type == "output":
        if not direction_reversed:
            return "Transaction outputs funds to this recipient wallet."
        else:
            return "Wallet receives output funds from this transaction."

    elif edge_type == "counterparty":
        return "Wallets are linked through observed transaction flow."

    elif edge_type == "network_observation":
        if (u_type == "transaction" and v_type == "ip") or (v_type == "transaction" and u_type == "ip"):
            if not direction_reversed:
                return "Transaction is associated with an observed network broadcast."
            else:
                return "Observed network broadcast associated with this transaction."
        elif (u_type == "ip" and v_type == "asn") or (v_type == "ip" and u_type == "asn"):
            if not direction_reversed:
                return "Observed IP maps to this Autonomous System."
            else:
                return "Autonomous System routing associated with this IP observation."
        elif (u_type == "ip" and v_type == "country") or (v_type == "ip" and u_type == "country"):
            if not direction_reversed:
                return "Observed IP maps to this geographic jurisdiction."
            else:
                return "Geographic jurisdiction associated with this IP observation."
        else:
            if not direction_reversed:
                return "Entities are linked through observed network broadcast telemetry."
            else:
                return "Observed network broadcast telemetry connecting entities in reverse direction."

    # General fallback
    if not direction_reversed:
        return f"Observed {edge_type} relationship connecting entities."
    else:
        return "Observed relationship traversed in reverse relative to the stored graph direction."


def _bfs_shortest_path(
    graph: nx.Graph,
    source: str,
    target: str,
    max_hops: int = 10,
) -> Optional[List[str]]:
    """
    Breadth-first search for the shortest path between source and target,
    bounded strictly by max_hops. Returns ordered list of node IDs if found.
    """
    if source == target:
        return [source]
    if not graph.has_node(source) or not graph.has_node(target):
        return None

    visited = {source: None}
    queue = deque([(source, 0)])

    while queue:
        curr, depth = queue.popleft()
        if depth >= max_hops:
            continue

        # Sort neighbors alphabetically for deterministic traversal
        neighbors = sorted(graph.neighbors(curr))
        for neighbor in neighbors:
            if neighbor not in visited:
                visited[neighbor] = curr
                if neighbor == target:
                    path = [target]
                    step = curr
                    while step is not None:
                        path.append(step)
                        step = visited[step]
                    path.reverse()
                    return path
                queue.append((neighbor, depth + 1))

    return None


def find_shortest_path(
    graph: nx.DiGraph,
    source_id: str,
    target_id: str,
    max_hops: int = 10,
) -> GraphPathResponse:
    """
    Find the shortest observed transactional or network trajectory between two entities.
    Attempts bounded directed search first, then falls back to bounded undirected search.
    Returns ordered path sequence, step-by-step relationship explanations, and traversal mode.
    """
    can_source = resolve_node_id(graph, source_id)
    can_target = resolve_node_id(graph, target_id)

    if not can_source or not can_target or not graph.has_node(can_source) or not graph.has_node(can_target):
        return GraphPathResponse(
            found=False,
            source=source_id,
            target=target_id,
            path_length=None,
            nodes=[],
            links=[],
            path_sequence=[],
            traversal_mode=None,
            steps=[],
        )

    # 1. Try bounded directed path
    traversal_mode = "directed"
    path_nodes = _bfs_shortest_path(graph, can_source, can_target, max_hops=max_hops)

    # 2. Fallback to bounded undirected path across shared hubs
    if not path_nodes:
        traversal_mode = "undirected"
        undirected_G = graph.to_undirected(as_view=True)
        path_nodes = _bfs_shortest_path(undirected_G, can_source, can_target, max_hops=max_hops)

    if not path_nodes:
        return GraphPathResponse(
            found=False,
            source=can_source,
            target=can_target,
            path_length=None,
            nodes=[],
            links=[],
            path_sequence=[],
            traversal_mode=None,
            steps=[],
        )

    # Build ordered node representations
    nodes = [node_to_schema(n_id, graph.nodes[n_id]) for n_id in path_nodes]

    # Build sequential steps and consecutive path links
    steps: List[PathStep] = []
    links: List[GraphLink] = []
    reserved = {"source", "target", "type"}

    for i in range(len(path_nodes) - 1):
        u = path_nodes[i]
        v = path_nodes[i + 1]

        if graph.has_edge(u, v):
            edge_data = graph.get_edge_data(u, v)
            direction_reversed = False
            actual_source = u
            actual_target = v
        elif graph.has_edge(v, u):
            edge_data = graph.get_edge_data(v, u)
            direction_reversed = True
            actual_source = v
            actual_target = u
        else:
            edge_data = {}
            direction_reversed = False
            actual_source = u
            actual_target = v

        e_type = edge_data.get("type", "relationship")
        meta = {k: val for k, val in edge_data.items() if k not in reserved and val is not None}
        explanation = generate_edge_explanation(u, v, e_type, direction_reversed, edge_data, graph)

        step = PathStep(
            step_index=i + 1,
            from_node=u,
            to_node=v,
            edge_type=e_type,
            direction_reversed=direction_reversed,
            metadata=meta,
            explanation=explanation,
        )
        steps.append(step)

        link = GraphLink(
            source=actual_source,
            target=actual_target,
            type=e_type,
            metadata=meta,
        )
        links.append(link)

    path_len = len(path_nodes) - 1

    return GraphPathResponse(
        found=True,
        source=can_source,
        target=can_target,
        path_length=path_len,
        nodes=nodes,
        links=links,
        path_sequence=path_nodes,
        traversal_mode=traversal_mode,
        steps=steps,
    )

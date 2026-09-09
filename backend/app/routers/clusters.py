"""
NIRIKSHAK AI — Unsupervised Behavioral Clustering API Router (Phase 9 Step 3)

Exposes read-only behavioral clustering intelligence for Bitcoin wallets:
- GET /api/clusters: Archetype profiles (K=6) and K=4..8 analytical diagnostics.
- GET /api/clusters/wallet/{wallet_id}: Single wallet cluster assignment with full archetype profile.
- GET /api/clusters/similar/{wallet_id}: Nearest-neighbor behaviorally similar wallets (cosine similarity).
- GET /api/clusters/{cluster_id}: Deep inspection of a specific cluster with sorted & paginated member wallets.

CRITICAL ROUTING INVARIANT:
Specific sub-paths (/wallet/{wallet_id} and /similar/{wallet_id}) MUST be declared
BEFORE the parameterized /{cluster_id} route to prevent Starlette/FastAPI path collision.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.ml.clustering import (
    find_similar_wallets,
    get_cluster_detail,
    get_wallet_cluster_detail,
    has_clustering_data,
    load_cluster_profiles,
)
from app.schemas.clustering import (
    ClusterDetailResponse,
    ClusterProfilesResponse,
    SimilarWalletsResponse,
    WalletClusterDetailResponse,
)

router = APIRouter()

ALLOWED_SORT_BY = {"distance", "address"}
MISSING_ARTIFACTS_DETAIL = "Clustering analysis results not found. Please execute analysis first."


def validate_and_clean_wallet_id(wallet_id: str) -> str:
    """
    Normalizes and validates a Bitcoin wallet identifier consistently with the investigation router:
    - strips whitespace
    - strips optional 'wallet:' prefix
    - rejects empty or excessively short identifiers (< 5 characters)
    - rejects whitespace, tabs, newlines, null bytes, and SQL/injection delimiters
    """
    clean_id = wallet_id.strip()
    if clean_id.startswith("wallet:"):
        clean_id = clean_id[7:].strip()

    if not clean_id or len(clean_id) < 5 or any(c in clean_id for c in [" ", "\t", "\n", ";", "'", '"', "\0"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid wallet identifier format: '{wallet_id}'."
        )
    return clean_id


# =====================================================================
# 1. GET /api/clusters — Summary, K Diagnostics & All Profiles
# =====================================================================

@router.get(
    "",
    response_model=ClusterProfilesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all behavioral cluster archetypes and model diagnostics",
    description="Retrieves the 6 behavioral cluster profiles, centroids, top differentiating traits, and K diagnostics."
)
def get_all_clusters():
    """
    Return all 6 behavioral cluster profiles along with K-evaluation diagnostics (K=4..8).
    Does NOT recompute clustering; loads persisted analytical artifacts directly.
    """
    if not has_clustering_data():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MISSING_ARTIFACTS_DETAIL
        )

    try:
        return load_cluster_profiles()
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MISSING_ARTIFACTS_DETAIL
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load clustering profiles: {str(e)}"
        )


# =====================================================================
# 2. GET /api/clusters/wallet/{wallet_id} — Single Wallet Assignment
# =====================================================================

@router.get(
    "/wallet/{wallet_id}",
    response_model=WalletClusterDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get wallet cluster assignment and archetype profile",
    description="Retrieves a single wallet's cluster membership, centroid distance, 2D PCA projection, and attached cluster profile."
)
def get_wallet_cluster_endpoint(wallet_id: str):
    """
    Lookup cluster assignment and archetype details for a single Bitcoin wallet address.
    """
    clean_id = validate_and_clean_wallet_id(wallet_id)

    if not has_clustering_data():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MISSING_ARTIFACTS_DETAIL
        )

    try:
        detail = get_wallet_cluster_detail(clean_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MISSING_ARTIFACTS_DETAIL
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve wallet cluster assignment: {str(e)}"
        )

    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wallet '{clean_id}' not found in clustered dataset."
        )

    return detail


# =====================================================================
# 3. GET /api/clusters/similar/{wallet_id} — Behaviorally Similar Wallets
# =====================================================================

@router.get(
    "/similar/{wallet_id}",
    response_model=SimilarWalletsResponse,
    status_code=status.HTTP_200_OK,
    summary="Find behaviorally similar Bitcoin wallets",
    description="Identifies top N nearest neighbors using cosine similarity on 22 RobustScaled behavioral features."
)
def get_similar_wallets_endpoint(
    wallet_id: str,
    top_n: int = Query(5, ge=1, le=50, description="Number of similar wallets to return (1 to 50)")
):
    """
    Find top N behaviorally similar wallets. Strictly excludes target wallet itself.
    Does NOT use risk scores or anomaly scores as similarity inputs.
    """
    clean_id = validate_and_clean_wallet_id(wallet_id)

    if not has_clustering_data():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MISSING_ARTIFACTS_DETAIL
        )

    try:
        return find_similar_wallets(clean_id, top_n=top_n)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wallet '{clean_id}' not found in clustered dataset."
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MISSING_ARTIFACTS_DETAIL
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute wallet behavioral similarity: {str(e)}"
        )


# =====================================================================
# 4. GET /api/clusters/{cluster_id} — Detailed Cluster Inspection
# =====================================================================

@router.get(
    "/{cluster_id}",
    response_model=ClusterDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get cluster detail and paginated member wallets",
    description="Retrieves a specific cluster archetype profile with paginated member wallets sorted by centroid distance or address."
)
def get_cluster_detail_endpoint(
    cluster_id: int,
    limit: int = Query(50, ge=1, le=500, description="Maximum number of member wallets to return (1 to 500)"),
    offset: int = Query(0, ge=0, description="Pagination offset index (>= 0)"),
    sort_by: str = Query("distance", description="Member sorting criterion ('distance' or 'address')"),
):
    """
    Retrieve deep inspection of a specific cluster archetype and its member wallets.
    """
    if sort_by not in ALLOWED_SORT_BY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_by parameter '{sort_by}'. Allowed values: 'distance', 'address'."
        )

    if not has_clustering_data():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MISSING_ARTIFACTS_DETAIL
        )

    try:
        detail = get_cluster_detail(
            cluster_id=cluster_id,
            limit=limit,
            offset=offset,
            sort_by=sort_by
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=MISSING_ARTIFACTS_DETAIL
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve cluster detail: {str(e)}"
        )

    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cluster ID {cluster_id} not found."
        )

    return detail

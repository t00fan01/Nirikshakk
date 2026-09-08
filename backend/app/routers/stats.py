"""
NIRIKSHAK AI — Analytical Dataset Statistics Router (Phase 3)

Provides fast analytical metrics via DuckDB over the normalized Parquet store.
"""

from fastapi import APIRouter, status
from app.pipeline.storage import get_dataset_analytics_summary
from app.schemas.transaction import DatasetStatsResponse

router = APIRouter()


@router.get("/stats", response_model=DatasetStatsResponse, status_code=status.HTTP_200_OK)
def get_dataset_stats():
    """
    Return high-level analytical statistics computed by DuckDB over the normalized Parquet storage.
    Includes transaction volume, wallet counts, network observations, time range, and top entities.
    """
    summary = get_dataset_analytics_summary()
    return DatasetStatsResponse(**summary)

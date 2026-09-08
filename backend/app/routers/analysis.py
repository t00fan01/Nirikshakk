"""
NIRIKSHAK AI — Analysis Orchestration Router (Phase 4)

Endpoints:
- POST /api/analysis/run: Execute feature engineering, Isolation Forest anomaly scoring, and risk ranking.
- GET /api/analysis/status: Retrieve current analysis status and summary metrics.
"""

from fastapi import APIRouter, HTTPException, status
from app.ml.analyzer import (
    AnalysisStatusResponse,
    AnalysisSummary,
    get_analysis_status,
    run_full_analysis,
)
from app.pipeline.storage import has_normalized_data

router = APIRouter()


@router.post("/run", response_model=AnalysisSummary, status_code=status.HTTP_200_OK)
def run_analysis():
    """
    Trigger end-to-end ML feature extraction, Isolation Forest outlier scoring,
    and multi-dimensional risk prioritization over the uploaded dataset.
    """
    if not has_normalized_data():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No normalized dataset available. Please upload a valid dataset before running analysis."
        )

    try:
        summary = run_full_analysis()
        return summary
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline execution failed: {str(err)}"
        )


@router.get("/status", response_model=AnalysisStatusResponse, status_code=status.HTTP_200_OK)
def get_status():
    """
    Retrieve current ML analysis readiness and summary metrics.
    """
    return get_analysis_status()

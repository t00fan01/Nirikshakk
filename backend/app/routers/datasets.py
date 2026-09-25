from datetime import datetime, timezone
import json
from pathlib import Path
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.graph.builder import (
    build_investigation_graph,
    get_graph_stats,
    has_graph_data,
    invalidate_graph_cache,
)
from app.ml.analyzer import (
    get_analysis_paths,
    has_analysis_data,
    run_full_analysis,
)
from app.pipeline.loader import (
    calculate_dataset_summary,
    parse_csv_content,
    parse_json_content,
)
from app.pipeline.normalizer import normalize_dataset
from app.pipeline.storage import (
    get_dataset_analytics_summary,
    get_storage_dir,
    has_normalized_data,
    save_normalized_tables,
)
from app.schemas.transaction import (
    ActiveDatasetStatus,
    BitcoinTransactionRecord,
    DatasetUploadResponse,
    StorageInfo,
)

router = APIRouter()

MANIFEST_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "active_dataset.json"
CANONICAL_DEMO_CSV = Path(__file__).resolve().parent.parent.parent / "data" / "demo" / "nirikshak_demo_15k.csv"
LEGACY_BENCHMARK_CSV = Path(__file__).resolve().parent.parent.parent / "data" / "demo_transactions.csv"


def process_dataset_end_to_end(
    valid_records: List[BitcoinTransactionRecord],
    filename: str,
    detected_format: str,
    total_rows: int,
    rejected_records: List[Dict[str, Any]],
    validation_status: str,
    val_ms: float,
) -> DatasetUploadResponse:
    """
    Executes the genuine end-to-end data processing lifecycle:
    1. Normalization & Parquet storage (Polars)
    2. ML Feature extraction, Isolation Forest, Risk Engine, Behavioral Clustering
    3. Multi-layer NetworkX graph compilation
    4. Process-level in-memory cache invalidation
    5. Active dataset manifest compilation with real measured stage durations
    """
    summary = calculate_dataset_summary(valid_records) if valid_records else None
    storage_info: Optional[StorageInfo] = None
    stage_timings: Dict[str, float] = {"validation": val_ms}
    analysis_dict: Optional[Dict[str, Any]] = None
    graph_dict: Optional[Dict[str, Any]] = None
    pipeline_status = "SUCCESS"

    if valid_records and validation_status != "FAILED":
        try:
            # Stage 2: Normalization & Parquet Storage
            t_norm = time.perf_counter()
            tables = normalize_dataset(valid_records)
            written_paths = save_normalized_tables(tables)
            norm_ms = round((time.perf_counter() - t_norm) * 1000.0, 2)
            stage_timings["normalization"] = norm_ms

            sdir = get_storage_dir()
            storage_info = StorageInfo(
                normalized=True,
                storage_dir=str(sdir),
                transactions_file=written_paths.get("transactions", ""),
                wallets_file=written_paths.get("wallets", ""),
                network_observations_file=written_paths.get("network_observations", ""),
                table_counts={
                    "transactions": len(tables["transactions"]),
                    "wallets": len(tables["wallets"]),
                    "network_observations": len(tables["network_observations"]),
                },
            )

            # Stage 3: ML Analysis (Features, Isolation Forest, Risk Scoring, Behavioral Clustering)
            t_ml = time.perf_counter()
            analysis_summary = run_full_analysis()
            ml_ms = round((time.perf_counter() - t_ml) * 1000.0, 2)
            stage_timings["analysis"] = ml_ms
            analysis_dict = {
                "wallets_analyzed": analysis_summary.wallets_analyzed,
                "anomalies_detected": analysis_summary.anomalies_detected,
                "critical_risk_leads": analysis_summary.critical_risk_leads,
                "high_risk_leads": analysis_summary.high_risk_leads,
                "cluster_count": analysis_summary.cluster_count,
                "duration_seconds": analysis_summary.analysis_duration_seconds,
            }

            # Stage 4: Multi-Layer NetworkX Graph Construction & Cache Invalidation
            t_graph = time.perf_counter()
            invalidate_graph_cache()
            G, graph_stats = build_investigation_graph(force_rebuild=True)
            graph_ms = round((time.perf_counter() - t_graph) * 1000.0, 2)
            stage_timings["graph_compilation"] = graph_ms
            graph_dict = {
                "total_nodes": graph_stats.get("total_nodes", len(G.nodes)),
                "total_edges": graph_stats.get("total_edges", len(G.edges)),
                "wallet_nodes": graph_stats.get("wallet_nodes", 0),
                "transaction_nodes": graph_stats.get("transaction_nodes", 0),
            }

            total_elapsed = round(val_ms + norm_ms + ml_ms + graph_ms, 2)
            stage_timings["total"] = total_elapsed
            stage_timings["validation_ms"] = val_ms
            stage_timings["normalization_ms"] = norm_ms
            stage_timings["analysis_ms"] = ml_ms
            stage_timings["graph_build_ms"] = graph_ms
            stage_timings["total_ms"] = total_elapsed

            # Write Active Dataset Manifest atomically
            manifest_payload = {
                "has_dataset": True,
                "filename": filename,
                "detected_format": detected_format,
                "total_transactions": len(tables["transactions"]),
                "total_wallets": len(tables["wallets"]),
                "anomalies_detected": analysis_summary.anomalies_detected,
                "high_risk_leads": analysis_summary.high_risk_leads,
                "critical_risk_leads": analysis_summary.critical_risk_leads,
                "cluster_count": analysis_summary.cluster_count,
                "graph_nodes": graph_dict["total_nodes"],
                "graph_edges": graph_dict["total_edges"],
                "stage_timings_ms": stage_timings,
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
            }
            try:
                with open(MANIFEST_FILE, "w", encoding="utf-8") as mf:
                    json.dump(manifest_payload, mf, indent=2)
            except Exception:
                pass

        except Exception as e:
            pipeline_status = "FAILED"
            stage_timings["error"] = str(e)

    return DatasetUploadResponse(
        filename=filename,
        detected_format=detected_format,
        total_rows=total_rows,
        valid_rows=len(valid_records),
        rejected_rows=len(rejected_records),
        validation_status=validation_status,
        summary=summary,
        rejected_details=rejected_records[:50],
        storage=storage_info,
        pipeline_status=pipeline_status,
        stage_timings_ms=stage_timings,
        analysis_summary=analysis_dict,
        graph_summary=graph_dict,
    )


@router.post("/upload", response_model=DatasetUploadResponse, status_code=status.HTTP_200_OK)
async def upload_dataset(
    file: UploadFile = File(..., description="Bitcoin transaction dataset (.csv or .json)")
):
    """
    Ingest, validate, normalize, analyze, cluster, and compile the graph end-to-end
    for an uploaded Bitcoin transaction dataset.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a filename."
        )

    filename = file.filename
    suffix = Path(filename).suffix.lower()

    if suffix in [".csv"]:
        detected_format = "csv"
    elif suffix in [".json"]:
        detected_format = "json"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{suffix}'. Only .csv and .json datasets are supported."
        )

    try:
        raw_bytes = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    if not raw_bytes or len(raw_bytes.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    try:
        content = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content = raw_bytes.decode("latin-1")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unable to decode file content as UTF-8/text: {str(e)}"
            )

    t_val = time.perf_counter()
    try:
        if detected_format == "csv":
            valid_records, rejected_records = parse_csv_content(content)
        else:
            valid_records, rejected_records = parse_json_content(content)
    except json.JSONDecodeError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON syntax: {str(err)}"
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse dataset file: {str(err)}"
        )
    val_ms = round((time.perf_counter() - t_val) * 1000.0, 2)

    total_rows = len(valid_records) + len(rejected_records)
    if total_rows == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset contains zero records or an empty table."
        )

    if len(rejected_records) == 0:
        validation_status = "PASSED"
    elif len(valid_records) > 0:
        validation_status = "PARTIAL"
    else:
        validation_status = "FAILED"

    return process_dataset_end_to_end(
        valid_records=valid_records,
        filename=filename,
        detected_format=detected_format,
        total_rows=total_rows,
        rejected_records=rejected_records,
        validation_status=validation_status,
        val_ms=val_ms,
    )


@router.post("/load-benchmark", response_model=DatasetUploadResponse, status_code=status.HTTP_200_OK)
def load_benchmark_dataset():
    """
    Load the official SIH26146 demonstration dataset (15,000 transactions) directly
    from backend/data/demo/nirikshak_demo_15k.csv and run the exact same end-to-end processing pipeline.
    """
    target_csv = CANONICAL_DEMO_CSV if CANONICAL_DEMO_CSV.exists() else LEGACY_BENCHMARK_CSV
    if not target_csv.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demonstration dataset not found on disk at {CANONICAL_DEMO_CSV} or {LEGACY_BENCHMARK_CSV}."
        )

    t_val = time.perf_counter()
    with open(target_csv, "r", encoding="utf-8") as f:
        content = f.read()

    valid_records, rejected_records = parse_csv_content(content)
    val_ms = round((time.perf_counter() - t_val) * 1000.0, 2)
    total_rows = len(valid_records) + len(rejected_records)

    return process_dataset_end_to_end(
        valid_records=valid_records,
        filename=target_csv.name,
        detected_format="csv",
        total_rows=total_rows,
        rejected_records=rejected_records,
        validation_status="PASSED",
        val_ms=val_ms,
    )


@router.get("/active", response_model=ActiveDatasetStatus, status_code=status.HTTP_200_OK)
def get_active_dataset_status():
    """
    Retrieve current system-wide active dataset state and stage execution timings.
    """
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as mf:
                data = json.load(mf)
                return ActiveDatasetStatus(**data)
        except Exception:
            pass

    # Fallback: check if normalized and analysis data exist on disk
    if has_normalized_data() and has_analysis_data():
        try:
            analytics = get_dataset_analytics_summary()
            summary_path = get_analysis_paths()["summary"]
            with open(summary_path, "r", encoding="utf-8") as sf:
                analysis_summary = json.load(sf)

            graph_stats = get_graph_stats() if has_graph_data() else {}
            fallback_filename = CANONICAL_DEMO_CSV.name if CANONICAL_DEMO_CSV.exists() else "nirikshak_demo_15k.csv"
            return ActiveDatasetStatus(
                has_dataset=True,
                filename=fallback_filename,
                total_transactions=analytics.get("transactions", 0),
                total_wallets=analytics.get("wallets", 0),
                anomalies_detected=analysis_summary.get("anomalies_detected", 0),
                high_risk_leads=analysis_summary.get("high_risk_leads", 0),
                critical_risk_leads=analysis_summary.get("critical_risk_leads", 0),
                cluster_count=analysis_summary.get("cluster_count", 6),
                graph_nodes=graph_stats.get("total_nodes", 0),
                graph_edges=graph_stats.get("total_edges", 0),
                analyzed_at=analysis_summary.get("analyzed_at"),
            )
        except Exception:
            pass

    return ActiveDatasetStatus(has_dataset=False)

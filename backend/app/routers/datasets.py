import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.pipeline.loader import (
    calculate_dataset_summary,
    parse_csv_content,
    parse_json_content,
)
from app.schemas.transaction import DatasetUploadResponse

router = APIRouter()


@router.post("/upload", response_model=DatasetUploadResponse, status_code=status.HTTP_200_OK)
async def upload_dataset(
    file: UploadFile = File(..., description="Bitcoin transaction dataset (.csv or .json)")
):
    """
    Ingest and validate Bitcoin transaction datasets according to schema_v1.
    Accepts CSV or JSON file uploads.
    Performs full Pydantic validation across all records and returns an ingestion report.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a filename."
        )

    filename = file.filename
    suffix = Path(filename).suffix.lower()

    # Determine format
    if suffix in [".csv"]:
        detected_format = "csv"
    elif suffix in [".json"]:
        detected_format = "json"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{suffix}'. Only .csv and .json datasets are supported."
        )

    # Read uploaded content
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

    # Parse and validate based on format
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

    total_rows = len(valid_records) + len(rejected_records)

    # If completely empty structure or missing rows
    if total_rows == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset contains zero records or an empty table."
        )

    # Determine validation status
    if len(rejected_records) == 0:
        validation_status = "PASSED"
    elif len(valid_records) > 0:
        validation_status = "PARTIAL"
    else:
        validation_status = "FAILED"

    summary = calculate_dataset_summary(valid_records) if valid_records else None

    return DatasetUploadResponse(
        filename=filename,
        detected_format=detected_format,
        total_rows=total_rows,
        valid_rows=len(valid_records),
        rejected_rows=len(rejected_records),
        validation_status=validation_status,
        summary=summary,
        rejected_details=rejected_records[:50],
    )

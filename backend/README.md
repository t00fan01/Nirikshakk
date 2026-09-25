# NIRIKSHAK AI - Backend Foundation (SIH26146)

Offline AI-powered Bitcoin transaction investigation and analysis platform backend.

## Problem Statement
**SIH26146:** "AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic"

---

## Directory Structure

```text
backend/
├── app/
│   ├── main.py              # FastAPI application entry point & CORS
│   ├── schemas/             # Pydantic schema_v1 definitions
│   │   ├── __init__.py
│   │   └── transaction.py   # BitcoinTransactionRecord, GroundTruthRecord, DatasetSummary
│   └── pipeline/            # Ingestion & validation pipeline
│       ├── __init__.py
│       └── loader.py        # CSV/JSON loaders, validators, and summary metrics
├── data/                    # Offline analytical data & datasets (excluded from git)
│   ├── .gitignore
│   └── .gitkeep
├── scripts/
│   ├── generate_dataset.py  # Synthetic Bitcoin transaction & network traffic generator
│   └── verify_phase1.py     # Automated Phase 1 validation test suite
├── models/                  # Serialized ML models (.gitkeep)
├── requirements.txt         # Minimal dependencies (FastAPI, Uvicorn, Pydantic)
└── README.md
```

---

## Phase 1: Synthetic Dataset Generation & Pipeline Foundation

The synthetic generator simulates realistic offline Bitcoin transaction traffic correlated with network observations based on `schema_v1`:
```text
timestamp, src_ip, dst_ip, src_port, dst_port, txid,
input_addresses[], output_addresses[], input_amounts[], output_amounts[],
fee, script_type, geo_country, ASN
```

### 1. Generate Synthetic Dataset
```bash
# Run with defaults (5,000 txs, ~5% anomalies, 7-day span)
python3 scripts/generate_dataset.py

# Or customize parameters:
python3 scripts/generate_dataset.py --num-tx 10000 --num-wallets 2000 --anomaly-pct 5.0 --days 14 --seed 42
```

Outputs in `backend/data/`:
* `demo_transactions.csv`: Ingestion-ready CSV dataset with serialized list fields.
* `demo_transactions.json`: Direct JSON array representation of transactions.
* `ground_truth.json`: Hidden evaluation labels (`normal`, `rapid_multihop_cluster`, `peeling_chain`, `burst_surge`, `network_correlated`, `fan_in_consolidation`) for model validation.

### 2. Verify Dataset & Pipeline Loader
```bash
python3 scripts/verify_phase1.py
```
Validates 100% schema compliance, zero record rejections, and 1-to-1 ground truth alignment.

---

## Getting Started (FastAPI Server)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Development Server
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Verify Endpoint
Open [http://localhost:8000/health](http://localhost:8000/health) or [http://localhost:8000/docs](http://localhost:8000/docs) for the interactive Swagger API documentation.

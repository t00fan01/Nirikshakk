# NIRIKSHAK

## AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic
**Smart India Hackathon 2026 — Problem Statement SIH26146**

---

NIRIKSHAK is an offline-capable, AI-driven Bitcoin transaction intelligence and investigative analysis platform. It correlates blockchain-layer transaction metadata (inputs, outputs, amounts, script types, fees) with network-layer observations (IP addresses, ports, Autonomous System Numbers [ASNs], geolocation) to surface prioritized, explainable investigative leads through multi-layer link analysis, unsupervised anomaly detection, and behavioral clustering.

Designed specifically for local and air-gapped investigative workstations, NIRIKSHAK runs completely offline without external blockchain RPC nodes, cloud AI services, or third-party tracking APIs.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Key Capabilities](#key-capabilities)
  - [Dataset Ingestion & Validation](#dataset-ingestion--validation)
  - [Local Analytical Storage](#local-analytical-storage)
  - [AI Anomaly Detection](#ai-anomaly-detection)
  - [Evidence-Based Risk Scoring](#evidence-based-risk-scoring)
  - [Behavioral Clustering](#behavioral-clustering)
  - [Multi-Layer Investigation Graph](#multi-layer-investigation-graph)
  - [Network Correlation & Investigative Evidence](#network-correlation--investigative-evidence)
  - [Investigation Console & Explainability](#investigation-console--explainability)
  - [Interactive Dashboard](#interactive-dashboard)
- [System Architecture](#system-architecture)
- [End-to-End Data Pipeline](#end-to-end-data-pipeline)
- [Docker & Offline Deployment](#docker--offline-deployment)
- [System Requirements](#system-requirements)
- [Quick Start — Native Local Environment](#quick-start--native-local-environment)
- [Quick Start — Docker Environment](#quick-start--docker-environment)
- [Live Demo Walkthrough](#live-demo-walkthrough)
- [Verified Prototype Metrics](#verified-prototype-metrics)
- [Technical Stack](#technical-stack)
- [Repository Structure](#repository-structure)
- [Responsible Interpretation & Ethics](#responsible-interpretation--ethics)
- [Current Limitations & Roadmap](#current-limitations--roadmap)
- [The Architects (Core Team)](#the-architects-core-team)
- [License](#license)

---

## Problem Statement

Investigating illicit financial flows across the Bitcoin network poses significant technical and operational hurdles:

1. **Volume and Pseudonymity:** Bitcoin transactions produce massive transaction volumes. While transaction histories are public on-chain, transaction outputs do not disclose legal identities.
2. **Obfuscation Techniques:** Entities frequently deploy behavioral evasion strategies—including peeling chains, high-velocity fan-out/fan-in consolidation, address re-use minimization, and rapid multi-hop relay.
3. **Disjointed Network Telemetry:** Network-layer observations (such as broadcast IPs, relay nodes, ASNs, and geographic origins) are rarely synthesized alongside blockchain UTXO dynamics in a unified investigative interface.
4. **Black-Box Alert Fatigue:** Traditional rule-based alerts lack statistical context, generate high false-positive rates, and provide little to no mathematical explanation for why an entity was flagged.
5. **Operational Security & Air-Gapped Environments:** Defense and law enforcement analysts require forensic tools capable of executing in restricted, air-gapped Linux environments without outbound internet access or telemetry leakage.

> **Important Investigative Note:** NIRIKSHAK produces prioritized **behavioral anomaly leads** and **investigative correlation evidence**. It does not assert definitive legal identity, physical entity ownership, or criminal culpability.

---

## Solution Overview

NIRIKSHAK addresses SIH26146 through an end-to-end, privacy-preserving analytical pipeline that transforms raw Bitcoin transaction datasets and network observation logs into interactive, explainable intelligence dossiers:

```text
Raw Dataset (CSV / JSON)
        │
        ▼
[ Schema Validation & Rejection Filtering ]
        │
        ▼
[ Normalization into Columnar Parquet & DuckDB ]
        │
        ▼
[ Behavioral Feature Extraction (24 Numerical Metrics) ]
        │
        ▼
[ Unsupervised Isolation Forest Anomaly Detection ]
        │
        ▼
[ Multi-Component Evidence-Based Risk Scoring (0–100) ]
        │
        ▼
[ Unsupervised K-Means Behavioral Clustering (K=6) ]
        │
        ▼
[ Heterogeneous NetworkX Investigation Graph Assembly ]
        │
        ▼
[ Ranked Investigative Alerts & Explainable Lead Dossiers ]
        │
        ▼
[ Interactive 3D Force-Directed Link Analysis Console ]
```

---

## Key Capabilities

### Dataset Ingestion & Validation
- **Supported Formats:** Validated ingestion of CSV and JSON datasets conforming to `schema_v1`.
- **Schema Validation:** Strict verification of transaction identifiers, input/output address arrays, satoshi amounts, timestamps, IP addresses, ports, ASNs, and countries.
- **Malformed Record Handling:** Invalid records are isolated and logged without halting execution.
- *Notice:* XML schema ingestion is scheduled for a future milestone and is not currently implemented.

### Local Analytical Storage
- **Zero Cloud Persistence:** All processed records are structured locally into compressed Apache Parquet tables (`wallets.parquet`, `transactions.parquet`, `features.parquet`).
- **DuckDB Query Engine:** High-speed SQL analytical queries across millions of rows with minimal memory footprint.

### AI Anomaly Detection
- **Algorithm:** Unsupervised **Isolation Forest** (100 estimators, deterministic random seed).
- **Engineered Behavioral Features (24 Metrics):**
  - *Activity Metrics:* Transaction frequency, unique input/output counterparty counts, total volume sent/received.
  - *Velocity & Burstiness:* Inter-arrival time variance, burstiness index, active lifespan, rapid-relay indicators.
  - *Flow Dynamics:* In/out transaction ratio, volume balance, fee ratio, peel-chain fragmentation index.
  - *Network Diversity:* Unique IP count, unique ASN count, unique country count, Shannon entropy of associated network infrastructure.
- **Normalized Anomaly Scoring:** Continuous anomaly score between `[0.0, 1.0]`.

### Evidence-Based Risk Scoring
- **Score Range:** `0.0` to `100.0` with four distinct priority bands:
  - **CRITICAL** (Score ≥ 75.0)
  - **HIGH** (50.0 ≤ Score < 75.0)
  - **MEDIUM** (25.0 ≤ Score < 50.0)
  - **LOW** (Score < 25.0)
- **Mathematical Decomposition:** Combines raw statistical anomaly scores with velocity penalties, peeling-chain heuristics, high-volume concentration, and network-infrastructure risk.

### Behavioral Clustering
- **Algorithm:** Unsupervised **K-Means clustering** ($K=6$) applied across standardized behavioral feature vectors.
- **Profiles Discovered:**
  - *High-Velocity Relay / Peeling Chain Entities*
  - *High-Volume Consolidation Hubs*
  - *Dispersed Network Infrastructure Routing*
  - *Balanced Intermediary Accounts*
  - *Infrequent Low-Value UTXO Holders*
  - *Standard End-User Wallets*
- **Dimensionality Reduction:** 2D and 3D PCA projection for spatial cluster visualization.
- **Nearest-Neighbor Analysis:** Euclidean distance queries to discover behaviorally similar wallets.

### Multi-Layer Investigation Graph
- **Heterogeneous Graph Engine:** Built using NetworkX to correlate multi-layer entity types:
  - **Wallet Nodes** (`wallet:<address>`)
  - **Transaction Nodes** (`tx:<txid>`)
  - **IP Nodes** (`ip:<address>`)
  - **ASN Nodes** (`asn:<number>`)
  - **Country Nodes** (`country:<code>`)
- **Typed Relationship Edges:**
  - `input` (Wallet $\to$ Transaction)
  - `output` (Transaction $\to$ Wallet)
  - `network_observation` (Transaction $\leftrightarrow$ IP)
  - `counterparty` (Heuristic direct wallet-to-wallet flows)
  - `routed_via` (IP $\to$ ASN)
  - `located_in` (IP $\to$ Country)
- **Investigation Bounds:** Subgraph exploration bounded to $1 \le \text{hops} \le 3$ with configurable safety caps (`max_nodes`) to prevent browser rendering degradation.

### Network Correlation & Investigative Evidence
- Network observations (IP, ASN, Country) are bound to transaction records via transaction IDs observed during network broadcast.
- **Crucial Disclaimer:** Network telemetry represents *correlation evidence* indicative of broadcast routes or proxy/relay nodes, **not proof of physical wallet ownership**.

### Investigation Console & Explainability
- **"Why Flagged" Transparent Dossier:** Direct natural-language explanation of primary and contributing anomaly signals (e.g., transaction burst rate, peel-chain sequence, high ASN entropy).
- **Entity Overview:** Complete balance, lifetime volume, first/last observed timestamps, and behavioral classification.
- **Associated Infrastructure:** Detailed breakdown of observed IPs, ASNs, and geographic distribution.
- **Cluster Diagnostics:** Membership cluster profile, distance to centroid, and behaviorally similar peers.
- **Path Investigation:** Deterministic shortest-path routing between two arbitrary wallets with intermediate transaction and network node breakdown.

### Interactive Dashboard
- **Overview:** High-level platform telemetry, active dataset status, anomaly counts, and risk distribution charts.
- **Network Visualizer:** Interactive 3D force-directed graph powered by WebGL/Three.js with camera positioning, node search, and neighborhood filtering.
- **Alerts Queue:** Filterable, sortable queue of ranked investigative leads with risk levels and primary signals.
- **Entities Table:** Searchable registry of all 4,900+ wallets with multi-column sorting.
- **Transactions & Model Analytics:** Model metrics, feature importance breakdowns, and raw transaction logs.

---

## System Architecture

```text
                     ┌───────────────────────────────────────────────┐
                     │          Analyst Web Browser (Client)         │
                     │  React 18 + Vite + Tailwind CSS + Three.js   │
                     └───────────────────────┬───────────────────────┘
                                             │ HTTP / JSON (Port 5173 / 80)
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │        Nginx Reverse Proxy Container          │
                     └───────────────────────┬───────────────────────┘
                                             │ Proxy /api/* (Port 8000)
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │          FastAPI Backend Application          │
                     │                 (Python 3.11)                 │
                     └───────┬───────────────────────────────┬───────┘
                             │                               │
              ┌──────────────┴──────────────┐ ┌──────────────┴──────────────┐
              ▼                             ▼ ▼                             ▼
   ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
   │ Ingestion Pipeline │         │  ML & Risk Engine  │         │ Graph Architecture │
   │ (CSV/JSON Loaders, │         │ (Isolation Forest, │         │ (NetworkX Engine,  │
   │ Normalization)     │         │  K-Means, Evidence)│         │  Subgraphs, Paths) │
   └──────────┬─────────┘         └──────────┬─────────┘         └──────────┬─────────┘
              │                              │                              │
              └──────────────────────────────┼──────────────────────────────┘
                                             ▼
                     ┌───────────────────────────────────────────────┐
                     │           Local Analytical Storage            │
                     │    • Apache Parquet (wallets, txs, features)  │
                     │    • DuckDB Embedded SQL Analytics            │
                     │    • Pickled NetworkX Graph Artifacts         │
                     │    • Joblib Serialized Models (IF, K-Means)   │
                     └───────────────────────────────────────────────┘
```

---

## End-to-End Data Pipeline

1. **Import:** Analyst uploads a CSV or JSON dataset via the Web UI or API.
2. **Validation:** Ingestion loader verifies schema integrity, timestamps, and address formats.
3. **Normalization:** Loader extracts individual transactions, inputs, outputs, and network links into relational tables.
4. **Columnar Storage:** Normalized data is persisted into local Apache Parquet tables and indexed in DuckDB.
5. **Feature Extraction:** 24 behavioral and network entropy features are calculated per wallet.
6. **AI Anomaly Detection:** Isolation Forest computes unsupervised outlier scores.
7. **Risk Scoring:** Multi-component risk model calculates composite 0–100 scores and assigns risk tiers.
8. **Behavioral Clustering:** K-Means segments wallets into $K=6$ profiles and calculates PCA coordinates.
9. **Graph Compilation:** NetworkX synthesizes wallet, transaction, IP, ASN, and country nodes and links.
10. **Lead Ranking:** Alerts engine indexes flagged entities and formats natural-language "Why Flagged" explanations.
11. **Dossier Exploration:** Analyst inspects specific wallets, evaluates cluster similarities, and reviews transaction histories.
12. **Graph Navigation:** Analyst traces multi-hop transactional and network paths in the 3D link-analysis canvas.

---

## Docker & Offline Deployment

NIRIKSHAK is engineered for reliable, offline operation on Linux workstations.

### Container Architecture
- **`nirikshak_backend`:** Python 3.11 container running FastAPI, Uvicorn, DuckDB, scikit-learn, and NetworkX.
- **`nirikshak_frontend`:** Lightweight Alpine Linux container with Nginx serving the compiled React single-page application and proxying `/api/*` requests to the backend.
- **Data Volume Persistence:** Local directory `./backend/data` is mounted into the backend container, ensuring datasets, analytical Parquet tables, and model artifacts persist across restarts.

### Offline Guarantee
- **Zero Cloud Dependence:** No OpenAI, no external LLM APIs, no public blockchain RPC endpoints.
- **Build vs. Runtime Separation:** Docker images are built when base images/packages are accessible. Once built, the platform executes **100% offline** without network connectivity.

---

## System Requirements

- **Operating System:** Linux (Ubuntu 20.04+, Debian 11+, RHEL 8+) or macOS (12+).
- **Container Runtime:** Docker Engine 24.0+ and Docker Compose v2+.
- **Native Python (if running without Docker):** Python 3.10, 3.11, or 3.12.
- **Node.js (if running without Docker):** Node.js 18+ or 20+ and npm.
- **System Memory:** 4 GB RAM minimum (8 GB recommended for large graph analysis).
- **Disk Space:** 2 GB free disk space.

---

## Quick Start — Native Local Environment

### 1. Clone the Repository
```bash
git clone https://github.com/AnujMalviya20/Nirikshak-.git
cd Nirikshak-
```

### 2. Launch Using Automated Demo Launcher (Recommended)
```bash
chmod +x run_demo.sh
./run_demo.sh
```
*The script automatically verifies Python and Node.js environments, launches both services, and configures graceful cleanup on exit.*

### 3. Manual Startup (Alternative)

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Frontend (in a separate terminal):**
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

- **Frontend Console:** [http://localhost:5173](http://localhost:5173)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## Quick Start — Docker Environment

### 1. Build Containers
```bash
docker compose build
```

### 2. Start Application
```bash
docker compose up -d
```

### 3. Verify Container Status
```bash
docker compose ps
```

### 4. Access Platform
Open your browser and navigate to:
```text
http://localhost:5173
```

To view live container logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```

---

## Live Demo Walkthrough

Follow this step-by-step sequence during evaluations or presentations:

1. **Open NIRIKSHAK:** Navigate to `http://localhost:5173` and click **Launch Console**.
2. **Import Dataset:** In the Overview dashboard, click **Import Dataset**. Select either:
   - Your custom CSV/JSON transaction file, or
   - The pre-loaded verified benchmark dataset (`backend/data/demo_transactions.csv`).
3. **Inspect Ingestion Telemetry:** Watch the real-time processing telemetry confirm validation, Parquet normalization, Isolation Forest execution, K-Means clustering, and graph compilation.
4. **Review Dashboard Metrics:** Verify updated dataset summary counters (5,000 transactions, 4,915 wallets, 10,650 graph nodes).
5. **Open Ranked Investigative Lead:** Navigate to the **Alerts** tab. Click the top-ranked lead (`bc1qa0fa87eac1de3da717bcfdc46ebb04276a`, Risk Score ~89.2).
6. **Examine "Why Flagged" Evidence:** Inspect the explainable breakdown detailing high transaction velocity, burst rate, and counterparty dispersion.
7. **Analyze Behavioral Cluster:** Review the wallet's cluster assignment and observe similar wallets flagged with equivalent behavioral profiles.
8. **Explore 3D Network Graph:** Switch to the **Network** tab. Search for the wallet address. Inspect 1-hop and 2-hop connected counterparties, transaction nodes, and associated broadcast IP addresses.
9. **Execute Path Analysis:** Trace fund flows between suspected counterparties using the shortest-path query engine.
10. **Review Entities Registry:** Access the **Entities** tab to evaluate multi-column sorting across risk levels and anomaly scores.
11. **Run Pipeline Check:** Click **Run Pipeline Check** in the header to execute an automated self-diagnostic verifying that all subsystem endpoints are healthy.

---

## Verified Prototype Metrics

The following metrics have been verified on the standard benchmark dataset bundled with the repository (`demo_transactions.csv`):

| Metric | Verified Value | Description |
| :--- | :--- | :--- |
| **Total Transactions** | `5,000` | Normalized Bitcoin transactions |
| **Total Unique Wallets** | `4,915` | Discovered source and destination addresses |
| **Investigation Graph Nodes** | `10,650` | Wallets (4,915), Txs (5,000), IPs (710), ASNs (16), Countries (9) |
| **Investigation Graph Edges** | `38,954` | Inputs, outputs, counterparty flows, and network observations |
| **Statistically Unusual Wallets** | `246` | Flagged by Isolation Forest and prioritized using behavioral evidence |
| **Behavioral Clusters** | `6` | Distinct behavioral profiles computed via K-Means ($K=6$) |
| **Highest Lead Risk Score** | `89.23 / 100` | Top investigative lead (`bc1qa0fa87eac1de3da717bcfdc46ebb04276a`) |
| **Automated Unit Tests** | `44 / 44 PASSED` | Complete backend test suite (`backend/tests/`) |

> *Clarification:* The 246 flagged entities represent statistically anomalous behaviors prioritized for human investigation, not confirmed criminal users.

---

## Technical Stack

### Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Bundler:** Vite 5
- **Styling:** Tailwind CSS + Custom Dark Theme Glassmorphism
- **Motion & Interactions:** Framer Motion
- **Data Visualization:** Three.js, React Force Graph 3D
- **Icons:** Lucide React
- **Production Server:** Nginx (Alpine Linux)

### Backend
- **Framework:** FastAPI
- **Server:** Uvicorn (ASGI)
- **Data Modeling:** Pydantic v2
- **Data Processing:** Polars, DuckDB, Apache Parquet
- **Machine Learning:** scikit-learn (Isolation Forest, K-Means, PCA)
- **Graph Engine:** NetworkX
- **Serialization:** Joblib

### Deployment & Infrastructure
- **Containerization:** Docker Engine, Docker Compose
- **Target Environment:** Linux (x86_64 / ARM64), macOS
- **Network Mode:** Standalone, air-gapped offline operation

---

## Repository Structure

```text
NIRIKSHAK/
├── docker-compose.yml              # Multi-container Docker deployment configuration
├── run_demo.sh                     # Native Linux/macOS launcher script
├── README.md                       # Primary repository documentation
├── implementation_plan.md          # SIH26146 architectural specification
├── backend/
│   ├── Dockerfile                  # Python 3.11 slim production container definition
│   ├── requirements.txt            # Python dependencies
│   ├── README.md                   # Backend-specific architecture guide
│   ├── app/
│   │   ├── main.py                 # FastAPI application entrypoint & routing
│   │   ├── graph/
│   │   │   └── builder.py          # NetworkX multi-layer investigation graph compiler
│   │   ├── ml/
│   │   │   ├── anomaly.py          # Isolation Forest anomaly detection engine
│   │   │   ├── clustering.py       # K-Means behavioral clustering (K=6)
│   │   │   ├── evidence.py         # Natural-language "Why Flagged" explainability
│   │   │   ├── features.py         # 24-dimensional behavioral feature extraction
│   │   │   └── risk.py             # Multi-component risk scoring (0-100)
│   │   ├── pipeline/
│   │   │   ├── loader.py           # CSV/JSON validation and dataset ingestion
│   │   │   └── storage.py          # Parquet normalization and DuckDB engine
│   │   ├── routers/
│   │   │   ├── alerts.py           # Ranked investigative leads API
│   │   │   ├── analysis.py         # AI analysis orchestration API
│   │   │   ├── clusters.py         # Behavioral clustering API
│   │   │   ├── datasets.py         # Real dataset upload and lifecycle API
│   │   │   ├── graph.py            # Graph subgraphs, search, and pathfinding API
│   │   │   └── investigations.py   # Entity dossiers and detailed investigation API
│   │   └── schemas/
│   │       ├── clustering.py       # Pydantic schemas for clustering responses
│   │       └── transaction.py      # Pydantic schemas for transactions and datasets
│   ├── data/                       # Local analytical data, Parquet tables, and graphs
│   │   ├── demo_transactions.csv   # Standard 5,000-tx benchmark dataset
│   │   ├── demo_transactions.json  # JSON benchmark dataset
│   │   └── ground_truth.json       # Hidden validation labels
│   ├── models/                     # Serialized Isolation Forest and K-Means models
│   ├── scripts/                    # Phase verification and benchmark generation scripts
│   └── tests/                      # Automated test suite (44 unit and integration tests)
└── frontend/
    ├── Dockerfile                  # Multi-stage Node build & Nginx production container
    ├── nginx.conf                  # Nginx reverse proxy configuration
    ├── package.json                # Frontend dependencies and build scripts
    ├── README.md                   # Frontend portal documentation
    ├── public/                     # Static assets and team member portraits
    │   ├── logo.png                # NIRIKSHAK platform brand logo
    │   └── ...                     # Offline team portraits
    └── src/
        ├── App.tsx                 # Client routing and shell layout
        ├── components/
        │   ├── AlertsPage.tsx      # Ranked alerts management component
        │   ├── DatasetImportModal.tsx # Real-time CSV/JSON dataset upload dialog
        │   ├── Footer.tsx          # Platform footer and attribution
        │   ├── NavigationBar.tsx   # Top navigation bar
        │   ├── WalletInvestigation.tsx # In-depth wallet dossier viewer
        │   └── clustering/         # Behavioral cluster visualizers
        ├── lib/
        │   └── api.ts              # Typed API client for FastAPI backend
        └── pages/
            ├── AboutUs.tsx         # "The Architects" team presentation
            ├── Dashboard.tsx       # Core investigation console
            └── Home.tsx            # Platform introduction page
```

---

## Responsible Interpretation & Ethics

NIRIKSHAK is engineered as an investigative decision-support system:

1. **Statistical Anomaly vs. Guilt:** Isolation Forest identifies statistical outliers based on distribution patterns. An unusual pattern does not constitute illegal conduct.
2. **Correlation vs. Ownership:** Association between a transaction ID and a broadcast IP indicates network relay observation, not legal or physical control of private keys.
3. **Human-in-the-Loop:** All flagged leads, risk scores, and cluster profiles are designed to assist qualified forensic analysts, who must verify findings against independent corroborating evidence.

---

## Current Limitations & Roadmap

### Current Prototype Limitations
- **XML Ingestion:** XML input parsing is currently in progress; only CSV and JSON datasets conforming to `schema_v1` are supported.
- **Graph Scale:** The current NetworkX graph engine is in-memory and optimized for prototype datasets (tens of thousands of nodes). Subgraphs are capped to ensure smooth rendering.
- **Enrichment Telemetry:** Geolocation and ASN attributes currently depend on telemetry present in the ingested dataset rather than an integrated offline MaxMind GeoIP2 database.

### Next Development Directions
- Support for streaming real-time mempool telemetry via local Bitcoin Core P2P socket ingestion.
- Integration of an embedded offline GeoLite2 City/ASN database for raw IP enrichment.
- Distributed graph query support using Memgraph or Neo4j for multi-million node transaction graphs.
- Automated generation of cryptographically signed PDF forensic audit reports.

---

## The Architects (Core Team)

NIRIKSHAK was designed and built by **The Architects**:

- **Anuj Malviya** — Data / Backend Engineer
- **Ishan Singh Tomar** — AI / ML Engineer
- **Amay Mishra** — Core Architect
- **Abhishek Verma** — Platform Engineer
- **Aditi Jain** — Research & Development
- **Lakshya Malviya** — Systems Architect

---

## License

All rights reserved. Licensing terms and distribution policies should be established separately by the project maintainers prior to public distribution.

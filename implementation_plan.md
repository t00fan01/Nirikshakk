# NIRIKSHAK — Implementation Plan
### SIH26146 — AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic (NTRO)
### Internal Hackathon Prototype Specification

---

## 1. Project Goal

Build NIRIKSHAK, an offline-capable Bitcoin transaction intelligence platform that ingests
network + blockchain metadata, correlates network-layer signals (IP/port/timing) with
blockchain-layer signals (wallet/TXID/amount), and surfaces ranked, explainable
investigative leads through a graph-driven dashboard.

**Immediate objective:** a college internal-hackathon prototype with 3 real, working
end-to-end features on top of the existing frontend, not the full SIH system.

---

## 2. Problem Understanding

SIH26146 (NTRO, Blockchain & Cybersecurity) requires an **offline Linux system** that:
- Ingests CSV/JSON/XML Bitcoin transaction + P2P network metadata
- Builds an IP ↔ wallet ↔ transaction entity graph
- Runs real ML (not rules-only) for anomaly detection
- Clusters related wallets/entities
- Detects laundering-like structures (peeling chains, mixing-like behavior)
- Produces ranked, explainable, confidence-scored investigative leads
- Presents results via dashboard + link-analysis visualization
- Never asserts identity or guilt — outputs are leads/evidence, not proof

---

## 3. Current NIRIKSHAK State (as of this prototype)

**Frontend (React + TypeScript + Tailwind + Framer Motion)** — already the strongest
asset in the project. Existing pages/components:
- Overview, Network (3D force graph — currently mock/random data), Alerts (UI complete,
  but `GET /api/alerts` unimplemented → "Unable to load alerts"), Investigate, Entities,
  Transactions, Reports
- AccountInvestigation, ModelAnalytics, RiskBreakdown, IntelligenceTrends,
  LiveThreatFeed, NavigationBar, Preloader, SmoothScroll

**Backend:** does not exist yet. No FastAPI service, no data pipeline, no ML.

**Design system (extracted from current screens — see Section 17 for full spec):**
black/emerald sidebar, off-white content panels, orange accent `#FF4F00`, emerald status
dot for "ACTIVE" states, serif display headings ("NIRIKSHAK", "Alerts"), uppercase
letter-spaced labels, rounded-2xl cards, glassmorphic dark graph canvas.

---

## 4. What Stays

- Entire current navigation IA and page skeletons
- Visual language: colors, typography, card/rounding system, animation style
- 3D force-graph component (rewired to consume real graph data instead of random)
- Alerts page layout (stat chips, filters, review queue) — only the data source changes

## 5. What Gets Added

- FastAPI backend service with the 3 working vertical slices (ingestion → ML → graph)
- Synthetic Bitcoin metadata dataset generator + hidden ground-truth file
- Polars/DuckDB/Parquet local data layer
- Isolation Forest anomaly model + feature engineering pipeline
- Risk-scoring/explanation engine (feature attribution → human-readable reasons)
- Real graph API (`/api/graph/{entity_id}`) feeding the existing 3D graph component
- "Why Flagged" evidence panel wired into Investigate/Alert-detail flow

## 6. What Remains Mocked / UI-Shell-Only for the Internal Prototype

Entity clustering (simple first-pass only, optional), peeling-chain detection (one
scripted demo scenario only), Timeline Replay, Cluster Explorer, Case/Report export,
full CoinJoin classification, GNN/GraphSAGE/GAT, multi-user auth, live blockchain
ingestion. These get clearly labeled placeholder states in the UI, not fake data
presented as real.

---

## 7. Final Architecture (Prototype)

```
CSV/JSON/XML upload
      │
      ▼
FastAPI: schema validation + normalization (Pydantic)
      │
      ▼
Polars (lazy) → normalized tables (transactions, wallets, network_observations)
      │
      ▼
Parquet (local storage) ── DuckDB (analytical queries)
      │
      ▼
Feature engineering (per-wallet/tx features)
      │
      ▼
NetworkX graph build (Wallet–Transaction–IP–ASN–Country edges)
      │
      ▼
Isolation Forest → anomaly_score
      │
      ▼
Risk Engine (anomaly + graph + flow-pattern signals → 0–100 risk score + confidence)
      │
      ▼
Explanation Engine (feature attribution → investigator-readable reasons)
      │
      ▼
FastAPI REST endpoints
      │
      ▼
React frontend (existing Overview/Network/Alerts/Investigate pages)
```

---

## 8. Tech Stack (Prototype-Scoped)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React, TypeScript, Tailwind, Framer Motion, existing 3D graph lib | Already built, offline-capable |
| Backend | FastAPI + Pydantic | Fast to build, auto-docs, strong typing for the schema this problem needs |
| Data | Polars (lazy) + DuckDB + Parquet | Offline-friendly, fast on a laptop-scale synthetic dataset, no server DB needed |
| Graph | NetworkX | Small graphs (hundreds–low thousands of nodes) don't need igraph's performance ceiling yet |
| ML | scikit-learn Isolation Forest | Real unsupervised anomaly detection, explainable, no labels required, fast to train |
| Clustering (optional) | Common-input heuristic + simple graph connectivity | HDBSCAN/Node2Vec deferred to final SIH scope — not needed to prove the concept |
| Explainability | Manual feature-attribution table (SHAP deferred) | SHAP adds real value later; for prototype, Isolation Forest's per-feature deviation is enough and faster to ship |
| Deployment | Docker Compose, dev on macOS, target Linux | Standard container parity |
| GeoIP | Local MaxMind GeoLite2 DB (offline) | No network calls needed |

Everything here runs with zero external API calls — satisfies the offline requirement
from day one.

---

## 9. Dataset Schema

```
timestamp, src_ip, dst_ip, src_port, dst_port, txid,
input_addresses[], output_addresses[], input_amounts[], output_amounts[],
fee, script_type, geo_country, ASN
```

Versioned as `schema_v1` so the official SIH dataset can be swapped in later without
touching the pipeline downstream of the validator.

---

## 10. Synthetic Dataset Generator

Python generator (`scripts/generate_dataset.py`), configurable: transaction count,
wallet count, IP count, time range, anomaly %, cluster count, suspicious-flow count,
amount range.

Produces:
- `data/demo_transactions.csv` / `.json`
- `data/ground_truth.json` (hidden — labels: normal / anomaly / burst / peeling-like /
  suspicious cluster / network-correlated; used only for offline model evaluation,
  never exposed in the UI)

Generation includes: majority normal traffic; a scripted suspicious cluster
(Wallet A→B→C→D rapid multi-hop flow); shared/noisy IPs so the model isn't trivially
easy; timing variation; one peeling-chain-like structure for the demo.

---

## 11. Real Data Pipeline (Production-Shape, Used at Reduced Scope in Prototype)

1. Upload → 2. Schema validation → 3. Normalization → 4. Local GeoIP/ASN enrichment →
5. Feature engineering → 6. Local storage (Parquet) → 7. Graph generation →
8. ML analysis → 9. Risk scoring → 10. Evidence generation → 11. FastAPI exposes
results → 12. React consumes API → 13. Analyst investigates → 14. Report export
(export step is UI-shell only in prototype).

---

## 12. ML Architecture

**Features:** amount, frequency, time-gap, in/out counts, wallet degree, counterparty
count, in/out ratio, burstiness, amount fragmentation, IP/ASN/country diversity,
network-observation count.

**Model:** Isolation Forest (unsupervised), trained on normalized per-wallet/tx feature
vectors. Output: anomaly_score (0–1), converted into a percentile-ranked severity.

**Evaluation:** precision/recall against the hidden ground-truth labels — reported
honestly, never fabricated (see Section 18).

---

## 13. Graph Architecture

Node types: Wallet, Transaction, IP, ASN, Country, Entity/Cluster.
Edges: Wallet→Transaction, Transaction→Wallet, Transaction→IP, IP→ASN, IP→Country,
Wallet→Wallet (heuristic), Wallet→Entity.

Prototype constraints: never render the full graph — always a filtered subgraph
(selected entity's neighborhood, hop-limited, risk-filtered). Search, zoom, pan,
highlight-path, and click-for-evidence are required interactions, reusing the existing
3D graph component for the network overview and adding a simpler 2D neighborhood view
for investigation (per the original 2D-investigation / 3D-overview split — justified
because path-tracing readability degrades in 3D at anything beyond ~30 nodes).

---

## 14. Risk Architecture

```
anomaly_score + graph_score + flow_pattern_score + network_correlation + entity_similarity
        → weighted Risk Engine → 0–100 risk score
```

Score is **not** presented as a probability (not calibrated in prototype). Confidence
is reported separately from risk: risk = "how unusual/suspicious," confidence = "how
much evidence supports this specific score." Thresholds are configurable, not
hardcoded, so false-positive tuning is a slider, not a redeploy.

---

## 15. Explainability Architecture

Model layer → per-feature deviation from baseline. Investigator layer → template
sentences ("Transaction activity is significantly more burst-like than the learned
normal baseline"). Visual layer → highlighted nodes/edges/path on the graph tied to
the same evidence. No raw ML jargon exposed without a plain-language translation next
to it.

---

## 16. API Design (Prototype Minimum)

```
POST /api/datasets/upload
POST /api/analysis/run
GET  /api/analysis/status
GET  /api/stats
GET  /api/alerts
GET  /api/alerts/{id}
GET  /api/graph/{entity_id}
GET  /api/graph/{entity_id}/subgraph
```
`GET /api/wallets/{address}`, `/transactions/{txid}`, `/timeline/{entity_id}`,
`/report/{id}` are stubbed to return placeholder/"not yet available" responses so the
frontend can wire to them without breaking, but aren't implemented for the internal
demo.

---

## 17. Frontend Architecture & Current Style Guide (preserve as-is)

**Do not redesign.** Extracted from the existing Overview/Network/Alerts screens:

- **Palette:** primary background off-white `#F4F5F1`-ish; dark panel/sidebar
  near-black-emerald `#0B1F17`–`#0E251C`; accent orange `#FF4F00`; emerald/green
  status `#2FBF71`-ish for "ACTIVE"/positive states; graph canvas near-black `#0A0A0A`
  with orange (high-risk) and emerald (normal/low-risk) node coloring.
- **Typography:** serif display face for big headings ("NIRIKSHAK", "Alerts", stat
  numbers) paired with a clean sans-serif for labels/body; labels are uppercase with
  wide letter-spacing (e.g. "OPERATIONAL STATUS", "DATASET INDEX").
- **Cards:** large rounded-2xl white cards on the light canvas; dark rounded-2xl panels
  for graph/status widgets; soft shadow, no hard borders.
- **Sidebar:** dark emerald-black, active nav item gets solid orange pill background.
- **Status indicators:** small colored dot + label (emerald = active/good, orange =
  anomaly/attention).
- **Motion:** Framer Motion for panel/transition animation; graph has ambient particle
  motion.
- Rule for all new components: reuse this exact token set — don't introduce new colors,
  fonts, or corner radii.

---

## 18. Prototype Scope — Real vs Mocked

**Real:** dataset ingestion, Isolation Forest anomaly detection, ranked alerts,
investigation graph for analyzed data, why-flagged explanations from actual model
features.

**Optional real (time-permitting):** simple entity clustering (common-input
heuristic), one scripted peeling-pattern detector.

**Mock/placeholder (clearly labeled in UI, not disguised as working):** GNN/temporal
graph intelligence, full CoinJoin classification, case management, report export,
real-time streaming, live blockchain ingestion, Timeline Replay, Cluster Explorer.

---

## 19. Final SIH Scope (Beyond Prototype)

Full entity clustering (Node2Vec + HDBSCAN), peeling-chain/CoinJoin detection models,
SHAP-based explainability, risk-score calibration, case management, temporal graph
learning, performance work for large datasets, hardened offline Linux deployment.

---

## 20. Implementation Phases

| Phase | Deliverable |
|---|---|
| 1 | Synthetic dataset generator + ground truth |
| 2 | FastAPI skeleton + Pydantic schema validation + upload endpoint |
| 3 | Polars/DuckDB/Parquet normalization + storage |
| 4 | Feature engineering + Isolation Forest + risk engine |
| 5 | NetworkX graph build + `/api/graph/*` endpoints |
| 6 | Explanation engine + alert payload shaping |
| 7 | Frontend wiring: Overview stats, Alerts list, Investigate graph, Why-Flagged panel |
| 8 | Demo scenario scripting + rehearsal |

---

## 21. Team Responsibilities

To be assigned per teammate strengths — suggested split: (a) data/ML pipeline
(generator, Polars/DuckDB, Isolation Forest, risk engine), (b) backend API/graph
(FastAPI, NetworkX, endpoints), (c) frontend integration (wiring existing components
to real endpoints, Why-Flagged panel, graph data binding).

---

## 22. Evaluation Metrics

Precision/recall/F1 of Isolation Forest against hidden ground-truth labels; alert
ranking quality (are labeled anomalies in the top-N ranked alerts); ingestion
correctness (valid vs rejected record counts match expected); graph correctness
(spot-check known suspicious flow renders correctly).

## 23. Testing Strategy

Unit tests on schema validator and feature engineering functions; integration test for
the full upload→analyze→alert pipeline against the synthetic dataset; manual QA of the
demo scenario end-to-end before presentation.

## 24. Offline Linux Deployment Strategy

Docker Compose services (`api`, optionally a static file server for the built React
app) with no outbound network calls at runtime — ML model artifacts, GeoIP DB, and all
data local to the container volume. Developed on macOS via Docker for parity, tested
on an Ubuntu target before demo day.

## 25. Performance Strategy

Lazy/streaming Polars reads; DuckDB for analytical queries over Parquet; graph API
never returns the full graph — only requested subgraphs (selected entity neighborhood,
hop-limited); frontend requests top-N alerts, not the entire alert set.

## 26. Security / Trust Considerations

Never state "criminal identified" — always "high-risk investigative lead." Never state
"IP proves ownership" — always "network observation correlated with transaction
activity." No fabricated accuracy/precision claims — only report numbers actually
measured against ground truth.

## 27. Research References (to expand before final SIH submission)

Placeholder — final version should include: Meiklejohn et al. (2013) on Bitcoin
address clustering heuristics (supports the common-input clustering approach, with the
known limitation that CoinJoin/mixing defeats the heuristic); foundational anomaly
detection literature for Isolation Forest (Liu et al., 2008); and current
graph-neural-network-for-illicit-transaction-detection literature to justify the final
SIH GNN roadmap phase. Full citation pass recommended once core build is stable.

## 28. Existing Product Comparison

Chainalysis Reactor, Elliptic Investigator, and TRM Forensics already do
production-grade address clustering, entity attribution, and case management at
massive scale with proprietary data. NIRIKSHAK doesn't compete on those fronts. Its
differentiation for SIH26146 specifically is the **network-layer + blockchain-layer
correlation** (IP/port/timing tied to wallet/TXID) and a fully **offline, self-hosted**
architecture — which matches NTRO's stated requirement in a way general-purpose
commercial tools aren't built around.

## 29. Risks and Mitigations

- Isolation Forest flags too much/little → mitigate with configurable sensitivity
  threshold (already present in UI) and dataset tuning before demo.
- Graph rendering breaks on real data shape → mitigate by hop-limiting and testing
  with the scripted suspicious-cluster scenario early, not last.
- Backend not ready in time → mitigate by building ingestion → alerts → graph in that
  exact order, since each is independently demoable.

## 30. 5-Minute Prototype Demo

Open NIRIKSHAK → Investigate console → upload dataset → show ingestion stats → Run
Analysis → show stages → show ranked high-risk alerts → open top alert → Why Flagged →
open graph → show Wallet→TX→Wallet→TX flow → show network correlation → show risk
score → state that clustering/peeling detection extend in the final SIH build.

## 31. Future SIH Expansion

Node2Vec + HDBSCAN clustering, peeling-chain/CoinJoin models, SHAP explainability,
calibrated risk scoring, case management + export, temporal graph learning, hardened
performance for full-scale datasets.

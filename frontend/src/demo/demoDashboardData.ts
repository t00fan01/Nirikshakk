/**
 * demoDashboardData.ts
 * ------------------------------------------------------------------
 * NIRIKSHAK AI — Standalone Frontend Demo Data Source (V3 Polish)
 * 
 * Central deterministic single source of truth for:
 * - Overview Dashboard KPIs & Investigation Status
 * - Top Investigative Leads
 * - Alerts Review Queue (12 alerts)
 * - Entity Intelligence Directory (42 entities: Wallets, Txs, IPs, ASNs, Geos)
 * - Transactions Forensic Registry (48 transactions)
 * - Active Investigation Dossier (NIR-INV-0007 / Root Target)
 * - Generated Demo Investigation Reports (5 reports with preview modals)
 * 
 * ZERO Math.random() — 100% deterministic and reproducible.
 * ------------------------------------------------------------------
 */

import { DEMO_ROOT_WALLET_ADDRESS, MASTER_GRAPH } from './demoGraphData';
import {
  AlertRecord,
  WalletClusterDetailResponse,
  WalletInvestigationResponse,
} from '../lib/api';

// =========================================================================
// 1. DASHBOARD OVERVIEW KPIS & INVESTIGATION STATUS
// =========================================================================

export const DEMO_OVERVIEW_KPIS = {
  totalEntities: 116228,
  transactionsAnalyzed: 15000,
  networkObservations: 29478,
  highRiskEntities: 38,
  activeAlerts: 12,
  investigativeLeads: 8,
  datasetName: "NIRIKSHAK DEMO DATASET",
  status: "ANALYSIS COMPLETE",
  graphStatus: "ACTIVE",
  lastAnalysis: "09 SEP 2026 — 14:32 UTC",
};

export const DEMO_RISK_DISTRIBUTION = [
  { level: "LOW", count: 67412, percentage: 58.0, color: "#14E0A8", desc: "Standard retail & verified merchant activity" },
  { level: "MODERATE", count: 27894, percentage: 24.0, color: "#FFB020", desc: "Elevated transaction velocity or hop count" },
  { level: "HIGH", count: 15110, percentage: 13.0, color: "#FF4F00", desc: "Structural peeling, fan-in/fan-out, or hosting anomaly" },
  { level: "CRITICAL", count: 5812, percentage: 5.0, color: "#FF3B1F", desc: "Confirmed obfuscation, mixing pool, or bridge conduit" },
];

// =========================================================================
// 2. TOP INVESTIGATIVE LEADS (5-8 Leads)
// =========================================================================

export interface InvestigativeLead {
  leadId: string;
  wallet: string;
  shortWallet: string;
  riskScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM";
  primarySignal: string;
  connectedEntities: number;
  status: "ACTIVE INVESTIGATION" | "INVESTIGATING" | "FLAGGED" | "ESCALATED" | "MONITORING" | "OPEN";
  community: string;
  volumeBtc: string;
}

export const DEMO_INVESTIGATIVE_LEADS: InvestigativeLead[] = [
  {
    leadId: "NIR-LEAD-001",
    wallet: DEMO_ROOT_WALLET_ADDRESS,
    shortWallet: "bc1qa0fa...276a",
    riskScore: 87,
    riskLevel: "HIGH",
    primarySignal: "Cross-cluster bridge + high transaction velocity",
    connectedEntities: 12,
    status: "ACTIVE INVESTIGATION",
    community: "Community A (High-Activity Core)",
    volumeBtc: "64.8190 BTC",
  },
  {
    leadId: "NIR-LEAD-002",
    wallet: "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
    shortWallet: "bc1q9d8x...419c",
    riskScore: 74,
    riskLevel: "HIGH",
    primarySignal: "Dense counterparty fan-in concentration",
    connectedEntities: 9,
    status: "INVESTIGATING",
    community: "Community A (High-Activity Core)",
    volumeBtc: "28.4000 BTC",
  },
  {
    leadId: "NIR-LEAD-003",
    wallet: "bc1q00f7c2m5p8r1t4w7y0u3i6o9a2s5d8f1g4h76621",
    shortWallet: "bc1q00f7...6621",
    riskScore: 91,
    riskLevel: "CRITICAL",
    primarySignal: "Critical consolidation sink / Rapid accumulation",
    connectedEntities: 16,
    status: "ESCALATED",
    community: "Community C (Fan-In Consolidation)",
    volumeBtc: "53.8000 BTC",
  },
  {
    leadId: "NIR-LEAD-004",
    wallet: "bc1q8r4t2w9y1u3i5o7p9a1s3d5f7g9h1j3k58821",
    shortWallet: "bc1q8r4t...8821",
    riskScore: 82,
    riskLevel: "CRITICAL",
    primarySignal: "Peeling chain progression origin",
    connectedEntities: 8,
    status: "INVESTIGATING",
    community: "Community B (Peeling / Layering Chain)",
    volumeBtc: "18.5000 BTC",
  },
  {
    leadId: "NIR-LEAD-005",
    wallet: "bc1qeeOut4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j9m2",
    shortWallet: "bc1qeeOu...j9m2",
    riskScore: 93,
    riskLevel: "CRITICAL",
    primarySignal: "Critical post-mix staging wallet",
    connectedEntities: 14,
    status: "FLAGGED",
    community: "Community E (Wasabi / CoinJoin Mixing)",
    volumeBtc: "26.4000 BTC",
  },
  {
    leadId: "NIR-LEAD-006",
    wallet: "bc1qbridgeEF3i6o9a2s5d8f1g4h7j0k3m6p9r2t5w",
    shortWallet: "bc1qbrEF...2t5w",
    riskScore: 83,
    riskLevel: "HIGH",
    primarySignal: "Cross-cluster bridge / Post-mix network correlation transit",
    connectedEntities: 7,
    status: "FLAGGED",
    community: "Community E (Wasabi / CoinJoin Mixing)",
    volumeBtc: "3.8000 BTC",
  },
  {
    leadId: "NIR-LEAD-007",
    wallet: "3K7c991a8m2t5w8y1u4i7o0a3s6d9f2g5h8991a",
    shortWallet: "3K7c991a...991a",
    riskScore: 62,
    riskLevel: "HIGH",
    primarySignal: "Fan-out concentration source (1-to-7)",
    connectedEntities: 11,
    status: "MONITORING",
    community: "Community D (Fan-Out Dispersal)",
    volumeBtc: "38.6000 BTC",
  },
  {
    leadId: "NIR-LEAD-008",
    wallet: "bc1q2d8x94k184q2p0a6y0r8j2m6e4w1t9q7u9911",
    shortWallet: "bc1q2d8x...9911",
    riskScore: 71,
    riskLevel: "HIGH",
    primarySignal: "Unusual burst activity above 3-sigma baseline",
    connectedEntities: 6,
    status: "OPEN",
    community: "Community A (High-Activity Core)",
    volumeBtc: "21.0000 BTC",
  },
];

// =========================================================================
// 3. ALERTS REVIEW QUEUE (12 Deterministic Alerts)
// =========================================================================

export interface DemoAlert {
  alertId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  entity: string;
  entityType: "wallet" | "network observation" | "transaction";
  signal: string;
  riskScore: number;
  detectedTime: string;
  status: "OPEN" | "INVESTIGATING" | "ESCALATED" | "RESOLVED";
  relatedTransactions: string[];
}

export const DEMO_ALERTS: DemoAlert[] = [
  {
    alertId: "ALT-0001",
    severity: "CRITICAL",
    entity: "bc1qeeOut4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j9m2",
    entityType: "wallet",
    signal: "Critical post-mix staging wallet receiving uniform 1.0 BTC output",
    riskScore: 93,
    detectedTime: "2026-09-22 17:48:12 UTC",
    status: "OPEN",
    relatedTransactions: ["e1111111baed91938481928374a8c818815ea7d4323c2132d732c5aa6ee038194"],
  },
  {
    alertId: "ALT-0002",
    severity: "CRITICAL",
    entity: "bc1q00f7c2m5p8r1t4w7y0u3i6o9a2s5d8f1g4h76621",
    entityType: "wallet",
    signal: "Massive 8-to-1 fan-in consolidation accumulating 53.8 BTC in single block",
    riskScore: 91,
    detectedTime: "2026-09-22 17:15:30 UTC",
    status: "ESCALATED",
    relatedTransactions: ["c1111111e0381948baed91938481928374a8c818815ea7d4323c2132d732c5aa6e"],
  },
  {
    alertId: "ALT-0003",
    severity: "HIGH",
    entity: DEMO_ROOT_WALLET_ADDRESS,
    entityType: "wallet",
    signal: "Cross-cluster bridge + high transaction velocity",
    riskScore: 87,
    detectedTime: "2026-09-22 16:32:05 UTC",
    status: "INVESTIGATING",
    relatedTransactions: [
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8",
    ],
  },
  {
    alertId: "ALT-0004",
    severity: "HIGH",
    entity: "185.220.101.42",
    entityType: "network observation",
    signal: "Repeated Tor Exit Relay correlation across multiple community transactions",
    riskScore: 76,
    detectedTime: "2026-09-22 15:50:22 UTC",
    status: "OPEN",
    relatedTransactions: ["8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8"],
  },
  {
    alertId: "ALT-0005",
    severity: "HIGH",
    entity: "bc1q8r4t2w9y1u3i5o7p9a1s3d5f7g9h1j3k58821",
    entityType: "wallet",
    signal: "Sequential single-input peeling chain structure with threshold evasion",
    riskScore: 82,
    detectedTime: "2026-09-22 15:20:44 UTC",
    status: "INVESTIGATING",
    relatedTransactions: ["b1111111ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf065601"],
  },
  {
    alertId: "ALT-0006",
    severity: "HIGH",
    entity: "bc1qbridgeEF3i6o9a2s5d8f1g4h7j0k3m6p9r2t5w",
    entityType: "wallet",
    signal: "Inter-cluster bridge transit linking CoinJoin pool to network infrastructure",
    riskScore: 83,
    detectedTime: "2026-09-22 14:05:18 UTC",
    status: "OPEN",
    relatedTransactions: ["e2222222baed91938481928374a8c818815ea7d4323c2132d732c5aa6ee038195"],
  },
  {
    alertId: "ALT-0007",
    severity: "HIGH",
    entity: "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
    entityType: "wallet",
    signal: "Dense counterparty fan-in consolidation from rapid transit addresses",
    riskScore: 74,
    detectedTime: "2026-09-22 13:40:02 UTC",
    status: "INVESTIGATING",
    relatedTransactions: ["e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  },
  {
    alertId: "ALT-0008",
    severity: "MEDIUM",
    entity: "3K7c991a8m2t5w8y1u4i7o0a3s6d9f2g5h8991a",
    entityType: "wallet",
    signal: "High-fanout disbursement fragmenting 38.6 BTC into 7 downstream wallets",
    riskScore: 62,
    detectedTime: "2026-09-22 13:05:12 UTC",
    status: "OPEN",
    relatedTransactions: ["d1111111a8c818815ea7d4323c2132d732c5aa6ee0381948baed9193848192837"],
  },
  {
    alertId: "ALT-0009",
    severity: "MEDIUM",
    entity: "bc1q2d8x94k184q2p0a6y0r8j2m6e4w1t9q7u9911",
    entityType: "wallet",
    signal: "Unusual burst transaction velocity above 3-sigma baseline",
    riskScore: 71,
    detectedTime: "2026-09-22 11:22:45 UTC",
    status: "INVESTIGATING",
    relatedTransactions: ["16e3c92e10696956f4d2f0945952f444c1143899f1165a250325d70e304f5899"],
  },
  {
    alertId: "ALT-0010",
    severity: "MEDIUM",
    entity: "91.240.118.55",
    entityType: "network observation",
    signal: "Autonomous broadcast from bulletproof hosting ASN (M247 Ltd)",
    riskScore: 65,
    detectedTime: "2026-09-22 10:14:09 UTC",
    status: "RESOLVED",
    relatedTransactions: ["b4444444d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf04"],
  },
  {
    alertId: "ALT-0011",
    severity: "MEDIUM",
    entity: "bc1q7x4e80m6p3k9v2w1t5r8j4m7e2q9u6y1t8821",
    entityType: "wallet",
    signal: "Rapid intermediate transit node transfer with minimal dwell time",
    riskScore: 68,
    detectedTime: "2026-09-22 08:30:15 UTC",
    status: "RESOLVED",
    relatedTransactions: ["e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  },
  {
    alertId: "ALT-0012",
    severity: "LOW",
    entity: "bc1qk4m7p9r2t5w8y1u3i6o8a0s2d4f6g8h0j4421",
    entityType: "wallet",
    signal: "Moderate inbound/outbound ratio anomaly with standard script format",
    riskScore: 56,
    detectedTime: "2026-09-22 06:12:30 UTC",
    status: "RESOLVED",
    relatedTransactions: ["8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8"],
  },
];

export function getDemoAlertRecords(): AlertRecord[] {
  return DEMO_ALERTS.map((a) => ({
    alert_id: a.alertId,
    timestamp: a.detectedTime,
    account_id: a.entity,
    severity: a.severity,
    classification: a.riskScore >= 80 ? "ANOMALOUS" : a.riskScore >= 60 ? "SUSPICIOUS" : "LEGITIMATE",
    risk_score: a.riskScore,
    alert_type: a.signal.split(" ")[0].toUpperCase(),
    reason: a.signal,
    status: a.status,
  }));
}

// =========================================================================
// 4. ENTITY INTELLIGENCE DIRECTORY (42 Visible Entities)
// =========================================================================

export interface DemoEntityRow {
  entityId: string;
  type: "WALLET" | "TRANSACTION" | "IP" | "ASN" | "GEO";
  riskScore: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  transactions: number;
  connections: number;
  firstSeen: string;
  lastSeen: string;
  status: "ACTIVE" | "MONITORED" | "CLEARED" | "FLAGGED";
  keySignal: string;
  community: string;
}

export const DEMO_ENTITIES: DemoEntityRow[] = [
  {
    entityId: DEMO_ROOT_WALLET_ADDRESS,
    type: "WALLET",
    riskScore: 87,
    riskLevel: "HIGH",
    transactions: 48,
    connections: 12,
    firstSeen: "2026-03-14 04:12:08 UTC",
    lastSeen: "2026-09-22 18:41:20 UTC",
    status: "ACTIVE",
    keySignal: "Cross-cluster bridge + high transaction velocity",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "bc1q00f7c2m5p8r1t4w7y0u3i6o9a2s5d8f1g4h76621",
    type: "WALLET",
    riskScore: 91,
    riskLevel: "CRITICAL",
    transactions: 34,
    connections: 16,
    firstSeen: "2026-05-20 10:14:00 UTC",
    lastSeen: "2026-09-22 17:15:30 UTC",
    status: "FLAGGED",
    keySignal: "Critical consolidation sink / Rapid accumulation",
    community: "Community C (Fan-In Consolidation)",
  },
  {
    entityId: "bc1qeeOut4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j9m2",
    type: "WALLET",
    riskScore: 93,
    riskLevel: "CRITICAL",
    transactions: 22,
    connections: 14,
    firstSeen: "2026-07-15 03:40:00 UTC",
    lastSeen: "2026-09-22 17:48:12 UTC",
    status: "FLAGGED",
    keySignal: "Critical post-mix staging wallet",
    community: "Community E (Wasabi / CoinJoin Mixing)",
  },
  {
    entityId: "bc1q8r4t2w9y1u3i5o7p9a1s3d5f7g9h1j3k58821",
    type: "WALLET",
    riskScore: 82,
    riskLevel: "CRITICAL",
    transactions: 19,
    connections: 8,
    firstSeen: "2026-06-01 08:15:30 UTC",
    lastSeen: "2026-09-22 15:20:44 UTC",
    status: "ACTIVE",
    keySignal: "Peeling chain progression origin",
    community: "Community B (Peeling / Layering Chain)",
  },
  {
    entityId: "bc1qbridgeEF3i6o9a2s5d8f1g4h7j0k3m6p9r2t5w",
    type: "WALLET",
    riskScore: 83,
    riskLevel: "HIGH",
    transactions: 16,
    connections: 7,
    firstSeen: "2026-07-18 12:10:00 UTC",
    lastSeen: "2026-09-22 14:05:18 UTC",
    status: "FLAGGED",
    keySignal: "Cross-cluster bridge / Post-mix network correlation transit",
    community: "Community E (Wasabi / CoinJoin Mixing)",
  },
  {
    entityId: "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
    type: "WALLET",
    riskScore: 74,
    riskLevel: "HIGH",
    transactions: 38,
    connections: 9,
    firstSeen: "2026-04-10 11:24:00 UTC",
    lastSeen: "2026-09-22 13:40:02 UTC",
    status: "MONITORED",
    keySignal: "Dense counterparty fan-in concentration",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "bc1q2d8x94k184q2p0a6y0r8j2m6e4w1t9q7u9911",
    type: "WALLET",
    riskScore: 71,
    riskLevel: "HIGH",
    transactions: 26,
    connections: 6,
    firstSeen: "2026-04-12 09:30:00 UTC",
    lastSeen: "2026-09-22 11:22:45 UTC",
    status: "ACTIVE",
    keySignal: "Unusual burst transaction velocity above 3-sigma baseline",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "3K7c991a8m2t5w8y1u4i7o0a3s6d9f2g5h8991a",
    type: "WALLET",
    riskScore: 62,
    riskLevel: "HIGH",
    transactions: 29,
    connections: 11,
    firstSeen: "2026-05-11 16:22:00 UTC",
    lastSeen: "2026-09-22 13:05:12 UTC",
    status: "MONITORED",
    keySignal: "Fan-out concentration source (1-to-7)",
    community: "Community D (Fan-Out Dispersal)",
  },
  {
    entityId: "bc1q7x4e80m6p3k9v2w1t5r8j4m7e2q9u6y1t8821",
    type: "WALLET",
    riskScore: 68,
    riskLevel: "HIGH",
    transactions: 21,
    connections: 5,
    firstSeen: "2026-04-15 14:00:00 UTC",
    lastSeen: "2026-09-22 08:30:15 UTC",
    status: "CLEARED",
    keySignal: "Rapid intermediate transit node transfer",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tl8831",
    type: "WALLET",
    riskScore: 63,
    riskLevel: "HIGH",
    transactions: 18,
    connections: 5,
    firstSeen: "2026-04-18 10:15:00 UTC",
    lastSeen: "2026-09-22 06:45:50 UTC",
    status: "CLEARED",
    keySignal: "Rapid value disbursement pattern",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "bc1qff1m4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j331",
    type: "WALLET",
    riskScore: 68,
    riskLevel: "HIGH",
    transactions: 14,
    connections: 6,
    firstSeen: "2026-08-01 15:10:00 UTC",
    lastSeen: "2026-09-22 09:44:18 UTC",
    status: "MONITORED",
    keySignal: "Network correlated hosting node",
    community: "Community F (Network Infrastructure Correlation)",
  },
  {
    entityId: "bc1p5d8k20w4r6t8j1m9e3q7u5y2t4x8p0m6e3310",
    type: "WALLET",
    riskScore: 48,
    riskLevel: "MEDIUM",
    transactions: 12,
    connections: 4,
    firstSeen: "2026-04-20 18:00:00 UTC",
    lastSeen: "2026-09-21 19:12:00 UTC",
    status: "MONITORED",
    keySignal: "Intermediate relayer",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "bc1qk4m7p9r2t5w8y1u3i6o8a0s2d4f6g8h0j4421",
    type: "WALLET",
    riskScore: 56,
    riskLevel: "MEDIUM",
    transactions: 15,
    connections: 4,
    firstSeen: "2026-04-22 13:45:00 UTC",
    lastSeen: "2026-09-22 06:12:30 UTC",
    status: "CLEARED",
    keySignal: "High inbound/outbound ratio",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "bc1qgg1m4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j111",
    type: "WALLET",
    riskScore: 14,
    riskLevel: "LOW",
    transactions: 42,
    connections: 8,
    firstSeen: "2026-01-19 12:00:00 UTC",
    lastSeen: "2026-09-22 07:15:00 UTC",
    status: "CLEARED",
    keySignal: "Verified OTC Desk / Institutional Gateway",
    community: "Community G (Regulated OTC / Merchant Cluster)",
  },
  {
    entityId: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa8801",
    type: "WALLET",
    riskScore: 28,
    riskLevel: "LOW",
    transactions: 11,
    connections: 3,
    firstSeen: "2026-02-10 08:00:00 UTC",
    lastSeen: "2026-09-21 14:10:00 UTC",
    status: "CLEARED",
    keySignal: "Legacy merchant deposit address",
    community: "Community A (High-Activity Core)",
  },
  // Key Transactions
  {
    entityId: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    type: "TRANSACTION",
    riskScore: 78,
    riskLevel: "HIGH",
    transactions: 1,
    connections: 6,
    firstSeen: "2026-09-22 16:45:11 UTC",
    lastSeen: "2026-09-22 16:45:11 UTC",
    status: "FLAGGED",
    keySignal: "Multi-input Consolidation (14.8250 BTC)",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8",
    type: "TRANSACTION",
    riskScore: 84,
    riskLevel: "CRITICAL",
    transactions: 1,
    connections: 5,
    firstSeen: "2026-09-22 16:50:00 UTC",
    lastSeen: "2026-09-22 16:50:00 UTC",
    status: "ACTIVE",
    keySignal: "Direct Value Transfer (22.4010 BTC) via Tor Exit",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "c1111111e0381948baed91938481928374a8c818815ea7d4323c2132d732c5aa6e",
    type: "TRANSACTION",
    riskScore: 92,
    riskLevel: "CRITICAL",
    transactions: 1,
    connections: 10,
    firstSeen: "2026-09-22 14:28:44 UTC",
    lastSeen: "2026-09-22 14:28:44 UTC",
    status: "FLAGGED",
    keySignal: "Major Multi-Input Consolidation 8-to-1 (53.8000 BTC)",
    community: "Community C (Fan-In Consolidation)",
  },
  {
    entityId: "d1111111a8c818815ea7d4323c2132d732c5aa6ee0381948baed9193848192837",
    type: "TRANSACTION",
    riskScore: 65,
    riskLevel: "HIGH",
    transactions: 1,
    connections: 9,
    firstSeen: "2026-09-22 13:05:12 UTC",
    lastSeen: "2026-09-22 13:05:12 UTC",
    status: "MONITORED",
    keySignal: "Major 1-to-7 Fan-Out Distribution (38.6000 BTC)",
    community: "Community D (Fan-Out Dispersal)",
  },
  {
    entityId: "e1111111baed91938481928374a8c818815ea7d4323c2132d732c5aa6ee038194",
    type: "TRANSACTION",
    riskScore: 91,
    riskLevel: "CRITICAL",
    transactions: 1,
    connections: 13,
    firstSeen: "2026-09-22 11:18:22 UTC",
    lastSeen: "2026-09-22 11:18:22 UTC",
    status: "FLAGGED",
    keySignal: "Chaumian CoinJoin Round 6-in / 6-out (26.4000 BTC)",
    community: "Community E (Wasabi / CoinJoin Mixing)",
  },
  // Key Network IPs
  {
    entityId: "185.220.101.42",
    type: "IP",
    riskScore: 76,
    riskLevel: "HIGH",
    transactions: 4,
    connections: 5,
    firstSeen: "2026-03-14 04:12:00 UTC",
    lastSeen: "2026-09-22 16:50:00 UTC",
    status: "FLAGGED",
    keySignal: "Tor Exit Relay / Privacy Tunnel (84 broadcasts)",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "45.142.179.88",
    type: "IP",
    riskScore: 34,
    riskLevel: "LOW",
    transactions: 2,
    connections: 3,
    firstSeen: "2026-04-10 11:24:00 UTC",
    lastSeen: "2026-09-22 16:45:11 UTC",
    status: "CLEARED",
    keySignal: "P2P Relay Node (31 broadcasts)",
    community: "Community A (High-Activity Core)",
  },
  {
    entityId: "185.220.101.45",
    type: "IP",
    riskScore: 72,
    riskLevel: "HIGH",
    transactions: 3,
    connections: 4,
    firstSeen: "2026-07-15 03:40:00 UTC",
    lastSeen: "2026-09-22 11:18:22 UTC",
    status: "FLAGGED",
    keySignal: "Tor Coordinator Node (65 broadcasts)",
    community: "Community E (Wasabi / CoinJoin Mixing)",
  },
  {
    entityId: "185.191.171.12",
    type: "IP",
    riskScore: 42,
    riskLevel: "MEDIUM",
    transactions: 3,
    connections: 4,
    firstSeen: "2026-06-01 08:15:00 UTC",
    lastSeen: "2026-09-22 14:15:00 UTC",
    status: "MONITORED",
    keySignal: "AWS EC2 Gateway Node (48 broadcasts)",
    community: "Community B (Peeling / Layering Chain)",
  },
  {
    entityId: "91.132.147.10",
    type: "IP",
    riskScore: 52,
    riskLevel: "MEDIUM",
    transactions: 2,
    connections: 3,
    firstSeen: "2026-08-01 15:10:00 UTC",
    lastSeen: "2026-09-22 09:44:18 UTC",
    status: "MONITORED",
    keySignal: "Dedicated Server Hosting (41 broadcasts)",
    community: "Community F (Network Infrastructure Correlation)",
  },
  {
    entityId: "103.14.26.180",
    type: "IP",
    riskScore: 14,
    riskLevel: "LOW",
    transactions: 3,
    connections: 4,
    firstSeen: "2026-01-19 12:00:00 UTC",
    lastSeen: "2026-09-22 07:15:00 UTC",
    status: "CLEARED",
    keySignal: "Exchange API Gateway (52 broadcasts)",
    community: "Community G (Regulated OTC / Merchant Cluster)",
  },
  // Key ASNs
  {
    entityId: "AS9009 (M247 Ltd)",
    type: "ASN",
    riskScore: 74,
    riskLevel: "HIGH",
    transactions: 7,
    connections: 6,
    firstSeen: "2026-01-01 00:00:00 UTC",
    lastSeen: "2026-09-22 18:00:00 UTC",
    status: "FLAGGED",
    keySignal: "High Tor/VPN Relay Density (M247 Europe Backbone)",
    community: "Global Telemetry",
  },
  {
    entityId: "AS14061 (DigitalOcean)",
    type: "ASN",
    riskScore: 32,
    riskLevel: "LOW",
    transactions: 12,
    connections: 9,
    firstSeen: "2026-01-01 00:00:00 UTC",
    lastSeen: "2026-09-22 18:00:00 UTC",
    status: "CLEARED",
    keySignal: "Commercial Cloud Provider (Amsterdam & Frankfurt)",
    community: "Global Telemetry",
  },
  {
    entityId: "AS16509 (Amazon AWS)",
    type: "ASN",
    riskScore: 22,
    riskLevel: "LOW",
    transactions: 8,
    connections: 6,
    firstSeen: "2026-01-01 00:00:00 UTC",
    lastSeen: "2026-09-22 18:00:00 UTC",
    status: "CLEARED",
    keySignal: "Amazon Data Services (US East Virginia)",
    community: "Global Telemetry",
  },
  {
    entityId: "AS24940 (Hetzner)",
    type: "ASN",
    riskScore: 44,
    riskLevel: "MEDIUM",
    transactions: 6,
    connections: 5,
    firstSeen: "2026-01-01 00:00:00 UTC",
    lastSeen: "2026-09-22 18:00:00 UTC",
    status: "MONITORED",
    keySignal: "Hetzner Online GmbH Dedicated Transit",
    community: "Global Telemetry",
  },
  // Key Jurisdictions (Geos)
  {
    entityId: "Germany (DE)",
    type: "GEO",
    riskScore: 24,
    riskLevel: "LOW",
    transactions: 14,
    connections: 8,
    firstSeen: "2026-01-01 00:00:00 UTC",
    lastSeen: "2026-09-22 18:00:00 UTC",
    status: "MONITORED",
    keySignal: "Frankfurt DE-CIX Backbone / Major Node Hub",
    community: "Global Telemetry",
  },
  {
    entityId: "Netherlands (NL)",
    type: "GEO",
    riskScore: 18,
    riskLevel: "LOW",
    transactions: 16,
    connections: 9,
    firstSeen: "2026-01-01 00:00:00 UTC",
    lastSeen: "2026-09-22 18:00:00 UTC",
    status: "CLEARED",
    keySignal: "Amsterdam AMS-IX Core Colocation",
    community: "Global Telemetry",
  },
  {
    entityId: "United States (US)",
    type: "GEO",
    riskScore: 15,
    riskLevel: "LOW",
    transactions: 11,
    connections: 7,
    firstSeen: "2026-01-01 00:00:00 UTC",
    lastSeen: "2026-09-22 18:00:00 UTC",
    status: "CLEARED",
    keySignal: "Northern Virginia Cloud Belt",
    community: "Global Telemetry",
  },
];

// =========================================================================
// 5. TRANSACTIONS FORENSIC REGISTRY (48 Deterministic Transactions)
// =========================================================================

export interface DemoTransactionRow {
  txid: string;
  shortTxid: string;
  timestamp: string;
  inputs: number;
  outputs: number;
  amountBtc: number;
  feeBtc: number;
  riskScore: number;
  pattern: "NORMAL" | "PEELING" | "FAN-IN" | "FAN-OUT" | "AMOUNT ANOMALY" | "HIGH VELOCITY" | "MIXING-LIKE";
  status: "CONFIRMED" | "FLAGGED" | "EVALUATED" | "ESCALATED";
  relatedWallets: string[];
  broadcastingIp?: string;
  asn?: string;
  country?: string;
}

export type DemoTransaction = DemoTransactionRow;

export const DEMO_TRANSACTIONS: DemoTransactionRow[] = [
  {
    txid: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    shortTxid: "e3b0c442...b855",
    timestamp: "2026-09-22 16:45:11 UTC",
    inputs: 2,
    outputs: 2,
    amountBtc: 14.8250,
    feeBtc: 0.00028,
    riskScore: 78,
    pattern: "HIGH VELOCITY",
    status: "FLAGGED",
    relatedWallets: [DEMO_ROOT_WALLET_ADDRESS, "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c", "bc1q7x4e80m6p3k9v2w1t5r8j4m7e2q9u6y1t8821"],
    broadcastingIp: "45.142.179.88",
    asn: "AS14061 (DigitalOcean)",
    country: "Netherlands (NL)",
  },
  {
    txid: "8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8",
    shortTxid: "8c818815...56a8",
    timestamp: "2026-09-22 16:50:00 UTC",
    inputs: 2,
    outputs: 2,
    amountBtc: 22.4010,
    feeBtc: 0.00035,
    riskScore: 84,
    pattern: "AMOUNT ANOMALY",
    status: "FLAGGED",
    relatedWallets: [DEMO_ROOT_WALLET_ADDRESS, "bc1qk4m7p9r2t5w8y1u3i6o8a0s2d4f6g8h0j4421"],
    broadcastingIp: "185.220.101.42",
    asn: "AS9009 (M247 Ltd)",
    country: "Germany (DE)",
  },
  {
    txid: "16e3c92e10696956f4d2f0945952f444c1143899f1165a250325d70e304f5899",
    shortTxid: "16e3c92e...5899",
    timestamp: "2026-09-22 16:55:00 UTC",
    inputs: 1,
    outputs: 2,
    amountBtc: 18.5000,
    feeBtc: 0.00042,
    riskScore: 82,
    pattern: "PEELING",
    status: "FLAGGED",
    relatedWallets: [DEMO_ROOT_WALLET_ADDRESS, "bc1q58v7p9m2t4w6y8u0i2o4a6s8d0f2g4h6j712a"],
    broadcastingIp: "45.142.179.88",
    asn: "AS14061 (DigitalOcean)",
    country: "Netherlands (NL)",
  },
  {
    txid: "c1111111e0381948baed91938481928374a8c818815ea7d4323c2132d732c5aa6e",
    shortTxid: "c1111111...aa6e",
    timestamp: "2026-09-22 14:28:44 UTC",
    inputs: 8,
    outputs: 1,
    amountBtc: 53.8000,
    feeBtc: 0.00045,
    riskScore: 92,
    pattern: "FAN-IN",
    status: "FLAGGED",
    relatedWallets: ["bc1q00f7c2m5p8r1t4w7y0u3i6o9a2s5d8f1g4h76621", "bc1qcc1m4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j1101"],
    broadcastingIp: "45.154.255.19",
    asn: "AS14061 (DigitalOcean)",
    country: "Netherlands (NL)",
  },
  {
    txid: "d1111111a8c818815ea7d4323c2132d732c5aa6ee0381948baed9193848192837",
    shortTxid: "d1111111...2837",
    timestamp: "2026-09-22 13:05:12 UTC",
    inputs: 1,
    outputs: 7,
    amountBtc: 38.6000,
    feeBtc: 0.00038,
    riskScore: 65,
    pattern: "FAN-OUT",
    status: "EVALUATED",
    relatedWallets: ["3K7c991a8m2t5w8y1u4i7o0a3s6d9f2g5h8991a", "bc1qdd1m4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j001"],
    broadcastingIp: "103.251.167.30",
    asn: "AS13335 (Cloudflare)",
    country: "Singapore (SG)",
  },
  {
    txid: "e1111111baed91938481928374a8c818815ea7d4323c2132d732c5aa6ee038194",
    shortTxid: "e1111111...8194",
    timestamp: "2026-09-22 11:18:22 UTC",
    inputs: 6,
    outputs: 6,
    amountBtc: 26.4000,
    feeBtc: 0.00062,
    riskScore: 91,
    pattern: "MIXING-LIKE",
    status: "FLAGGED",
    relatedWallets: ["bc1qeeOut4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j9m2", "bc1qbridgeEF3i6o9a2s5d8f1g4h7j0k3m6p9r2t5w"],
    broadcastingIp: "185.220.101.42",
    asn: "AS9009 (M247 Ltd)",
    country: "Germany (DE)",
  },
  {
    txid: "b1111111ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf065601",
    shortTxid: "b1111111...5601",
    timestamp: "2026-09-22 15:15:00 UTC",
    inputs: 1,
    outputs: 2,
    amountBtc: 18.5000,
    feeBtc: 0.00019,
    riskScore: 77,
    pattern: "PEELING",
    status: "EVALUATED",
    relatedWallets: ["bc1q58v7p9m2t4w6y8u0i2o4a6s8d0f2g4h6j712a", "bc1q33x9p1m4t7w0y2u5i8o1a4s7d0f3g6h9j901b"],
    broadcastingIp: "185.191.171.12",
    asn: "AS16509 (Amazon AWS)",
    country: "United States (US)",
  },
  {
    txid: "b222222298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b802",
    shortTxid: "b2222222...b802",
    timestamp: "2026-09-22 15:18:00 UTC",
    inputs: 1,
    outputs: 2,
    amountBtc: 15.2000,
    feeBtc: 0.00018,
    riskScore: 75,
    pattern: "PEELING",
    status: "EVALUATED",
    relatedWallets: ["bc1q33x9p1m4t7w0y2u5i8o1a4s7d0f3g6h9j901b", "bc1q77c1p4m7t0w3y6u9i2o5a8s1d4f7g0h3j112e"],
    broadcastingIp: "185.191.171.12",
    asn: "AS16509 (Amazon AWS)",
    country: "United States (US)",
  },
  {
    txid: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
    shortTxid: "4b227777...bf8a",
    timestamp: "2026-09-22 12:10:00 UTC",
    inputs: 1,
    outputs: 2,
    amountBtc: 4.7500,
    feeBtc: 0.00018,
    riskScore: 46,
    pattern: "NORMAL",
    status: "CONFIRMED",
    relatedWallets: ["bc1q7x4e80m6p3k9v2w1t5r8j4m7e2q9u6y1t8821", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa8801"],
    broadcastingIp: "45.142.179.88",
    asn: "AS14061 (DigitalOcean)",
    country: "Netherlands (NL)",
  },
  {
    txid: "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
    shortTxid: "ef2d127de...e39d",
    timestamp: "2026-09-22 10:45:00 UTC",
    inputs: 1,
    outputs: 3,
    amountBtc: 8.9200,
    feeBtc: 0.00021,
    riskScore: 52,
    pattern: "NORMAL",
    status: "CONFIRMED",
    relatedWallets: ["bc1ql9p2t4w6y8u0i2o4a6s8d0f2g4h6j8k0m1129", "bc1q3m5p7r9t1w3y5u7i9o1a3s5d7f9g1h3j7765"],
    broadcastingIp: "45.142.179.89",
    asn: "AS14061 (DigitalOcean)",
    country: "Netherlands (NL)",
  },
  {
    txid: "g111111181928374a8c818815ea7d4323c2132d732c5aa6ee038194baed919384",
    shortTxid: "g1111111...9384",
    timestamp: "2026-09-22 07:15:00 UTC",
    inputs: 1,
    outputs: 2,
    amountBtc: 18.0000,
    feeBtc: 0.00015,
    riskScore: 24,
    pattern: "NORMAL",
    status: "CONFIRMED",
    relatedWallets: ["bc1q88a0s2d4f6g8h0j2k4m6p8r0t2w4y6u8i3312", "bc1qgg1m4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j111"],
    broadcastingIp: "103.14.26.180",
    asn: "AS13335 (Cloudflare)",
    country: "India (IN)",
  },
  {
    txid: "f111111191938481928374a8c818815ea7d4323c2132d732c5aa6ee038194baed",
    shortTxid: "f1111111...baed",
    timestamp: "2026-09-22 09:44:18 UTC",
    inputs: 2,
    outputs: 2,
    amountBtc: 14.0000,
    feeBtc: 0.00025,
    riskScore: 65,
    pattern: "HIGH VELOCITY",
    status: "EVALUATED",
    relatedWallets: ["bc1qbridgeEF3i6o9a2s5d8f1g4h7j0k3m6p9r2t5w", "bc1qff1m4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j331"],
    broadcastingIp: "91.132.147.10",
    asn: "AS24940 (Hetzner)",
    country: "Germany (DE)",
  },
];

// Generate extra realistic standard transactions to reach 45+ rows
for (let i = 1; i <= 36; i++) {
  const isSuspicious = i % 3 === 0;
  const risk = isSuspicious ? 60 + (i % 22) : 12 + (i % 25);
  const patterns: DemoTransactionRow["pattern"][] = ["NORMAL", "NORMAL", "PEELING", "NORMAL", "FAN-OUT", "AMOUNT ANOMALY", "NORMAL"];
  const pattern = isSuspicious ? patterns[i % patterns.length] : "NORMAL";
  const hexSuffix = (1000 + i).toString(16).padStart(4, "0");
  const txid = `f${hexSuffix}481928374a8c818815ea7d4323c2132d732c5aa6ee038194baed${hexSuffix}`;

  DEMO_TRANSACTIONS.push({
    txid,
    shortTxid: `${txid.slice(0, 8)}...${txid.slice(-6)}`,
    timestamp: `2026-09-22 ${(18 - Math.floor(i / 3)).toString().padStart(2, "0")}:${((i * 7) % 60).toString().padStart(2, "0")}:14 UTC`,
    inputs: 1 + (i % 3),
    outputs: 1 + (i % 4),
    amountBtc: Number((0.085 + (i * 0.42)).toFixed(4)),
    feeBtc: Number((0.00012 + (i % 5) * 0.00004).toFixed(5)),
    riskScore: risk,
    pattern,
    status: risk >= 80 ? "FLAGGED" : risk >= 60 ? "EVALUATED" : "CONFIRMED",
    relatedWallets: [DEMO_ROOT_WALLET_ADDRESS, `bc1qretail${i}0s2d4f6g8h0j2k4m6p8r0t2w4y6u8i`],
    broadcastingIp: `45.142.179.${80 + (i % 15)}`,
    asn: i % 2 === 0 ? "AS14061 (DigitalOcean)" : "AS16509 (Amazon AWS)",
    country: i % 3 === 0 ? "Netherlands (NL)" : i % 3 === 1 ? "Germany (DE)" : "United States (US)",
  });
}

// =========================================================================
// 6. ACTIVE INVESTIGATION DOSSIER (NIR-INV-0007 / Root Target)
// =========================================================================

export const DEMO_TARGET_DOSSIER: WalletInvestigationResponse = {
  wallet: {
    address: DEMO_ROOT_WALLET_ADDRESS,
    first_seen: "2026-03-14 04:12:08 UTC",
    last_seen: "2026-09-22 18:41:20 UTC",
    transaction_count: 48,
    input_transaction_count: 26,
    output_transaction_count: 22,
    total_input_amount: 64.8190,
    total_output_amount: 62.4510,
  },
  risk: {
    score: 87,
    level: "HIGH",
    anomaly_score: 0.88,
    anomaly_percentile: 96.4,
    is_outlier: true,
    subscores: {
      anomaly: 88,
      activity: 92,
      network: 76,
      behavior: 89,
    },
  },
  evidence: [
    {
      category: "TOPOLOGY_BRIDGE",
      message: "Direct high-value bridge conduit connecting Core Transit Cluster to Community B Peeling Chain",
      severity: "CRITICAL",
      feature: "inter_cluster_edge_weight",
    },
    {
      category: "VELOCITY_ANOMALY",
      message: "Observed value transit speed of 62.45 BTC with average wallet dwell time under 4 minutes",
      severity: "HIGH",
      feature: "rapid_transit_dwell_time",
    },
    {
      category: "NETWORK_CORRELATION",
      message: "Multiple transactions broadcast via AS9009 Tor Exit Relays (185.220.101.42)",
      severity: "HIGH",
      feature: "tor_broadcast_correlation",
    },
    {
      category: "STRUCTURAL_FANIN",
      message: "Asymmetric fan-in concentration from 6 distinct high-risk deposit addresses",
      severity: "MEDIUM",
      feature: "fanin_dispersion_ratio",
    },
  ],
  transactions: [
    {
      txid: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      timestamp: "2026-09-22 16:45:11 UTC",
      input_addresses: [DEMO_ROOT_WALLET_ADDRESS, "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c"],
      output_addresses: ["bc1q7x4e80m6p3k9v2w1t5r8j4m7e2q9u6y1t8821", "bc1p5d8k20w4r6t8j1m9e3q7u5y2t4x8p0m6e3310"],
      input_amounts: [8.525, 6.300],
      output_amounts: [10.200, 4.62472],
      fee: 0.00028,
      script_type: "witness_v0_keyhash",
      total_input_amount: 14.825,
      total_output_amount: 14.82472,
      is_input: true,
      is_output: false,
    },
    {
      txid: "8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8",
      timestamp: "2026-09-22 16:50:00 UTC",
      input_addresses: ["bc1qk4m7p9r2t5w8y1u3i6o8a0s2d4f6g8h0j4421"],
      output_addresses: [DEMO_ROOT_WALLET_ADDRESS, "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNL2291"],
      input_amounts: [22.40135],
      output_amounts: [18.200, 4.201],
      fee: 0.00035,
      script_type: "witness_v0_keyhash",
      total_input_amount: 22.40135,
      total_output_amount: 22.401,
      is_input: false,
      is_output: true,
    },
    {
      txid: "16e3c92e10696956f4d2f0945952f444c1143899f1165a250325d70e304f5899",
      timestamp: "2026-09-22 16:55:00 UTC",
      input_addresses: [DEMO_ROOT_WALLET_ADDRESS],
      output_addresses: ["bc1q58v7p9m2t4w6y8u0i2o4a6s8d0f2g4h6j712a", DEMO_ROOT_WALLET_ADDRESS],
      input_amounts: [18.50042],
      output_amounts: [15.200, 3.300],
      fee: 0.00042,
      script_type: "witness_v0_keyhash",
      total_input_amount: 18.50042,
      total_output_amount: 18.500,
      is_input: true,
      is_output: true,
    },
  ],
  network_observations: [
    {
      txid: "8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8",
      timestamp: "2026-09-22 16:50:00 UTC",
      src_ip: "185.220.101.42",
      dst_ip: "84.17.48.21",
      src_port: 8333,
      dst_port: 8333,
      geo_country: "Germany (DE)",
      asn: "AS9009 (M247 Ltd)",
    },
    {
      txid: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      timestamp: "2026-09-22 16:45:11 UTC",
      src_ip: "45.142.179.88",
      dst_ip: "104.244.42.1",
      src_port: 8333,
      dst_port: 8333,
      geo_country: "Netherlands (NL)",
      asn: "AS14061 (DigitalOcean)",
    },
  ],
  graph_summary: {
    direct_neighbor_count: 12,
    transaction_count: 48,
    ip_count: 3,
    asn_count: 2,
    country_count: 2,
  },
  total_transactions: 48,
  total_network_observations: 2,
};

export const DEMO_TARGET_CLUSTER: WalletClusterDetailResponse = {
  wallet_address: DEMO_ROOT_WALLET_ADDRESS,
  cluster_id: 1,
  cluster_label: "CL-01 (High-Velocity Transit Syndicate)",
  distance_to_centroid: 0.142,
  pca_x: 2.45,
  pca_y: -1.18,
  cluster_profile: {
    cluster_id: 1,
    label: "CL-01 (High-Velocity Transit Syndicate)",
    description: "Inter-cluster value bridge conduit characterized by high-volume transit and sub-hour dwell time.",
    wallet_count: 22,
    average_risk_score: 84.5,
    anomaly_rate: 0.86,
    centroid_distance_mean: 0.22,
    centroid_distance_median: 0.19,
    top_differentiating_features: ["outbound_velocity", "cross_cluster_degree", "tor_broadcast_rate"],
    centroid_summary: {
      volume_btc: 184.29,
      tx_count: 348,
      median_dwell_minutes: 3.8,
    },
  },
};

/**
 * Fallback Dossier Generator for Any Entity Clicked
 * Guarantees that clicking ANY wallet in the demo displays a fully consistent dossier!
 */
export function getDemoWalletDossier(walletAddress: string): WalletInvestigationResponse {
  const clean = walletAddress.replace(/^wallet:/, "").trim();
  if (clean === DEMO_ROOT_WALLET_ADDRESS) {
    return DEMO_TARGET_DOSSIER;
  }

  // Find in MASTER_GRAPH
  const foundNode = MASTER_GRAPH.nodes.find((n) => n.id === `wallet:${clean}` || n.label.includes(clean.slice(0, 8)));
  const score = foundNode?.risk_score ?? 65;
  const level = score >= 82 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW";
  const fields = foundNode?.fields || {};

  return {
    wallet: {
      address: clean,
      first_seen: fields["First Seen"] || "2026-04-10 11:24:00 UTC",
      last_seen: fields["Last Seen"] || "2026-09-22 17:33:14 UTC",
      transaction_count: parseInt(fields["Transaction Count"] || "16", 10) || 16,
      input_transaction_count: 8,
      output_transaction_count: 8,
      total_input_amount: parseFloat(fields["Inbound Volume"] || "14.5") || 14.5,
      total_output_amount: parseFloat(fields["Outbound Volume"] || "14.2") || 14.2,
    },
    risk: {
      score,
      level,
      anomaly_score: Number((score / 100).toFixed(2)),
      anomaly_percentile: Math.min(score + 8, 99),
      is_outlier: score >= 60,
      subscores: {
        anomaly: score,
        activity: Math.min(score + 4, 98),
        network: Math.max(score - 10, 20),
        behavior: score,
      },
    },
    evidence: [
      {
        category: "BEHAVIORAL_PATTERN",
        message: fields["Primary Signal"] || "Observed in structured multi-party transaction community",
        severity: level,
        feature: "cluster_correlation",
      },
      {
        category: "COMMUNITY_MEMBERSHIP",
        message: `Assigned to ${fields.Community || "Active Investigation Cluster"}`,
        severity: score >= 70 ? "HIGH" : "MEDIUM",
        feature: "community_id",
      },
    ],
    transactions: DEMO_TARGET_DOSSIER.transactions,
    network_observations: DEMO_TARGET_DOSSIER.network_observations,
    graph_summary: {
      direct_neighbor_count: 6,
      transaction_count: 16,
      ip_count: 2,
      asn_count: 1,
      country_count: 1,
    },
    total_transactions: 16,
    total_network_observations: 2,
  };
}

export function getDemoWalletCluster(walletAddress: string): WalletClusterDetailResponse {
  const clean = walletAddress.replace(/^wallet:/, "").trim();
  if (clean === DEMO_ROOT_WALLET_ADDRESS) {
    return DEMO_TARGET_CLUSTER;
  }
  const foundNode = MASTER_GRAPH.nodes.find((n) => n.id === `wallet:${clean}` || n.label.includes(clean.slice(0, 8)));
  const score = foundNode?.risk_score ?? 60;
  const clusterLabel = foundNode?.fields?.Community || "CL-02 (Peeling & Transit Cluster)";

  return {
    wallet_address: clean,
    cluster_id: 2,
    cluster_label: clusterLabel,
    distance_to_centroid: 0.28,
    pca_x: 0.85,
    pca_y: 1.12,
    cluster_profile: {
      cluster_id: 2,
      label: clusterLabel,
      description: "Behavioral grouping sharing heuristic transaction topology and relay timing.",
      wallet_count: 14,
      average_risk_score: score,
      anomaly_rate: 0.54,
      centroid_distance_mean: 0.31,
      centroid_distance_median: 0.26,
      top_differentiating_features: ["peeling_depth", "fan_out_dispersion", "ip_correlation_count"],
      centroid_summary: {
        volume_btc: 89.4,
        tx_count: 182,
        median_dwell_minutes: 6.2,
      },
    },
  };
}

// =========================================================================
// 7. GENERATED DEMO INVESTIGATION REPORTS (5 Reports)
// =========================================================================

export interface DemoReport {
  reportId: string;
  title: string;
  created: string;
  entitiesCount: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "FINALIZED" | "PENDING REVIEW" | "ACTIVE FORENSICS";
  executiveSummary: string;
  primaryEntity: string;
  riskIndicators: string[];
  transactionSummary: {
    volumeBtc: string;
    txCount: number;
    avgFee: string;
    suspiciousCount: number;
  };
  networkCorrelations: {
    asn: string;
    ips: string[];
    jurisdictions: string[];
  };
  connectedEntities: string[];
  timeline: { time: string; event: string }[];
  analystNotes: string;
}

export const DEMO_REPORTS: DemoReport[] = [
  {
    reportId: "NIR-RPT-0001",
    title: "Network Topology Assessment & Syndicate Mapping",
    created: "2026-09-22 18:41 UTC",
    entitiesCount: 172,
    riskLevel: "HIGH",
    status: "FINALIZED",
    executiveSummary:
      "Comprehensive structural analysis of 172 network entities across 7 distinct behavioral clusters. Identified 8 inter-community bridge conduits responsible for funneling value from high-velocity transit nodes into structured CoinJoin obfuscation pools.",
    primaryEntity: DEMO_ROOT_WALLET_ADDRESS,
    riskIndicators: [
      "Multi-community value aggregation into 53.8 BTC consolidation sink",
      "Tor Exit relay broadcast on ASN9009 (M247 Ltd)",
      "Chaumian CoinJoin round participation with 6 equal 1.0 BTC outputs",
    ],
    transactionSummary: {
      volumeBtc: "284.6200 BTC",
      txCount: 29,
      avgFee: "0.00031 BTC",
      suspiciousCount: 18,
    },
    networkCorrelations: {
      asn: "AS9009 (M247 Ltd) & AS14061 (DigitalOcean)",
      ips: ["185.220.101.42", "45.142.179.88", "185.220.101.45"],
      jurisdictions: ["Germany (DE)", "Netherlands (NL)", "United States (US)"],
    },
    connectedEntities: [
      DEMO_ROOT_WALLET_ADDRESS,
      "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
      "bc1q00f7c2m5p8r1t4w7y0u3i6o9a2s5d8f1g4h76621",
      "bc1qeeOut4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j9m2",
    ],
    timeline: [
      { time: "2026-03-14 04:12 UTC", event: "First observation of root conduit wallet bc1qa0fa...276a" },
      { time: "2026-05-20 10:14 UTC", event: "Community C Fan-In consolidation cluster initialized" },
      { time: "2026-07-15 03:40 UTC", event: "Wasabi CoinJoin pool mixing transactions detected" },
      { time: "2026-09-22 16:50 UTC", event: "Tor exit relay broadcast correlation flagged by ML pipeline" },
    ],
    analystNotes:
      "All evidence indicates a coordinated multi-tier Bitcoin laundering structure. Immediate asset freezing recommendations dispatched for downstream exchange deposit addresses.",
  },
  {
    reportId: "NIR-RPT-0002",
    title: "High-Risk Wallet Forensics Dossier (NIR-INV-0007)",
    created: "2026-09-22 17:30 UTC",
    entitiesCount: 28,
    riskLevel: "CRITICAL",
    status: "ACTIVE FORENSICS",
    executiveSummary:
      "Focused forensic drill-down on primary target bc1qa0fa...276a (Risk 87/100). Entity functions as the central conduit between deposit transit and peeling chain disbursement, maintaining sub-4 minute dwell time.",
    primaryEntity: DEMO_ROOT_WALLET_ADDRESS,
    riskIndicators: [
      "Cross-cluster bridging activity",
      "Dwell time below 4th percentile of network baseline",
      "Correlated with Tor IP 185.220.101.42",
    ],
    transactionSummary: {
      volumeBtc: "64.8190 BTC",
      txCount: 48,
      avgFee: "0.00035 BTC",
      suspiciousCount: 14,
    },
    networkCorrelations: {
      asn: "AS9009 (M247 Ltd)",
      ips: ["185.220.101.42", "45.142.179.88"],
      jurisdictions: ["Germany (DE)", "Netherlands (NL)"],
    },
    connectedEntities: [
      "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
      "bc1q58v7p9m2t4w6y8u0i2o4a6s8d0f2g4h6j712a",
      "bc1qk4m7p9r2t5w8y1u3i6o8a0s2d4f6g8h0j4421",
    ],
    timeline: [
      { time: "16:45:11 UTC", event: "Consolidation tx e3b0c442...b855 confirmed" },
      { time: "16:50:00 UTC", event: "Direct transfer 8c818815...56a8 broadcast via Tor" },
      { time: "16:55:00 UTC", event: "Peeling dispatch 16e3c92e...5899 forwarded to Comm B" },
    ],
    analystNotes:
      "Recommend sub-surface tracking of change addresses peeled in Community B.",
  },
  {
    reportId: "NIR-RPT-0003",
    title: "Sequential Peeling Chain Flow & Extraction Analysis",
    created: "2026-09-22 16:15 UTC",
    entitiesCount: 22,
    riskLevel: "HIGH",
    status: "FINALIZED",
    executiveSummary:
      "Audit of 5-hop peeling chain in Community B. Original 18.5 BTC input systematically peeled into ~3.2 BTC extraction amounts across four sequential transactions.",
    primaryEntity: "bc1q8r4t2w9y1u3i5o7p9a1s3d5f7g9h1j3k58821",
    riskIndicators: [
      "Systematic peel ratio between 18% and 22%",
      "Evasion of 5 BTC reporting threshold on all extraction outputs",
    ],
    transactionSummary: {
      volumeBtc: "48.2000 BTC",
      txCount: 5,
      avgFee: "0.00018 BTC",
      suspiciousCount: 5,
    },
    networkCorrelations: {
      asn: "AS16509 (Amazon AWS)",
      ips: ["185.191.171.12", "185.191.171.14"],
      jurisdictions: ["United States (US)"],
    },
    connectedEntities: [
      "bc1q33x9p1m4t7w0y2u5i8o1a4s7d0f3g6h9j901b",
      "bc1q77c1p4m7t0w3y6u9i2o5a8s1d4f7g0h3j112e",
      "1Peel1A4xP6QGefi2DMPTfTL5SLmv7DivfNa1101",
    ],
    timeline: [
      { time: "15:15:00 UTC", event: "Peel Step 1: 18.5 BTC -> 15.2 BTC change + 3.3 BTC peel" },
      { time: "15:18:00 UTC", event: "Peel Step 2: 15.2 BTC -> 12.1 BTC change + 3.1 BTC peel" },
      { time: "15:22:00 UTC", event: "Peel Step 3: 12.1 BTC -> 8.9 BTC change + 3.2 BTC peel" },
    ],
    analystNotes: "Extraction addresses trace to non-custodial mobile wallet seeds.",
  },
  {
    reportId: "NIR-RPT-0004",
    title: "Network Telemetry Correlation & Autonomous System Audit",
    created: "2026-09-22 15:00 UTC",
    entitiesCount: 35,
    riskLevel: "MEDIUM",
    status: "FINALIZED",
    executiveSummary:
      "Cross-layer analysis combining Bitcoin mempool transaction telemetry with network BGP observations. 48% of suspicious transactions originate from data center ASNs with zero client-side peer diversity.",
    primaryEntity: "AS9009 (M247 Ltd)",
    riskIndicators: [
      "Concentration of Tor exit node broadcast IPs in Frankfurt hub",
      "Co-located transaction relay across Hetzner AS24940 and M247",
    ],
    transactionSummary: {
      volumeBtc: "112.5000 BTC",
      txCount: 14,
      avgFee: "0.00029 BTC",
      suspiciousCount: 9,
    },
    networkCorrelations: {
      asn: "AS9009 (M247 Ltd)",
      ips: ["185.220.101.42", "185.220.101.45", "91.240.118.55"],
      jurisdictions: ["Germany (DE)", "Netherlands (NL)"],
    },
    connectedEntities: ["asn:AS9009", "asn:AS24940", "geo:DE", "geo:NL"],
    timeline: [
      { time: "11:18 UTC", event: "Tor coordinator node active during CoinJoin round" },
      { time: "16:50 UTC", event: "High-risk direct transfer broadcast from 185.220.101.42" },
    ],
    analystNotes: "Telemetry feeds integrated with FATF Travel Rule watchlist.",
  },
  {
    reportId: "NIR-RPT-0005",
    title: "Wasabi CoinJoin Pool & Anonymity Set Syndicate Audit",
    created: "2026-09-22 13:45 UTC",
    entitiesCount: 26,
    riskLevel: "CRITICAL",
    status: "FINALIZED",
    executiveSummary:
      "Deep analysis of 6-in / 6-out equalized CoinJoin transaction e1111111...8194. Identified deliberate anonymity set pooling followed by consolidation in post-mix staging wallet bc1qeeOut4...j9m2.",
    primaryEntity: "bc1qeeOut4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j9m2",
    riskIndicators: [
      "Exact 1.0000 BTC uniform output value matching Wasabi round parameters",
      "Rapid post-mix consolidation violating standard wallet behavior",
    ],
    transactionSummary: {
      volumeBtc: "26.4000 BTC",
      txCount: 3,
      avgFee: "0.00062 BTC",
      suspiciousCount: 3,
    },
    networkCorrelations: {
      asn: "AS9009 (M247 Ltd)",
      ips: ["185.220.101.45"],
      jurisdictions: ["Germany (DE)"],
    },
    connectedEntities: [
      "bc1qeeOut4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j9m2",
      "bc1qbridgeEF3i6o9a2s5d8f1g4h7j0k3m6p9r2t5w",
      "bc1qeeIn4a7s0d3f6g9h2j5m8p1r4t7w0y3u6i9o2",
    ],
    timeline: [
      { time: "11:18:22 UTC", event: "CoinJoin transaction e1111111 confirmed on block 862,242" },
      { time: "11:22:10 UTC", event: "Post-mix consolidation tx e2222222 dispatched to bridge EF" },
    ],
    analystNotes: "Anonymity set broken via temporal linkage and fee-rate fingerprinting.",
  },
];

export {
  DEMO_INVESTIGATION_ACTIVITIES,
  type InvestigationActivityEvent,
} from './demoInvestigationActivity';

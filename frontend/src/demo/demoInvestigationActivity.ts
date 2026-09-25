/**
 * NIRIKSHAK — DETERMINISTIC INVESTIGATION ACTIVITY TIMELINE
 * Frontend-only cyber-forensic activity stream for standalone demonstration.
 * Zero WebSocket or backend dependency. 100% deterministic and reproducible.
 */

export interface InvestigationActivityEvent {
  id: string;
  time: string;
  type:
    | "GRAPH_EXPANSION"
    | "RISK_SIGNAL"
    | "ANOMALY_DETECTION"
    | "NETWORK_CORRELATION"
    | "PATH_DISCOVERY"
    | "PEELING_DETECTED"
    | "CLUSTER_PROFILED"
    | "GEO_JURISDICTION"
    | "FAN_IN_AGGREGATION"
    | "ALERT_ESCALATION"
    | "LEAD_GENERATED"
    | "SAR_REPORT_READY";
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  entity?: string;
  targetWallet?: string;
  badgeLabel: string;
}

export const DEMO_INVESTIGATION_ACTIVITIES: InvestigationActivityEvent[] = [
  {
    id: "EVT-001",
    time: "09:42:18",
    type: "GRAPH_EXPANSION",
    title: "Investigation Graph Topology Expanded",
    description: "3-hop investigation neighborhood compiled across 240 forensic nodes and 390 transactional links.",
    severity: "INFO",
    entity: "3D Forensics Graph",
    badgeLabel: "GRAPH SCOPE",
  },
  {
    id: "EVT-002",
    time: "09:43:07",
    type: "RISK_SIGNAL",
    title: "High-Risk Transit Conduit Identified",
    description: "Target wallet bc1qa0fa...276a evaluated with composite Risk Score 87 / 100 (Critical Tier).",
    severity: "CRITICAL",
    entity: "bc1qa0fa87eac1de3da717bcfdc46ebb04276a",
    targetWallet: "bc1qa0fa87eac1de3da717bcfdc46ebb04276a",
    badgeLabel: "RISK 87",
  },
  {
    id: "EVT-003",
    time: "09:44:15",
    type: "ANOMALY_DETECTION",
    title: "Transaction Velocity Anomaly Flagged",
    description: "Multi-input transit frequency exceeded heuristic baseline by 4.8x across primary outbound channel.",
    severity: "HIGH",
    entity: "tx:e3b0c442...b855",
    targetWallet: "bc1qa0fa87eac1de3da717bcfdc46ebb04276a",
    badgeLabel: "ANOMALY",
  },
  {
    id: "EVT-004",
    time: "09:44:52",
    type: "NETWORK_CORRELATION",
    title: "Tor Exit Relay Broadcast Correlated",
    description: "Transaction broadcast matched to recurring Tor Exit node 185.220.101.42 (Hetzner AS24940, Frankfurt).",
    severity: "HIGH",
    entity: "185.220.101.42 (Tor Relay)",
    badgeLabel: "NETWORK OBS",
  },
  {
    id: "EVT-005",
    time: "09:45:30",
    type: "PATH_DISCOVERY",
    title: "Cross-Community Value Bridge Discovered",
    description: "Bridge transaction identified linking Community 01 (High-Activity Core) to Community 05 (Mixing Cluster).",
    severity: "HIGH",
    entity: "Core → Wasabi Mixing Bridge",
    targetWallet: "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
    badgeLabel: "BRIDGE PATH",
  },
  {
    id: "EVT-006",
    time: "09:46:11",
    type: "PEELING_DETECTED",
    title: "Sequential Peeling Chain Tracked",
    description: "5-hop change peeling pattern isolated with 14.8250 BTC rolling distribution and sub-minute dwell.",
    severity: "MEDIUM",
    entity: "Community 02 (Peeling Chain)",
    badgeLabel: "PEELING",
  },
  {
    id: "EVT-007",
    time: "09:47:04",
    type: "CLUSTER_PROFILED",
    title: "Syndicate Behavioral Cluster Profiled",
    description: "Target classified under CL-01 (High-Velocity Transit Syndicate) with 22 correlated conduits.",
    severity: "INFO",
    entity: "CL-01 Syndicate",
    targetWallet: "bc1qa0fa87eac1de3da717bcfdc46ebb04276a",
    badgeLabel: "CLUSTER CL-01",
  },
  {
    id: "EVT-008",
    time: "09:48:22",
    type: "GEO_JURISDICTION",
    title: "Jurisdictional Relay Propagation Mapped",
    description: "Transaction relay propagation traced across Frankfurt DE-CIX and Amsterdam AMS-IX backbones.",
    severity: "MEDIUM",
    entity: "Germany (DE) & Netherlands (NL)",
    badgeLabel: "GEO JURISDICTION",
  },
  {
    id: "EVT-009",
    time: "09:49:18",
    type: "FAN_IN_AGGREGATION",
    title: "Multi-Input Fan-In Consolidation Isolated",
    description: "8-to-1 UTXO consolidation detected pooling 53.8000 BTC into intermediary aggregation address.",
    severity: "HIGH",
    entity: "tx:c1111111...8374",
    targetWallet: "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
    badgeLabel: "FAN-IN 53.8 BTC",
  },
  {
    id: "EVT-010",
    time: "09:50:05",
    type: "ALERT_ESCALATION",
    title: "Forensic Detection Alert Escalated",
    description: "Alert ALT-0001 escalated to active investigation: High velocity transit + peeling chain initiation.",
    severity: "CRITICAL",
    entity: "ALT-0001",
    targetWallet: "bc1qa0fa87eac1de3da717bcfdc46ebb04276a",
    badgeLabel: "ALERT ESCALATED",
  },
  {
    id: "EVT-011",
    time: "09:51:33",
    type: "LEAD_GENERATED",
    title: "Priority Investigative Lead Dispatched",
    description: "Lead NIR-LEAD-001 queued for forensic tracing with automated graph neighborhood extraction.",
    severity: "HIGH",
    entity: "NIR-LEAD-001",
    targetWallet: "bc1qa0fa87eac1de3da717bcfdc46ebb04276a",
    badgeLabel: "PRIORITY LEAD",
  },
  {
    id: "EVT-012",
    time: "09:52:45",
    type: "SAR_REPORT_READY",
    title: "Forensic Casefile Assessment Compiled",
    description: "Draft intelligence report NIR-RPT-0001 (High-Risk Wallet Transit Syndicate) generated and ready for review.",
    severity: "INFO",
    entity: "NIR-RPT-0001",
    badgeLabel: "REPORT COMPILED",
  },
];

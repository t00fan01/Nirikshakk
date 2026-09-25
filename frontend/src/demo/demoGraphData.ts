/**
 * demoGraphData.ts
 * ------------------------------------------------------------------
 * NIRIKSHAK AI — Deterministic Cyber-Intelligence Graph Data Engine V4
 * 
 * Standalone frontend demo dataset.
 * ZERO Math.random() — completely reproducible deterministic topology.
 * 
 * Target Topology V4:
 * - 10 Structured Forensic Communities + Global Infrastructure Telemetry
 * - 230 total nodes: 150 wallets, 46 transactions, 20 IPs, 7 ASNs, 7 Geos
 * - 421 transaction-mediated & network observation links (spider-web mesh)
 * - 13 inter-community bridge conduits
 * - Strict Zero-Isolated Nodes enforcement across all hop levels:
 *     1-Hop: 24 nodes, 40 links, 0 isolated
 *     2-Hop: 97 nodes, 165 links, 0 isolated
 *     3-Hop: 230 nodes, 421 links, 0 isolated
 * ------------------------------------------------------------------
 */

import { GraphData, GraphNode, GraphLink, EntityType } from '../components/Graph/NetworkGraph3D';

export interface DemoGraphStats {
  status?: string;
  total_nodes: number;
  total_edges: number;
  wallet_nodes: number;
  transaction_nodes: number;
  ip_nodes: number;
  asn_nodes: number;
  country_nodes: number;
  entity_nodes: number;
  input_edges: number;
  output_edges: number;
  counterparty_edges: number;
  network_observation_edges: number;
  density: number;
  // camelCase
  totalNodes: number;
  totalEdges: number;
  wallets: number;
  transactions: number;
  networkObservations: number;
  riskEntities: number;
  communities: number;
}

// Canonical Demo Root Wallet (High Risk, 87 Score)
export const DEMO_ROOT_WALLET_ID = "wallet:bc1qa0fa87eac1de3da717bcfdc46ebb04276a";
export const DEMO_ROOT_WALLET_ADDRESS = "bc1qa0fa87eac1de3da717bcfdc46ebb04276a";

const btcStr = (val: number) => `${val.toFixed(4)} BTC`;

function buildMasterDemoGraph(): {
  nodes: GraphNode[];
  links: GraphLink[];
  communityMap: Map<string, string>;
  hopMap: Map<string, number>;
} {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const communityMap = new Map<string, string>();
  const hopMap = new Map<string, number>();

  const addNode = (
    id: string,
    type: EntityType,
    label: string,
    riskScore: number,
    community: string,
    hop: number,
    fields: Record<string, string> = {},
    pos: { x: number; y: number; z: number } | null = null
  ) => {
    let riskLevel = "LOW";
    if (riskScore >= 82) riskLevel = "CRITICAL";
    else if (riskScore >= 60) riskLevel = "HIGH";
    else if (riskScore >= 35) riskLevel = "MEDIUM";

    const nodeObj: GraphNode = {
      id,
      type,
      label,
      risk_score: riskScore,
      confidence: Number((0.86 + (riskScore % 12) * 0.01).toFixed(2)),
      fields: {
        "Risk Level": riskLevel,
        Community: community,
        ...fields,
      },
    };

    if (pos) {
      nodeObj.x = Math.round(pos.x);
      nodeObj.y = Math.round(pos.y);
      nodeObj.z = Math.round(pos.z);
    }

    nodes.push(nodeObj);
    communityMap.set(id, community);
    hopMap.set(id, hop);
  };

  const addLink = (
    source: string,
    target: string,
    kind: "wallet" | "wallet-risk" | "flow" | "net"
  ) => {
    links.push({ source, target, kind });
  };

  // =========================================================================
  // 1. GLOBAL INFRASTRUCTURE LAYER (7 GEOS & 7 ASNS)
  // =========================================================================
  const geos: [string, string, number, string, number][] = [
    ["geo:NL", "Netherlands (NL)", 18, "Amsterdam AMS-IX Core", 1],
    ["geo:DE", "Germany (DE)", 24, "Frankfurt DE-CIX Backbone", 1],
    ["geo:US", "United States (US)", 15, "Northern Virginia Cloud Belt", 2],
    ["geo:SG", "Singapore (SG)", 12, "Equinix SG1 Colocation", 2],
    ["geo:GB", "United Kingdom (GB)", 14, "London Telehouse North", 2],
    ["geo:FR", "France (FR)", 16, "Paris InterXion Hub", 2],
    ["geo:IN", "India (IN)", 10, "Mumbai NIXI Core", 3],
  ];

  geos.forEach(([id, name, risk, hub, hop], i) => {
    const ang = (i / geos.length) * Math.PI * 2;
    addNode(id, "geo", name, risk, "Global Telemetry", hop, {
      Country: name,
      "Infrastructure Hub": hub,
      "Regulatory Jurisdiction": "FATF Travel Rule Monitored",
      "Network Tier": "Tier-1 Autonomous Transit",
    }, { x: Math.cos(ang) * 320, y: Math.sin(ang) * 320, z: -80 });
  });

  const asns: [string, string, string, string, number, number][] = [
    ["asn:AS14061", "AS14061 (DigitalOcean)", "DigitalOcean LLC", "geo:NL", 32, 1],
    ["asn:AS9009", "AS9009 (M247 Ltd)", "M247 Europe Backbone", "geo:DE", 74, 1],
    ["asn:AS16509", "AS16509 (Amazon AWS)", "Amazon Data Services", "geo:US", 22, 2],
    ["asn:AS13335", "AS13335 (Cloudflare)", "Cloudflare Anycast", "geo:SG", 19, 2],
    ["asn:AS15169", "AS15169 (Google LLC)", "Google Edge Cloud", "geo:FR", 18, 2],
    ["asn:AS24940", "AS24940 (Hetzner)", "Hetzner Online GmbH", "geo:DE", 44, 2],
    ["asn:AS3356", "AS3356 (Lumen/Level3)", "Lumen Global IP Transit", "geo:GB", 15, 2],
  ];

  asns.forEach(([id, label, org, geoId, risk, hop], i) => {
    const ang = (i / asns.length) * Math.PI * 2 + 0.3;
    addNode(id, "asn", label, risk, "Global Telemetry", hop, {
      Organization: org,
      "BGP Prefix Count": "1,420 announced prefixes",
      "Hosting Profile": risk > 50 ? "High Tor/VPN Relay Density" : "Commercial Data Center",
      "Associated Jurisdiction": geoId.replace("geo:", ""),
    }, { x: Math.cos(ang) * 260, y: Math.sin(ang) * 260, z: -40 });
    addLink(id, geoId, "net");
  });

  // Cross-infrastructure link for India gateway
  addLink("asn:AS13335", "geo:IN", "net");

  // Community layout centers in a spatial 3D ring around root
  const commDefs = [
    { id: 1, key: "c1", name: "Community 01 — HIGH ACTIVITY CORE", angle: 0, r: 35, z: 0, baseHop: 1 },
    { id: 2, key: "c2", name: "Community 02 — PEELING CHAIN", angle: 0.63, r: 155, z: 25, baseHop: 2 },
    { id: 3, key: "c3", name: "Community 03 — FAN-IN CONSOLIDATION", angle: 1.26, r: 165, z: -20, baseHop: 2 },
    { id: 4, key: "c4", name: "Community 04 — FAN-OUT DISPERSAL", angle: 1.88, r: 160, z: 30, baseHop: 2 },
    { id: 5, key: "c5", name: "Community 05 — MIXING-LIKE CLUSTER", angle: 2.51, r: 170, z: -25, baseHop: 3 },
    { id: 6, key: "c6", name: "Community 06 — NETWORK INFRASTRUCTURE", angle: 3.14, r: 155, z: 15, baseHop: 2 },
    { id: 7, key: "c7", name: "Community 07 — BRIDGE CLUSTER", angle: 3.77, r: 165, z: -30, baseHop: 2 },
    { id: 8, key: "c8", name: "Community 08 — SECONDARY HIGH-RISK CLUSTER", angle: 4.40, r: 160, z: 25, baseHop: 3 },
    { id: 9, key: "c9", name: "Community 09 — NORMAL ACTIVITY CLUSTER", angle: 5.02, r: 170, z: -20, baseHop: 3 },
    { id: 10, key: "c10", name: "Community 10 — CROSS-COMMUNITY INVESTIGATION HUB", angle: 5.65, r: 155, z: 10, baseHop: 3 },
  ];

  function getPos(commIdx: number, offsetIdx: number, totalOffset: number, radiusOffset = 36) {
    const center = commDefs[commIdx];
    const cx = Math.cos(center.angle) * center.r;
    const cy = Math.sin(center.angle) * center.r;
    const cz = center.z;

    const localAng = (offsetIdx / Math.max(totalOffset, 1)) * Math.PI * 2;
    const x = cx + Math.cos(localAng) * radiusOffset;
    const y = cy + Math.sin(localAng) * radiusOffset;
    const z = cz + ((offsetIdx % 5) - 2) * 12;
    return { x, y, z };
  }

  // =========================================================================
  // 2. COMMUNITY 01: HIGH ACTIVITY CORE (Root Nexus)
  // =========================================================================
  addNode(
    DEMO_ROOT_WALLET_ID,
    "wallet",
    "bc1qa0fa...276a",
    87,
    commDefs[0].name,
    1,
    {
      "Wallet Address": "bc1qa0fa87eac1de3da717bcfdc46ebb04276a",
      "Primary Signal": "High Velocity + Cross-Cluster Transit",
      "Transaction Count": "48",
      "Inbound Volume": btcStr(44.2),
      "Outbound Volume": btcStr(43.8),
      "First Seen": "2026-08-11 04:12:00 UTC",
      "Last Seen": "2026-09-22 16:50:00 UTC",
    },
    { x: 0, y: 0, z: 0 }
  );

  const c1Wallets = [
    "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
    "bc1q7x4e80m6p3k9v2w1t5r8j4m7e2q9u6y1t8821",
    "bc1qk4m7p9r2t5w8y1u3i6o8a0s2d4f6g8h0j4421",
    "bc1q2u5y8r1e4w7t0m3k6p9a2s5d8f1g4h7j0m9831",
    "bc1qa111core87eac1de3da717bcfdc46ebb04276a",
    "bc1qa222core87eac1de3da717bcfdc46ebb04276a",
    "bc1qa333core87eac1de3da717bcfdc46ebb04276a",
    "bc1qa444core87eac1de3da717bcfdc46ebb04276a",
    "bc1qa555core87eac1de3da717bcfdc46ebb04276a",
    "bc1qa666core87eac1de3da717bcfdc46ebb04276a",
    "bc1qa777core87eac1de3da717bcfdc46ebb04276a",
    "bc1qa888core87eac1de3da717bcfdc46ebb04276a",
    "bc1qa999core87eac1de3da717bcfdc46ebb04276a",
    "bc1qaaaaCore87eac1de3da717bcfdc46ebb04276a",
    "bc1qbbbbCore87eac1de3da717bcfdc46ebb04276a",
    "bc1qccccCore87eac1de3da717bcfdc46ebb04276a",
  ];

  const c1WIds: string[] = [];
  c1Wallets.forEach((addr, i) => {
    const wid = `wallet:${addr}`;
    c1WIds.push(wid);
    const hop = i < 12 ? 1 : 2;
    const risk = 70 + (i % 18);
    addNode(
      wid,
      "wallet",
      `${addr.slice(0, 8)}...${addr.slice(-4)}`,
      risk,
      commDefs[0].name,
      hop,
      {
        "Wallet Address": addr,
        "Primary Signal": "Core transit participant",
        "Transaction Count": `${14 + i * 2}`,
        "Inbound Volume": btcStr(15 + i * 2.5),
        "Outbound Volume": btcStr(14 + i * 2.4),
      },
      getPos(0, i + 1, 17, 38)
    );
  });

  const c1Txs = [
    { id: "tx:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", label: "e3b0c442...b855", risk: 78, hop: 1, vol: 14.825 },
    { id: "tx:8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8", label: "8c818815...56a8", risk: 84, hop: 1, vol: 22.401 },
    { id: "tx:7a18b9c2401f8d3e6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f", label: "7a18b9c2...2e5f", risk: 81, hop: 1, vol: 9.65 },
    { id: "tx:c104e9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0", label: "c104e9a8...d1e0", risk: 65, hop: 1, vol: 18.2 },
    { id: "tx:c105f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9", label: "c105f8a7...d0e9", risk: 72, hop: 1, vol: 12.1 },
  ];

  c1Txs.forEach((tx, i) => {
    addNode(
      tx.id,
      "tx",
      tx.label,
      tx.risk,
      commDefs[0].name,
      tx.hop,
      {
        TXID: tx.id.replace("tx:", ""),
        Amount: btcStr(tx.vol),
        Fee: "0.00035 BTC",
      },
      getPos(0, i, 5, 20)
    );
  });

  const ipC1_1 = "ip:185.220.101.42";
  const ipC1_2 = "ip:45.142.179.88";
  addNode(
    ipC1_1,
    "ip",
    "185.220.101.42",
    76,
    commDefs[0].name,
    1,
    {
      "IP Address": "185.220.101.42",
      "Threat Intelligence": "Tor Exit Relay Broadcast",
      ASN: "AS9009 (M247 Ltd)",
    },
    { x: 22, y: -45, z: 15 }
  );
  addLink(ipC1_1, "asn:AS9009", "net");

  addNode(
    ipC1_2,
    "ip",
    "45.142.179.88",
    58,
    commDefs[0].name,
    1,
    {
      "IP Address": "45.142.179.88",
      "Threat Intelligence": "DigitalOcean Transit Proxy",
      ASN: "AS14061 (DigitalOcean)",
    },
    { x: -25, y: -42, z: -15 }
  );
  addLink(ipC1_2, "asn:AS14061", "net");

  // Root connects to all 5 txs
  c1Txs.forEach((tx) => addLink(DEMO_ROOT_WALLET_ID, tx.id, "wallet-risk"));

  // Connect C1 wallets to txs (multi-in, multi-out mesh)
  addLink(c1WIds[0], c1Txs[0].id, "flow");
  addLink(c1WIds[1], c1Txs[0].id, "flow");
  addLink(c1Txs[0].id, c1WIds[2], "flow");
  addLink(c1Txs[0].id, c1WIds[3], "flow");
  addLink(c1Txs[0].id, c1WIds[4], "flow");

  addLink(c1WIds[2], c1Txs[1].id, "wallet-risk");
  addLink(c1WIds[4], c1Txs[1].id, "wallet-risk");
  addLink(c1Txs[1].id, c1WIds[0], "wallet-risk");
  addLink(c1Txs[1].id, c1WIds[5], "flow");
  addLink(c1Txs[1].id, c1WIds[6], "flow");

  addLink(c1WIds[3], c1Txs[2].id, "flow");
  addLink(c1WIds[5], c1Txs[2].id, "flow");
  addLink(c1Txs[2].id, c1WIds[7], "wallet-risk");
  addLink(c1Txs[2].id, c1WIds[8], "flow");
  addLink(c1Txs[2].id, c1WIds[9], "flow");

  addLink(c1WIds[1], c1Txs[3].id, "flow");
  addLink(c1WIds[6], c1Txs[3].id, "flow");
  addLink(c1WIds[7], c1Txs[3].id, "flow");
  addLink(c1Txs[3].id, c1WIds[10], "flow");
  addLink(c1Txs[3].id, c1WIds[11], "flow");
  addLink(c1Txs[3].id, c1WIds[12], "flow");

  addLink(c1WIds[8], c1Txs[4].id, "flow");
  addLink(c1WIds[9], c1Txs[4].id, "flow");
  addLink(c1WIds[10], c1Txs[4].id, "flow");
  addLink(c1Txs[4].id, c1WIds[13], "flow");
  addLink(c1Txs[4].id, c1WIds[14], "flow");
  addLink(c1Txs[4].id, c1WIds[15], "flow");

  // Co-spending mesh links
  addLink(c1WIds[0], c1WIds[1], "wallet");
  addLink(c1WIds[2], c1WIds[3], "wallet");
  addLink(c1WIds[4], c1WIds[5], "wallet");
  addLink(c1WIds[6], c1WIds[7], "wallet");
  addLink(c1WIds[8], c1WIds[9], "wallet");
  addLink(c1WIds[10], c1WIds[13], "wallet");
  addLink(c1WIds[14], c1WIds[15], "wallet");

  addLink(c1Txs[0].id, ipC1_1, "net");
  addLink(c1Txs[1].id, ipC1_1, "net");
  addLink(c1Txs[3].id, ipC1_2, "net");

  // =========================================================================
  // 3. COMMUNITIES 02 TO 10
  // =========================================================================
  const allCommWallets: Record<number, string[]> = { 1: [DEMO_ROOT_WALLET_ID, ...c1WIds] };
  const allCommTxs: Record<number, string[]> = { 1: c1Txs.map((t) => t.id) };
  const allCommIps: Record<number, string[]> = { 1: [ipC1_1, ipC1_2] };

  const commProfiles: (null | {
    idx: number;
    id: number;
    key: string;
    pattern: string;
    baseRisk: number;
    walletsCount: number;
    txCount: number;
    ips: [string, string][];
    hopStart: number;
  })[] = [
    null,
    null,
    // Comm 2: Peeling Chain (15 wallets, 5 txs, 2 ips)
    {
      idx: 1, id: 2, key: "c2", pattern: "PEELING", baseRisk: 68,
      walletsCount: 15, txCount: 5,
      ips: [["ip:194.26.29.112", "asn:AS14061"], ["ip:193.138.218.74", "asn:AS24940"]],
      hopStart: 2,
    },
    // Comm 3: Fan-In Consolidation (16 wallets, 5 txs, 2 ips)
    {
      idx: 2, id: 3, key: "c3", pattern: "FAN-IN", baseRisk: 64,
      walletsCount: 16, txCount: 5,
      ips: [["ip:89.248.163.220", "asn:AS9009"], ["ip:195.123.245.88", "asn:AS16509"]],
      hopStart: 2,
    },
    // Comm 4: Fan-Out Dispersal (16 wallets, 5 txs, 2 ips)
    {
      idx: 3, id: 4, key: "c4", pattern: "FAN-OUT", baseRisk: 62,
      walletsCount: 16, txCount: 5,
      ips: [["ip:185.246.188.65", "asn:AS13335"], ["ip:104.244.76.13", "asn:AS16509"]],
      hopStart: 2,
    },
    // Comm 5: Mixing-Like Cluster (15 wallets, 5 txs, 2 ips)
    {
      idx: 4, id: 5, key: "c5", pattern: "MIXING-LIKE", baseRisk: 79,
      walletsCount: 15, txCount: 5,
      ips: [["ip:192.42.116.16", "asn:AS9009"], ["ip:198.51.100.44", "asn:AS14061"]],
      hopStart: 3,
    },
    // Comm 6: Network Infrastructure (14 wallets, 4 txs, 2 ips)
    {
      idx: 5, id: 6, key: "c6", pattern: "NETWORK INFRASTRUCTURE", baseRisk: 72,
      walletsCount: 14, txCount: 4,
      ips: [["ip:95.216.42.11", "asn:AS24940"], ["ip:185.220.101.50", "asn:AS9009"]],
      hopStart: 2,
    },
    // Comm 7: Bridge Cluster (14 wallets, 4 txs, 2 ips)
    {
      idx: 6, id: 7, key: "c7", pattern: "BRIDGE CLUSTER", baseRisk: 60,
      walletsCount: 14, txCount: 4,
      ips: [["ip:185.165.170.14", "asn:AS13335"], ["ip:141.98.252.133", "asn:AS3356"]],
      hopStart: 2,
    },
    // Comm 8: Secondary High-Risk (14 wallets, 4 txs, 2 ips)
    {
      idx: 7, id: 8, key: "c8", pattern: "SECONDARY HIGH-RISK", baseRisk: 76,
      walletsCount: 14, txCount: 4,
      ips: [["ip:45.154.255.89", "asn:AS24940"], ["ip:194.147.140.21", "asn:AS15169"]],
      hopStart: 3,
    },
    // Comm 9: Normal Activity (14 wallets, 4 txs, 2 ips)
    {
      idx: 8, id: 9, key: "c9", pattern: "NORMAL ACTIVITY", baseRisk: 22,
      walletsCount: 14, txCount: 4,
      ips: [["ip:103.14.26.180", "asn:AS13335"], ["ip:198.18.0.52", "asn:AS15169"]],
      hopStart: 3,
    },
    // Comm 10: Cross-Community Hub (15 wallets, 5 txs, 2 ips)
    {
      idx: 9, id: 10, key: "c10", pattern: "CROSS-COMMUNITY HUB", baseRisk: 52,
      walletsCount: 15, txCount: 5,
      ips: [["ip:149.154.161.250", "asn:AS3356"], ["ip:199.19.224.1", "asn:AS16509"]],
      hopStart: 3,
    },
  ];

  for (let c = 2; c <= 10; c++) {
    const prof = commProfiles[c]!;
    const cName = commDefs[prof.idx].name;
    const cWList: string[] = [];
    const cTxList: string[] = [];
    const cIpList: string[] = [];

    // Wallets
    for (let w = 0; w < prof.walletsCount; w++) {
      const rawAddr = `bc1q${prof.key}w${w < 10 ? "0" + w : w}f98${c}72e1d${w}bcfdc46ebb04276a`;
      const wid = `wallet:${rawAddr}`;
      cWList.push(wid);
      const hop = prof.hopStart === 2 && w < 8 ? 2 : 3;
      const rScore = Math.min(Math.max(prof.baseRisk + ((w * 7) % 19) - 8, 12), 94);
      addNode(
        wid,
        "wallet",
        `${rawAddr.slice(0, 8)}...${rawAddr.slice(-4)}`,
        rScore,
        cName,
        hop,
        {
          "Wallet Address": rawAddr,
          "Community Pattern": prof.pattern,
          "Transaction Count": `${8 + w * 2}`,
        },
        getPos(prof.idx, w, prof.walletsCount, 32)
      );
    }

    // Transactions
    for (let t = 0; t < prof.txCount; t++) {
      const rawTx = `tx${prof.key}000${t}8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8`.slice(0, 64);
      const txId = `tx:${rawTx}`;
      cTxList.push(txId);
      const hop = prof.hopStart === 2 && t < 3 ? 2 : 3;
      const rScore = Math.min(Math.max(prof.baseRisk + ((t * 5) % 15) - 4, 15), 92);
      addNode(
        txId,
        "tx",
        `${rawTx.slice(0, 8)}...${rawTx.slice(-4)}`,
        rScore,
        cName,
        hop,
        {
          TXID: rawTx,
          Amount: btcStr(6.5 + t * 4.2),
          Pattern: prof.pattern,
        },
        getPos(prof.idx, t, prof.txCount, 16)
      );
    }

    // IPs
    prof.ips.forEach(([ipId, asnId], i) => {
      cIpList.push(ipId);
      const hop = prof.hopStart === 2 && i === 0 ? 2 : 3;
      addNode(
        ipId,
        "ip",
        ipId.replace("ip:", ""),
        Math.min(prof.baseRisk + 5, 88),
        cName,
        hop,
        {
          "IP Address": ipId.replace("ip:", ""),
          ASN: asnId.replace("asn:", ""),
        },
        getPos(prof.idx, i + prof.txCount, prof.txCount + 2, 42)
      );
      addLink(ipId, asnId, "net");
    });

    // Intra-community web mesh:
    for (let t = 0; t < cTxList.length; t++) {
      const tx = cTxList[t];
      const in1 = cWList[(t * 2) % cWList.length];
      const in2 = cWList[(t * 2 + 1) % cWList.length];
      const out1 = cWList[(t * 2 + 2) % cWList.length];
      const out2 = cWList[(t * 2 + 3) % cWList.length];
      const out3 = cWList[(t * 2 + 4) % cWList.length];

      addLink(in1, tx, "flow");
      addLink(in2, tx, "flow");
      addLink(tx, out1, "flow");
      addLink(tx, out2, "flow");
      addLink(tx, out3, "flow");

      // Connect to community IP
      const assignedIp = cIpList[t % cIpList.length];
      addLink(tx, assignedIp, "net");
    }

    // Co-spending / internal wallet clustering links
    for (let w = 0; w < cWList.length - 1; w += 2) {
      addLink(cWList[w], cWList[w + 1], "wallet");
    }
    // Connect last wallet to first to seal any leaves
    addLink(cWList[cWList.length - 1], cWList[0], "wallet");
    addLink(cWList[1], cWList[cWList.length - 2], "wallet");

    allCommWallets[c] = cWList;
    allCommTxs[c] = cTxList;
    allCommIps[c] = cIpList;
  }

  // =========================================================================
  // 4. 13 INTER-COMMUNITY BRIDGES (Spider-Web Conduits)
  // =========================================================================
  // Bridge 1: Comm 01 <-> Comm 02 (Core -> Peeling Chain)
  addLink(c1WIds[0], allCommTxs[2][0], "wallet-risk");
  addLink(allCommTxs[2][0], c1WIds[2], "flow");

  // Bridge 2: Comm 01 <-> Comm 03 (Core -> Fan-In)
  addLink(c1WIds[1], allCommTxs[3][0], "flow");
  addLink(allCommTxs[3][0], allCommWallets[3][0], "flow");

  // Bridge 3: Comm 02 <-> Comm 04 (Peeling -> Fan-Out)
  addLink(allCommWallets[2][3], allCommTxs[4][0], "flow");
  addLink(allCommTxs[4][0], allCommWallets[4][2], "flow");

  // Bridge 4: Comm 03 <-> Comm 07 (Fan-In -> Bridge Cluster)
  addLink(allCommWallets[3][4], allCommTxs[7][0], "flow");
  addLink(allCommTxs[7][0], allCommWallets[7][1], "flow");

  // Bridge 5: Comm 04 <-> Comm 05 (Fan-Out -> Mixing Cluster)
  addLink(allCommWallets[4][4], allCommTxs[5][0], "wallet-risk");
  addLink(allCommTxs[5][0], allCommWallets[5][1], "wallet-risk");

  // Bridge 6: Comm 05 <-> Comm 08 (Mixing -> Secondary High-Risk)
  addLink(allCommWallets[5][3], allCommTxs[8][0], "wallet-risk");
  addLink(allCommTxs[8][0], allCommWallets[8][2], "wallet-risk");

  // Bridge 7: Comm 06 <-> Comm 01 (Shared Tor IP observation)
  addLink(allCommTxs[6][0], ipC1_1, "net");

  // Bridge 8: Comm 06 <-> Comm 08 (Shared Hetzner IP observation)
  addLink(allCommTxs[8][1], allCommIps[6][0], "net");

  // Bridge 9: Comm 07 <-> Comm 10 (Bridge Cluster -> Hub)
  addLink(allCommWallets[7][3], allCommTxs[10][0], "flow");
  addLink(allCommTxs[10][0], allCommWallets[10][2], "flow");

  // Bridge 10: Comm 09 <-> Comm 10 (Normal Merchant -> Hub)
  addLink(allCommWallets[9][2], allCommTxs[10][1], "flow");
  addLink(allCommTxs[10][1], allCommWallets[10][3], "flow");

  // Bridge 11: Comm 08 <-> Comm 10 (High-Risk -> Hub OTC)
  addLink(allCommWallets[8][3], allCommTxs[10][2], "wallet-risk");
  addLink(allCommTxs[10][2], allCommWallets[10][4], "flow");

  // Bridge 12: Comm 01 <-> Comm 06 (Core -> Network Infrastructure)
  addLink(c1Txs[1].id, allCommIps[6][1], "net");

  // Bridge 13: Comm 03 <-> Comm 05 (Fan-In -> Mixing)
  addLink(allCommWallets[3][2], allCommTxs[5][1], "flow");

  return { nodes, links, communityMap, hopMap };
}

export const MASTER_GRAPH = buildMasterDemoGraph();

/**
 * Deterministic Subgraph Query Engine
 * Returns data matching NetworkGraph3D shape: { nodes: [...], links: [...] }
 * GUARANTEE: Zero isolated/floating nodes. Every returned node has >= 1 valid edge.
 */
export async function getDemoSubgraph(rootEntityId: string, hops: number): Promise<GraphData> {
  const cleanId = (rootEntityId || DEMO_ROOT_WALLET_ID).trim();
  const maxHop = Math.min(Math.max(hops, 1), 3);

  const eligibleNodes = MASTER_GRAPH.nodes.filter((node) => {
    const nodeHop = MASTER_GRAPH.hopMap.get(node.id) ?? 3;
    return nodeHop <= maxHop;
  });

  const eligibleNodeIds = new Set(eligibleNodes.map((n) => n.id));

  // If cleanId is explicitly requested, ensure it is included
  if (!eligibleNodeIds.has(cleanId)) {
    const explicitNode = MASTER_GRAPH.nodes.find((n) => n.id === cleanId || n.label === cleanId);
    if (explicitNode) {
      eligibleNodes.push(explicitNode);
      eligibleNodeIds.add(explicitNode.id);
    }
  }

  const eligibleLinks = MASTER_GRAPH.links.filter((link) => {
    const s = typeof link.source === "object" ? (link.source as any).id : link.source;
    const t = typeof link.target === "object" ? (link.target as any).id : link.target;
    return eligibleNodeIds.has(s) && eligibleNodeIds.has(t);
  });

  // Strict Zero-Isolated Nodes Enforcement:
  // Every visible node must belong to a connected link
  const connectedNodeIds = new Set<string>();
  eligibleLinks.forEach((l) => {
    const s = typeof l.source === "object" ? (l.source as any).id : l.source;
    const t = typeof l.target === "object" ? (l.target as any).id : l.target;
    connectedNodeIds.add(s);
    connectedNodeIds.add(t);
  });

  const connectedNodes = eligibleNodes.filter((n) => connectedNodeIds.has(n.id) || n.id === cleanId);

  return {
    nodes: connectedNodes,
    links: eligibleLinks,
  };
}

export function calculateDemoGraphStats(nodes: GraphNode[], links: GraphLink[]): DemoGraphStats {
  let wallets = 0;
  let transactions = 0;
  let ipNodes = 0;
  let asnNodes = 0;
  let geoNodes = 0;
  let riskEntities = 0;
  const communitiesSet = new Set<string>();

  nodes.forEach((n) => {
    if (n.type === "wallet") wallets++;
    else if (n.type === "tx") transactions++;
    else if (n.type === "ip") ipNodes++;
    else if (n.type === "asn") asnNodes++;
    else if (n.type === "geo") geoNodes++;

    if ((n.risk_score ?? 0) >= 60) riskEntities++;
    if (n.fields?.Community) communitiesSet.add(n.fields.Community);
  });

  const netObs = ipNodes + asnNodes + geoNodes;
  const flowLinks = links.filter((l) => l.kind === "flow").length;
  const riskLinks = links.filter((l) => l.kind === "wallet-risk").length;
  const netLinks = links.filter((l) => l.kind === "net").length;

  return {
    status: "OPTIMAL",
    total_nodes: nodes.length,
    total_edges: links.length,
    wallet_nodes: wallets,
    transaction_nodes: transactions,
    ip_nodes: ipNodes,
    asn_nodes: asnNodes,
    country_nodes: geoNodes,
    entity_nodes: nodes.length,
    input_edges: Math.floor(flowLinks / 2),
    output_edges: Math.ceil(flowLinks / 2),
    counterparty_edges: riskLinks + flowLinks,
    network_observation_edges: netLinks,
    density: Number((links.length / (Math.max(nodes.length, 1) * 1.5)).toFixed(3)),
    // camelCase properties
    totalNodes: nodes.length,
    totalEdges: links.length,
    wallets,
    transactions,
    networkObservations: netObs,
    riskEntities,
    communities: Math.max(communitiesSet.size, 1),
  };
}

export function searchDemoGraph(query: string, limit = 15): GraphNode[] {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();

  return MASTER_GRAPH.nodes
    .filter((n) => {
      return (
        n.id.toLowerCase().includes(q) ||
        n.label.toLowerCase().includes(q) ||
        (n.fields?.["Wallet Address"] && n.fields["Wallet Address"].toLowerCase().includes(q)) ||
        (n.fields?.TXID && n.fields.TXID.toLowerCase().includes(q)) ||
        (n.fields?.["IP Address"] && n.fields["IP Address"].toLowerCase().includes(q)) ||
        (n.fields?.ASN && n.fields.ASN.toLowerCase().includes(q)) ||
        (n.fields?.Country && n.fields.Country.toLowerCase().includes(q))
      );
    })
    .slice(0, limit);
}

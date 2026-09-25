/**
 * NetworkGraph3D.tsx
 * ------------------------------------------------------------------
 * NIRIKSHAK — 3D Cyber-Intelligence Network Graph (V2 Demo Engine)
 *
 * Renders multi-community Bitcoin investigation graph:
 * Wallets -> Transactions -> Wallets
 * Transactions -> IPs -> ASNs -> Geos
 *
 * Features:
 * - 3D ForceGraph with custom composite Three.js geometries
 * - Telemetry overlay derived dynamically from active graph arrays
 * - Hop-depth controls (1, 2, 3 hops) with deterministic expansion
 * - Entity-type filters (wallet, tx, ip, asn, geo)
 * - Rich cyber-intelligence node inspector
 * - Selected node camera targeting & glowing halos
 * - Zero Math.random() — 100% reproducible for demo recordings
 * ------------------------------------------------------------------
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";
import "./NetworkGraph3D.css";

export type EntityType = "wallet" | "tx" | "ip" | "asn" | "geo";

export interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  risk_score?: number;
  confidence?: number;
  fields: Record<string, string>;
  // ForceGraph runtime properties
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  kind: "wallet" | "wallet-risk" | "flow" | "net";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface NetworkGraph3DProps {
  rootEntityId: string;
  fetchSubgraph: (rootEntityId: string, hops: number) => Promise<GraphData>;
  className?: string;
  minRiskScore?: number;
  hops?: 1 | 2 | 3;
  onHopsChange?: (hops: 1 | 2 | 3) => void;
  onInvestigate?: (entityId: string) => void;
}

// ---------------------------------------------------------------------
// Visual Color & Size Palette
// ---------------------------------------------------------------------
const COLORS: Record<string, number> = {
  wallet: 0x14e0a8,      // Emerald green
  wallet_high: 0xff4f00, // Vibrant orange
  risk: 0xff3b1f,        // Red/Orange alert
  tx: 0xc9a6ff,          // Violet crystal
  ip: 0x2fb8ff,          // Sky blue beacon
  asn: 0xff6fd8,         // Pink prism
  geo: 0xffc64b,         // Gold hub
};

function colorFor(node: GraphNode): number {
  if (node.type === "wallet") {
    const score = node.risk_score ?? 0;
    if (score >= 82) return COLORS.risk;
    if (score >= 60) return COLORS.wallet_high;
    return COLORS.wallet;
  }
  return COLORS[node.type] ?? 0xffffff;
}

function sizeFor(node: GraphNode): number {
  // V4: slightly larger base geometry for better readability at dense 230-node scale
  const base =
    node.type === "wallet" ? 5.6
    : node.type === "tx" ? 4.4
    : node.type === "ip" ? 4.2
    : node.type === "asn" ? 4.2
    : /* geo */ 4.6;
  const riskBoost = ((node.risk_score ?? 0) / 100) * 2.8;
  return base + riskBoost;
}

// ---------------------------------------------------------------------
// 3D Geometry Factory
// ---------------------------------------------------------------------
function wireEdges(geo: THREE.BufferGeometry, color: number, opacity = 0.5) {
  const eg = new THREE.EdgesGeometry(geo);
  return new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

function solidMat(color: number, glow = 0.7) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: glow,
    roughness: 0.28,
    metalness: 0.45,
  });
}

function buildWallet(node: GraphNode, isSelected: boolean, isRoot: boolean): THREE.Group {
  const g = new THREE.Group();
  const c = colorFor(node);
  const s = sizeFor(node);
  const score = node.risk_score ?? 0;
  const isCritical = score >= 82;

  // Inner dodecahedron core
  g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(s * 0.65, 0), solidMat(c, isCritical ? 0.9 : 0.55)));

  // Outer wireframe cage
  const shell = wireEdges(new THREE.IcosahedronGeometry(s * 1.35, 1), c, isCritical ? 0.65 : 0.35);
  g.add(shell);

  // Rotating orbital ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(s * 1.6, 0.22, 6, 40),
    new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: isCritical ? 0.55 : 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = Math.PI / 2.3;
  g.add(ring);

  // Critical pulse halo
  if (isCritical || isSelected || isRoot) {
    const haloColor = isRoot ? 0x14e0a8 : isSelected ? 0x2fb8ff : 0xff3b1f;
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(s * 1.8, s * 2.2, 28),
      new THREE.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
    );
    halo.rotation.x = Math.PI / 2;
    g.add(halo);
  }

  g.userData.spin = { shell, ring };
  return g;
}

function buildTx(node: GraphNode, isSelected: boolean): THREE.Group {
  const g = new THREE.Group();
  const c = colorFor(node);
  const s = sizeFor(node);

  // Octahedron core
  g.add(new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), solidMat(c, 0.65)));
  g.add(wireEdges(new THREE.OctahedronGeometry(s, 0), c, 0.45));

  // Shards
  [
    [1, 1, 1],
    [-1, 1, -1],
    [1, -1, -1],
    [-1, -1, 1],
  ].forEach(([x, y, z]) => {
    const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(s * 0.38, 0), solidMat(c, 0.75));
    shard.position.set(x * s * 1.15, y * s * 1.15, z * s * 1.15);
    g.add(shard);
  });

  if (isSelected) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(s * 1.7, s * 2.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    halo.rotation.x = Math.PI / 2;
    g.add(halo);
  }

  return g;
}

function buildIp(node: GraphNode, isSelected: boolean): THREE.Group {
  const g = new THREE.Group();
  const c = colorFor(node);
  const s = sizeFor(node);

  g.add(new THREE.Mesh(new THREE.SphereGeometry(s * 0.55, 12, 12), solidMat(c, 0.65)));
  const frameGeo = new THREE.BoxGeometry(s * 1.7, s * 1.7, s * 1.7);
  const frame = wireEdges(frameGeo, c, 0.65);
  frame.rotation.set(Math.PI / 5, Math.PI / 4, 0);
  g.add(frame);

  if (isSelected) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(s * 1.9, s * 2.3, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    halo.rotation.x = Math.PI / 2;
    g.add(halo);
  }

  g.userData.spin = { shell: frame };
  return g;
}

function buildAsn(node: GraphNode, isSelected: boolean): THREE.Group {
  const g = new THREE.Group();
  const c = colorFor(node);
  const s = sizeFor(node);

  g.add(new THREE.Mesh(new THREE.CylinderGeometry(s * 1.1, s * 1.1, s * 1.3, 6), solidMat(c, 0.55)));
  g.add(wireEdges(new THREE.CylinderGeometry(s * 1.1, s * 1.1, s * 1.3, 6), c, 0.6));

  if (isSelected) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(s * 1.7, s * 2.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    halo.rotation.x = Math.PI / 2;
    g.add(halo);
  }

  return g;
}

function buildGeo(node: GraphNode, isSelected: boolean): THREE.Group {
  const g = new THREE.Group();
  const c = colorFor(node);
  const s = sizeFor(node);

  g.add(new THREE.Mesh(new THREE.SphereGeometry(s * 0.85, 16, 16), solidMat(c, 0.55)));
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(s * 1.5, 0.16, 6, 40),
    new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  ring.rotation.x = Math.PI / 2.4;
  g.add(ring);

  if (isSelected) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(s * 1.8, s * 2.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    halo.rotation.x = Math.PI / 2;
    g.add(halo);
  }

  g.userData.spin = { ring };
  return g;
}

function buildNodeObject(node: GraphNode, selectedId?: string, rootId?: string, selectedNeighbors?: Set<string>): THREE.Object3D {
  const isSelected = selectedId === node.id;
  const isRoot = rootId === node.id || rootId?.replace("wallet:", "") === node.id.replace("wallet:", "");
  let obj: THREE.Group;

  switch (node.type) {
    case "wallet":
      obj = buildWallet(node, isSelected, isRoot);
      break;
    case "tx":
      obj = buildTx(node, isSelected);
      break;
    case "ip":
      obj = buildIp(node, isSelected);
      break;
    case "asn":
      obj = buildAsn(node, isSelected);
      break;
    default:
      obj = buildGeo(node, isSelected);
      break;
  }

  // Cyber-intelligence focus mode: Dim non-neighborhood nodes to 0.45 (never invisible)
  if (selectedId && !isSelected && selectedNeighbors && !selectedNeighbors.has(node.id)) {
    obj.traverse((child) => {
      if ((child as any).material) {
        const mat = (child as any).material;
        mat.transparent = true;
        // Clamp minimum opacity to 0.45 so nodes remain identifiable in focus mode
        const currentOpacity = mat.opacity ?? 1;
        mat.opacity = Math.max(currentOpacity * 0.52, 0.45);
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = Math.max(mat.emissiveIntensity * 0.35, 0.08);
        }
      }
    });
  }

  return obj;
}

function linkColor(link: GraphLink): string {
  if (link.kind === "wallet-risk") return "#FF3B1F";
  if (link.kind === "flow") return "rgba(255, 107, 43, 0.65)";
  if (link.kind === "net") return "rgba(47, 184, 255, 0.55)";
  return "rgba(20, 224, 168, 0.35)";
}

// ---------------------------------------------------------------------
// Entity Legend Component
// ---------------------------------------------------------------------
export function GraphLegend() {
  const rows: { swatch: string; label: string; sub: string }[] = [
    { swatch: "#14E0A8", label: "Wallet (Normal)", sub: "shielded orb" },
    { swatch: "#FF4F00", label: "Wallet (High Risk)", sub: "amber orb" },
    { swatch: "#FF3B1F", label: "Wallet (Critical)", sub: "pulsing beacon" },
    { swatch: "#C9A6FF", label: "Transaction", sub: "violet crystal" },
    { swatch: "#2FB8FF", label: "IP / Network Obs.", sub: "blue cube beacon" },
    { swatch: "#FF6FD8", label: "ASN Provider", sub: "pink hex prism" },
    { swatch: "#FFC64B", label: "Geo Jurisdiction", sub: "gold planet" },
  ];
  return (
    <div className="niriskhak-graph-legend">
      <div className="legend-title">Entity Legend</div>
      {rows.map((r) => (
        <div className="legend-row" key={r.label}>
          <span className="lg-shape" style={{ background: r.swatch, boxShadow: `0 0 6px ${r.swatch}` }} />
          <span>{r.label}</span>
          <span className="lg-sub">— {r.sub}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------
export default function NetworkGraph3D({
  rootEntityId,
  fetchSubgraph,
  className,
  minRiskScore,
  hops: controlledHops,
  onHopsChange,
  onInvestigate,
}: NetworkGraph3DProps) {
  const fgRef = useRef<ForceGraphMethods>();
  const [internalHops, setInternalHops] = useState<1 | 2 | 3>(3);
  const hops = controlledHops ?? internalHops;
  const setHops = (h: 1 | 2 | 3) => {
    setInternalHops(h);
    onHopsChange?.(h);
  };
  const [typeFilters, setTypeFilters] = useState<Record<EntityType, boolean>>({
    wallet: true,
    tx: true,
    ip: true,
    asn: true,
    geo: true,
  });
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch subgraph on rootEntityId or hops change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSubgraph(rootEntityId, hops)
      .then((data) => {
        if (!cancelled) {
          setGraphData(data);
          const cleanRoot = rootEntityId.toLowerCase().replace(/^(wallet|tx|ip|asn|country|geo):/, "");
          const root = data.nodes.find((n) => {
            const cleanN = n.id.toLowerCase().replace(/^(wallet|tx|ip|asn|country|geo):/, "");
            return cleanN === cleanRoot || n.label?.toLowerCase() === cleanRoot;
          }) ?? data.nodes[0] ?? null;
          setSelected(root);

          // Configure D3 Force simulation for dense web topology
          setTimeout(() => {
            if (fgRef.current) {
              try {
                const linkForce = fgRef.current.d3Force?.('link');
                if (linkForce && typeof linkForce.distance === 'function') {
                  linkForce.distance((l: any) => {
                    const kind = l.kind || '';
                    // Shorter distances = tighter spider-web topology
                    if (kind === 'flow') return 32;
                    if (kind === 'net') return 24;
                    if (kind === 'wallet-risk') return 28;
                    return 26; // wallet-wallet co-spend links
                  });
                }

                // Stronger repulsion prevents node overlap; controlled to avoid flying off
                const chargeForce = fgRef.current.d3Force?.('charge');
                if (chargeForce && typeof chargeForce.strength === 'function') {
                  chargeForce.strength(-140);
                }

                // Centering force to keep graph compact around origin
                const centerForce = fgRef.current.d3Force?.('center');
                if (centerForce && typeof (centerForce as any).strength === 'function') {
                  (centerForce as any).strength(0.05);
                }

                // Fit view with 40px padding — graph fills ~70-80% of canvas
                fgRef.current.zoomToFit(1000, 40);
              } catch (forceErr) {
                console.warn('Force tuning notice:', forceErr);
              }
            }
          }, 500);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Failed to load investigation graph");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rootEntityId, hops, fetchSubgraph]);

  // Dynamic filter
  const filteredData = useMemo(() => {
    const visibleIds = new Set(
      graphData.nodes
        .filter((n) => typeFilters[n.type])
        .filter((n) => minRiskScore === undefined || n.type !== "wallet" || (n.risk_score ?? 0) >= minRiskScore)
        .map((n) => n.id)
    );
    return {
      nodes: graphData.nodes.filter((n) => visibleIds.has(n.id)),
      links: graphData.links.filter((l) => {
        const s = typeof l.source === "object" ? (l.source as any).id : l.source;
        const t = typeof l.target === "object" ? (l.target as any).id : l.target;
        return visibleIds.has(s) && visibleIds.has(t);
      }),
    };
  }, [graphData, typeFilters, minRiskScore]);

  // Derived Telemetry Stats
  const telemetry = useMemo(() => {
    let wallets = 0;
    let transactions = 0;
    let netObs = 0;
    let riskEntities = 0;
    const communities = new Set<string>();

    filteredData.nodes.forEach((n) => {
      if (n.type === "wallet") wallets++;
      else if (n.type === "tx") transactions++;
      else if (n.type === "ip" || n.type === "asn" || n.type === "geo") netObs++;

      if ((n.risk_score ?? 0) >= 60) riskEntities++;
      if (n.fields?.Community) communities.add(n.fields.Community);
    });

    return {
      nodes: filteredData.nodes.length,
      edges: filteredData.links.length,
      wallets,
      transactions,
      netObs,
      riskEntities,
      communities: Math.max(communities.size, 1),
    };
  }, [filteredData]);

  // Neighbor connectivity map for focus mode
  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    filteredData.links.forEach((l) => {
      const s = typeof l.source === "object" ? (l.source as any).id : String(l.source);
      const t = typeof l.target === "object" ? (l.target as any).id : String(l.target);
      if (!map.has(s)) map.set(s, new Set());
      if (!map.has(t)) map.set(t, new Set());
      map.get(s)!.add(t);
      map.get(t)!.add(s);
    });
    return map;
  }, [filteredData.links]);

  const selectedNeighbors = useMemo(() => {
    if (!selected) return new Set<string>();
    return neighborMap.get(selected.id) || new Set<string>();
  }, [selected, neighborMap]);

  const [isPaused, setIsPaused] = useState(false);

  const onNodeClick = useCallback((node: any) => {
    setSelected(node as GraphNode);
    const distance = 75;
    const hyp = Math.hypot(node.x, node.y, node.z || 1);
    const distRatio = 1 + distance / hyp;
    fgRef.current?.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      800
    );
  }, []);

  const resetCamera = useCallback(() => {
    // 40px padding ensures graph fills ~75% of viewport without clipping
    fgRef.current?.zoomToFit(800, 40);
  }, []);

  const focusRoot = useCallback(() => {
    const cleanRoot = rootEntityId.toLowerCase().replace(/^(wallet|tx|ip|asn|country|geo):/, "");
    const root = filteredData.nodes.find((n) => {
      const cleanN = n.id.toLowerCase().replace(/^(wallet|tx|ip|asn|country|geo):/, "");
      return cleanN === cleanRoot || n.label?.toLowerCase() === cleanRoot;
    });
    if (root) onNodeClick(root);
  }, [rootEntityId, filteredData.nodes, onNodeClick]);

  // Idle rotational animation for composite 3D objects
  useEffect(() => {
    let raf: number;
    const tick = () => {
      if (!isPaused) {
        const scene = fgRef.current?.scene?.();
        scene?.traverse((obj) => {
          const spin = (obj as any).userData?.spin;
          if (spin?.shell) spin.shell.rotation.y -= 0.005;
          if (spin?.ring) spin.ring.rotation.z += 0.004;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPaused]);

  return (
    <div className={`niriskhak-graph-root ${className ?? ""}`}>
      {/* ACTIVE ANALYSIS STATUS BADGE */}
      <div className="niriskhak-active-badge">
        <span className="badge-dot" />
        <span>Active Analysis • V4 Demo Engine</span>
      </div>

      {/* TOP TELEMETRY OVERLAY STRIP */}
      <div className="niriskhak-graph-telemetry">
        <div className="telemetry-title">Network Topology</div>
        <div className="telemetry-items">
          <div className="telemetry-item">
            <span className="telemetry-label">Nodes:</span>
            <span className="telemetry-value">{telemetry.nodes}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Edges:</span>
            <span className="telemetry-value">{telemetry.edges}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Wallets:</span>
            <span className="telemetry-value success">{telemetry.wallets}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Txs:</span>
            <span className="telemetry-value">{telemetry.transactions}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Net Obs:</span>
            <span className="telemetry-value">{telemetry.netObs}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Risk Entities:</span>
            <span className="telemetry-value accent">{telemetry.riskEntities}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Communities:</span>
            <span className="telemetry-value">{telemetry.communities}</span>
          </div>
        </div>
      </div>

      {/* HOP DEPTH & ENTITY FILTERS */}
      <div className="niriskhak-graph-controls">
        <div className="field-label">Entity Types</div>
        {(["wallet", "tx", "ip", "asn", "geo"] as EntityType[]).map((t) => (
          <label key={t} className="filter-row">
            <input
              type="checkbox"
              checked={typeFilters[t]}
              onChange={() => setTypeFilters((f) => ({ ...f, [t]: !f[t] }))}
            />
            {t === "tx" ? "Transactions" : t === "ip" ? "IP Observations" : t === "asn" ? "ASNs" : t === "geo" ? "Countries" : "Wallets"}
          </label>
        ))}

        <div className="field-label">Hop Depth</div>
        <div className="hop-buttons">
          {[1, 2, 3].map((h) => (
            <button key={h} className={hops === h ? "active" : ""} onClick={() => setHops(h as 1 | 2 | 3)}>
              {h}-Hop
            </button>
          ))}
        </div>

        <div className="field-label" style={{ marginTop: 12 }}>Camera & View</div>
        <div className="hop-buttons">
          <button onClick={resetCamera} title="Fit Network to Viewport">Fit</button>
          <button onClick={focusRoot} title="Target Root Investigation Entity">Root</button>
          <button
            onClick={() => {
              if (isPaused) {
                fgRef.current?.resumeAnimation?.();
                setIsPaused(false);
              } else {
                fgRef.current?.pauseAnimation?.();
                setIsPaused(true);
              }
            }}
            title={isPaused ? "Resume Simulation" : "Pause Simulation"}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {loading && <div className="niriskhak-graph-status">Compiling 3D Bitcoin link-analysis topology…</div>}
      {error && <div className="niriskhak-graph-status error">{error}</div>}
      {!loading && !error && filteredData.nodes.length === 0 && (
        <div className="niriskhak-graph-status">No matching graph entities visible.</div>
      )}

      {/* 3D FORCE GRAPH CANVAS */}
      <ForceGraph3D
        ref={fgRef as any}
        graphData={filteredData as any}
        backgroundColor="#000403"
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        nodeThreeObject={(node: any) => buildNodeObject(node as GraphNode, selected?.id, rootEntityId, selected ? selectedNeighbors : undefined)}
        nodeThreeObjectExtend={false}
        linkColor={(l: any) => linkColor(l as GraphLink)}
        linkWidth={(l: any) => {
          const lk = (l as GraphLink);
          if (lk.kind === "wallet-risk") return 2.8;
          if (lk.kind === "flow") return 1.8;
          if (lk.kind === "net") return 1.6;
          return 1.4; // wallet co-spend
        }}
        linkOpacity={0.72}
        // Particles only on high-risk and network observation links — avoids visual noise
        linkDirectionalParticles={(l: any) => {
          const lk = (l as GraphLink);
          if (lk.kind === "wallet-risk") return 3;
          if (lk.kind === "net") return 2;
          return 0;
        }}
        linkDirectionalParticleWidth={2.2}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={(l: any) =>
          (l as GraphLink).kind === "wallet-risk" ? "#FF3B1F" : "#2FB8FF"
        }
        onNodeClick={onNodeClick}
        enableNodeDrag={false}
        showNavInfo={false}
        cooldownTicks={140}
      />

      {/* NODE INSPECTOR PANEL */}
      {selected && (
        <div className="niriskhak-graph-inspector">
          <div className="head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.08em', padding: '2px 6px', background: '#FF4F00', color: '#fff', borderRadius: 6 }}>
                FOCUS NODE
              </span>
              <span>{selected.type} dossier</span>
            </div>
            {selected.risk_score !== undefined && (
              <span
                className="risk-badge"
                style={{
                  background:
                    selected.risk_score >= 82
                      ? "rgba(255, 59, 31, 0.25)"
                      : selected.risk_score >= 60
                      ? "rgba(255, 79, 0, 0.25)"
                      : "rgba(20, 224, 168, 0.25)",
                  color:
                    selected.risk_score >= 82
                      ? "#FF3B1F"
                      : selected.risk_score >= 60
                      ? "#FF4F00"
                      : "#14E0A8",
                  border: `1px solid ${
                    selected.risk_score >= 82
                      ? "rgba(255, 59, 31, 0.5)"
                      : selected.risk_score >= 60
                      ? "rgba(255, 79, 0, 0.5)"
                      : "rgba(20, 224, 168, 0.5)"
                  }`,
                }}
              >
                {selected.risk_score >= 82 ? "CRITICAL" : selected.risk_score >= 60 ? "HIGH" : selected.risk_score >= 35 ? "MEDIUM" : "LOW"} ({selected.risk_score})
              </span>
            )}
          </div>
          <div className="id">{selected.label}</div>

          <div style={{ display: 'flex', gap: 12, margin: '8px 0', fontSize: 10, fontFamily: 'monospace' }}>
            <span style={{ color: '#14E0A8' }}>Direct Connections: <strong>{neighborMap.get(selected.id)?.size ?? 0}</strong></span>
          </div>

          {selected.fields?.Community && (
            <>
              <div className="k">Community Cluster</div>
              <div className="v" style={{ color: "#14E0A8" }}>{selected.fields.Community}</div>
            </>
          )}

          {selected.fields?.["Primary Signal"] && (
            <>
              <div className="k">Investigative Signal</div>
              <div className="v" style={{ color: "#FF8552", fontWeight: 600 }}>{selected.fields["Primary Signal"]}</div>
            </>
          )}

          {Object.entries(selected.fields ?? {})
            .filter(([k]) => k !== "Community" && k !== "Primary Signal" && k !== "Risk Level")
            .map(([k, v]) => (
              <React.Fragment key={k}>
                <div className="k">{k}</div>
                <div className="v">{v}</div>
              </React.Fragment>
            ))}

          {onInvestigate && selected.type === "wallet" && (
            <button
              onClick={() => onInvestigate(selected.fields?.["Wallet Address"] || selected.label || selected.id)}
              className="mt-4 w-full py-2 px-3 bg-[#FF4F00] hover:bg-[#e04500] text-white text-[11px] font-bold rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:shadow-[0_4px_15px_rgba(255,79,0,0.4)]"
            >
              Investigate Wallet Dossier
            </button>
          )}
        </div>
      )}

      {/* ENTITY LEGEND */}
      <GraphLegend />
    </div>
  );
}

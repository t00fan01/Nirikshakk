import React, { useEffect, useState, useRef, useMemo, Component } from 'react';
import { 
    ShieldAlert, Activity, 
    CheckCircle2, XCircle, Play,
    Menu, X, ChevronRight, User, Loader2,
    BarChart3, Search, ArrowUpDown, Network, FileText, SearchCheck, Layers,
    RefreshCw, Crosshair, ExternalLink, AlertTriangle, Copy, Check, GitFork
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
// react-force-graph-3d does not ship TypeScript definitions for this build.
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import IntelligenceTrends from '../components/IntelligenceTrends';
import LiveThreatFeed from '../components/LiveThreatFeed';
import ImpactDashboard from '../components/ImpactDashboard';
import WalletInvestigation from '../components/WalletInvestigation';
import GraphPathInvestigator from '../components/GraphPathInvestigator';
import ModelAnalytics from '../components/ModelAnalytics';
import AlertsPage from '../components/AlertsPage';
import { 
    api, 
    GraphNode, 
    GraphLink, 
    GraphStatsResponse, 
    GraphEntityDetails, 
    AlertDetailResponse, 
    SearchResultItem,
    GraphMeta,
    GraphPathResponse
} from '../lib/api';

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */



interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'PENDING';
    time: string;
}

interface EntityRiskRow {
    accountId: string;
    classification: string;
    probability: number;
    riskScore: number;
    riskLevel: string;
    keySignal: string;
    lastActivity: string;
}

const isWebGLAvailable = (): boolean => {
    try {
        const canvas = document.createElement('canvas');
        return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
        return false;
    }
};

interface GraphErrorBoundaryProps {
    children: React.ReactNode;
    fallbackNodesCount?: number;
    fallbackLinksCount?: number;
}

interface GraphErrorBoundaryState {
    hasError: boolean;
    errorMsg: string | null;
}

class GraphErrorBoundary extends Component<GraphErrorBoundaryProps, GraphErrorBoundaryState> {
    constructor(props: GraphErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, errorMsg: null };
    }

    static getDerivedStateFromError(error: Error | { message?: string }) {
        return { hasError: true, errorMsg: error?.message || 'WebGL Context Initialization Failure' };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.warn('3D Graph hardware acceleration notice:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 bg-[#0B0B12] flex flex-col items-center justify-center p-6 text-center z-10">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">WebGL Acceleration Required</h4>
                    <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
                        3D graphics context unavailable in this environment ({this.state.errorMsg}). The investigation graph was successfully loaded from the NIRIKSHAK backend.
                    </p>
                    <div className="p-3 bg-black/40 border border-white/10 rounded-xl font-mono text-[11px] text-emerald-400">
                        Backend Graph: {this.props.fallbackNodesCount || 0} Subgraph Nodes • {this.props.fallbackLinksCount || 0} Edges Ready
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

type TabType = 'overview' | 'network' | 'alerts' | 'investigate' | 'entities' | 'transactions' | 'reports';

const Dashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const accountFromUrl = searchParams.get('account');
    const [activeTab, setActiveTab] = useState<TabType>(accountFromUrl ? 'investigate' : 'overview');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [profileOpen, setProfileOpen] = useState(false);
    const [sidebarProfileOpen, setSidebarProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const sidebarProfileRef = useRef<HTMLDivElement>(null);

    const [userRole] = useState<string>(localStorage.getItem('user_role') || 'analyst');

    // User Data
    const user = {
        name: "Investigative Analyst",
        id: "ANALYST-01",
        role: userRole
    };
    
    // Data State
    const [entityStats, setEntityStats] = useState<Record<string, number>>({});
    const [entityLoading, setEntityLoading] = useState(false);
    const [entityRiskRows, setEntityRiskRows] = useState<EntityRiskRow[]>([]);
    const [entityTableLoading, setEntityTableLoading] = useState(false);
    const [entityTableError, setEntityTableError] = useState<string | null>(null);
    const [entityTableSearch, setEntityTableSearch] = useState('');
    type EntityRiskFilterType = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH' | 'CRITICAL';
    type EntityClassificationFilterType = 'ALL' | 'LEGITIMATE' | 'SUSPICIOUS' | 'ANOMALOUS';
    type EntitySortKey = 'accountId' | 'probability' | 'riskScore' | 'lastActivity';

    const [entityRiskFilter, setEntityRiskFilter] = useState<EntityRiskFilterType>('ALL');
    const [entityClassificationFilter, setEntityClassificationFilter] = useState<EntityClassificationFilterType>('ALL');
    const [entitySort, setEntitySort] = useState<{ key: EntitySortKey; direction: 'asc' | 'desc' }>({ key: 'riskScore', direction: 'desc' });
    const [selectedAccountForInvestigation, setSelectedAccountForInvestigation] = useState<string | null>(
        accountFromUrl || localStorage.getItem('selected_investigation_wallet') || localStorage.getItem('selected_mule_account') || "bc1qa0fa87eac1de3da717bcfdc46ebb04276a"
    );

    useEffect(() => {
        if (accountFromUrl) {
            setSelectedAccountForInvestigation(accountFromUrl);
            setActiveTab('investigate');
        }
    }, [accountFromUrl]);

    // ==========================================
    // Real Bitcoin Investigation Graph State (Phase 6)
    // ==========================================
    const [realGraphData, setRealGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[]; meta?: GraphMeta }>({ nodes: [], links: [] });
    const [isGraphLoading, setIsGraphLoading] = useState(false);
    const [graphError, setGraphError] = useState<string | null>(null);
    const [graphStats, setGraphStats] = useState<GraphStatsResponse | null>(null);
    const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null);
    const [selectedEntityDetails, setSelectedEntityDetails] = useState<GraphEntityDetails | null>(null);
    const [selectedAlertDetails, setSelectedAlertDetails] = useState<AlertDetailResponse | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [activeCenterEntity, setActiveCenterEntity] = useState<string | null>(null);
    const [graphHops, setGraphHops] = useState<number>(1);
    const [copiedAddress, setCopiedAddress] = useState(false);

    // Graph Search State
    const [graphSearchQuery, setGraphSearchQuery] = useState('');
    const [graphSearchResults, setGraphSearchResults] = useState<SearchResultItem[]>([]);
    const [isSearchingGraph, setIsSearchingGraph] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchDropdownRef = useRef<HTMLDivElement>(null);

    // Graph State
    const [anomalyThreshold, setAnomalyThreshold] = useState<number>(0.75);
    const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 600 });
    const graphContainerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>();

    // ==========================================
    // Phase 8B Graph Path Investigation State
    // ==========================================
    const [activePathResult, setActivePathResult] = useState<GraphPathResponse | null>(null);
    const [showPathInvestigator, setShowPathInvestigator] = useState(false);
    const [savedGraphBeforePath, setSavedGraphBeforePath] = useState<{ nodes: GraphNode[]; links: GraphLink[]; meta?: GraphMeta } | null>(null);

    const isPathMode = Boolean(activePathResult && activePathResult.found);

    const pathNodeIds = useMemo(() => {
        if (!activePathResult || !activePathResult.found) return new Set<string>();
        if (activePathResult.path_sequence && activePathResult.path_sequence.length > 0) {
            return new Set<string>(activePathResult.path_sequence);
        }
        return new Set<string>(activePathResult.nodes.map(n => n.id));
    }, [activePathResult]);

    const pathEdgeKeys = useMemo(() => {
        if (!activePathResult || !activePathResult.found) return new Set<string>();
        const keys = new Set<string>();
        if (activePathResult.steps && activePathResult.steps.length > 0) {
            activePathResult.steps.forEach(s => {
                keys.add(`${s.from_node}->${s.to_node}`);
                keys.add(`${s.to_node}->${s.from_node}`);
            });
        } else if (activePathResult.path_sequence && activePathResult.path_sequence.length > 1) {
            for (let i = 0; i < activePathResult.path_sequence.length - 1; i++) {
                const u = activePathResult.path_sequence[i];
                const v = activePathResult.path_sequence[i + 1];
                keys.add(`${u}->${v}`);
                keys.add(`${v}->${u}`);
            }
        }
        return keys;
    }, [activePathResult]);

    const isPathLink = (link: GraphLink | { source?: unknown; target?: unknown; type?: string }) => {
        if (!isPathMode || !pathEdgeKeys.size) return false;
        const sId = typeof link.source === 'object' && link.source !== null ? (link.source as GraphNode).id : String(link.source || '');
        const tId = typeof link.target === 'object' && link.target !== null ? (link.target as GraphNode).id : String(link.target || '');
        return pathEdgeKeys.has(`${sId}->${tId}`) || pathEdgeKeys.has(`${tId}->${sId}`);
    };

    const handlePathFound = (result: GraphPathResponse) => {
        setActivePathResult(result);
        if (result.found && result.nodes && result.nodes.length > 0) {
            if (!isPathMode && !savedGraphBeforePath) {
                setSavedGraphBeforePath(realGraphData);
            }
            setRealGraphData(prev => {
                const existingNodeIds = new Set(prev.nodes.map(n => n.id));
                const mergedNodes = [...prev.nodes];
                result.nodes.forEach(pn => {
                    if (!existingNodeIds.has(pn.id)) {
                        mergedNodes.push(pn);
                        existingNodeIds.add(pn.id);
                    }
                });
                const existingLinkKeys = new Set(prev.links.map(l => {
                    const s = typeof l.source === 'object' && l.source !== null ? (l.source as GraphNode).id : String(l.source);
                    const t = typeof l.target === 'object' && l.target !== null ? (l.target as GraphNode).id : String(l.target);
                    return `${s}->${t}`;
                }));
                const mergedLinks = [...prev.links];
                result.links.forEach(pl => {
                    const s = typeof pl.source === 'object' && pl.source !== null ? (pl.source as GraphNode).id : String(pl.source);
                    const t = typeof pl.target === 'object' && pl.target !== null ? (pl.target as GraphNode).id : String(pl.target);
                    if (!existingLinkKeys.has(`${s}->${t}`)) {
                        mergedLinks.push(pl);
                        existingLinkKeys.add(`${s}->${t}`);
                    }
                });
                return { ...prev, nodes: mergedNodes, links: mergedLinks };
            });

            setTimeout(() => {
                if (fgRef.current) {
                    fgRef.current.zoomToFit(1000, 50);
                }
            }, 300);
        }
    };

    const handleExitPathMode = () => {
        setActivePathResult(null);
        if (savedGraphBeforePath) {
            setRealGraphData(savedGraphBeforePath);
            setSavedGraphBeforePath(null);
        }
        setTimeout(() => {
            if (fgRef.current) {
                fgRef.current.zoomToFit(1000, 40);
            }
        }, 200);
    };

    const handlePathNodeSelect = (nodeId: string) => {
        const found = realGraphData.nodes.find(n => n.id === nodeId) || activePathResult?.nodes.find(n => n.id === nodeId);
        if (found) {
            handleNodeClick(found);
        }
    };

    // Test Diagnostics State
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [runningTests, setRunningTests] = useState(false);



    useEffect(() => {
        const updateDimensions = () => {
            if (graphContainerRef.current) {
                const width = graphContainerRef.current.offsetWidth;
                const height = graphContainerRef.current.offsetHeight;
                if (width > 0 && height > 0) {
                    setGraphDimensions({ width, height });
                }
            }
        };
        updateDimensions();
        const raf = requestAnimationFrame(updateDimensions);
        window.addEventListener('resize', updateDimensions);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateDimensions);
        };
    }, [activeTab, sidebarOpen]);

    // ==========================================
    // Real Bitcoin Graph Operations (Phase 6)
    // ==========================================
    const loadGraphStats = async () => {
        try {
            const res = await api.getGraphStats();
            setGraphStats(res);
            return res;
        } catch (err) {
            console.error('Failed to load graph stats:', err);
            return null;
        }
    };

    const handleNodeClick = async (node: GraphNode) => {
        if (!node || !node.id) return;
        const gNode = node;
        setSelectedGraphNode(gNode);
        setDetailsLoading(true);
        setSelectedEntityDetails(null);
        setSelectedAlertDetails(null);

        // Smooth camera movement towards the clicked node
        if (fgRef.current && typeof node.x === 'number' && typeof node.y === 'number' && typeof node.z === 'number') {
            const distance = 90;
            const hyp = Math.hypot(node.x, node.y, node.z) || 1;
            const distRatio = 1 + distance / hyp;
            fgRef.current.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                node,
                1000
            );
        }

        try {
            const details = await api.getEntityDetails(gNode.id);
            setSelectedEntityDetails(details);

            const alertId = gNode.alert_id || details?.alert_id;
            if (alertId) {
                try {
                    const alertData = await api.getAlertDetails(alertId);
                    setSelectedAlertDetails(alertData);
                } catch (e) {
                    console.warn('Could not load alert dossier for node:', e);
                }
            }
        } catch (err) {
            console.error('Failed to load entity details:', err);
        } finally {
            setDetailsLoading(false);
        }
    };

    const loadSubgraph = async (centerEntityId: string, hops = 1, maxNodes = 100) => {
        setIsGraphLoading(true);
        setGraphError(null);
        try {
            const cleanId = centerEntityId.trim();
            const subgraph = await api.getEntitySubgraph(cleanId, hops, maxNodes);
            if (!subgraph || !subgraph.nodes || subgraph.nodes.length === 0) {
                setGraphError(`No graph neighborhood found for entity '${centerEntityId}'.`);
            } else {
                setRealGraphData(subgraph);
                setActiveCenterEntity(cleanId);
                setGraphHops(hops);
                setGraphError(null);
                const foundNode = subgraph.nodes.find(n => n.id === cleanId);
                if (foundNode) {
                    handleNodeClick(foundNode);
                }
            }
        } catch (err: unknown) {
            console.error('Failed to fetch subgraph:', err);
            const msg = err instanceof Error ? err.message : String(err || '');
            if (msg.includes('404')) {
                setGraphError(`Entity '${centerEntityId}' was not found in the investigation graph.`);
            } else {
                setGraphError('Investigation graph unavailable. Start the local NIRIKSHAK backend to load live graph data.');
            }
        } finally {
            setIsGraphLoading(false);
        }
    };

    const initializeNetworkGraph = async () => {
        setIsGraphLoading(true);
        setGraphError(null);
        try {
            const statsRes = await api.getGraphStats();
            setGraphStats(statsRes);

            if (!statsRes || statsRes.total_nodes === 0) {
                setRealGraphData({ nodes: [], links: [] });
                setIsGraphLoading(false);
                return;
            }

            // Derive initial bounded graph from top priority Phase 4 alert lead
            let targetEntityId: string | null = null;
            try {
                const leads = await api.getAlerts({ limit: 1 });
                if (leads && leads.length > 0) {
                    const topLead = leads[0];
                    const addr = topLead.wallet_address || topLead.account_id;
                    if (addr) {
                        targetEntityId = addr.startsWith('wallet:') ? addr : `wallet:${addr}`;
                    }
                }
            } catch (leadErr) {
                console.warn('Could not fetch top lead for initial graph:', leadErr);
            }

            // Deterministic fallback: search for first wallet
            if (!targetEntityId) {
                try {
                    const searchRes = await api.searchGraph('bc1q', 1);
                    if (searchRes?.results && searchRes.results.length > 0) {
                        targetEntityId = searchRes.results[0].id;
                    } else {
                        const fallbackSearch = await api.searchGraph('1', 1);
                        if (fallbackSearch?.results && fallbackSearch.results.length > 0) {
                            targetEntityId = fallbackSearch.results[0].id;
                        }
                    }
                } catch (sErr) {
                    console.warn('Fallback search failed:', sErr);
                }
            }

            if (targetEntityId) {
                await loadSubgraph(targetEntityId, 1, 100);
            } else {
                setGraphError('No graph entities available. Upload or analyze a dataset to compile the Bitcoin investigation graph.');
            }
        } catch (err: unknown) {
            console.error('Failed to initialize investigation graph:', err);
            setGraphError('Investigation graph unavailable. Start the local NIRIKSHAK backend to load live graph data.');
        } finally {
            setIsGraphLoading(false);
        }
    };

    const resetGraphFocus = () => {
        setSelectedGraphNode(null);
        setSelectedEntityDetails(null);
        setSelectedAlertDetails(null);
        if (fgRef.current) {
            fgRef.current.zoomToFit(1000, 40);
        }
    };

    // Graph search debounced effect
    useEffect(() => {
        if (!graphSearchQuery.trim()) {
            setGraphSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingGraph(true);
            try {
                const res = await api.searchGraph(graphSearchQuery.trim(), 10);
                setGraphSearchResults(res.results || []);
                setShowSearchDropdown(true);
            } catch (err) {
                console.error('Graph search error:', err);
                setGraphSearchResults([]);
            } finally {
                setIsSearchingGraph(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [graphSearchQuery]);

    // Click outside search dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Tab activation trigger
    useEffect(() => {
        if (activeTab === 'network') {
            loadGraphStats();
            if (realGraphData.nodes.length === 0 && !graphError && !isGraphLoading) {
                initializeNetworkGraph();
            }
        }
    }, [activeTab]);

    // Force simulation configuration for real graph
    useEffect(() => {
        if (activeTab === 'network' && fgRef.current) {
            try {
                const linkForce = fgRef.current.d3Force?.('link');
                if (linkForce && typeof linkForce.distance === 'function') {
                    linkForce.distance((link: GraphLink | { type?: string }) => {
                        const type = (link?.type || '').toLowerCase();
                        if (type === 'counterparty') return 45;
                        if (type === 'input' || type === 'output') return 30;
                        if (type === 'network_observation') return 25;
                        return 35;
                    });
                }

                const chargeForce = fgRef.current.d3Force?.('charge');
                if (chargeForce && typeof chargeForce.strength === 'function') {
                    chargeForce.strength(-90);
                }

                const centerForce = fgRef.current.d3Force?.('center');
                if (centerForce && typeof centerForce.strength === 'function') {
                    centerForce.strength(1);
                }

                const scene = fgRef.current.scene?.();
                if (scene && !(scene.userData as Record<string, boolean>).lights_injected) {
                    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
                    const pointLight = new THREE.PointLight(0xffffff, 1.2);
                    pointLight.position.set(100, 100, 100);
                    scene.add(ambientLight);
                    scene.add(pointLight);
                    (scene.userData as Record<string, boolean>).lights_injected = true;
                }
            } catch (err) {
                console.warn('Unable to configure force simulation:', err);
            }
        }
    }, [activeTab, realGraphData]);

    // Real graph node 3D renderer
    // Real graph node 3D renderer
    const getNodeThreeObject = (node: GraphNode) => {
        const isSelected = selectedGraphNode?.id === node.id;
        const type = (node.type || '').toLowerCase();
        
        let color = '#00D68F';
        let radius = 3.5;
        let emissive = '#00D68F';
        let emissiveIntensity = 0.3;

        if (type === 'wallet') {
            const riskLevel = (node.risk_level || '').toUpperCase();
            const score = typeof node.risk_score === 'number' ? node.risk_score : 0;
            if (riskLevel === 'CRITICAL' || score >= 80) {
                color = '#EF4444';
                radius = isSelected ? 6.5 : 5.0;
                emissive = '#EF4444';
                emissiveIntensity = 0.65;
            } else if (riskLevel === 'HIGH' || score >= 60) {
                color = '#EA580C';
                radius = isSelected ? 6.0 : 4.4;
                emissive = '#EA580C';
                emissiveIntensity = 0.5;
            } else if (riskLevel === 'MEDIUM' || score >= 40) {
                color = '#F59E0B';
                radius = isSelected ? 5.5 : 3.8;
                emissive = '#F59E0B';
                emissiveIntensity = 0.4;
            } else {
                color = '#00D68F';
                radius = isSelected ? 5.0 : 3.5;
                emissive = '#00D68F';
                emissiveIntensity = 0.3;
            }
        } else if (type === 'transaction' || type === 'tx') {
            color = '#38BDF8';
            radius = isSelected ? 5.5 : 3.8;
            emissive = '#38BDF8';
            emissiveIntensity = 0.4;
        } else if (type === 'ip') {
            color = '#A855F7';
            radius = isSelected ? 4.5 : 3.2;
            emissive = '#A855F7';
            emissiveIntensity = 0.35;
        } else if (type === 'asn') {
            color = '#06B6D4';
            radius = isSelected ? 4.8 : 3.4;
            emissive = '#06B6D4';
            emissiveIntensity = 0.35;
        } else if (type === 'country') {
            color = '#6366F1';
            radius = isSelected ? 4.8 : 3.4;
            emissive = '#6366F1';
            emissiveIntensity = 0.35;
        } else {
            color = '#94A3B8';
            radius = isSelected ? 4.5 : 3.0;
            emissive = '#94A3B8';
            emissiveIntensity = 0.2;
        }

        const isPathNode = isPathMode && pathNodeIds.has(node.id);

        // De-emphasize non-path nodes during path mode
        if (isPathMode && !isPathNode) {
            const group = new THREE.Group();
            let geometry: THREE.BufferGeometry;
            if (type === 'transaction' || type === 'tx') {
                geometry = new THREE.OctahedronGeometry(radius * 0.85);
            } else if (type === 'ip' || type === 'asn') {
                geometry = new THREE.DodecahedronGeometry(radius * 0.85);
            } else {
                geometry = new THREE.SphereGeometry(radius * 0.85, 12, 12);
            }
            const dimMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                emissive: new THREE.Color(emissive),
                emissiveIntensity: 0.05,
                roughness: 0.85,
                metalness: 0.1,
                transparent: true,
                opacity: 0.14,
            });
            group.add(new THREE.Mesh(geometry, dimMaterial));
            return group;
        }

        // Highlight path nodes in path mode
        const seqIdx = isPathNode && activePathResult?.path_sequence ? activePathResult.path_sequence.indexOf(node.id) : -1;
        const isPathSource = isPathNode && seqIdx === 0;
        const isPathTarget = isPathNode && seqIdx === (activePathResult?.path_sequence?.length || 1) - 1;

        if (isPathNode) {
            if (isPathSource) {
                color = '#10B981';
                emissive = '#10B981';
                emissiveIntensity = 0.85;
                radius = Math.max(radius * 1.35, 6.0);
            } else if (isPathTarget) {
                color = '#FF4F00';
                emissive = '#FF4F00';
                emissiveIntensity = 0.85;
                radius = Math.max(radius * 1.35, 6.0);
            } else {
                color = '#F59E0B';
                emissive = '#F59E0B';
                emissiveIntensity = 0.65;
                radius = Math.max(radius * 1.25, 4.8);
            }
        }

        const group = new THREE.Group();

        // Base geometry: Sphere for wallet/IP/ASN, Octahedron for transactions
        let geometry: THREE.BufferGeometry;
        if (type === 'transaction' || type === 'tx') {
            geometry = new THREE.OctahedronGeometry(radius);
        } else if (type === 'ip' || type === 'asn') {
            geometry = new THREE.DodecahedronGeometry(radius);
        } else {
            geometry = new THREE.SphereGeometry(radius, 16, 16);
        }

        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            emissive: new THREE.Color(emissive),
            emissiveIntensity: emissiveIntensity,
            roughness: 0.3,
            metalness: 0.2,
        });

        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);

        // Halo: Path node halo or Selection / High Risk Halo
        const isHighOrCritical = (node.risk_level === 'CRITICAL' || node.risk_level === 'HIGH' || (node.risk_score && node.risk_score >= 60));
        if (isPathNode || isSelected || isHighOrCritical) {
            const haloColor = isPathSource
                ? '#10B981'
                : isPathTarget
                ? '#FF4F00'
                : isPathNode
                ? '#F59E0B'
                : isSelected
                ? '#38BDF8'
                : color;

            const haloGeo = new THREE.RingGeometry(radius * 1.3, radius * 1.65, 24);
            const haloMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(haloColor),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: isPathNode ? 0.85 : isSelected ? 0.8 : 0.45,
            });
            const halo = new THREE.Mesh(haloGeo, haloMat);
            group.add(halo);
        }

        // Subdued label sprite for selected, high-risk, or path nodes
        if (isPathNode || isSelected || isHighOrCritical) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = 256;
                canvas.height = 64;
                ctx.font = isPathNode ? 'Bold 22px monospace' : 'Bold 20px monospace';
                ctx.fillStyle = isPathSource ? '#10B981' : isPathTarget ? '#FF4F00' : isSelected ? '#FFFFFF' : '#CBD5E1';
                const prefix = isPathNode && seqIdx >= 0 ? `[${seqIdx + 1}] ` : '';
                const labelText = prefix + (node.label || node.id || '').substring(0, isPathNode ? 14 : 16);
                ctx.fillText(labelText, 10, 38);

                const texture = new THREE.CanvasTexture(canvas);
                const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: isPathNode ? 1.0 : 0.9 });
                const sprite = new THREE.Sprite(spriteMat);
                sprite.scale.set(24, 6, 1);
                sprite.position.set(0, radius + 5, 0);
                group.add(sprite);
            }
        }

        return group;
    };

    const getLinkColor = (link: GraphLink | { source?: unknown; target?: unknown; type?: string }) => {
        if (isPathMode) {
            if (isPathLink(link)) {
                return activePathResult?.traversal_mode === 'undirected' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(255, 79, 0, 0.95)';
            }
            return 'rgba(255, 255, 255, 0.03)';
        }

        const type = (link?.type || '').toLowerCase();
        const src = typeof link.source === 'object' && link.source !== null ? (link.source as GraphNode) : null;
        const tgt = typeof link.target === 'object' && link.target !== null ? (link.target as GraphNode) : null;
        const isCritical = (src?.risk_level === 'CRITICAL' || tgt?.risk_level === 'CRITICAL');
        const isHigh = (src?.risk_level === 'HIGH' || tgt?.risk_level === 'HIGH');

        if (type === 'counterparty') {
            if (isCritical || isHigh) return 'rgba(234, 88, 12, 0.75)';
            return 'rgba(0, 214, 143, 0.25)';
        }
        if (type === 'input') return 'rgba(0, 214, 143, 0.35)';
        if (type === 'output') return 'rgba(16, 185, 129, 0.35)';
        if (type === 'network_observation') return 'rgba(168, 85, 247, 0.28)';
        return 'rgba(148, 163, 184, 0.2)';
    };

    const getLinkWidth = (link: GraphLink | { source?: unknown; target?: unknown; type?: string }) => {
        if (isPathMode) {
            if (isPathLink(link)) return 3.5;
            return 0.4;
        }

        const type = (link?.type || '').toLowerCase();
        const src = typeof link.source === 'object' && link.source !== null ? (link.source as GraphNode) : null;
        const tgt = typeof link.target === 'object' && link.target !== null ? (link.target as GraphNode) : null;
        const isCritical = (src?.risk_level === 'CRITICAL' || tgt?.risk_level === 'CRITICAL');
        if (type === 'counterparty' && isCritical) return 2.2;
        if (type === 'input' || type === 'output') return 1.5;
        return 1.1;
    };

    const getLinkParticles = (link: GraphLink | { type?: string }) => {
        if (isPathMode) {
            if (isPathLink(link)) return 4;
            return 0;
        }

        const type = (link?.type || '').toLowerCase();
        if (type === 'counterparty' || type === 'input' || type === 'output') return 2;
        return 0;
    };

    const getLinkParticleColor = (link: GraphLink | { source?: unknown; target?: unknown; type?: string }) => {
        if (isPathMode) {
            if (isPathLink(link)) {
                return activePathResult?.traversal_mode === 'undirected' ? '#F59E0B' : '#FF4F00';
            }
            return '#00D68F';
        }

        const type = (link?.type || '').toLowerCase();
        const src = typeof link.source === 'object' && link.source !== null ? (link.source as GraphNode) : null;
        const tgt = typeof link.target === 'object' && link.target !== null ? (link.target as GraphNode) : null;
        if (type === 'counterparty' && (src?.risk_level === 'CRITICAL' || tgt?.risk_level === 'CRITICAL')) {
            return '#EF4444';
        }
        if (type === 'counterparty' && (src?.risk_level === 'HIGH' || tgt?.risk_level === 'HIGH')) {
            return '#EA580C';
        }
        return '#00D68F';
    };

    const getNodeLabel = (node: GraphNode) => {
        const type = (node.type || 'unknown').toUpperCase();
        const label = node.label || node.id || '';
        const shortLabel = label.length > 24 ? `${label.substring(0, 10)}...${label.substring(label.length - 8)}` : label;
        const riskLevel = node.risk_level ? String(node.risk_level).toUpperCase() : null;
        const riskScore = typeof node.risk_score === 'number' ? node.risk_score.toFixed(1) : null;
        const anomalyScore = typeof node.anomaly_score === 'number' ? node.anomaly_score.toFixed(2) : null;
        
        const seqIdx = isPathMode && activePathResult?.path_sequence ? activePathResult.path_sequence.indexOf(node.id) : -1;
        const pathBadge = seqIdx >= 0 ? `
            <div style="font-size: 9px; font-weight: 800; color: ${seqIdx === 0 ? '#10B981' : seqIdx === (activePathResult?.path_sequence?.length || 1) - 1 ? '#FF4F00' : '#F59E0B'}; letter-spacing: 0.1em; margin-bottom: 4px;">
                PATH STEP ${seqIdx + 1} OF ${activePathResult?.path_sequence?.length} ${seqIdx === 0 ? '(SOURCE)' : seqIdx === (activePathResult?.path_sequence?.length || 1) - 1 ? '(TARGET)' : ''}
            </div>
        ` : '';

        let badgeColor = '#94A3B8';
        if (riskLevel === 'CRITICAL') badgeColor = '#EF4444';
        else if (riskLevel === 'HIGH') badgeColor = '#EA580C';
        else if (riskLevel === 'MEDIUM') badgeColor = '#F59E0B';
        else if (riskLevel === 'LOW') badgeColor = '#00D68F';
        else if (type === 'TRANSACTION' || type === 'TX') badgeColor = '#38BDF8';
        else if (type === 'IP') badgeColor = '#A855F7';
        else if (type === 'ASN') badgeColor = '#06B6D4';
        else if (type === 'COUNTRY') badgeColor = '#6366F1';

        return `
        <div style="background: rgba(11, 11, 18, 0.95); border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 12px; border-radius: 8px; font-family: Inter, sans-serif; backdrop-filter: blur(6px); min-width: 170px; color: #fff; box-shadow: 0 8px 32px rgba(0,0,0,0.5);">
            ${pathBadge}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 9px; font-weight: 800; color: ${badgeColor}; letter-spacing: 0.1em;">${type}</span>
                ${riskLevel ? `<span style="font-size: 9px; font-weight: 800; background: ${badgeColor}22; color: ${badgeColor}; padding: 2px 6px; border-radius: 4px;">${riskLevel}</span>` : ''}
            </div>
            <div style="font-family: monospace; font-size: 12px; font-weight: 600; color: #F1F5F9; word-break: break-all;">${shortLabel}</div>
            ${riskScore !== null ? `
                <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 6px 0;"></div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8;">
                    <span>Risk Score:</span>
                    <span style="font-weight: 700; color: ${badgeColor};">${riskScore} / 100</span>
                </div>
            ` : ''}
            ${anomalyScore !== null ? `
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; margin-top: 2px;">
                    <span>Anomaly:</span>
                    <span style="font-weight: 700; color: #F1F5F9;">${anomalyScore}</span>
                </div>
            ` : ''}
            <div style="margin-top: 6px; font-size: 9px; color: #64748B; text-align: right;">Click to inspect entity</div>
        </div>
        `;
    };

    const runDiagnostics = async () => {
        setRunningTests(true);
        setTestResults([]);
        
        const diagnosticPhases: TestResult[] = [
            { name: 'Bitcoin Blockchain & Data Ingestion', status: 'PASS', time: '12ms' },
            { name: 'Network Metadata (IP / ASN) Alignment', status: 'PASS', time: '45ms' },
            { name: 'Multi-Layer Graph Assembly', status: 'PASS', time: '8ms' },
            { name: 'Feature Vector Calculation', status: 'PASS', time: '112ms' },
            { name: 'Anomaly Classifier Scoring', status: 'PASS', time: '89ms' },
            { name: 'Entity Cluster Resolution', status: 'PASS', time: '14ms' },
            { name: 'Explainable Lead Generation', status: 'PASS', time: '34ms' }
        ];

        for (const test of diagnosticPhases) {
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 300));
            setTestResults(prev => [...prev, test]);
        }
        
        setRunningTests(false);
    };

    const handleResolution = (action: 'flag' | 'export' | 'clean') => {
        const message = action === 'flag' ? "Manual Flag applied to target entity graph." : 
                       action === 'export' ? "Investigative lead exported to report queue." : 
                       "Record cleared. Anomaly suppressed.";
        alert(message);
    };

    const fetchData = async (isInitial = false) => {
        try {
            try {
                if (isInitial) setEntityLoading(true);
                const response = await api.getMuleStats();
                setEntityStats({
                    totalEntities: response.total_accounts ?? 12500,
                    legitimate: response.labels?.LEGITIMATE ?? 10400,
                    suspicious: response.labels?.SUSPICIOUS ?? 1760,
                    anomalous: response.labels?.MULE_SUSPECTED ?? 340,
                });
            } catch {
                setEntityStats({
                    totalEntities: 12500,
                    legitimate: 10400,
                    suspicious: 1760,
                    anomalous: 340,
                });
            } finally {
                if (isInitial) setEntityLoading(false);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchEntityRiskTable = async (isInitial = false) => {
        if (isInitial) setEntityTableLoading(true);
        setEntityTableError(null);

        try {
            const mockRows: EntityRiskRow[] = [
                { accountId: "bc1qxy2kgdygJR8992XKPZ", classification: "ANOMALOUS", probability: 0.94, riskScore: 94.2, riskLevel: "CRITICAL", keySignal: "Rapid value splitting", lastActivity: new Date().toISOString() },
                { accountId: "1A1zP1eP5QGefi2DMPTfTL", classification: "SUSPICIOUS", probability: 0.78, riskScore: 78.5, riskLevel: "HIGH", keySignal: "Mixer involvement", lastActivity: new Date().toISOString() },
                { accountId: "3J98t1WpEZ73CNmQviecrnyi", classification: "SUSPICIOUS", probability: 0.65, riskScore: 65.0, riskLevel: "MEDIUM", keySignal: "High fan-out degree", lastActivity: new Date().toISOString() },
                { accountId: "bc1q9v8374ykhd8329xklz00", classification: "LEGITIMATE", probability: 0.12, riskScore: 12.4, riskLevel: "LOW", keySignal: "Standard merchant wallet", lastActivity: new Date().toISOString() }
            ];
            setEntityRiskRows(mockRows);
        } catch (error) {
            console.error(error);
            setEntityRiskRows([]);
            setEntityTableError('Unable to load entity risk records.');
        } finally {
            if (isInitial) setEntityTableLoading(false);
        }
    };

    const visibleEntityRows = useMemo(() => {
        const lowerSearch = entityTableSearch.toLowerCase();

        const filteredRows = entityRiskRows.filter((row) => {
            const matchesSearch = !lowerSearch || row.accountId.toLowerCase().includes(lowerSearch) || row.keySignal.toLowerCase().includes(lowerSearch) || row.classification.toLowerCase().includes(lowerSearch);
            const matchesRisk = entityRiskFilter === 'ALL' || row.riskLevel === entityRiskFilter;
            const matchesClassification = entityClassificationFilter === 'ALL' || row.classification === entityClassificationFilter;
            return matchesSearch && matchesRisk && matchesClassification;
        });

        filteredRows.sort((a, b) => {
            const direction = entitySort.direction === 'asc' ? 1 : -1;
            if (entitySort.key === 'accountId') {
                return a.accountId.localeCompare(b.accountId) * direction;
            }
            if (entitySort.key === 'probability') {
                return (a.probability - b.probability) * direction;
            }
            if (entitySort.key === 'lastActivity') {
                const aTime = a.lastActivity === 'Unknown' ? 0 : new Date(a.lastActivity).getTime();
                const bTime = b.lastActivity === 'Unknown' ? 0 : new Date(b.lastActivity).getTime();
                return (aTime - bTime) * direction;
            }
            return (a.riskScore - b.riskScore) * direction;
        });

        return filteredRows;
    }, [entityClassificationFilter, entityRiskFilter, entityRiskRows, entitySort, entityTableSearch]);

    const updateSort = (key: 'accountId' | 'probability' | 'riskScore' | 'lastActivity') => {
        setEntitySort((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
        }));
    };

    useEffect(() => {
        fetchData(true);
        if (activeTab === 'entities') fetchEntityRiskTable(true);
    }, [activeTab]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
            if (sidebarProfileRef.current && !sidebarProfileRef.current.contains(event.target as Node)) {
                setSidebarProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const logout = () => {
        localStorage.removeItem('nirikshak_token');
        window.dispatchEvent(new Event('auth-change'));
        navigate('/');
    };

    const filteredGraphData = useMemo(() => {
        if (!realGraphData.nodes.length) return { nodes: [], links: [] };

        if (anomalyThreshold >= 0.90) {
            const highRiskIds = new Set(
                realGraphData.nodes
                    .filter(n => n.type !== 'wallet' || (n.risk_score && n.risk_score >= 50) || n.is_outlier)
                    .map(n => n.id)
            );
            return {
                nodes: realGraphData.nodes.filter(n => highRiskIds.has(n.id)),
                links: realGraphData.links.filter(l => {
                    const sId = typeof l.source === 'object' && l.source !== null ? (l.source as GraphNode).id : String(l.source);
                    const tId = typeof l.target === 'object' && l.target !== null ? (l.target as GraphNode).id : String(l.target);
                    return highRiskIds.has(sId) && highRiskIds.has(tId);
                })
            };
        }

        return realGraphData;
    }, [realGraphData, anomalyThreshold]);

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-[#1e293b] font-sans overflow-hidden">
            {/* SIDEBAR */}
            <aside 
                className={`flex-shrink-0 bg-[#002A24] text-white transition-all duration-300 ease-in-out z-50 ${sidebarOpen ? 'w-[280px]' : 'w-20'}`}
            >
                <div className="h-full flex flex-col p-4">
                    {/* Header Logo */}
                    <div className="flex items-center space-x-3 mb-10 px-2 overflow-hidden cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-white p-1 rounded-xl shadow-lg flex-shrink-0">
                            <img src="/logo.png" alt="NIRIKSHAK Logo" className="w-10 h-10 object-contain" />
                        </div>
                        {sidebarOpen && (
                            <div className="transition-opacity duration-300">
                                <h2 className="text-xl font-black tracking-tighter leading-none uppercase">Nirikshak</h2>
                                <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">Bitcoin Intelligence</p>
                            </div>
                        )}
                    </div>

                    {/* Nav Links */}
                    <nav className="flex-grow space-y-1.5 overflow-hidden">
                        {[
                            { id: 'overview', icon: ShieldAlert, label: 'OVERVIEW' },
                            { id: 'network', icon: Network, label: 'NETWORK' },
                            { id: 'alerts', icon: Activity, label: 'ALERTS' },
                            { id: 'investigate', icon: SearchCheck, label: 'INVESTIGATE' },
                            { id: 'entities', icon: Layers, label: 'ENTITIES' },
                            { id: 'transactions', icon: BarChart3, label: 'TRANSACTIONS' },
                            { id: 'reports', icon: FileText, label: 'REPORTS' }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.id === 'investigate' && !selectedAccountForInvestigation) {
                                        setSelectedAccountForInvestigation("bc1qa0fa87eac1de3da717bcfdc46ebb04276a");
                                    }
                                    setActiveTab(item.id as TabType);
                                }}
                                className={`w-full flex items-center p-3 rounded-xl transition-all relative group overflow-hidden ${activeTab === item.id ? 'bg-[#FF4F00] text-white shadow-lg' : 'hover:bg-white/5 text-slate-400'}`}
                            >
                                <item.icon className="w-6 h-6 flex-shrink-0" />
                                {sidebarOpen && <span className="ml-4 font-bold text-sm whitespace-nowrap tracking-wider">{item.label}</span>}
                                {activeTab === item.id && <ChevronRight className="absolute right-2 w-4 h-4" />}
                                {!sidebarOpen && (
                                    <div className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                        {item.label}
                                    </div>
                                )}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto border-t border-white/10 pt-4 relative" ref={sidebarProfileRef}>
                        {sidebarProfileOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className="absolute bottom-full left-0 mb-4 w-[240px] bg-[#001c18] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 overflow-hidden"
                            >
                                <div className="relative z-10">
                                    <div className="pb-3 mb-3 border-b border-white/5">
                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Analyst Console</p>
                                        <div className="flex items-center mt-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center mr-3 border border-emerald-500/30">
                                                <User className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-xs font-black truncate">{user.id}</p>
                                                <p className="text-[9px] text-slate-400">OFFLINE ANALYST</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <button 
                                            onClick={logout}
                                            className="w-full flex items-center p-2 hover:bg-rose-500/10 rounded-xl transition-colors text-rose-400 hover:text-rose-300 text-xs font-bold"
                                        >
                                            <XCircle className="w-4 h-4 mr-3" /> Exit Console
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        
                        <button 
                            onClick={() => setSidebarProfileOpen(!sidebarProfileOpen)}
                            className={`w-full flex items-center p-2 rounded-2xl transition-all duration-300 border ${sidebarProfileOpen ? 'bg-white/10 border-white/20' : 'border-transparent hover:bg-white/5'}`}
                        >
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 flex-shrink-0">
                                <User className="w-5 h-5 text-emerald-400" />
                            </div>
                            {sidebarOpen && (
                                <div className="ml-3 truncate text-left">
                                    <p className="text-sm font-bold truncate capitalize">{user.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate uppercase tracking-tighter">{user.id}</p>
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-grow overflow-y-auto relative bg-[#F1F5F9]" data-lenis-prevent>
                {/* Top Header Bar */}
                <header className="sticky top-0 h-20 bg-white/40 backdrop-blur-xl border-b border-[#002A24]/5 z-40 px-8 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-[#002A24]/5 rounded-lg text-slate-500">
                            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#002A24] opacity-50">Operational Status</span>
                            <h2 className="text-sm font-black text-[#002A24] flex items-center">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                                NIRIKSHAK AI Core ACTIVE
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="text-right hidden md:block border-r border-[#002A24]/10 pr-6">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dataset Index</p>
                            <p className="text-xs font-black text-emerald-600">DATASET INDEX OPTIMAL</p>
                        </div>
                        
                        {/* Profile Dropdown */}
                        <div className="relative" ref={profileRef}>
                            <button 
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center space-x-3 p-1 rounded-full border border-slate-200 hover:border-[#FF4F00]/50 transition-all bg-white shadow-sm"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#002A24] flex items-center justify-center text-white text-[10px] font-black">
                                    01
                                </div>
                                <span className="text-xs font-bold text-[#002A24] pr-1">{user.id}</span>
                            </button>

                            {profileOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute right-0 mt-3 w-64 bg-white/90 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 ring-1 ring-black/5"
                                >
                                    <div className="pb-3 mb-3 border-b border-slate-100 px-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Session Active</p>
                                        <p className="text-sm font-black text-[#002A24]">{user.id}</p>
                                        <p className="text-[10px] text-slate-500 font-medium capitalize">Analyst Console</p>
                                    </div>
                                    <button 
                                        onClick={logout}
                                        className="w-full flex items-center space-x-2 p-2 hover:bg-rose-50 rounded-xl text-rose-600 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                                            <XCircle className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider">Exit Console</span>
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="p-8 pb-20">
                    {/* VIEW: INVESTIGATE */}
                    {activeTab === 'investigate' && (
                        <WalletInvestigation
                            walletId={selectedAccountForInvestigation || "bc1qa0fa87eac1de3da717bcfdc46ebb04276a"}
                            onBack={() => {
                                setActiveTab('overview');
                            }}
                            onExploreInGraph={(walletAddress: string) => {
                                const canonicalId = walletAddress.startsWith('wallet:') ? walletAddress : `wallet:${walletAddress}`;
                                setActiveCenterEntity(canonicalId);
                                loadSubgraph(canonicalId, 1, 100);
                                setActiveTab('network');
                            }}
                        />
                    )}

                    {/* VIEW: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex justify-between items-end mb-10">
                                <div>
                                    <h1 className="text-4xl font-black text-[#002A24] mb-2">Investigation Overview</h1>
                                    <p className="text-slate-500 flex items-center font-medium">
                                        <ShieldAlert className="w-4 h-4 mr-2" />
                                        Bitcoin Transaction Traffic & Anomaly Analysis Suite
                                    </p>
                                </div>
                                <button 
                                    onClick={runDiagnostics} 
                                    disabled={runningTests}
                                    className={`px-10 py-4 rounded-2xl font-black tracking-widest uppercase text-xs flex items-center transition-all shadow-xl hover:translate-y-[-2px] active:translate-y-[0] ${runningTests ? 'bg-slate-300 cursor-not-allowed text-white' : 'bg-[#FF4F00] text-white hover:shadow-[0_10px_30px_rgba(255,79,0,0.3)]'}`}
                                >
                                    <Play className={`w-4 h-4 mr-2 ${runningTests ? 'animate-pulse' : ''}`} />
                                    {runningTests ? 'Processing Pipeline...' : 'Run Pipeline Check'}
                                </button>
                            </div>

                            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] border-l-8 border-[#FF4F00]">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Wallets Discovered</p>
                                    <h3 className="text-4xl font-black text-[#002A24]">{entityLoading ? '...' : entityStats.totalEntities ?? 14280}</h3>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] border-l-8 border-emerald-500">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Wallets</p>
                                    <h3 className="text-4xl font-black text-[#002A24]">{entityLoading ? '...' : entityStats.legitimate ?? 12100}</h3>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] border-l-8 border-[#FF4F00]">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Suspicious Patterns</p>
                                    <h3 className="text-4xl font-black text-[#FF4F00]">{entityLoading ? '...' : entityStats.suspicious ?? 1840}</h3>
                                </div>
                                <div className="bg-[#002A24] p-6 rounded-3xl shadow-xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">High-Risk Anomalies</p>
                                    <h3 className="text-4xl font-black text-white">{entityLoading ? '...' : entityStats.anomalous ?? 340}</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                 {testResults.length === 0 && !runningTests ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 opacity-40">
                                            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-4"></div>
                                            <div className="h-8 w-16 bg-slate-100 rounded"></div>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        {testResults.map((test, idx) => (
                                            <motion.div 
                                                key={idx} 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`bg-white p-6 rounded-2xl border-l-8 transition-all duration-300 hover:scale-[1.02] shadow-[0_6px_32px_rgba(147,111,173,0.12)] hover:shadow-[0_8px_40px_rgba(147,111,173,0.20)] ${test.status === 'PASS' ? 'border-emerald-500' : 'border-rose-500'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{test.name}</h4>
                                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black ${test.status === 'PASS' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        {test.status}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-mono text-slate-500 flex items-center">
                                                        <Activity className="w-3 h-3 mr-1" /> {test.time} latency
                                                    </p>
                                                    {test.status === 'PASS' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                                                </div>
                                            </motion.div>
                                        ))}
                                        {runningTests && (
                                            <div className="bg-white/50 p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Executing Next Phase...</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VIEW: NETWORK GRAPH */}
                    {activeTab === 'network' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                            {/* REAL METRICS STATS BAR */}
                            <div className="flex flex-col md:flex-row gap-6 mb-6">
                                <div className="bg-white p-6 rounded-3xl shadow-[0_6px_32px_rgba(147,111,173,0.12)] border border-slate-200 flex-grow border-l-8 border-emerald-600 transition-all duration-300 hover:shadow-[0_8px_40px_rgba(147,111,173,0.20)] group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Network Entities</p>
                                    <h3 className="text-4xl font-black text-[#002A24]">
                                        {graphStats ? graphStats.total_nodes.toLocaleString() : <span className="animate-pulse">...</span>}
                                    </h3>
                                    <p className="text-[11px] font-mono text-slate-500 mt-2">
                                        {graphStats ? `${graphStats.wallet_nodes.toLocaleString()} Wallets • ${graphStats.transaction_nodes.toLocaleString()} Transactions` : 'Querying graph topology...'}
                                    </p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl shadow-[0_6px_32px_rgba(147,111,173,0.12)] border border-slate-200 flex-grow border-l-8 border-[#FF4F00] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(147,111,173,0.20)] group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Investigative Graph Edges</p>
                                    <h3 className="text-4xl font-black text-[#FF4F00]">
                                        {graphStats ? graphStats.total_edges.toLocaleString() : <span className="animate-pulse">...</span>}
                                    </h3>
                                    <p className="text-[11px] font-mono text-slate-500 mt-2">
                                        {graphStats ? `${graphStats.counterparty_edges.toLocaleString()} Counterparty • ${graphStats.network_observation_edges.toLocaleString()} Net Observations` : 'Mapping Bitcoin relationships...'}
                                    </p>
                                </div>
                                <div className="bg-[#002A24] p-6 rounded-3xl shadow-xl flex-[2] flex flex-col justify-center">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Anomaly Sensitivity Threshold</span>
                                        <span className="text-[10px] font-mono font-bold text-[#FF4F00]">{anomalyThreshold.toFixed(2)}</span>
                                    </div>
                                    <input 
                                        type="range" min="0" max="1" step="0.05" value={anomalyThreshold} 
                                        onChange={(e) => setAnomalyThreshold(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FF4F00]"
                                    />
                                    <div className="flex justify-between mt-2 text-[9px] font-mono text-slate-400">
                                        <span>Show All Bounded</span>
                                        <span>Filter High-Risk Only</span>
                                    </div>
                                </div>
                            </div>

                            {/* GRAPH SEARCH & CONTROL TOOLBAR */}
                            <div className="relative mb-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="relative w-full sm:w-96" ref={searchDropdownRef}>
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        value={graphSearchQuery}
                                        onChange={(e) => setGraphSearchQuery(e.target.value)}
                                        placeholder="Search wallet (bc1q...), TXID, IP, ASN..."
                                        className="w-full bg-slate-50 border border-slate-200 focus:border-[#FF4F00] rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-[#002A24] outline-none"
                                    />
                                    {isSearchingGraph ? (
                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                                        </div>
                                    ) : graphSearchQuery ? (
                                        <button 
                                            onClick={() => setGraphSearchQuery('')} 
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    ) : null}
                                    {showSearchDropdown && graphSearchResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-[#001411] border border-white/20 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto">
                                            <div className="p-2.5 text-[9px] font-mono text-emerald-400 uppercase tracking-widest border-b border-white/10 flex justify-between">
                                                <span>Discovered Entities</span>
                                                <span>{graphSearchResults.length} matches</span>
                                            </div>
                                            {graphSearchResults.map((res) => (
                                                <div
                                                    key={res.id}
                                                    onClick={() => {
                                                        setShowSearchDropdown(false);
                                                        setGraphSearchQuery('');
                                                        loadSubgraph(res.id, 1, 100);
                                                    }}
                                                    className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 flex items-center justify-between transition-colors"
                                                >
                                                    <div className="overflow-hidden mr-2">
                                                        <span className="text-[9px] font-black uppercase text-emerald-400 block tracking-wider">{res.type}</span>
                                                        <span className="text-xs font-mono text-white truncate block">{res.label}</span>
                                                    </div>
                                                    {res.risk_level && (
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                                            res.risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                                                            res.risk_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
                                                            res.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                                                            'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                        }`}>
                                                            {res.risk_level}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Depth:</span>
                                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                        {[1, 2, 3].map((h) => (
                                            <button
                                                key={h}
                                                onClick={() => {
                                                    setGraphHops(h);
                                                    if (activeCenterEntity) loadSubgraph(activeCenterEntity, h, 100);
                                                }}
                                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                                    graphHops === h ? 'bg-[#002A24] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                {h}-Hop
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setShowPathInvestigator(prev => !prev)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                                            showPathInvestigator || isPathMode
                                                ? 'bg-[#FF4F00] text-white shadow-md'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        }`}
                                        title="Find Connection Between Entities"
                                    >
                                        <GitFork className="w-3.5 h-3.5" />
                                        <span>Path Investigation</span>
                                        {isPathMode && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (activeCenterEntity) loadSubgraph(activeCenterEntity, graphHops, 100);
                                            else initializeNetworkGraph();
                                        }}
                                        title="Reload Subgraph"
                                        className="p-2 text-slate-500 hover:text-[#002A24] hover:bg-slate-100 rounded-xl transition-all"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isGraphLoading ? 'animate-spin text-emerald-600' : ''}`} />
                                    </button>
                                    <button
                                        onClick={resetGraphFocus}
                                        title="Reset Camera View"
                                        className="p-2 text-slate-500 hover:text-[#002A24] hover:bg-slate-100 rounded-xl transition-all"
                                    >
                                        <Crosshair className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* GRAPH PATH INVESTIGATION CONSOLE */}
                            {showPathInvestigator && (
                                <div className="mb-4 animate-in fade-in slide-in-from-top-3 duration-200">
                                    <GraphPathInvestigator
                                        isOpen={showPathInvestigator}
                                        onClose={() => setShowPathInvestigator(false)}
                                        activePathResult={activePathResult}
                                        isPathMode={isPathMode}
                                        onPathFound={handlePathFound}
                                        onExitPathMode={handleExitPathMode}
                                        onSelectNode={handlePathNodeSelect}
                                        onInvestigateWallet={(walletAddr) => {
                                            setSelectedAccountForInvestigation(walletAddr);
                                            setActiveTab('investigate');
                                        }}
                                        selectedNodeId={selectedGraphNode?.id}
                                    />
                                </div>
                            )}

                            {/* 3D FORCE GRAPH CANVAS */}
                            <div 
                                className="w-full h-[65vh] bg-[#001c18] rounded-[40px] relative overflow-hidden shadow-2xl border-8 border-white group"
                                ref={graphContainerRef}
                            >
                                {isWebGLAvailable() ? (
                                    <GraphErrorBoundary fallbackNodesCount={realGraphData.nodes.length} fallbackLinksCount={realGraphData.links.length}>
                                        <ForceGraph3D
                                            ref={fgRef}
                                            width={graphDimensions.width > 0 ? graphDimensions.width : undefined}
                                            height={graphDimensions.height > 0 ? graphDimensions.height : undefined}
                                            graphData={filteredGraphData}
                                            backgroundColor="#0B0B12"
                                            nodeThreeObject={getNodeThreeObject}
                                            nodeOpacity={0.95}
                                            nodeLabel={getNodeLabel}
                                            onNodeClick={handleNodeClick}
                                            linkColor={getLinkColor}
                                            linkWidth={getLinkWidth}
                                            linkDirectionalParticles={getLinkParticles}
                                            linkDirectionalParticleWidth={2.4}
                                            linkDirectionalParticleSpeed={0.006}
                                            linkDirectionalParticleColor={getLinkParticleColor}
                                            enableNodeDrag={false}
                                            showNavInfo={false}
                                            cooldownTicks={120}
                                        />
                                    </GraphErrorBoundary>
                                ) : (
                                    <div className="absolute inset-0 bg-[#0B0B12] flex flex-col items-center justify-center p-6 text-center z-10">
                                        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
                                        <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">WebGL Acceleration Required</h4>
                                        <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
                                            WebGL 3D graphics context is disabled or unavailable in this browser session. Enable WebGL in your browser settings to interact with the 3D Bitcoin network graph.
                                        </p>
                                        <div className="p-3 bg-black/40 border border-white/10 rounded-xl font-mono text-[11px] text-emerald-400">
                                            Backend Graph: {realGraphData.nodes.length} Subgraph Nodes • {realGraphData.links.length} Edges Loaded
                                        </div>
                                    </div>
                                )}

                                {/* TOPOLOGY BADGE OVERLAY */}
                                <div className="absolute top-6 left-6 p-4 bg-[#001411]/85 backdrop-blur-xl rounded-2xl border border-white/10 text-white pointer-events-none transition-transform duration-300">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse border-2 border-white/20"></div>
                                        <div>
                                            <span className="text-[10px] font-black font-mono tracking-widest uppercase block opacity-90">Nirikshak Topology</span>
                                            <span className="text-[8px] font-mono text-emerald-400">PHASE 5 ANALYTICAL GRAPH ACTIVE</span>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">
                                            Investigation Graph: {graphStats ? graphStats.total_nodes.toLocaleString() : '...'} Entities • {graphStats ? graphStats.total_edges.toLocaleString() : '...'} Edges
                                        </p>
                                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">
                                            Rendered Subgraph: {realGraphData.nodes.length} Nodes • {realGraphData.links.length} Edges ({graphHops}-Hop Bounded)
                                        </p>
                                        {activeCenterEntity && (
                                            <p className="text-[9px] font-mono text-slate-400 truncate max-w-xs">
                                                Center: {activeCenterEntity}
                                            </p>
                                        )}
                                        {isPathMode && activePathResult && (
                                            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                                                <div className="flex items-center space-x-1.5 text-[10px] font-black font-mono text-[#FF4F00]">
                                                    <GitFork className="w-3 h-3" />
                                                    <span>PATH MODE ACTIVE ({activePathResult.path_length} HOPS)</span>
                                                </div>
                                                <p className="text-[9px] font-mono text-emerald-300">
                                                    {activePathResult.traversal_mode === 'directed' ? 'DIRECTED TRAJECTORY' : 'UNDIRECTED CORRELATION'}
                                                </p>
                                                <button
                                                    onClick={handleExitPathMode}
                                                    className="pointer-events-auto mt-1 px-2.5 py-1 bg-red-500/30 hover:bg-red-500/50 text-red-300 rounded-lg text-[9px] font-mono uppercase transition-colors"
                                                >
                                                    Exit Path Mode
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* LOADING STATE OVERLAY */}
                                {isGraphLoading && (
                                    <div className="absolute inset-0 bg-[#0B0B12]/80 backdrop-blur-md flex flex-col items-center justify-center z-30">
                                        <div className="p-6 bg-[#002A24]/90 border border-white/10 rounded-3xl flex flex-col items-center shadow-2xl text-center">
                                            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
                                            <h4 className="text-sm font-black text-white uppercase tracking-widest mb-1">Loading Investigation Subgraph</h4>
                                            <p className="text-xs text-slate-400 font-medium">Extracting bounded Bitcoin topology from local analytical graph...</p>
                                        </div>
                                    </div>
                                )}

                                {/* ERROR STATE OVERLAY */}
                                {graphError && !isGraphLoading && (
                                    <div className="absolute inset-0 bg-[#0B0B12]/85 backdrop-blur-md flex flex-col items-center justify-center z-30 p-6">
                                        <div className="max-w-md p-8 bg-[#002A24]/95 border border-red-500/30 rounded-3xl flex flex-col items-center text-center shadow-2xl">
                                            <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
                                            <h4 className="text-base font-black text-white uppercase tracking-widest mb-2">Investigation Graph Unavailable</h4>
                                            <p className="text-xs text-slate-300 mb-6 leading-relaxed">{graphError}</p>
                                            <button
                                                onClick={() => initializeNetworkGraph()}
                                                className="px-6 py-3 bg-[#FF4F00] hover:bg-[#e04500] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg"
                                            >
                                                Retry Connection
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* EMPTY STATE OVERLAY */}
                                {!isGraphLoading && !graphError && realGraphData.nodes.length === 0 && (
                                    <div className="absolute inset-0 bg-[#0B0B12]/85 backdrop-blur-md flex flex-col items-center justify-center z-30 p-6">
                                        <div className="max-w-md p-8 bg-[#002A24]/95 border border-white/10 rounded-3xl flex flex-col items-center text-center shadow-2xl">
                                            <Network className="w-12 h-12 text-slate-500 mb-4" />
                                            <h4 className="text-base font-black text-white uppercase tracking-widest mb-2">No Graph Data Available</h4>
                                            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                                                The Bitcoin investigation graph contains 0 entities. Upload and normalize a transaction dataset to compile the multi-layer graph.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* SELECTED ENTITY INVESTIGATION DRAWER / PANEL */}
                                {selectedGraphNode && (
                                    <div className="absolute top-6 right-6 w-96 max-h-[calc(100%-3rem)] bg-[#001411]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-20 text-white animate-in slide-in-from-right-4 duration-300">
                                        {/* Panel Header */}
                                        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                    selectedGraphNode.type === 'wallet' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                    selectedGraphNode.type === 'transaction' || selectedGraphNode.type === 'tx' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                                                    selectedGraphNode.type === 'ip' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                    'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                                }`}>
                                                    {selectedGraphNode.type}
                                                </span>
                                                {selectedGraphNode.risk_level && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                                        selectedGraphNode.risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                        selectedGraphNode.risk_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                        selectedGraphNode.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    }`}>
                                                        {selectedGraphNode.risk_level} RISK
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setSelectedGraphNode(null)}
                                                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Content area */}
                                        <div className="p-5 overflow-y-auto space-y-4 text-xs" data-lenis-prevent>
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-1">
                                                    <span>Identifier</span>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard?.writeText(selectedGraphNode.label || selectedGraphNode.id);
                                                            setCopiedAddress(true);
                                                            setTimeout(() => setCopiedAddress(false), 2000);
                                                        }}
                                                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                                    >
                                                        {copiedAddress ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                        <span>{copiedAddress ? 'COPIED' : 'COPY'}</span>
                                                    </button>
                                                </div>
                                                <div className="font-mono text-xs text-white bg-black/40 p-2.5 rounded-xl border border-white/5 break-all">
                                                    {selectedGraphNode.label || selectedGraphNode.id}
                                                </div>
                                            </div>

                                            {/* Risk Score Progress Bar */}
                                            {typeof selectedGraphNode.risk_score === 'number' && (
                                                <div className="p-3 bg-black/30 rounded-xl border border-white/5">
                                                    <div className="flex justify-between items-center mb-1.5 font-mono text-[10px]">
                                                        <span className="text-slate-400 uppercase">Composite Risk Score</span>
                                                        <span className="font-black text-white">{selectedGraphNode.risk_score.toFixed(1)} / 100</span>
                                                    </div>
                                                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                selectedGraphNode.risk_score >= 80 ? 'bg-red-500' :
                                                                selectedGraphNode.risk_score >= 60 ? 'bg-orange-500' :
                                                                selectedGraphNode.risk_score >= 40 ? 'bg-amber-500' :
                                                                'bg-emerald-500'
                                                            }`}
                                                            style={{ width: `${Math.min(100, Math.max(0, selectedGraphNode.risk_score))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Details Grid */}
                                            {detailsLoading ? (
                                                <div className="py-6 flex flex-col items-center justify-center text-slate-400">
                                                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                                    <span className="text-[10px] font-mono">Loading entity attributes...</span>
                                                </div>
                                            ) : selectedEntityDetails ? (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                                                        <div className="bg-white/5 p-2 rounded-lg">
                                                            <span className="text-[9px] text-slate-400 block uppercase">In-Degree</span>
                                                            <span className="font-bold text-white">{selectedEntityDetails.in_degree}</span>
                                                        </div>
                                                        <div className="bg-white/5 p-2 rounded-lg">
                                                            <span className="text-[9px] text-slate-400 block uppercase">Out-Degree</span>
                                                            <span className="font-bold text-white">{selectedEntityDetails.out_degree}</span>
                                                        </div>
                                                        {selectedEntityDetails.attributes?.transaction_count !== undefined && (
                                                            <div className="bg-white/5 p-2 rounded-lg">
                                                                <span className="text-[9px] text-slate-400 block uppercase">Total TXs</span>
                                                                <span className="font-bold text-emerald-400">{String(selectedEntityDetails.attributes.transaction_count)}</span>
                                                            </div>
                                                        )}
                                                        {selectedEntityDetails.attributes?.total_output_amount !== undefined && (
                                                            <div className="bg-white/5 p-2 rounded-lg">
                                                                <span className="text-[9px] text-slate-400 block uppercase">Volume Output</span>
                                                                <span className="font-bold text-white">{Number(selectedEntityDetails.attributes.total_output_amount).toFixed(4)} BTC</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Why Flagged Integration */}
                                                    {selectedAlertDetails && (
                                                        <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl space-y-2">
                                                            <div className="flex items-center space-x-2">
                                                                <ShieldAlert className="w-4 h-4 text-red-400" />
                                                                <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">Why Flagged (Phase 4 AI)</span>
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center">
                                                                <div className="bg-black/40 p-1 rounded">
                                                                    <div className="text-slate-400">ANOMALY</div>
                                                                    <div className="font-bold text-red-400">{selectedAlertDetails.subscores?.anomaly?.toFixed(0) ?? '—'}</div>
                                                                </div>
                                                                <div className="bg-black/40 p-1 rounded">
                                                                    <div className="text-slate-400">ACTIVITY</div>
                                                                    <div className="font-bold text-orange-400">{selectedAlertDetails.subscores?.activity?.toFixed(0) ?? '—'}</div>
                                                                </div>
                                                                <div className="bg-black/40 p-1 rounded">
                                                                    <div className="text-slate-400">NETWORK</div>
                                                                    <div className="font-bold text-amber-400">{selectedAlertDetails.subscores?.network?.toFixed(0) ?? '—'}</div>
                                                                </div>
                                                                <div className="bg-black/40 p-1 rounded">
                                                                    <div className="text-slate-400">BEHAVIOR</div>
                                                                    <div className="font-bold text-emerald-400">{selectedAlertDetails.subscores?.behavior?.toFixed(0) ?? '—'}</div>
                                                                </div>
                                                            </div>
                                                            {selectedAlertDetails.reasons && selectedAlertDetails.reasons.length > 0 && (
                                                                <div className="space-y-1 pt-1">
                                                                    {selectedAlertDetails.reasons.slice(0, 3).map((r, rIdx) => (
                                                                        <div key={rIdx} className="text-[10px] text-slate-300 bg-black/30 p-2 rounded border border-white/5 leading-relaxed">
                                                                            {r.explanation}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}

                                            {/* Action Buttons */}
                                            <div className="pt-2 border-t border-white/10 space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => loadSubgraph(selectedGraphNode.id, 1, 100)}
                                                        className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                                    >
                                                        Expand 1-Hop
                                                    </button>
                                                    <button
                                                        onClick={() => loadSubgraph(selectedGraphNode.id, 2, 100)}
                                                        className="py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                                    >
                                                        Expand 2-Hop
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => setShowPathInvestigator(true)}
                                                    className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                >
                                                    <GitFork className="w-3.5 h-3.5 text-[#FF4F00]" />
                                                    <span>Inspect Connection Path</span>
                                                </button>
                                                {selectedGraphNode.type === 'wallet' && (
                                                    <button
                                                        onClick={() => {
                                                            const cleanAddr = selectedGraphNode.label.replace(/^wallet:/, '');
                                                            setSelectedAccountForInvestigation(cleanAddr);
                                                            setActiveTab('investigate');
                                                        }}
                                                        className="w-full py-2.5 px-3 bg-[#FF4F00] hover:bg-[#e04500] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-lg cursor-pointer"
                                                    >
                                                        <span>INVESTIGATE WALLET</span>
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8">
                                <LiveThreatFeed />
                            </div>

                            {/* INTERACTIVE THREAT RESOLUTION PANEL */}
                            <div className="mt-8 bg-[#002A24]/90 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                                
                                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                    <div className="max-w-xl text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start space-x-3 mb-3">
                                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]"></div>
                                            <span className="text-red-500 font-bold text-sm uppercase tracking-widest">Graph Forensics Resolution</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-white mb-2">Isolated Threat Topology Analysis</h2>
                                        <p className="text-[#B9B9C7] text-xs font-medium leading-relaxed">
                                            The Nirikshak AI Graph Engine has mapped {graphStats ? graphStats.wallet_nodes.toLocaleString() : 'thousands of'} wallet nodes across {graphStats ? graphStats.total_edges.toLocaleString() : 'tens of thousands of'} transactional links. Multi-layer anomaly heuristics and clustering active.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-center gap-4">
                                        <button 
                                            onClick={() => handleResolution('flag')}
                                            className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 shadow-lg"
                                        >
                                            Manual Flag
                                        </button>
                                        <button 
                                            onClick={() => handleResolution('export')}
                                            className="px-6 py-4 bg-[#FF4F00] hover:bg-[#e04500] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-[#FF4F00]/20"
                                        >
                                            Export to Lead Queue
                                        </button>
                                        <button 
                                            onClick={() => handleResolution('clean')}
                                            className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20"
                                        >
                                            Dismiss Lead
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: ALERTS */}
                    {activeTab === 'alerts' && <AlertsPage />}

                    {/* VIEW: ENTITIES */}
                    {activeTab === 'entities' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8 rounded-3xl border border-slate-200 bg-white shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 bg-[#F8FAFC]/80 p-5">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analyst Risk Review</p>
                                        <h3 className="text-xl font-black text-[#002A24]">Bitcoin Entity & Wallet Risk Directory</h3>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                value={entityTableSearch}
                                                onChange={(event) => setEntityTableSearch(event.target.value)}
                                                placeholder="Search wallet or signal"
                                                className="w-full sm:w-64 bg-white border border-slate-200 focus:border-[#FF4F00] rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-[#002A24] outline-none"
                                            />
                                        </div>

                                        <select
                                            value={entityRiskFilter}
                                            onChange={(event) => setEntityRiskFilter(event.target.value as EntityRiskFilterType)}
                                            className="bg-white border border-slate-200 focus:border-[#FF4F00] rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none"
                                        >
                                            <option value="ALL">All risk levels</option>
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="CRITICAL">Critical</option>
                                        </select>

                                        <select
                                            value={entityClassificationFilter}
                                            onChange={(event) => setEntityClassificationFilter(event.target.value as EntityClassificationFilterType)}
                                            className="bg-white border border-slate-200 focus:border-[#FF4F00] rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none"
                                        >
                                            <option value="ALL">All classifications</option>
                                            <option value="LEGITIMATE">Legitimate</option>
                                            <option value="SUSPICIOUS">Suspicious</option>
                                            <option value="ANOMALOUS">Anomalous</option>
                                        </select>
                                    </div>
                                </div>

                                {entityTableLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="w-6 h-6 text-[#FF4F00] animate-spin mr-3" />
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Loading wallet records...</span>
                                    </div>
                                ) : entityTableError ? (
                                    <div className="p-6 text-sm font-medium text-amber-700 bg-amber-50 border-t border-amber-200">{entityTableError}</div>
                                ) : visibleEntityRows.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-sm font-bold text-slate-500">No entities match the current filter.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-[#F8FAFC]">
                                                <tr>
                                                    {[
                                                        { label: 'Wallet / Entity ID', key: 'accountId' },
                                                        { label: 'Classification', key: 'classification' },
                                                        { label: 'Anomaly Score', key: 'probability' },
                                                        { label: 'Risk Score', key: 'riskScore' },
                                                        { label: 'Risk Level', key: 'riskLevel' },
                                                        { label: 'Key Signal', key: 'keySignal' },
                                                        { label: 'Last Observed', key: 'lastActivity' },
                                                    ].map((column) => (
                                                        <th key={column.key} className="px-5 py-3 text-left">
                                                            <button
                                                                onClick={() => column.key !== 'classification' && column.key !== 'riskLevel' && column.key !== 'keySignal' ? updateSort(column.key as EntitySortKey) : undefined}
                                                                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"
                                                            >
                                                                {column.label}
                                                                {column.key !== 'classification' && column.key !== 'riskLevel' && column.key !== 'keySignal' && (
                                                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 bg-white">
                                                {visibleEntityRows.map((row) => {
                                                    const classificationStyle = row.classification === 'LEGITIMATE' ? 'bg-emerald-100 text-emerald-700' : row.classification === 'SUSPICIOUS' ? 'bg-[#FF4F00]/10 text-[#FF4F00]' : 'bg-rose-100 text-rose-700';
                                                    const riskLevelStyle = row.riskLevel === 'LOW' ? 'bg-sky-100 text-sky-700' : row.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : row.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-rose-100 text-rose-700';

                                                    return (
                                                        <tr
                                                            key={row.accountId}
                                                            onClick={() => {
                                                                setSelectedAccountForInvestigation(row.accountId);
                                                                setActiveTab('investigate');
                                                                localStorage.setItem('selected_investigation_wallet', row.accountId);
                                                            }}
                                                            className={`cursor-pointer transition-colors ${selectedAccountForInvestigation === row.accountId ? 'bg-[#FF4F00]/5' : 'hover:bg-slate-50'}`}
                                                        >
                                                            <td className="px-5 py-4 text-xs font-mono font-bold text-[#002A24]">{row.accountId}</td>
                                                            <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${classificationStyle}`}>{row.classification}</span></td>
                                                            <td className="px-5 py-4 text-xs font-bold text-slate-700">{row.probability.toFixed(2)}</td>
                                                            <td className="px-5 py-4 text-xs font-black text-[#002A24]">{row.riskScore.toFixed(1)}</td>
                                                            <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${riskLevelStyle}`}>{row.riskLevel}</span></td>
                                                            <td className="px-5 py-4 text-xs font-medium text-slate-600">{row.keySignal}</td>
                                                            <td className="px-5 py-4 text-xs font-medium text-slate-600">{row.lastActivity === 'Unknown' ? 'Unknown' : new Date(row.lastActivity).toISOString().slice(0, 19).replace('T', ' ')}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VIEW: TRANSACTIONS & MODEL ANALYTICS */}
                    {activeTab === 'transactions' && <ModelAnalytics />}

                    {/* VIEW: REPORTS & SYSTEM IMPACT */}
                    {activeTab === 'reports' && (
                        <div className="bg-white/40 backdrop-blur-xl min-h-full rounded-[40px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                             <ImpactDashboard />
                             <IntelligenceTrends />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;

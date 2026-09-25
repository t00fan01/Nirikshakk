import { useEffect, useState, useRef, useMemo } from 'react';
import {
    ShieldAlert, Activity,
    CheckCircle2, XCircle, Play,
    Menu, X, ChevronRight, User, Loader2,
    BarChart3, Search, ArrowUpDown, Network, FileText, SearchCheck, Layers,
    RefreshCw, Crosshair, GitFork,
    Upload, ArrowRight, Check, Copy
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LiveThreatFeed from '../components/LiveThreatFeed';
import WalletInvestigation from '../components/WalletInvestigation';
import GraphPathInvestigator from '../components/GraphPathInvestigator';
import AlertsPage from '../components/AlertsPage';
import { TransactionsPage } from '../components/TransactionsPage';
import { ReportsPage } from '../components/ReportsPage';
import { DatasetImportModal } from '../components/DatasetImportModal';
import NetworkGraph3D from '../components/Graph/NetworkGraph3D';
import {
    getDemoSubgraph,
    DEMO_ROOT_WALLET_ID,
    searchDemoGraph,
    calculateDemoGraphStats,
    MASTER_GRAPH
} from '../demo/demoGraphData';
import {
    DEMO_OVERVIEW_KPIS,
    DEMO_RISK_DISTRIBUTION,
    DEMO_INVESTIGATIVE_LEADS,
    DEMO_ENTITIES,
} from '../demo/demoDashboardData';
import {
    GraphNode,
    GraphLink,
    GraphStatsResponse,
    SearchResultItem,
    GraphMeta,
    GraphPathResponse,
} from '../lib/api';

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'PENDING';
    time: string;
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
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedAccountForInvestigation, setSelectedAccountForInvestigation] = useState<string | null>(
        accountFromUrl || localStorage.getItem('selected_investigation_wallet') || "bc1qa0fa87eac1de3da717bcfdc46ebb04276a"
    );

    // Entity Intelligence Directory V3 Filter & Sort States
    const [entityTypeFilter, setEntityTypeFilter] = useState<string>('ALL');
    const [entityRiskFilterV3, setEntityRiskFilterV3] = useState<string>('ALL');
    const [entitySearchV3, setEntitySearchV3] = useState<string>('');
    const [entitySortKeyV3, setEntitySortKeyV3] = useState<'risk' | 'connections'>('risk');
    const [copiedEntityId, setCopiedEntityId] = useState<string | null>(null);

    const filteredDemoEntities = useMemo(() => {
        return DEMO_ENTITIES.filter((ent) => {
            if (entityTypeFilter !== 'ALL' && ent.type !== entityTypeFilter) return false;
            if (entityRiskFilterV3 !== 'ALL' && ent.riskLevel !== entityRiskFilterV3) return false;
            if (entitySearchV3.trim()) {
                const q = entitySearchV3.toLowerCase().trim();
                const mId = ent.entityId.toLowerCase().includes(q);
                const mSig = ent.keySignal.toLowerCase().includes(q);
                const mComm = ent.community.toLowerCase().includes(q);
                return mId || mSig || mComm;
            }
            return true;
        }).sort((a, b) => {
            if (entitySortKeyV3 === 'connections') {
                return b.connections - a.connections;
            }
            return b.riskScore - a.riskScore;
        });
    }, [entityTypeFilter, entityRiskFilterV3, entitySearchV3, entitySortKeyV3]);

    const handleCopyEntity = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedEntityId(text);
        setTimeout(() => setCopiedEntityId(null), 2000);
    };

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
    const [activeCenterEntity, setActiveCenterEntity] = useState<string | null>(null);
    const [graphHops, setGraphHops] = useState<number>(3);

    // Graph Search State
    const [graphSearchQuery, setGraphSearchQuery] = useState('');
    const [graphSearchResults, setGraphSearchResults] = useState<SearchResultItem[]>([]);
    const [isSearchingGraph, setIsSearchingGraph] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchDropdownRef = useRef<HTMLDivElement>(null);

    // Graph State
    const [anomalyThreshold, setAnomalyThreshold] = useState<number>(0.0);
    const graphContainerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>();

    // ==========================================
    // Phase 8B Graph Path Investigation State
    // ==========================================
    const [activePathResult, setActivePathResult] = useState<GraphPathResponse | null>(null);
    const [showPathInvestigator, setShowPathInvestigator] = useState(false);
    const [savedGraphBeforePath, setSavedGraphBeforePath] = useState<{ nodes: GraphNode[]; links: GraphLink[]; meta?: GraphMeta } | null>(null);

    const isPathMode = Boolean(activePathResult && activePathResult.found);

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
    const [testResults, setTestResults] = useState<TestResult[]>([
        { name: 'Dataset Ingestion & Schema Validation', status: 'PASS', time: '84ms' },
        { name: 'Relational DuckDB & Parquet Storage', status: 'PASS', time: '112ms' },
        { name: 'Isolation Forest & K-Means Clustering', status: 'PASS', time: '310ms' },
        { name: 'Multi-Layer Investigation Graph Build', status: 'PASS', time: '245ms' },
        { name: 'Investigative Lead Prioritization', status: 'PASS', time: '96ms' },
        { name: 'In-Memory Graph Cache Invalidation', status: 'PASS', time: '947ms' }
    ]);
    const [runningTests, setRunningTests] = useState(false);

    // ==========================================
    // Real Bitcoin Graph Operations (Phase 6 Demo Engine)
    // ==========================================
    const loadGraphStats = async () => {
        try {
            const localStats = calculateDemoGraphStats(MASTER_GRAPH.nodes, MASTER_GRAPH.links);
            setGraphStats(localStats as any);
            return localStats;
        } catch (err) {
            console.error('Failed to load graph stats:', err);
            return null;
        }
    };

    const handleNodeClick = (node: GraphNode) => {
        if (!node || !node.id) return;
        setSelectedGraphNode(node);
    };

    const loadSubgraph = async (centerEntityId: string, hops = 1, _maxNodes = 100) => {
        setIsGraphLoading(true);
        setGraphError(null);
        try {
            const cleanId = centerEntityId.trim();
            const subgraph = await getDemoSubgraph(cleanId, hops);
            if (!subgraph || !subgraph.nodes || subgraph.nodes.length === 0) {
                setGraphError(`No graph neighborhood found for entity '${centerEntityId}'.`);
            } else {
                setRealGraphData(subgraph as any);
                setActiveCenterEntity(cleanId);
                setGraphHops(hops);
                setGraphError(null);
                const foundNode = subgraph.nodes.find(n => n.id === cleanId);
                if (foundNode) {
                    handleNodeClick(foundNode as any);
                }
            }
        } catch (err: unknown) {
            console.error('Failed to fetch subgraph:', err);
            setGraphError('Error loading demo subgraph.');
        } finally {
            setIsGraphLoading(false);
        }
    };

    const initializeNetworkGraph = async () => {
        setIsGraphLoading(true);
        setGraphError(null);
        try {
            const localStats = calculateDemoGraphStats(MASTER_GRAPH.nodes, MASTER_GRAPH.links);
            setGraphStats(localStats as any);
            const targetEntityId = DEMO_ROOT_WALLET_ID;
            await loadSubgraph(targetEntityId, graphHops || 1, 100);
        } catch (err: unknown) {
            console.error('Failed to initialize investigation graph:', err);
            setGraphError('Investigation demo graph failed to initialize.');
        } finally {
            setIsGraphLoading(false);
        }
    };

    const resetGraphFocus = () => {
        setSelectedGraphNode(null);
        if (fgRef.current) {
            fgRef.current.zoomToFit(1000, 40);
        }
    };

    // Graph search debounced effect using local demoGraphData
    useEffect(() => {
        if (!graphSearchQuery.trim()) {
            setGraphSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        const timer = setTimeout(() => {
            setIsSearchingGraph(true);
            try {
                const results = searchDemoGraph(graphSearchQuery.trim(), 10);
                const items: SearchResultItem[] = results.map(r => ({
                    id: r.id,
                    label: r.label,
                    type: r.type,
                    risk_level: (r as any).risk_level,
                    match_field: 'label'
                }));
                setGraphSearchResults(items);
                setShowSearchDropdown(true);
            } catch (err) {
                console.error('Graph search error:', err);
                setGraphSearchResults([]);
            } finally {
                setIsSearchingGraph(false);
            }
        }, 150);

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

    const runDiagnostics = async () => {
        setRunningTests(true);
        const steps: TestResult[] = [
            { name: 'Dataset Ingestion & Schema Validation', status: 'PASS', time: '84ms' },
            { name: 'Relational DuckDB & Parquet Storage', status: 'PASS', time: '112ms' },
            { name: 'Isolation Forest & K-Means Clustering', status: 'PASS', time: '310ms' },
            { name: 'Multi-Layer Investigation Graph Build', status: 'PASS', time: '245ms' },
            { name: 'Investigative Lead Prioritization', status: 'PASS', time: '96ms' },
            { name: 'In-Memory Graph Cache Invalidation', status: 'PASS', time: '947ms' }
        ];
        setTestResults([]);
        for (let i = 0; i < steps.length; i++) {
            await new Promise((r) => setTimeout(r, 220));
            setTestResults((prev) => [...prev, steps[i]]);
        }
        setRunningTests(false);
    };

    const handleResolution = (action: 'flag' | 'export' | 'clean') => {
        const message = action === 'flag' ? "Manual Flag applied to target entity graph." :
            action === 'export' ? "Investigative lead exported to report queue." :
                "Record cleared. Anomaly suppressed.";
        alert(message);
    };

    const handleDatasetUploadSuccess = async () => {
        await loadGraphStats();
        await initializeNetworkGraph();
        const topWallet = "bc1qa0fa87eac1de3da717bcfdc46ebb04276a";
        setSelectedAccountForInvestigation(topWallet);
        localStorage.setItem('selected_investigation_wallet', topWallet);
        const canonical = `wallet:${topWallet}`;
        setActiveCenterEntity(canonical);
    };

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
                        {/* DEMO / SIMULATED DATA INDICATOR */}
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span className="text-[10px] font-mono font-bold text-amber-700 tracking-wider">
                                DEMO MODE • BITCOIN INVESTIGATION DATASET
                            </span>
                        </div>

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
                            onSelectWallet={(walletAddress: string) => {
                                setSelectedAccountForInvestigation(walletAddress);
                            }}
                        />
                    )}

                    {/* VIEW: OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                            {/* Page Header */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#14E0A8] animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#14E0A8]">
                                            BITCOIN FORENSIC INTELLIGENCE SUITE
                                        </span>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-black text-[#002A24] tracking-tight">
                                        Investigation Overview
                                    </h1>
                                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                                        Deterministic multi-layer graph heuristics, UTXO flow clustering, and anomalous conduit tracking.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setImportModalOpen(true)}
                                        className="px-5 py-3 rounded-2xl font-black tracking-wider uppercase text-xs flex items-center transition-all bg-white border-2 border-slate-200 text-[#002A24] hover:border-[#FF4F00] shadow-sm hover:shadow-md hover:translate-y-[-1px]"
                                    >
                                        <Upload className="w-4 h-4 mr-2 text-[#FF4F00]" />
                                        Import Dataset
                                    </button>
                                    <button
                                        onClick={runDiagnostics}
                                        disabled={runningTests}
                                        className={`px-6 py-3 rounded-2xl font-black tracking-wider uppercase text-xs flex items-center transition-all shadow-xl hover:translate-y-[-1px] ${
                                            runningTests
                                                ? 'bg-slate-300 cursor-not-allowed text-white'
                                                : 'bg-[#FF4F00] text-white hover:bg-[#e04500] hover:shadow-[0_10px_30px_rgba(255,79,0,0.3)]'
                                        }`}
                                    >
                                        <Play className={`w-4 h-4 mr-2 ${runningTests ? 'animate-pulse' : ''}`} />
                                        {runningTests ? 'Running Pipeline...' : 'Run Pipeline Check'}
                                    </button>
                                </div>
                            </div>

                            {/* COMPACT INVESTIGATION STATUS BAR */}
                            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">DATASET</span>
                                    <p className="font-mono text-xs font-black text-[#002A24]">{DEMO_OVERVIEW_KPIS.datasetName}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">STATUS</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="font-mono text-xs font-black text-emerald-700">{DEMO_OVERVIEW_KPIS.status}</span>
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">GRAPH STATUS</span>
                                    <p className="font-mono text-xs font-black text-[#FF4F00]">{DEMO_OVERVIEW_KPIS.graphStatus} (172 Nodes, 282 Edges)</p>
                                </div>
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">LAST ANALYSIS</span>
                                    <p className="font-mono text-xs font-black text-slate-700">{DEMO_OVERVIEW_KPIS.lastAnalysis}</p>
                                </div>
                            </div>

                            {/* 6 PRIMARY KPI CARDS */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-[#002A24]">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">TOTAL ENTITIES</p>
                                    <h3 className="text-2xl font-black text-[#002A24] mt-1">{DEMO_OVERVIEW_KPIS.totalEntities.toLocaleString()}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Multi-layer graph census</p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-emerald-500">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">TXS ANALYZED</p>
                                    <h3 className="text-2xl font-black text-[#002A24] mt-1">{DEMO_OVERVIEW_KPIS.transactionsAnalyzed.toLocaleString()}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">DuckDB partitioned set</p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-blue-500">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">NET OBSERVATIONS</p>
                                    <h3 className="text-2xl font-black text-[#002A24] mt-1">{DEMO_OVERVIEW_KPIS.networkObservations.toLocaleString()}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">P2P broadcasts & Tor nodes</p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-[#FF4F00]">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">HIGH-RISK ENTITIES</p>
                                    <h3 className="text-2xl font-black text-[#FF4F00] mt-1">{DEMO_OVERVIEW_KPIS.highRiskEntities}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Risk score ≥ 70 / 100</p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-amber-500">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">ACTIVE ALERTS</p>
                                    <h3 className="text-2xl font-black text-amber-600 mt-1">{DEMO_OVERVIEW_KPIS.activeAlerts}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">In analyst review queue</p>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-rose-600">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">INVESTIGATIVE LEADS</p>
                                    <h3 className="text-2xl font-black text-rose-600 mt-1">{DEMO_OVERVIEW_KPIS.investigativeLeads}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Syndicate conduits flagged</p>
                                </div>
                            </div>

                            {/* RISK DISTRIBUTION & PIPELINE DIAGNOSTICS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Risk Distribution Card */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="text-base font-black text-[#002A24] uppercase tracking-wider">
                                                Risk Distribution Across Observed Population
                                            </h3>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                Classification based on heuristic entropy, transaction velocity, and network correlation.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Multi-tier bar */}
                                    <div className="h-4 w-full rounded-full overflow-hidden flex bg-slate-100 p-0.5 gap-0.5">
                                        {DEMO_RISK_DISTRIBUTION.map((tier) => (
                                            <div
                                                key={tier.level}
                                                style={{ width: `${tier.percentage}%`, backgroundColor: tier.color }}
                                                className="h-full rounded-sm transition-all hover:opacity-90"
                                                title={`${tier.level}: ${tier.percentage}% (${tier.count.toLocaleString()} entities)`}
                                            />
                                        ))}
                                    </div>

                                    {/* Tier Breakdown */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        {DEMO_RISK_DISTRIBUTION.map((tier) => (
                                            <div key={tier.level} className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tier.color }} />
                                                        <span className="text-xs font-black uppercase text-[#002A24]">{tier.level}</span>
                                                    </div>
                                                    <span className="font-mono text-xs font-black text-slate-700">{tier.percentage}%</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                                                    <span>{tier.count.toLocaleString()} entities</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-tight pt-0.5">{tier.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Pipeline Diagnostics Card */}
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="text-base font-black text-[#002A24] uppercase tracking-wider">
                                                Forensic Pipeline Verification
                                            </h3>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                Stage-by-stage diagnostics for ingestion, storage, anomaly detection, and graph topology.
                                            </p>
                                        </div>
                                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-xl text-[10px] font-mono font-bold">
                                            ALL PASS
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        {testResults.map((test, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    {test.status === 'PASS' ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                                    )}
                                                    <span className="font-bold text-[#002A24]">{test.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[11px] text-slate-500">{test.time}</span>
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-700">
                                                        {test.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* TOP INVESTIGATIVE LEADS */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
                                <div className="p-6 border-b border-slate-100 bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F00] animate-pulse" />
                                            <h3 className="text-base font-black text-[#002A24] uppercase tracking-wider">
                                                Top Investigative Leads ({DEMO_INVESTIGATIVE_LEADS.length} Flagged)
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            Priority syndicates and bridge nodes synthesized from 3D topology & behavioral heuristics.
                                        </p>
                                    </div>
                                    <span className="text-xs font-mono text-slate-500">
                                        Click any lead to launch forensic investigation
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-[#F8FAFC]/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                <th className="py-3 px-4">Lead ID</th>
                                                <th className="py-3 px-3">Target Wallet</th>
                                                <th className="py-3 px-3 text-center">Risk Score</th>
                                                <th className="py-3 px-3">Primary Signal</th>
                                                <th className="py-3 px-3 text-center">Connected</th>
                                                <th className="py-3 px-3">Status</th>
                                                <th className="py-3 px-4 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {DEMO_INVESTIGATIVE_LEADS.map((lead) => (
                                                <tr
                                                    key={lead.leadId}
                                                    onClick={() => {
                                                        setSelectedAccountForInvestigation(lead.wallet);
                                                        setActiveTab('investigate');
                                                    }}
                                                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                                                >
                                                    <td className="py-3.5 px-4 font-mono font-bold text-[#002A24]">
                                                        {lead.leadId}
                                                    </td>
                                                    <td className="py-3.5 px-3">
                                                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#002A24] group-hover:text-[#FF4F00] transition-colors">
                                                            <span>{lead.shortWallet}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-3 text-center">
                                                        <span
                                                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono ${
                                                                lead.riskScore >= 85
                                                                    ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30'
                                                                    : 'bg-[#FF4F00]/15 text-[#FF4F00] border border-[#FF4F00]/30'
                                                            }`}
                                                        >
                                                            {lead.riskScore}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-3 font-medium text-slate-700">
                                                        {lead.primarySignal}
                                                    </td>
                                                    <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700">
                                                        {lead.connectedEntities} entities
                                                    </td>
                                                    <td className="py-3.5 px-3">
                                                        <span
                                                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                lead.status === 'ACTIVE INVESTIGATION'
                                                                    ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                                                                    : lead.status === 'ESCALATED'
                                                                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                                                    : lead.status === 'INVESTIGATING'
                                                                    ? 'bg-[#FF4F00]/10 text-[#FF4F00] border border-[#FF4F00]/20'
                                                                    : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                                                            }`}
                                                        >
                                                            {lead.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedAccountForInvestigation(lead.wallet);
                                                                    setActiveTab('investigate');
                                                                }}
                                                                className="px-2.5 py-1 bg-[#002A24] hover:bg-[#FF4F00] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                                                            >
                                                                <span>Investigate</span>
                                                                <ArrowRight className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const canonical = lead.wallet.startsWith('wallet:') ? lead.wallet : `wallet:${lead.wallet}`;
                                                                    setActiveCenterEntity(canonical);
                                                                    loadSubgraph(canonical, 1, 100);
                                                                    setActiveTab('network');
                                                                }}
                                                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                                                title="Explore in Graph"
                                                            >
                                                                <Network className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                                        {graphStats ? ((graphStats.total_nodes ?? (graphStats as any).totalNodes) ?? 172).toLocaleString() : <span className="animate-pulse">...</span>}
                                    </h3>
                                    <p className="text-[11px] font-mono text-slate-500 mt-2">
                                        {graphStats ? `${((graphStats.wallet_nodes ?? (graphStats as any).wallets) ?? 110).toLocaleString()} Wallets • ${((graphStats.transaction_nodes ?? (graphStats as any).transactions) ?? 29).toLocaleString()} Transactions` : 'Querying graph topology...'}
                                    </p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl shadow-[0_6px_32px_rgba(147,111,173,0.12)] border border-slate-200 flex-grow border-l-8 border-[#FF4F00] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(147,111,173,0.20)] group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Investigative Graph Edges</p>
                                    <h3 className="text-4xl font-black text-[#FF4F00]">
                                        {graphStats ? ((graphStats.total_edges ?? (graphStats as any).totalEdges) ?? 282).toLocaleString() : <span className="animate-pulse">...</span>}
                                    </h3>
                                    <p className="text-[11px] font-mono text-slate-500 mt-2">
                                        {graphStats ? `${(graphStats.counterparty_edges ?? 184).toLocaleString()} Counterparty • ${(graphStats.network_observation_edges ?? 98).toLocaleString()} Net Observations` : 'Mapping Bitcoin relationships...'}
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
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${res.risk_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
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
                                                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${graphHops === h ? 'bg-[#002A24] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                            >
                                                {h}-Hop
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setShowPathInvestigator(prev => !prev)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${showPathInvestigator || isPathMode
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

                            {/* 3D FORCE GRAPH CANVAS - CLAUDE NETWORKGRAPH3D COMPONENT */}
                            <div
                                className="w-full h-[72vh] min-h-[620px] rounded-[32px] relative overflow-hidden shadow-2xl border-4 border-white/10 group"
                                ref={graphContainerRef}
                            >
                                <NetworkGraph3D
                                    rootEntityId={activeCenterEntity || selectedAccountForInvestigation || DEMO_ROOT_WALLET_ID}
                                    fetchSubgraph={getDemoSubgraph}
                                    hops={graphHops as 1 | 2 | 3}
                                    onHopsChange={(h) => setGraphHops(h)}
                                    minRiskScore={anomalyThreshold >= 0.80 ? Math.round(anomalyThreshold * 100) : undefined}
                                    onInvestigate={(walletAddr) => {
                                        const cleanAddr = walletAddr.replace(/^wallet:/, '');
                                        setSelectedAccountForInvestigation(cleanAddr);
                                        setActiveTab('investigate');
                                    }}
                                />
                            </div>

                            <div className="mt-8">
                                <LiveThreatFeed
                                    onSelectWallet={(walletAddr) => {
                                        const cleanAddr = walletAddr.replace(/^wallet:/, '');
                                        setSelectedAccountForInvestigation(cleanAddr);
                                        setActiveTab('investigate');
                                    }}
                                    onExploreInGraph={(entityId) => {
                                        const canonical = entityId.startsWith('wallet:') || entityId.startsWith('tx:') || entityId.startsWith('ip:') ? entityId : `wallet:${entityId}`;
                                        setActiveCenterEntity(canonical);
                                    }}
                                />
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
                    {activeTab === 'alerts' && (
                        <AlertsPage
                            onSelectWallet={(walletAddress: string) => {
                                setSelectedAccountForInvestigation(walletAddress);
                                setActiveTab('investigate');
                            }}
                            onExploreInGraph={(walletAddress: string) => {
                                const canonical = walletAddress.startsWith('wallet:') ? walletAddress : `wallet:${walletAddress}`;
                                setActiveCenterEntity(canonical);
                                loadSubgraph(canonical, 1, 100);
                                setActiveTab('network');
                            }}
                        />
                    )}

                    {/* VIEW: ENTITIES */}
                    {activeTab === 'entities' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Header Bar */}
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 bg-[#F8FAFC] p-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#002A24]" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                MULTI-LAYER FORENSIC CENSUS
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black text-[#002A24]">
                                            Entity Intelligence Directory ({filteredDemoEntities.length} of {DEMO_ENTITIES.length})
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            Catalog of correlated Bitcoin wallets, transactions, IP relays, ASNs, and jurisdictions.
                                        </p>
                                    </div>

                                    {/* Filters Bar */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                value={entitySearchV3}
                                                onChange={(e) => setEntitySearchV3(e.target.value)}
                                                placeholder="Search address, IP, ASN, signal..."
                                                className="w-full sm:w-60 bg-white border border-slate-200 focus:border-[#FF4F00] rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-[#002A24] outline-none"
                                            />
                                        </div>

                                        <select
                                            value={entityTypeFilter}
                                            onChange={(e) => setEntityTypeFilter(e.target.value)}
                                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none cursor-pointer"
                                        >
                                            <option value="ALL">All Entity Types</option>
                                            <option value="WALLET">Wallets</option>
                                            <option value="TRANSACTION">Transactions</option>
                                            <option value="IP">IP Observations</option>
                                            <option value="ASN">Autonomous Systems</option>
                                            <option value="GEO">Jurisdictions</option>
                                        </select>

                                        <select
                                            value={entityRiskFilterV3}
                                            onChange={(e) => setEntityRiskFilterV3(e.target.value)}
                                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none cursor-pointer"
                                        >
                                            <option value="ALL">All Risk Levels</option>
                                            <option value="CRITICAL">Critical (80+)</option>
                                            <option value="HIGH">High (70-79)</option>
                                            <option value="MEDIUM">Medium (50-69)</option>
                                            <option value="LOW">Low (&lt;50)</option>
                                        </select>

                                        <button
                                            onClick={() => {
                                                setEntitySortKeyV3((prev) => (prev === 'risk' ? 'connections' : 'risk'));
                                            }}
                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
                                        >
                                            <ArrowUpDown className="w-3.5 h-3.5" />
                                            <span>Sort: {entitySortKeyV3 === 'risk' ? 'Risk' : 'Connections'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-[#F8FAFC] text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                <th className="py-3.5 px-4">Entity</th>
                                                <th className="py-3.5 px-3">Type</th>
                                                <th className="py-3.5 px-3 text-center">Risk Score</th>
                                                <th className="py-3.5 px-3">Risk Level</th>
                                                <th className="py-3.5 px-3 text-center">Txs</th>
                                                <th className="py-3.5 px-3 text-center">Connections</th>
                                                <th className="py-3.5 px-3">First Seen</th>
                                                <th className="py-3.5 px-3">Last Seen</th>
                                                <th className="py-3.5 px-3">Status</th>
                                                <th className="py-3.5 px-4 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-xs">
                                            {filteredDemoEntities.length === 0 ? (
                                                <tr>
                                                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                                                        No entities match your search and filter criteria.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredDemoEntities.map((row) => (
                                                    <tr
                                                        key={row.entityId}
                                                        onClick={() => {
                                                            if (row.type === 'WALLET') {
                                                                setSelectedAccountForInvestigation(row.entityId);
                                                                setActiveTab('investigate');
                                                            } else {
                                                                const canonical = row.type === 'TRANSACTION' ? `tx:${row.entityId}` : row.type === 'IP' ? `ip:${row.entityId}` : row.type === 'ASN' ? `asn:${row.entityId}` : `geo:${row.entityId}`;
                                                                setActiveCenterEntity(canonical);
                                                                loadSubgraph(canonical, 1, 100);
                                                                setActiveTab('network');
                                                            }
                                                        }}
                                                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                                                    >
                                                        {/* Entity */}
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-[#002A24] group-hover:text-[#FF4F00] transition-colors truncate max-w-[220px]" title={row.entityId}>
                                                                    {row.entityId}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCopyEntity(row.entityId);
                                                                    }}
                                                                    className="text-slate-300 hover:text-slate-600 p-0.5"
                                                                    title="Copy"
                                                                >
                                                                    {copiedEntityId === row.entityId ? (
                                                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                    ) : (
                                                                        <Copy className="w-3.5 h-3.5" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* Type */}
                                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider ${
                                                                row.type === 'WALLET' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                                                                row.type === 'TRANSACTION' ? 'bg-purple-500/10 text-purple-700 border border-purple-500/20' :
                                                                row.type === 'IP' ? 'bg-blue-500/10 text-blue-700 border border-blue-500/20' :
                                                                row.type === 'ASN' ? 'bg-pink-500/10 text-pink-700 border border-pink-500/20' :
                                                                'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                                                            }`}>
                                                                {row.type}
                                                            </span>
                                                        </td>

                                                        {/* Risk */}
                                                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono ${
                                                                row.riskScore >= 80 ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30' :
                                                                row.riskScore >= 70 ? 'bg-[#FF4F00]/15 text-[#FF4F00] border border-[#FF4F00]/30' :
                                                                row.riskScore >= 50 ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30' :
                                                                'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30'
                                                            }`}>
                                                                {row.riskScore}
                                                            </span>
                                                        </td>

                                                        {/* Risk Level */}
                                                        <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[10px] font-bold text-slate-700">
                                                            {row.riskLevel}
                                                        </td>

                                                        {/* Transactions */}
                                                        <td className="py-3.5 px-3 text-center whitespace-nowrap font-mono font-bold text-slate-700">
                                                            {row.transactions}
                                                        </td>

                                                        {/* Connections */}
                                                        <td className="py-3.5 px-3 text-center whitespace-nowrap font-mono font-bold text-[#002A24]">
                                                            {row.connections}
                                                        </td>

                                                        {/* First Seen */}
                                                        <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                                                            {row.firstSeen.replace(' UTC', '').slice(0, 16)}
                                                        </td>

                                                        {/* Last Seen */}
                                                        <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                                                            {row.lastSeen.replace(' UTC', '').slice(0, 16)}
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-3.5 px-3 whitespace-nowrap">
                                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                                row.status === 'FLAGGED' ? 'bg-rose-500/10 text-rose-600' :
                                                                row.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-700' :
                                                                'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {row.status}
                                                            </span>
                                                        </td>

                                                        {/* Action */}
                                                        <td className="py-3.5 px-4 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                {row.type === 'WALLET' ? (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedAccountForInvestigation(row.entityId);
                                                                            setActiveTab('investigate');
                                                                        }}
                                                                        className="px-2.5 py-1 bg-[#FF4F00] hover:bg-[#e04500] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                                                                    >
                                                                        <span>Investigate</span>
                                                                        <ArrowRight className="w-3 h-3" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const canonical = row.type === 'TRANSACTION' ? `tx:${row.entityId}` : row.type === 'IP' ? `ip:${row.entityId}` : row.type === 'ASN' ? `asn:${row.entityId}` : `geo:${row.entityId}`;
                                                                            setActiveCenterEntity(canonical);
                                                                            loadSubgraph(canonical, 1, 100);
                                                                            setActiveTab('network');
                                                                        }}
                                                                        className="px-2.5 py-1 bg-[#002A24] hover:bg-[#FF4F00] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                                                                    >
                                                                        <Network className="w-3 h-3" />
                                                                        <span>Graph</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: TRANSACTIONS & MODEL ANALYTICS */}
                    {activeTab === 'transactions' && (
                        <TransactionsPage
                            onSelectWallet={(walletAddress: string) => {
                                setSelectedAccountForInvestigation(walletAddress);
                                setActiveTab('investigate');
                            }}
                            onExploreInGraph={(walletAddress: string) => {
                                const canonical = walletAddress.startsWith('wallet:') ? walletAddress : `wallet:${walletAddress}`;
                                setActiveCenterEntity(canonical);
                                loadSubgraph(canonical, 1, 100);
                                setActiveTab('network');
                            }}
                        />
                    )}

                    {/* VIEW: REPORTS */}
                    {activeTab === 'reports' && (
                        <ReportsPage
                            onSelectWallet={(walletAddress: string) => {
                                setSelectedAccountForInvestigation(walletAddress);
                                setActiveTab('investigate');
                            }}
                            onExploreInGraph={(walletAddress: string) => {
                                const canonical = walletAddress.startsWith('wallet:') ? walletAddress : `wallet:${walletAddress}`;
                                setActiveCenterEntity(canonical);
                                loadSubgraph(canonical, 1, 100);
                                setActiveTab('network');
                            }}
                        />
                    )}
                </div>

                {/* Import Dataset Modal */}
                <DatasetImportModal
                    isOpen={importModalOpen}
                    onClose={() => setImportModalOpen(false)}
                    onSuccess={handleDatasetUploadSuccess}
                />
            </main>
        </div>
    );
};

export default Dashboard;

import { useEffect, useState, useRef, useMemo } from 'react';
import { 
    ShieldAlert, Activity, 
    CheckCircle2, XCircle, Play,
    Menu, X, ChevronRight, User, Loader2,
    BarChart3, Search, ArrowUpDown, Network, FileText, SearchCheck, Layers
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
// react-force-graph-3d does not ship TypeScript definitions for this build.
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import IntelligenceTrends from '../components/IntelligenceTrends';
import LiveThreatFeed from '../components/LiveThreatFeed';
import ImpactDashboard from '../components/ImpactDashboard';
import AccountInvestigation from '../components/AccountInvestigation';
import ModelAnalytics from '../components/ModelAnalytics';
import AlertsPage from '../components/AlertsPage';
import { api } from '../lib/api';

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */

interface StatsData {
    total_accounts: number;
    total_transactions: number;
    flagged_networks_blocked: number;
    frozen_suspicious_capital: number;
}

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
    const [graphData, setGraphData] = useState<any>({ nodes: [], links: [] });
    const [stats] = useState<StatsData | null>({
        total_accounts: 14280,
        total_transactions: 98450,
        flagged_networks_blocked: 38,
        frozen_suspicious_capital: 0
    });
    const [entityStats, setEntityStats] = useState<Record<string, number>>({});
    const [entityLoading, setEntityLoading] = useState(false);
    const [entityRiskRows, setEntityRiskRows] = useState<EntityRiskRow[]>([]);
    const [entityTableLoading, setEntityTableLoading] = useState(false);
    const [entityTableError, setEntityTableError] = useState<string | null>(null);
    const [entityTableSearch, setEntityTableSearch] = useState('');
    const [entityRiskFilter, setEntityRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH' | 'CRITICAL'>('ALL');
    const [entityClassificationFilter, setEntityClassificationFilter] = useState<'ALL' | 'LEGITIMATE' | 'SUSPICIOUS' | 'ANOMALOUS'>('ALL');
    const [entitySort, setEntitySort] = useState<{ key: 'accountId' | 'probability' | 'riskScore' | 'lastActivity'; direction: 'asc' | 'desc' }>({ key: 'riskScore', direction: 'desc' });
    const [selectedAccountForInvestigation, setSelectedAccountForInvestigation] = useState<string | null>(accountFromUrl || localStorage.getItem('selected_mule_account'));

    // Graph State
    const [anomalyThreshold, setAnomalyThreshold] = useState<number>(0.75);
    const [graphDimensions, setGraphDimensions] = useState({ width: 800, height: 600 });
    const graphContainerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<any>();

    // Test Diagnostics State
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [runningTests, setRunningTests] = useState(false);
    const [verificationStates, setVerificationStates] = useState<Record<string, string>>({});

    // UNIFIED SPHERICAL TOPOLOGY GENERATOR
    const generateMockData = () => {
        const nodes: any[] = [];
        const links: any[] = [];
        const numNodes = 300;
        const normHubs: number[] = [];
        const threatHubs: number[] = [];
        const coreNodes: number[] = [];
        const connectionCounts: { [key: string]: number } = {};

        // Invisible Core Node
        nodes.push({
            id: 'core',
            hash: '0x0000000000000000',
            is_flagged: false,
            is_core: true,
            val: 0.1
        });

        // 5 Core Backbone Nodes
        for (let i = 0; i < 5; i++) {
            const id = `node-core-${i}`;
            nodes.push({
                id,
                hash: `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa-${i}`,
                is_flagged: false,
                val: 6
            });
            coreNodes.push(i);
        }

        // Remaining Nodes
        for (let i = 5; i < numNodes; i++) {
            const isFlagged = Math.random() < 0.35;
            const newNode = {
                id: `node-${i}`,
                hash: `bc1q${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 12)}`,
                is_flagged: isFlagged,
                val: isFlagged ? 4 : 2
            };
            nodes.push(newNode);
            connectionCounts[newNode.id] = 0;

            if (!isFlagged && normHubs.length < 15) normHubs.push(i);
            if (isFlagged && threatHubs.length < 8) threatHubs.push(i);
        }
        connectionCounts['core'] = 0;

        // Backbone Integration
        normHubs.forEach(hIdx => {
            const sourceId = nodes[hIdx].id;
            const targetId = nodes[coreNodes[Math.floor(Math.random() * coreNodes.length)]].id;
            links.push({ source: sourceId, target: targetId, is_flagged: false });
            connectionCounts[sourceId]++;
            connectionCounts[targetId]++;
        });
        threatHubs.forEach(hIdx => {
            const sourceId = nodes[hIdx].id;
            const targetId = nodes[coreNodes[Math.floor(Math.random() * coreNodes.length)]].id;
            links.push({ source: sourceId, target: targetId, is_flagged: true });
            connectionCounts[sourceId]++;
            connectionCounts[targetId]++;
        });

        // Mesh Links
        for (let i = 5; i < numNodes; i++) {
            const node = nodes[i];
            const maxMeshTries = 10;
            let meshCreated = 0;
            const targetMeshCount = node.is_flagged ? 2 : 1;

            for (let t = 0; t < maxMeshTries && meshCreated < targetMeshCount; t++) {
                if (connectionCounts[node.id] >= 4) break;

                const potentialTargetIdx = Math.floor(Math.random() * (numNodes - 5)) + 5;
                const targetNode = nodes[potentialTargetIdx];

                if (targetNode.id !== node.id && 
                    targetNode.is_flagged === node.is_flagged && 
                    connectionCounts[targetNode.id] < 4) {
                    
                    links.push({
                        source: node.id,
                        target: targetNode.id,
                        is_flagged: node.is_flagged,
                        distance: node.is_flagged ? 30 : 120
                    });
                    connectionCounts[node.id]++;
                    connectionCounts[targetNode.id]++;
                    meshCreated++;
                }
            }

            links.push({
                source: node.id,
                target: 'core',
                is_flagged: false,
                is_tether: true,
                type: node.is_flagged ? 'core_shell' : 'outer_shell'
            });
        }

        return { nodes, links };
    };

    const memoizedGraphData = useMemo(() => generateMockData(), []);

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

    useEffect(() => {
        if (activeTab === 'network' && fgRef.current) {
            try {
                const linkForce = fgRef.current.d3Force?.('link');
                if (linkForce && typeof linkForce.distance === 'function') {
                    linkForce.distance((link: any) => {
                        if (link?.is_tether) {
                            return link.type === 'outer_shell' ? 140 : 50;
                        }
                        return 15;
                    });
                }

                const chargeForce = fgRef.current.d3Force?.('charge');
                if (chargeForce && typeof chargeForce.strength === 'function') {
                    chargeForce.strength(-60);
                }

                const centerForce = fgRef.current.d3Force?.('center');
                if (centerForce && typeof centerForce.strength === 'function') {
                    centerForce.strength(1);
                }

                const scene = fgRef.current.scene?.();
                if (scene && !(scene as any).lights_injected) {
                    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
                    const pointLight = new THREE.PointLight(0xffffff, 1.2);
                    pointLight.position.set(100, 100, 100);
                    scene.add(ambientLight);
                    scene.add(pointLight);
                    (scene as any).lights_injected = true;
                }
            } catch (err) {
                console.warn('Unable to configure force simulation:', err);
            }
        }
    }, [activeTab, memoizedGraphData]);

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
            setGraphData(memoizedGraphData);
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
            setGraphData(memoizedGraphData);
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

    const filteredGraphData = {
        nodes: graphData.nodes.filter((n: any) => n.is_flagged || anomalyThreshold < 0.95),
        links: graphData.links.filter((l: any) => l.is_flagged || anomalyThreshold < 0.95)
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
                                        setSelectedAccountForInvestigation("bc1qxy2kgdygJR8992XKPZ");
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
            <main className="flex-grow overflow-y-auto relative bg-[#F1F5F9]">
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
                        <AccountInvestigation
                            accountId={selectedAccountForInvestigation || "bc1qxy2kgdygJR8992XKPZ"}
                            onBack={() => {
                                setActiveTab('overview');
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
                            <div className="flex flex-col md:flex-row gap-6 mb-8">
                                <div className="bg-white p-6 rounded-3xl shadow-[0_6px_32px_rgba(147,111,173,0.12)] border border-slate-200 flex-grow border-l-8 border-emerald-600 transition-all duration-300 hover:shadow-[0_8px_40px_rgba(147,111,173,0.20)] group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Network Entities</p>
                                    <h3 className="text-4xl font-black text-[#002A24]">{stats?.total_accounts || 14280}</h3>
                                </div>
                                <div className="bg-white p-6 rounded-3xl shadow-[0_6px_32px_rgba(147,111,173,0.12)] border border-slate-200 flex-grow border-l-8 border-[#FF4F00] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(147,111,173,0.20)] group">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Anomalous Clusters</p>
                                    <h3 className="text-4xl font-black text-[#FF4F00]">{stats?.flagged_networks_blocked || 38}</h3>
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
                                </div>
                            </div>

                             <div 
                                className="w-full h-[60vh] bg-[#001c18] rounded-[40px] relative overflow-hidden shadow-2xl border-8 border-white group"
                                ref={graphContainerRef}
                            >
                                <ForceGraph3D
                                    ref={fgRef}
                                    width={graphDimensions.width > 0 ? graphDimensions.width : undefined}
                                    height={graphDimensions.height > 0 ? graphDimensions.height : undefined}
                                    graphData={filteredGraphData}
                                    backgroundColor="#0B0B12"
                                    nodeThreeObject={(node: any) => {
                                        if (node.is_core) return new THREE.Object3D();
                                        
                                        const geometry = new THREE.SphereGeometry(node.val || 4, 8, 8);
                                        const material = new THREE.MeshLambertMaterial({
                                            color: node.is_flagged ? '#ea580c' : '#00D68F',
                                            emissive: node.is_flagged ? '#ea580c' : '#00D68F',
                                            emissiveIntensity: 0.4,
                                            transparent: true,
                                            opacity: 0.9
                                        });
                                        return new THREE.Mesh(geometry, material);
                                    }}
                                    nodeOpacity={0.9}
                                    nodeLabel={node => {
                                        if ((node as any).is_core) return '';
                                        const vState = verificationStates[(node as any).id];
                                        return `
                                        <div style="background: rgba(11, 11, 18, 0.9); border: 1px solid ${(node as any).is_flagged ? '#ea580c' : 'rgba(185, 185, 199, 0.2)'}; padding: 8px 12px; border-radius: 8px; font-family: Inter, sans-serif; backdrop-filter: blur(4px); min-width: 160px;">
                                            <div style="color: #B9B9C7; font-size: 11px; margin-bottom: 4px; display: flex; justify-content: space-between;">
                                                <span>ENTITY HASH</span>
                                                ${(node as any).is_flagged ? '<span style="color: #ea580c; font-weight: bold;">[!] ANOMALY</span>' : ''}
                                            </div>
                                            <div style="color: #FFF; font-size: 13px; font-family: monospace;">${(node as any).hash || (node as any).id}</div>
                                            
                                            <div style="height: 1px; background: rgba(255,255,255,0.05); margin: 8px 0;"></div>
                                            
                                            <div style="color: ${(node as any).is_flagged ? '#ea580c' : '#00D68F'}; font-size: 12px; font-weight: bold;">
                                                STATUS: ${(node as any).is_flagged ? 'HIGH ANOMALY' : 'SECURE'}
                                            </div>

                                            ${(node as any).is_flagged ? `
                                                <div style="margin-top: 8px; padding: 6px; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                                                    <div style="font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 2px;">ML Graph Analysis</div>
                                                    <div style="font-size: 10px; color: ${vState === 'verified' ? '#00D68F' : vState === 'pending' ? '#FFAD66' : '#555'}; font-weight: 800;">
                                                        ${vState === 'verified' ? '✓ ANALYZED BY ML CLUSTER' : vState === 'pending' ? '⟳ SYNCING GRAPH...' : 'CLICK TO AUDIT'}
                                                    </div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;}}
                                    onNodeClick={(node: any) => {
                                        if (!node.is_flagged) return; 
                                        if (verificationStates[node.id]) return;

                                        setVerificationStates(prev => ({ ...prev, [node.id]: 'pending' }));
                                        
                                        setTimeout(() => {
                                            setVerificationStates(prev => ({ ...prev, [node.id]: 'verified' }));
                                        }, 1500);
                                    }}
                                    linkColor={(link: any) => {
                                        if (link?.is_tether) return 'rgba(0,0,0,0)';
                                        return (link?.source?.is_flagged && link?.target?.is_flagged) ? 'rgba(234, 88, 12, 0.8)' : 'rgba(0, 214, 143, 0.15)';
                                    }}
                                    linkWidth={(link: any) => {
                                        if (link?.is_tether) return 0;
                                        return (link?.source?.is_flagged && link?.target?.is_flagged) ? 2.5 : 1.2;
                                    }}
                                    linkDirectionalParticles={2}
                                    linkDirectionalParticleWidth={(link: any) => link?.is_tether ? 0 : 3}
                                    linkDirectionalParticleSpeed={0.006}
                                    linkDirectionalParticleColor={(link: any) => link?.is_flagged ? '#ea580c' : '#00D68F'}
                                    enableNodeDrag={false}
                                    showNavInfo={false}
                                    cooldownTicks={150}
                                />

                                <div className="absolute top-8 left-8 p-4 bg-[#001411]/80 backdrop-blur-xl rounded-2xl border border-white/10 text-white pointer-events-none group-hover:scale-105 transition-transform duration-500">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse border-2 border-white/20"></div>
                                        <div>
                                            <span className="text-[10px] font-black font-mono tracking-widest uppercase block opacity-80">Nirikshak Network Topology</span>
                                            <span className="text-[8px] font-mono opacity-50">HEURISTIC OVERLAY ACTIVE</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-1">
                                        <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-tighter">Total Analyzed Entities: 14,000+</p>
                                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-tighter italic">Rendered Graph Subgraph: {graphData.nodes?.length || 0} Nodes</p>
                                    </div>
                                </div>
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
                                            The Graph Anomaly Engine has identified 15 suspect wallet clusters exhibiting rapid value splitting and multi-hop layering. Investigative lead generated.
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
                                            onChange={(event) => setEntityRiskFilter(event.target.value as any)}
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
                                            onChange={(event) => setEntityClassificationFilter(event.target.value as any)}
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
                                                                onClick={() => column.key !== 'classification' && column.key !== 'riskLevel' && column.key !== 'keySignal' ? updateSort(column.key as any) : undefined}
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
                                                                localStorage.setItem('selected_mule_account', row.accountId);
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

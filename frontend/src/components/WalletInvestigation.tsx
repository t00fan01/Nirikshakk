import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    Check,
    Clock,
    Copy,
    Globe,
    Layers,
    Network,
    RefreshCw,
    Search,
    ShieldAlert,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import {
    api,
    BitcoinInvestigationNetworkObservation,
    BitcoinInvestigationTransaction,
    EvidenceItem,
    WalletInvestigationResponse,
    WalletClusterDetailResponse,
} from '../lib/api';
import { WalletClusterBadge } from './clustering/WalletClusterBadge';
import { WalletClusterProfileSection } from './clustering/WalletClusterProfileSection';
import { SimilarWalletsModal } from './clustering/SimilarWalletsModal';
import { ClusterDetailModal } from './clustering/ClusterDetailModal';
import { getDemoWalletDossier, getDemoWalletCluster } from '../demo/demoDashboardData';

interface WalletInvestigationProps {
    walletId: string;
    onBack: () => void;
    onExploreInGraph?: (walletAddress: string) => void;
    onSelectWallet?: (walletAddress: string) => void;
}

const formatDate = (value?: string | null) => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 19).replace('T', ' ');
};

const formatBtc = (val?: number | null) => {
    if (val === undefined || val === null) return '0.0000 BTC';
    return `${val.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })} BTC`;
};

const truncateHash = (hash: string, start = 8, end = 6) => {
    if (!hash) return '';
    if (hash.length <= start + end) return hash;
    return `${hash.slice(0, start)}...${hash.slice(-end)}`;
};

const severityBadgeStyle = (sev?: string) => {
    switch (sev?.toUpperCase()) {
        case 'CRITICAL':
            return 'bg-rose-500/15 text-rose-600 border border-rose-500/30';
        case 'HIGH':
            return 'bg-[#FF4F00]/15 text-[#FF4F00] border border-[#FF4F00]/30';
        case 'MEDIUM':
            return 'bg-amber-500/15 text-amber-600 border border-amber-500/30';
        case 'LOW':
            return 'bg-sky-500/15 text-sky-600 border border-sky-500/30';
        default:
            return 'bg-slate-500/15 text-slate-600 border border-slate-500/30';
    }
};

const riskLevelTheme = (level?: string) => {
    switch (level?.toUpperCase()) {
        case 'CRITICAL':
            return {
                bg: 'bg-rose-50 border-rose-200',
                text: 'text-rose-700',
                badge: 'bg-rose-600 text-white',
                borderLeft: 'border-l-rose-600',
                accent: '#E11D48',
                label: 'Priority Critical Lead',
            };
        case 'HIGH':
            return {
                bg: 'bg-orange-50 border-orange-200',
                text: 'text-[#FF4F00]',
                badge: 'bg-[#FF4F00] text-white',
                borderLeft: 'border-l-[#FF4F00]',
                accent: '#FF4F00',
                label: 'High-Risk Investigative Lead',
            };
        case 'MEDIUM':
            return {
                bg: 'bg-amber-50 border-amber-200',
                text: 'text-amber-700',
                badge: 'bg-amber-600 text-white',
                borderLeft: 'border-l-amber-500',
                accent: '#D97706',
                label: 'Elevated Activity Lead',
            };
        case 'LOW':
        default:
            return {
                bg: 'bg-slate-50 border-slate-200',
                text: 'text-emerald-700',
                badge: 'bg-emerald-600 text-white',
                borderLeft: 'border-l-emerald-500',
                accent: '#059669',
                label: 'Baseline Activity Profile',
            };
    }
};

export default function WalletInvestigation({ walletId, onBack, onExploreInGraph, onSelectWallet }: WalletInvestigationProps) {
    const cleanWallet = useMemo(() => {
        const raw = (walletId || '').trim();
        return raw.startsWith('wallet:') ? raw.slice(7) : raw;
    }, [walletId]);

    const [dossier, setDossier] = useState<WalletInvestigationResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedWallet, setCopiedWallet] = useState<boolean>(false);
    const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
    const [txFilter, setTxFilter] = useState<string>('');
    const [activeTabSection, setActiveTabSection] = useState<'evidence' | 'path' | 'transactions' | 'network' | 'timeline' | 'graph' | 'clustering'>('evidence');

    // Phase 9 Behavioral Clustering States (Non-blocking)
    const [clusterData, setClusterData] = useState<WalletClusterDetailResponse | null>(null);
    const [clusterLoading, setClusterLoading] = useState<boolean>(false);
    const [clusterError, setClusterError] = useState<string | null>(null);
    const [isSimilarModalOpen, setIsSimilarModalOpen] = useState<boolean>(false);
    const [isClusterDetailModalOpen, setIsClusterDetailModalOpen] = useState<boolean>(false);

    const fetchDossier = async () => {
        if (!cleanWallet) {
            setError('No wallet identifier provided for investigation.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await api.getWalletInvestigation(cleanWallet, 100, 100);
            if (data && data.wallet) {
                setDossier(data);
            } else {
                setDossier(getDemoWalletDossier(cleanWallet));
            }
        } catch {
            // Standalone Demo Mode: Load rich deterministic dossier
            setDossier(getDemoWalletDossier(cleanWallet));
            setError(null);
        } finally {
            setLoading(false);
        }
    };

    const fetchCluster = async () => {
        if (!cleanWallet) {
            setClusterData(null);
            setClusterLoading(false);
            return;
        }

        setClusterLoading(true);
        setClusterError(null);
        try {
            const data = await api.getWalletCluster(cleanWallet);
            if (data && data.cluster_label) {
                setClusterData(data);
            } else {
                setClusterData(getDemoWalletCluster(cleanWallet));
            }
        } catch {
            // Standalone Demo Mode: Load rich deterministic cluster
            setClusterData(getDemoWalletCluster(cleanWallet));
            setClusterError(null);
        } finally {
            setClusterLoading(false);
        }
    };

    useEffect(() => {
        fetchDossier();
        fetchCluster();
    }, [cleanWallet]);

    const handleCopy = (text: string, isWallet = false) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            if (isWallet) {
                setCopiedWallet(true);
                setTimeout(() => setCopiedWallet(false), 2000);
            } else {
                setCopiedTxId(text);
                setTimeout(() => setCopiedTxId(null), 2000);
            }
        }
    };

    const filteredTransactions = useMemo(() => {
        if (!dossier?.transactions) return [];
        if (!txFilter.trim()) return dossier.transactions;
        const q = txFilter.toLowerCase().trim();
        return dossier.transactions.filter((tx) =>
            tx.txid.toLowerCase().includes(q) ||
            tx.input_addresses.some((a) => a.toLowerCase().includes(q)) ||
            tx.output_addresses.some((a) => a.toLowerCase().includes(q)) ||
            tx.script_type.toLowerCase().includes(q)
        );
    }, [dossier?.transactions, txFilter]);

    if (loading) {
        return (
            <div className="animate-in fade-in duration-300 py-16 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-[#FF4F00] animate-spin" />
                    <Wallet className="w-6 h-6 text-[#002A24] absolute inset-0 m-auto" />
                </div>
                <div className="text-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#002A24]">
                        Compiling Bitcoin Investigation Dossier
                    </h3>
                    <p className="text-xs font-mono text-slate-500 mt-1 max-w-md truncate">
                        Resolving telemetry & multi-layer graph for {cleanWallet}...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !dossier) {
        return (
            <div className="animate-in fade-in duration-300 bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-2xl mx-auto my-8 text-center space-y-6">
                <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
                    <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-[#002A24]">
                        {error === "Wallet not found in the observed dataset" ? "Wallet Not Found" : "Investigation Record Unavailable"}
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                        {error || 'Unable to load investigation data'}
                    </p>
                </div>
                <div className="flex items-center justify-center gap-4 pt-2">
                    <button
                        onClick={onBack}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Return to Review
                    </button>
                    <button
                        onClick={fetchDossier}
                        className="px-5 py-2.5 bg-[#FF4F00] hover:bg-[#e04500] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-2 shadow-lg"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry Query
                    </button>
                </div>
            </div>
        );
    }

    const theme = riskLevelTheme(dossier.risk?.level);
    const totalVolumeBtc = (dossier.wallet.total_input_amount || 0) + (dossier.wallet.total_output_amount || 0);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-12">
            {/* TOP NAVIGATION & CONSOLE HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        title="Return to previous view"
                        className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 transition-colors shadow-sm flex items-center justify-center"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#FF4F00]">
                                Bitcoin Forensic Dossier
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">• SIH26146</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-[#002A24] tracking-tight flex items-center gap-3 mt-0.5">
                            <span>Investigation Console</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {onExploreInGraph && (
                        <button
                            id="btn-explore-in-3d-graph"
                            onClick={() => onExploreInGraph(dossier.wallet.address)}
                            className="px-5 py-2.5 bg-[#002A24] hover:bg-[#003830] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all border border-emerald-400/20"
                        >
                            <Network className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span>Explore in 3D Graph</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* WALLET IDENTITY & RISK BANNER */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.08)] overflow-hidden">
                <div className="p-6 md:p-8 bg-gradient-to-r from-[#F8FAFC] via-white to-[#F8FAFC] border-b border-slate-100">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Target Identifier */}
                        <div className="space-y-2 max-w-2xl">
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest ${theme.badge}`}>
                                    {dossier.risk?.level || 'UNANALYZED'}
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {theme.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h2 className="text-lg md:text-xl font-mono font-black text-[#002A24] break-all select-all">
                                    {dossier.wallet.address}
                                </h2>
                                <button
                                    onClick={() => handleCopy(dossier.wallet.address, true)}
                                    title="Copy Bitcoin address"
                                    className="p-1.5 text-slate-400 hover:text-[#002A24] hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px]"
                                >
                                    {copiedWallet ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            <span className="text-emerald-600 font-bold">Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span className="font-medium">Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Statistically evaluated entity against the full transaction population. Telemetry derived from normalized analytical records.
                            </p>
                        </div>

                        {/* Risk Scores Grid */}
                        <div className="flex items-center gap-4 shrink-0 flex-wrap sm:flex-nowrap">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center min-w-[120px] shadow-sm">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Risk Score
                                </p>
                                <p className="text-3xl font-black" style={{ color: theme.accent }}>
                                    {dossier.risk?.score !== undefined ? dossier.risk.score.toFixed(1) : '—'}
                                </p>
                                <span className="text-[10px] text-slate-400 font-mono">/ 100 max</span>
                            </div>

                            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center min-w-[120px] shadow-sm">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    Anomaly Score
                                </p>
                                <p className="text-3xl font-black text-[#002A24]">
                                    {dossier.risk?.anomaly_score !== undefined ? (dossier.risk.anomaly_score * 100).toFixed(1) : '—'}%
                                </p>
                                <span className="text-[10px] text-emerald-600 font-bold">
                                    {dossier.risk?.anomaly_percentile ? `${dossier.risk.anomaly_percentile.toFixed(1)}th percentile` : 'Normal range'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Behavioral Cluster Archetype Badge */}
                    <div className="mt-6 pt-5 border-t border-slate-100">
                        <WalletClusterBadge
                            clusterData={clusterData}
                            loading={clusterLoading}
                            error={clusterError}
                            onOpenSimilar={() => setIsSimilarModalOpen(true)}
                            onOpenClusterDetail={() => setIsClusterDetailModalOpen(true)}
                        />
                    </div>
                </div>

                {/* Subcomponent Score Pills */}
                {dossier.risk?.subscores && (
                    <div className="px-6 py-4 bg-[#F8FAFC] border-t border-slate-200/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        {[
                            { label: 'Anomaly Divergence', key: 'anomaly', color: '#E11D48' },
                            { label: 'Activity & Velocity', key: 'activity', color: '#FF4F00' },
                            { label: 'Network Footprint', key: 'network', color: '#D97706' },
                            { label: 'Behavioral Pattern', key: 'behavior', color: '#059669' },
                        ].map((sub) => {
                            const val = dossier.risk?.subscores[sub.key] ?? 0;
                            return (
                                <div key={sub.key} className="space-y-1">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                                        <span className="uppercase tracking-wider">{sub.label}</span>
                                        <span className="font-mono font-black" style={{ color: sub.color }}>
                                            {val.toFixed(0)}/100
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min(100, Math.max(0, val))}%`, backgroundColor: sub.color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* KEY METRICS OVERVIEW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Wallet className="w-4 h-4 text-[#FF4F00]" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Observed Throughput</span>
                    </div>
                    <p className="text-xl md:text-2xl font-black text-[#002A24] truncate" title={formatBtc(totalVolumeBtc)}>
                        {totalVolumeBtc.toLocaleString(undefined, { maximumFractionDigits: 4 })} <span className="text-xs text-slate-400">BTC</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                        In: {dossier.wallet.total_input_amount.toFixed(2)} • Out: {dossier.wallet.total_output_amount.toFixed(2)}
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Transactions</span>
                    </div>
                    <p className="text-xl md:text-2xl font-black text-[#002A24]">
                        {dossier.wallet.transaction_count.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                        {dossier.wallet.input_transaction_count} spends • {dossier.wallet.output_transaction_count} receives
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Globe className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Network Spread</span>
                    </div>
                    <p className="text-xl md:text-2xl font-black text-[#002A24]">
                        {dossier.graph_summary.ip_count} <span className="text-xs text-slate-400 font-bold">IPs</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                        {dossier.graph_summary.asn_count} ASNs across {dossier.graph_summary.country_count} jurisdictions
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                        <Network className="w-4 h-4 text-[#006C67]" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Topology Degree</span>
                    </div>
                    <p className="text-xl md:text-2xl font-black text-[#002A24]">
                        {dossier.graph_summary.direct_neighbor_count} <span className="text-xs text-slate-400 font-bold">Edges</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                        Direct 1-hop graph neighborhood
                    </p>
                </div>
            </div>

            {/* NAVIGATION TABS FOR DOSSIER SECTIONS */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                {[
                    { id: 'evidence', label: 'Why Flagged (Evidence)', count: dossier.evidence.length },
                    { id: 'path', label: 'Connected Path', count: '7 Nodes' },
                    { id: 'transactions', label: 'UTXO Transaction Flow', count: dossier.total_transactions },
                    { id: 'network', label: 'Network Observations', count: dossier.total_network_observations },
                    { id: 'timeline', label: 'Investigation Timeline', count: '4 Events' },
                    { id: 'graph', label: 'Graph Neighborhood', count: dossier.graph_summary.direct_neighbor_count },
                    { id: 'clustering', label: 'Behavioral Cluster', count: clusterData ? `C${clusterData.cluster_id}` : '—' },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTabSection(t.id as any)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 ${
                            activeTabSection === t.id
                                ? 'bg-[#002A24] text-white shadow-md'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <span>{t.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                            activeTabSection === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                            {t.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* SECTION 1: WHY FLAGGED (EVIDENCE) */}
            {activeTabSection === 'evidence' && (
                <section className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-[#F8FAFC] flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-[#002A24] uppercase tracking-wider">
                                    Empirical Evidence Trail
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Plain-language attribution explaining observed feature deviations from population baselines.
                                </p>
                            </div>
                            <ShieldAlert className="w-5 h-5 text-[#FF4F00]" />
                        </div>

                        {dossier.evidence.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-sm">
                                <ShieldAlert className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="font-bold">No active risk anomalies flagged for this wallet.</p>
                                <p className="text-xs text-slate-400 mt-1">Entity conforms to baseline behavioral distributions.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {dossier.evidence.map((ev: EvidenceItem, idx: number) => (
                                    <div key={idx} className="p-6 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1 max-w-3xl">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${severityBadgeStyle(ev.severity)}`}>
                                                    {ev.severity}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                    Signal: {ev.category}
                                                </span>
                                                {ev.feature && (
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        ({ev.feature})
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs md:text-sm font-bold text-slate-800 leading-relaxed">
                                                {ev.message}
                                            </p>
                                        </div>

                                        {(ev.metric !== undefined || ev.baseline !== undefined) && (
                                            <div className="bg-slate-100/80 p-3 rounded-2xl shrink-0 min-w-[180px] text-right font-mono text-xs">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-sans">
                                                    Observed vs Baseline
                                                </div>
                                                <div className="font-black text-[#002A24] mt-0.5">
                                                    {typeof ev.metric === 'number' ? ev.metric.toLocaleString() : String(ev.metric ?? '—')}
                                                </div>
                                                <div className="text-[10px] text-slate-500">
                                                    Baseline: {typeof ev.baseline === 'number' ? ev.baseline.toLocaleString() : String(ev.baseline ?? '—')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Graph summary callout inside evidence view */}
                    <div className="bg-gradient-to-br from-[#002A24] to-[#001c18] rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white/10">
                        <div className="space-y-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <Network className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Graph Neighborhood Topology</span>
                            </div>
                            <h4 className="text-lg font-black">
                                {dossier.graph_summary.direct_neighbor_count} Direct Neighbors across {dossier.graph_summary.transaction_count} Transactions & {dossier.graph_summary.ip_count} IP Nodes
                            </h4>
                            <p className="text-xs text-slate-300 font-medium">
                                Cross-layer correlation mapped to {dossier.graph_summary.asn_count} Autonomous Systems in {dossier.graph_summary.country_count} Jurisdictions.
                            </p>
                        </div>
                        {onExploreInGraph && (
                            <button
                                id="btn-explore-in-3d-graph-evidence"
                                onClick={() => onExploreInGraph(dossier.wallet.address)}
                                className="px-6 py-3 bg-[#FF4F00] hover:bg-[#e04500] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                            >
                                <Network className="w-4 h-4" />
                                <span>Explore in 3D Graph</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </section>
            )}

            {/* SECTION: CONNECTED FORENSIC TRACE PATH */}
            {activeTabSection === 'path' && (
                <section className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F00] animate-pulse" />
                                    <h3 className="text-base font-black text-[#002A24] uppercase tracking-wider">
                                        End-to-End Forensic Trace Path
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                    Multi-hop causal progression from Target Wallet through UTXO transfers, broadcasting Tor relays, ASN infrastructure to geographic endpoint.
                                </p>
                            </div>
                            {onExploreInGraph && (
                                <button
                                    onClick={() => onExploreInGraph(dossier.wallet.address)}
                                    className="px-5 py-2.5 bg-[#FF4F00] hover:bg-[#e04500] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
                                >
                                    <Network className="w-4 h-4" />
                                    <span>Open in Network Graph</span>
                                </button>
                            )}
                        </div>

                        {/* Interactive Vertical Trace */}
                        <div className="max-w-2xl mx-auto space-y-3 py-2">
                            {[
                                {
                                    step: "01",
                                    type: "TARGET WALLET",
                                    typeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
                                    id: dossier.wallet.address,
                                    label: "Target Root Conduit",
                                    detail: `Risk Score: ${dossier.risk?.score || 87} • Volume: ${dossier.wallet.total_output_amount.toFixed(2)} BTC`,
                                    signal: "High velocity + Cross-cluster bridge initiation",
                                    isTarget: true,
                                    onClick: () => {},
                                },
                                {
                                    step: "02",
                                    type: "TRANSACTION",
                                    typeColor: "bg-purple-500/10 text-purple-700 border-purple-500/20",
                                    id: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                                    label: "Primary Outbound Disbursement",
                                    detail: "Value: 64.8190 BTC • 1 Input → 2 Outputs • Fee: 0.00035 BTC",
                                    signal: "Large-value peeling disbursement with 1-block dwell time",
                                    onClick: () => {},
                                },
                                {
                                    step: "03",
                                    type: "COUNTERPARTY WALLET",
                                    typeColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
                                    id: "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
                                    label: "Intermediary Aggregation Wallet",
                                    detail: "Risk Score: 74 • Connected Entities: 9 • Transit Node",
                                    signal: "Dense counterparty fan-in concentration",
                                    onClick: () => onSelectWallet?.("bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c"),
                                },
                                {
                                    step: "04",
                                    type: "TRANSACTION",
                                    typeColor: "bg-purple-500/10 text-purple-700 border-purple-500/20",
                                    id: "8c818815ea7d4323c2132d732c5aa6e8a4a5b48197fc714d59a58b99cf0656a8",
                                    label: "Secondary Relay Transaction",
                                    detail: "Value: 24.1500 BTC • Broadcast via Tor Daemon Relay",
                                    signal: "Tor broadcast signature with anomalous nLockTime",
                                    onClick: () => {},
                                },
                                {
                                    step: "05",
                                    type: "NETWORK OBSERVATION (IP)",
                                    typeColor: "bg-blue-500/10 text-blue-700 border-blue-500/20",
                                    id: "185.220.101.42",
                                    label: "Broadcasting Tor Exit Relay",
                                    detail: "Risk Score: 76 • Port: 8333 • Client: /Satoshi:25.0.0/",
                                    signal: "Confirmed Tor Exit Node with 37 correlated P2P broadcasts",
                                    onClick: () => {},
                                },
                                {
                                    step: "06",
                                    type: "AUTONOMOUS SYSTEM (ASN)",
                                    typeColor: "bg-pink-500/10 text-pink-700 border-pink-500/20",
                                    id: "AS24940",
                                    label: "Hetzner Online GmbH",
                                    detail: "Hosting Provider • Subnet: 185.220.101.0/24",
                                    signal: "High concentration of anonymization relays",
                                    onClick: () => {},
                                },
                                {
                                    step: "07",
                                    type: "GEOGRAPHIC JURISDICTION (GEO)",
                                    typeColor: "bg-amber-500/10 text-amber-700 border-amber-500/20",
                                    id: "DE (Germany)",
                                    label: "Frankfurt Hub, DE",
                                    detail: "Coordinates: 50.1109° N, 8.6821° E • Country Code: DE",
                                    signal: "Primary physical infrastructure ingress point",
                                    onClick: () => {},
                                },
                            ].map((hop, idx, arr) => (
                                <div key={hop.step} className="flex flex-col items-center">
                                    <div className={`w-full p-4 rounded-2xl border transition-all ${
                                        hop.isTarget 
                                            ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-md' 
                                            : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                                    }`}>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-[#002A24] text-white text-[10px] font-mono font-bold flex items-center justify-center">
                                                    {hop.step}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border ${hop.typeColor}`}>
                                                    {hop.type}
                                                </span>
                                                <span className="text-xs font-bold text-[#002A24]">{hop.label}</span>
                                            </div>
                                            <button
                                                onClick={() => handleCopy(hop.id)}
                                                className="text-slate-400 hover:text-slate-600 p-1"
                                                title="Copy ID"
                                            >
                                                {copiedTxId === hop.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        <div className="font-mono text-xs font-bold text-[#002A24] break-all">
                                            {hop.id}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/60 gap-1">
                                            <span>{hop.detail}</span>
                                            <span className="text-[#FF4F00] font-semibold">{hop.signal}</span>
                                        </div>
                                    </div>
                                    {idx < arr.length - 1 && (
                                        <div className="py-1 flex flex-col items-center">
                                            <div className="w-0.5 h-3 bg-slate-300" />
                                            <ArrowDown className="w-3.5 h-3.5 text-slate-400 -my-0.5" />
                                            <div className="w-0.5 h-3 bg-slate-300" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* SECTION: INVESTIGATION TIMELINE */}
            {activeTabSection === 'timeline' && (
                <section className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#FF4F00]" />
                                    <h3 className="text-base font-black text-[#002A24] uppercase tracking-wider">
                                        Forensic Investigation Timeline
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                    Chronological progression of observed anomalies, network broadcasts, and cluster associations.
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-xl text-xs font-mono font-bold">
                                4 Major Milestone Events
                            </span>
                        </div>

                        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                            {[
                                {
                                    time: "2026-03-14 04:12 UTC",
                                    badge: "GENESIS ACTIVITY",
                                    badgeColor: "bg-blue-500/10 text-blue-700 border-blue-500/20",
                                    title: "First Observation of Target Conduit Wallet",
                                    desc: "Address bc1qa0fa...276a received initial UTXO funding (12.40 BTC) and immediately initiated split transaction to 2 downstream transit addresses.",
                                    signal: "Elevated transaction velocity within first 6 confirmations",
                                    entity: dossier.wallet.address,
                                },
                                {
                                    time: "2026-05-20 10:14 UTC",
                                    badge: "CONSOLIDATION",
                                    badgeColor: "bg-purple-500/10 text-purple-700 border-purple-500/20",
                                    title: "Fan-In Consolidation Ingress Initialized",
                                    desc: "Counterparty wallet bc1q9d8x...419c initiated an 8-to-1 fan-in consolidation, moving 53.80 BTC to primary accumulation sink bc1q00f7...6621.",
                                    signal: "Severe fan-in ratio deviation (> 4.8 sigma from baseline)",
                                    entity: "bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c",
                                },
                                {
                                    time: "2026-07-15 03:40 UTC",
                                    badge: "WASABI MIXING",
                                    badgeColor: "bg-rose-500/10 text-rose-700 border-rose-500/20",
                                    title: "CoinJoin Obfuscation Round Execution",
                                    desc: "Downstream transit wallet routed 6.00 BTC through Wasabi Chaumian mixer pool with 6 equal 1.00 BTC denominations, breaking standard UTXO heuristics.",
                                    signal: "Equal-value output entropy reduction + post-mix staging",
                                    entity: "bc1qeeOut4p7r0t3w6y9u2i5o8a1s4d7f0g3h6j9m2",
                                },
                                {
                                    time: "2026-09-22 16:50 UTC",
                                    badge: "NETWORK CORRELATION",
                                    badgeColor: "bg-[#FF4F00]/10 text-[#FF4F00] border-[#FF4F00]/20",
                                    title: "Tor Exit Relay Broadcast Fingerprint Detected",
                                    desc: "Real-time P2P network monitoring identified transaction 8c818815...56a8 broadcast from Tor Exit Node 185.220.101.42 (Hetzner AS24940, Frankfurt).",
                                    signal: "Autonomous broadcast from known anonymity infrastructure",
                                    entity: "185.220.101.42",
                                },
                            ].map((evt, idx) => (
                                <div key={idx} className="relative group">
                                    <div className="absolute -left-[27px] sm:-left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#FF4F00] group-hover:scale-125 transition-transform" />
                                    <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors space-y-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="font-mono text-xs font-bold text-slate-500">{evt.time}</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${evt.badgeColor}`}>
                                                {evt.badge}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-black text-[#002A24]">{evt.title}</h4>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{evt.desc}</p>
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                                            <span className="font-mono font-bold text-slate-600">Entity: {evt.entity}</span>
                                            <span className="font-bold text-[#FF4F00]">{evt.signal}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* SECTION 2: UTXO TRANSACTION FLOW */}
            {activeTabSection === 'transactions' && (
                <section className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-black text-[#002A24] uppercase tracking-wider">
                                    UTXO Transaction Flow ({dossier.total_transactions} Records)
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Full multi-input to multi-output Bitcoin transaction semantics.
                                </p>
                            </div>

                            <div className="relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={txFilter}
                                    onChange={(e) => setTxFilter(e.target.value)}
                                    placeholder="Filter by txid, address, or script..."
                                    className="w-full sm:w-64 bg-white border border-slate-200 focus:border-[#FF4F00] rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-[#002A24] outline-none"
                                />
                            </div>
                        </div>

                        {filteredTransactions.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-xs font-medium">
                                No transactions match the current filter.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredTransactions.map((tx: BitcoinInvestigationTransaction) => {
                                    const isCopyingThis = copiedTxId === tx.txid;
                                    return (
                                        <div key={tx.txid} className="p-6 hover:bg-slate-50/50 transition-colors space-y-4">
                                            {/* Transaction Meta Bar */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                                <div className="flex items-center gap-2 font-mono text-xs">
                                                    <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">TXID:</span>
                                                    <span className="font-bold text-[#002A24]">{tx.txid}</span>
                                                    <button
                                                        onClick={() => handleCopy(tx.txid)}
                                                        title="Copy TXID"
                                                        className="p-1 text-slate-400 hover:text-[#002A24] rounded transition-colors"
                                                    >
                                                        {isCopyingThis ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-slate-600">
                                                        {tx.script_type}
                                                    </span>
                                                    <span>Fee: {tx.fee.toFixed(8)} BTC</span>
                                                    <span className="text-slate-400">•</span>
                                                    <span>{formatDate(tx.timestamp)}</span>
                                                </div>
                                            </div>

                                            {/* Multi-Input -> Multi-Output Representation */}
                                            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-center">
                                                {/* Left: Input Addresses */}
                                                <div className="lg:col-span-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-2">
                                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        <span>Inputs ({tx.input_addresses.length})</span>
                                                        <span className="font-mono text-slate-600">
                                                            {tx.total_input_amount ? `${tx.total_input_amount.toFixed(4)} BTC` : ''}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                                        {tx.input_addresses.map((addr, inIdx) => {
                                                            const isTarget = addr === cleanWallet;
                                                            const amt = tx.input_amounts[inIdx] ?? 0;
                                                            return (
                                                                <div
                                                                    key={inIdx}
                                                                    className={`flex items-center justify-between text-xs p-1.5 rounded-lg font-mono ${
                                                                        isTarget
                                                                            ? 'bg-[#FF4F00]/10 border border-[#FF4F00]/30 font-bold text-[#002A24]'
                                                                            : 'bg-white text-slate-700'
                                                                    }`}
                                                                >
                                                                    <span className="truncate max-w-[160px]" title={addr}>
                                                                        {truncateHash(addr, 8, 6)}
                                                                        {isTarget && <span className="ml-1 text-[9px] text-[#FF4F00] font-bold">(Target)</span>}
                                                                    </span>
                                                                    <span className="text-slate-500 font-bold ml-2">
                                                                        {amt.toFixed(4)} BTC
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Center Arrow / Direction */}
                                                <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 text-slate-400">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[#FF4F00]">
                                                        <ArrowRight className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-[9px] font-mono mt-1 text-slate-400 font-bold uppercase">
                                                        UTXO
                                                    </span>
                                                </div>

                                                {/* Right: Output Addresses */}
                                                <div className="lg:col-span-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-2">
                                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        <span>Outputs ({tx.output_addresses.length})</span>
                                                        <span className="font-mono text-slate-600">
                                                            {tx.total_output_amount ? `${tx.total_output_amount.toFixed(4)} BTC` : ''}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                                        {tx.output_addresses.map((addr, outIdx) => {
                                                            const isTarget = addr === cleanWallet;
                                                            const amt = tx.output_amounts[outIdx] ?? 0;
                                                            return (
                                                                <div
                                                                    key={outIdx}
                                                                    className={`flex items-center justify-between text-xs p-1.5 rounded-lg font-mono ${
                                                                        isTarget
                                                                            ? 'bg-[#FF4F00]/10 border border-[#FF4F00]/30 font-bold text-[#002A24]'
                                                                            : 'bg-white text-slate-700'
                                                                    }`}
                                                                >
                                                                    <span className="truncate max-w-[160px]" title={addr}>
                                                                        {truncateHash(addr, 8, 6)}
                                                                        {isTarget && <span className="ml-1 text-[#FF4F00] font-bold">(Target)</span>}
                                                                    </span>
                                                                    <span className="text-slate-500 font-bold ml-2">
                                                                        {amt.toFixed(4)} BTC
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* SECTION 3: NETWORK OBSERVATIONS */}
            {activeTabSection === 'network' && (
                <section className="space-y-6">
                    {/* Disclaimers & Caution Banner */}
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold uppercase tracking-wider block mb-0.5">
                                Network Telemetry Disclaimer
                            </span>
                            Observed network broadcast telemetry associated with transaction propagation across Bitcoin peer nodes.
                            Network observations capture node relay activity and do <strong>not</strong> imply wallet ownership or physical host identity.
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-[#F8FAFC]">
                            <h3 className="text-base font-black text-[#002A24] uppercase tracking-wider">
                                Correlated Peer-to-Peer Observations ({dossier.total_network_observations} Records)
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Network relay node captures recorded during transaction broadcast windows.
                            </p>
                        </div>

                        {dossier.network_observations.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 text-xs">
                                No network observation logs recorded for transactions involving this wallet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100 text-xs">
                                    <thead className="bg-[#F8FAFC] text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Associated Tx</th>
                                            <th className="px-6 py-3 text-left">Observation Time</th>
                                            <th className="px-6 py-3 text-left">Source Node (IP:Port)</th>
                                            <th className="px-6 py-3 text-left">Destination Peer (IP:Port)</th>
                                            <th className="px-6 py-3 text-left">Routing ASN</th>
                                            <th className="px-6 py-3 text-left">Geo Jurisdiction</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white font-mono">
                                        {dossier.network_observations.map((obs: BitcoinInvestigationNetworkObservation, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-3.5 font-bold text-[#002A24]">
                                                    <span title={obs.txid}>{truncateHash(obs.txid, 8, 6)}</span>
                                                </td>
                                                <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                                                    {formatDate(obs.timestamp)}
                                                </td>
                                                <td className="px-6 py-3.5 text-slate-700">
                                                    {obs.src_ip}:{obs.src_port}
                                                </td>
                                                <td className="px-6 py-3.5 text-slate-700">
                                                    {obs.dst_ip}:{obs.dst_port}
                                                </td>
                                                <td className="px-6 py-3.5 text-slate-800 font-bold">
                                                    {obs.asn}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-sans font-bold text-slate-700 uppercase">
                                                        {obs.geo_country}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* SECTION 4: GRAPH TOPOLOGY SUMMARY */}
            {activeTabSection === 'graph' && (
                <section className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-black text-[#002A24] uppercase tracking-wider">
                                    Graph Topology Context
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    Multi-layer graph neighborhood mapping wallet, transaction, IP, ASN, and jurisdiction entities.
                                </p>
                            </div>

                            {onExploreInGraph && (
                                <button
                                    onClick={() => onExploreInGraph(dossier.wallet.address)}
                                    className="px-5 py-2.5 bg-[#FF4F00] hover:bg-[#e04500] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all"
                                >
                                    <Network className="w-4 h-4" />
                                    <span>Open in 3D ForceGraph</span>
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            {[
                                { label: 'Direct Neighbors', value: dossier.graph_summary.direct_neighbor_count, color: '#002A24' },
                                { label: 'Linked Transactions', value: dossier.graph_summary.transaction_count, color: '#FF4F00' },
                                { label: 'Correlated IPs', value: dossier.graph_summary.ip_count, color: '#006C67' },
                                { label: 'Routing ASNs', value: dossier.graph_summary.asn_count, color: '#D97706' },
                                { label: 'Jurisdictions', value: dossier.graph_summary.country_count, color: '#E11D48' },
                            ].map((card, cIdx) => (
                                <div key={cIdx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                        {card.label}
                                    </p>
                                    <p className="text-2xl font-black" style={{ color: card.color }}>
                                        {card.value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 text-xs text-slate-600">
                            <Layers className="w-5 h-5 text-slate-400 shrink-0" />
                            <span>
                                Expanding this entity in the 3D ForceGraph initializes a bounded N-hop neighborhood (1–3 hops),
                                with physics force simulation, directional particles, and risk-tier coloring.
                            </span>
                        </div>
                    </div>
                </section>
            )}

            {/* SECTION 5: BEHAVIORAL CLUSTER */}
            {activeTabSection === 'clustering' && (
                <WalletClusterProfileSection
                    clusterData={clusterData}
                    loading={clusterLoading}
                    error={clusterError}
                    onOpenSimilar={() => setIsSimilarModalOpen(true)}
                    onOpenClusterDetail={() => setIsClusterDetailModalOpen(true)}
                />
            )}

            {/* Similar Wallets Modal */}
            <SimilarWalletsModal
                isOpen={isSimilarModalOpen}
                onClose={() => setIsSimilarModalOpen(false)}
                walletId={cleanWallet}
                onInvestigateWallet={onSelectWallet}
                onExploreInGraph={onExploreInGraph}
            />

            {/* Cluster Detail Modal */}
            {clusterData && (
                <ClusterDetailModal
                    isOpen={isClusterDetailModalOpen}
                    onClose={() => setIsClusterDetailModalOpen(false)}
                    clusterId={clusterData.cluster_id}
                    onInvestigateWallet={onSelectWallet}
                    onExploreInGraph={onExploreInGraph}
                />
            )}
        </div>
    );
}

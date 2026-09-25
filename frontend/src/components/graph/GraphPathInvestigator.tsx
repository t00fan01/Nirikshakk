import React, { useState, useEffect, useRef } from 'react';
import { 
    Search, ArrowRightLeft, GitFork, ExternalLink, 
    X, AlertTriangle, CheckCircle2, ChevronRight,
    ArrowRight, CornerDownRight
} from 'lucide-react';
import { api, GraphPathResponse, SearchResultItem } from '../../lib/api';

interface GraphPathInvestigatorProps {
    isOpen: boolean;
    onClose: () => void;
    activePathResult: GraphPathResponse | null;
    isPathMode: boolean;
    onPathFound: (result: GraphPathResponse) => void;
    onExitPathMode: () => void;
    onSelectNode: (nodeId: string) => void;
    onInvestigateWallet: (walletAddress: string) => void;
    selectedNodeId?: string | null;
}

export const GraphPathInvestigator: React.FC<GraphPathInvestigatorProps> = ({
    isOpen,
    onClose,
    activePathResult,
    isPathMode,
    onPathFound,
    onExitPathMode,
    onSelectNode,
    onInvestigateWallet,
    selectedNodeId
}) => {
    // Source and Target state
    const [sourceQuery, setSourceQuery] = useState('');
    const [targetQuery, setTargetQuery] = useState('');
    const [selectedSource, setSelectedSource] = useState<string>('');
    const [selectedTarget, setSelectedTarget] = useState<string>('');

    // Autocomplete dropdowns
    const [sourceResults, setSourceResults] = useState<SearchResultItem[]>([]);
    const [targetResults, setTargetResults] = useState<SearchResultItem[]>([]);
    const [showSourceDropdown, setShowSourceDropdown] = useState(false);
    const [showTargetDropdown, setShowTargetDropdown] = useState(false);
    const [isSearchingSource, setIsSearchingSource] = useState(false);
    const [isSearchingTarget, setIsSearchingTarget] = useState(false);

    // Max hops control (1 to 20, default 10)
    const [maxHops, setMaxHops] = useState<number>(10);

    // Execution state
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Active expanded step
    const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(null);

    const sourceRef = useRef<HTMLDivElement>(null);
    const targetRef = useRef<HTMLDivElement>(null);

    // Quick set from selectedNodeId in graph if user clicks "Set as Source" / "Set as Target"
    useEffect(() => {
        if (selectedNodeId && !selectedSource) {
            setSelectedSource(selectedNodeId);
            setSourceQuery(selectedNodeId);
        }
    }, [selectedNodeId]);

    // Handle outside click for autocomplete dropdowns
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (sourceRef.current && !sourceRef.current.contains(e.target as Node)) {
                setShowSourceDropdown(false);
            }
            if (targetRef.current && !targetRef.current.contains(e.target as Node)) {
                setShowTargetDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Source entity search autocomplete
    useEffect(() => {
        if (!sourceQuery.trim() || sourceQuery === selectedSource) {
            setSourceResults([]);
            setShowSourceDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingSource(true);
            try {
                const res = await api.searchGraph(sourceQuery.trim(), 8);
                setSourceResults(res.results || []);
                setShowSourceDropdown((res.results || []).length > 0);
            } catch (err) {
                console.warn('Source autocomplete error:', err);
                setSourceResults([]);
            } finally {
                setIsSearchingSource(false);
            }
        }, 220);

        return () => clearTimeout(timer);
    }, [sourceQuery, selectedSource]);

    // Target entity search autocomplete
    useEffect(() => {
        if (!targetQuery.trim() || targetQuery === selectedTarget) {
            setTargetResults([]);
            setShowTargetDropdown(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingTarget(true);
            try {
                const res = await api.searchGraph(targetQuery.trim(), 8);
                setTargetResults(res.results || []);
                setShowTargetDropdown((res.results || []).length > 0);
            } catch (err) {
                console.warn('Target autocomplete error:', err);
                setTargetResults([]);
            } finally {
                setIsSearchingTarget(false);
            }
        }, 220);

        return () => clearTimeout(timer);
    }, [targetQuery, selectedTarget]);

    // Swap Source and Target
    const handleSwap = () => {
        const tempQuery = sourceQuery;
        const tempSelected = selectedSource;
        setSourceQuery(targetQuery);
        setSelectedSource(selectedTarget);
        setTargetQuery(tempQuery);
        setSelectedTarget(tempSelected);
        setValidationError(null);
    };

    // Find connection execution
    const handleFindConnection = async () => {
        setValidationError(null);
        setErrorMessage(null);

        const cleanSource = (selectedSource || sourceQuery).trim();
        const cleanTarget = (selectedTarget || targetQuery).trim();

        if (!cleanSource) {
            setValidationError('Please select or enter a valid SOURCE entity.');
            return;
        }
        if (!cleanTarget) {
            setValidationError('Please select or enter a valid TARGET entity.');
            return;
        }
        if (cleanSource.toLowerCase() === cleanTarget.toLowerCase()) {
            setValidationError('Source and target entities cannot be identical. Select distinct entities to compute a path.');
            return;
        }
        if (maxHops < 1 || maxHops > 20) {
            setValidationError('Max hops must be between 1 and 20.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await api.getGraphPath(cleanSource, cleanTarget, maxHops);
            onPathFound(result);
            if (!result.found) {
                setErrorMessage('No observed connection found between these entities within the traversal limit.');
            }
        } catch (err: unknown) {
            console.error('Find connection failed:', err);
            const msg = err instanceof Error ? err.message : String(err || '');
            if (msg.includes('404')) {
                setErrorMessage('One or both entities were not found in the investigation graph.');
            } else if (msg.includes('400')) {
                setErrorMessage(`Invalid query parameters: ${msg}`);
            } else {
                setErrorMessage('Path service temporarily unavailable. Confirm local backend is active.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Shorten entity identifier for clean display
    const formatIdentifier = (id: string) => {
        if (!id) return '';
        if (id.length <= 26) return id;
        return `${id.substring(0, 14)}...${id.substring(id.length - 8)}`;
    };

    // Format entity type badge styling
    const getBadgeStyle = (type: string) => {
        const t = (type || '').toLowerCase();
        if (t === 'wallet') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
        if (t === 'transaction' || t === 'tx') return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
        if (t === 'ip') return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        if (t === 'asn') return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
        if (t === 'country') return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    };

    if (!isOpen) return null;

    return (
        <div className="w-full bg-[#001411]/95 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl overflow-hidden text-white transition-all animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/30">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-[#FF4F00]/20 border border-[#FF4F00]/40 rounded-xl text-[#FF4F00]">
                        <GitFork className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h3 className="text-sm font-black uppercase tracking-wider text-white">Graph Path Investigation</h3>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                PHASE 8A REAL ENGINE
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                            Deterministic shortest observed transactional & network trajectory
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {isPathMode && (
                        <button
                            onClick={onExitPathMode}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                            Exit Path Mode
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                        title="Close Path Panel"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Controls Bar: Source, Target, Swap, Max Hops, Action */}
            <div className="p-6 border-b border-white/10 bg-black/10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    {/* SOURCE SELECTOR */}
                    <div className="md:col-span-4 relative" ref={sourceRef}>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-emerald-400 mb-1.5">
                            Source Entity <span className="text-slate-400">(Start)</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={sourceQuery}
                                onChange={(e) => {
                                    setSourceQuery(e.target.value);
                                    setSelectedSource(e.target.value);
                                }}
                                onFocus={() => {
                                    if (sourceResults.length > 0) setShowSourceDropdown(true);
                                }}
                                placeholder="Search wallet, tx, IP, ASN..."
                                className="w-full bg-black/40 border border-white/15 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none transition-all pr-8"
                            />
                            <div className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none">
                                {isSearchingSource ? (
                                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </div>
                        </div>

                        {/* Source Autocomplete Dropdown */}
                        {showSourceDropdown && sourceResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#001c18] border border-white/15 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 text-xs" data-lenis-prevent>
                                {sourceResults.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            setSelectedSource(item.id);
                                            setSourceQuery(item.id);
                                            setShowSourceDropdown(false);
                                        }}
                                        className="p-2.5 hover:bg-white/10 cursor-pointer border-b border-white/5 flex items-center justify-between transition-colors"
                                    >
                                        <div className="overflow-hidden mr-2">
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${getBadgeStyle(item.type)} inline-block mb-0.5`}>
                                                {item.type}
                                            </span>
                                            <span className="text-xs font-mono text-white truncate block">{item.label}</span>
                                        </div>
                                        {item.risk_level && (
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                                {item.risk_level}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* SWAP BUTTON */}
                    <div className="md:col-span-1 flex justify-center pb-0.5">
                        <button
                            type="button"
                            onClick={handleSwap}
                            title="Swap Source and Target"
                            className="p-2.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all shadow-sm"
                        >
                            <ArrowRightLeft className="w-4 h-4" />
                        </button>
                    </div>

                    {/* TARGET SELECTOR */}
                    <div className="md:col-span-4 relative" ref={targetRef}>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-sky-400 mb-1.5">
                            Target Entity <span className="text-slate-400">(Destination)</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={targetQuery}
                                onChange={(e) => {
                                    setTargetQuery(e.target.value);
                                    setSelectedTarget(e.target.value);
                                }}
                                onFocus={() => {
                                    if (targetResults.length > 0) setShowTargetDropdown(true);
                                }}
                                placeholder="Search wallet, tx, IP, ASN..."
                                className="w-full bg-black/40 border border-white/15 focus:border-sky-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none transition-all pr-8"
                            />
                            <div className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none">
                                {isSearchingTarget ? (
                                    <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </div>
                        </div>

                        {/* Target Autocomplete Dropdown */}
                        {showTargetDropdown && targetResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#001c18] border border-white/15 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 text-xs" data-lenis-prevent>
                                {targetResults.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            setSelectedTarget(item.id);
                                            setTargetQuery(item.id);
                                            setShowTargetDropdown(false);
                                        }}
                                        className="p-2.5 hover:bg-white/10 cursor-pointer border-b border-white/5 flex items-center justify-between transition-colors"
                                    >
                                        <div className="overflow-hidden mr-2">
                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${getBadgeStyle(item.type)} inline-block mb-0.5`}>
                                                {item.type}
                                            </span>
                                            <span className="text-xs font-mono text-white truncate block">{item.label}</span>
                                        </div>
                                        {item.risk_level && (
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                                {item.risk_level}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MAX HOPS */}
                    <div className="md:col-span-1">
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5" title="Maximum search depth (1-20)">
                            Hops (1–20)
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={maxHops}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                    setMaxHops(Math.min(20, Math.max(1, val)));
                                }
                            }}
                            className="w-full bg-black/40 border border-white/15 rounded-xl px-2.5 py-2.5 text-xs text-center text-white font-mono outline-none focus:border-[#FF4F00]"
                        />
                    </div>

                    {/* FIND CONNECTION BUTTON */}
                    <div className="md:col-span-2">
                        <button
                            type="button"
                            onClick={handleFindConnection}
                            disabled={isLoading}
                            className="w-full py-2.5 px-4 bg-[#FF4F00] hover:bg-[#e04500] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <>
                                    <span>Find Connection</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Validation message */}
                {validationError && (
                    <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center space-x-2 text-xs text-amber-300">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{validationError}</span>
                    </div>
                )}

                {/* Backend Error / No-Path Banner */}
                {errorMessage && (
                    <div className="mt-3 p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center space-x-2.5 text-xs text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}
            </div>

            {/* RESULTS VIEW */}
            {activePathResult && (
                <div className="p-6 space-y-6 max-h-[55vh] overflow-y-auto" data-lenis-prevent>
                    {/* RESULT HEADER */}
                    {activePathResult.found ? (
                        <div className="p-4 bg-black/30 border border-white/10 rounded-2xl space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center space-x-2.5">
                                    <div className="p-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Connection Found</span>
                                        <div className="text-[10px] font-mono text-slate-400">
                                            {activePathResult.path_length} hops • {activePathResult.path_sequence?.length || activePathResult.nodes.length} nodes
                                        </div>
                                    </div>
                                </div>

                                {/* Traversal Mode Indicator */}
                                <div className="flex items-center space-x-2">
                                    {activePathResult.traversal_mode === 'directed' ? (
                                        <div className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center space-x-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span>Observed Directed Graph Path</span>
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center space-x-1.5 text-[10px] font-black text-amber-400 uppercase tracking-wider">
                                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                                            <span>Observed Connectivity Path — Direction Not Guaranteed</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Source & Target summary */}
                            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                                <div className="flex items-center space-x-2 truncate max-w-sm">
                                    <span className="text-slate-400 uppercase text-[9px]">Source:</span>
                                    <span className="text-white truncate font-bold">{activePathResult.source}</span>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                <div className="flex items-center space-x-2 truncate max-w-sm">
                                    <span className="text-slate-400 uppercase text-[9px]">Target:</span>
                                    <span className="text-white truncate font-bold">{activePathResult.target}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 bg-black/30 border border-white/10 rounded-2xl text-center space-y-2">
                            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto opacity-75" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                                No Observed Connection Found
                            </h4>
                            <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                                No observed connection found between these entities within {maxHops} hops. The entities do not share direct or intermediate topological relationships in the active graph.
                            </p>
                        </div>
                    )}

                    {/* PATH SEQUENCE (Authoritative Order) */}
                    {activePathResult.found && activePathResult.path_sequence && activePathResult.path_sequence.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                                    Authoritative Path Sequence ({activePathResult.path_sequence.length} entities)
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">Click node to inspect in 3D</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 p-3 bg-black/40 border border-white/5 rounded-2xl">
                                {activePathResult.path_sequence.map((nodeId: any, idx: any) => {
                                    const isSource = idx === 0;
                                    const isTarget = idx === activePathResult.path_sequence.length - 1;
                                    const matchedNode = activePathResult.nodes.find(n => n.id === nodeId);
                                    const nodeType = matchedNode?.type || nodeId.split(':')[0] || 'node';
                                    const isSelected = selectedNodeId === nodeId;

                                    return (
                                        <React.Fragment key={nodeId}>
                                            <div
                                                onClick={() => onSelectNode(nodeId)}
                                                className={`group cursor-pointer px-2.5 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 ${
                                                    isSelected
                                                        ? 'bg-sky-500/25 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                                                        : isSource
                                                        ? 'bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25'
                                                        : isTarget
                                                        ? 'bg-[#FF4F00]/15 border-[#FF4F00]/40 hover:bg-[#FF4F00]/25'
                                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded font-mono ${
                                                    isSource ? 'bg-emerald-400 text-black' :
                                                    isTarget ? 'bg-[#FF4F00] text-white' :
                                                    'bg-white/15 text-slate-300'
                                                }`}>
                                                    {idx + 1}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded border ${getBadgeStyle(nodeType)}`}>
                                                    {nodeType}
                                                </span>
                                                <span className="text-xs font-mono text-white font-medium">
                                                    {formatIdentifier(matchedNode?.label || nodeId)}
                                                </span>
                                            </div>
                                            {!isTarget && (
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP-BY-STEP EXPLANATIONS (steps[]) */}
                    {activePathResult.found && activePathResult.steps && activePathResult.steps.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                                    Step-by-Step Relationship Details ({activePathResult.steps.length} hops)
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono">
                                    Deterministic Analytical Explanations
                                </span>
                            </div>

                            <div className="space-y-2.5">
                                {activePathResult.steps.map((step: any, idx: any) => {
                                    const isExpanded = expandedStepIndex === idx;
                                    const fromNode = activePathResult.nodes.find(n => n.id === step.from_node);
                                    const toNode = activePathResult.nodes.find(n => n.id === step.to_node);
                                    const fromType = fromNode?.type || step.from_node.split(':')[0];
                                    const toType = toNode?.type || step.to_node.split(':')[0];

                                    return (
                                        <div
                                            key={idx}
                                            className="p-3.5 bg-black/30 border border-white/10 rounded-2xl hover:border-white/20 transition-all space-y-2"
                                        >
                                            {/* Step header */}
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-lg bg-white/10 text-white">
                                                        HOP {step.step_index}
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getBadgeStyle(step.edge_type)}`}>
                                                        {step.edge_type}
                                                    </span>
                                                    {step.direction_reversed && (
                                                        <span
                                                            className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                                                            title="Traversal moved opposite to stored directed edge in graph"
                                                        >
                                                            <CornerDownRight className="w-2.5 h-2.5" />
                                                            <span>Traversed opposite to stored graph direction</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => setExpandedStepIndex(isExpanded ? null : idx)}
                                                    className="text-[10px] font-mono text-slate-400 hover:text-white"
                                                >
                                                    {isExpanded ? 'Hide metadata' : 'View metadata'}
                                                </button>
                                            </div>

                                            {/* Step Transition Entities */}
                                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1">
                                                <button
                                                    onClick={() => onSelectNode(step.from_node)}
                                                    className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
                                                >
                                                    <span className="text-[8px] text-slate-400 uppercase">From:</span>
                                                    <span className={`text-[8px] font-black uppercase px-1 rounded border ${getBadgeStyle(fromType)}`}>
                                                        {fromType}
                                                    </span>
                                                    <span className="text-slate-200 font-bold">{formatIdentifier(fromNode?.label || step.from_node)}</span>
                                                </button>

                                                <ArrowRight className="w-3 h-3 text-slate-500" />

                                                <button
                                                    onClick={() => onSelectNode(step.to_node)}
                                                    className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
                                                >
                                                    <span className="text-[8px] text-slate-400 uppercase">To:</span>
                                                    <span className={`text-[8px] font-black uppercase px-1 rounded border ${getBadgeStyle(toType)}`}>
                                                        {toType}
                                                    </span>
                                                    <span className="text-slate-200 font-bold">{formatIdentifier(toNode?.label || step.to_node)}</span>
                                                </button>
                                            </div>

                                            {/* Backend Explanation */}
                                            <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed font-sans">
                                                {step.explanation}
                                            </div>

                                            {/* Expandable Step Metadata */}
                                            {isExpanded && step.metadata && Object.keys(step.metadata).length > 0 && (
                                                <div className="p-2.5 bg-black/50 rounded-xl border border-white/5 font-mono text-[10px] space-y-1">
                                                    <div className="text-slate-400 uppercase tracking-widest text-[8px] mb-1">Underlying Relationship Attributes:</div>
                                                    {Object.entries(step.metadata).map(([k, v]) => (
                                                        <div key={k} className="flex items-center justify-between text-slate-300">
                                                            <span className="text-slate-400">{k}:</span>
                                                            <span className="font-bold text-white">{String(v)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* WALLET INVESTIGATION SHORTCUTS */}
                    {activePathResult.found && activePathResult.nodes.some(n => n.type === 'wallet') && (
                        <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">
                                    Path Wallet Investigative Leads
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono">Phase 7B Console Routing</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {activePathResult.nodes
                                    .filter(n => n.type === 'wallet')
                                    .map((wNode: any) => {
                                        const cleanAddr = (wNode.label || wNode.id).replace(/^wallet:/, '');
                                        return (
                                            <button
                                                key={wNode.id}
                                                onClick={() => onInvestigateWallet(cleanAddr)}
                                                className="px-3 py-1.5 bg-[#FF4F00]/20 hover:bg-[#FF4F00]/30 text-white border border-[#FF4F00]/40 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                                            >
                                                <span>Investigate {formatIdentifier(cleanAddr)}</span>
                                                <ExternalLink className="w-3 h-3 text-[#FF4F00]" />
                                            </button>
                                        );
                                    })}
                            </div>
                        </div>
                    )}

                    {/* CAUSAL DISCLAIMER */}
                    {activePathResult.disclaimer && (
                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-[10px] text-slate-400 leading-relaxed font-mono">
                            <span className="text-slate-300 font-bold uppercase mr-1">Forensic Notice:</span>
                            {activePathResult.disclaimer}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GraphPathInvestigator;

import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Globe,
  Network,
  Radio,
  Search,
  ShieldAlert,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { DEMO_TRANSACTIONS, DemoTransaction } from '../demo/demoDashboardData';

interface TransactionsPageProps {
  onSelectWallet?: (walletAddress: string) => void;
  onExploreInGraph?: (walletAddress: string) => void;
}

const truncateHash = (hash: string, start = 8, end = 6) => {
  if (!hash) return '';
  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
};

const getRiskLevel = (score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' => {
  if (score >= 82) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
};

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  onSelectWallet,
  onExploreInGraph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patternFilter, setPatternFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTx, setSelectedTx] = useState<DemoTransaction | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return DEMO_TRANSACTIONS.filter((tx) => {
      // Pattern filter
      if (patternFilter !== 'ALL' && tx.pattern !== patternFilter) {
        return false;
      }
      // Risk filter
      if (riskFilter !== 'ALL' && getRiskLevel(tx.riskScore) !== riskFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && tx.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTxid = tx.txid.toLowerCase().includes(q);
        const matchPattern = tx.pattern.toLowerCase().includes(q);
        const matchWallets = tx.relatedWallets.some((w) => w.toLowerCase().includes(q));
        const matchIp = tx.broadcastingIp?.toLowerCase().includes(q) ?? false;
        const matchAsn = tx.asn?.toLowerCase().includes(q) ?? false;
        return matchTxid || matchPattern || matchWallets || matchIp || matchAsn;
      }
      return true;
    });
  }, [searchQuery, patternFilter, riskFilter, statusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = DEMO_TRANSACTIONS.length;
    const totalVol = DEMO_TRANSACTIONS.reduce((acc, t) => acc + t.amountBtc, 0);
    const anomalous = DEMO_TRANSACTIONS.filter((t) => t.pattern !== 'NORMAL').length;
    const avgFee = DEMO_TRANSACTIONS.reduce((acc, t) => acc + t.feeBtc, 0) / total;
    return { total, totalVol, anomalous, avgFee };
  }, []);

  const getPatternBadge = (pattern: DemoTransaction['pattern']) => {
    switch (pattern) {
      case 'NORMAL':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      case 'PEELING':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'FAN-IN':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'FAN-OUT':
        return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'MIXING-LIKE':
        return 'bg-rose-500/10 text-rose-700 border-rose-500/20';
      case 'HIGH VELOCITY':
        return 'bg-[#FF4F00]/10 text-[#FF4F00] border-[#FF4F00]/20';
      case 'AMOUNT ANOMALY':
        return 'bg-pink-500/10 text-pink-700 border-pink-500/20';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRiskBadge = (level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-600 border border-rose-500/30';
      case 'HIGH':
        return 'bg-[#FF4F00]/15 text-[#FF4F00] border border-[#FF4F00]/30';
      case 'MEDIUM':
        return 'bg-amber-500/15 text-amber-700 border border-amber-500/30';
      case 'LOW':
        return 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/30';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#14E0A8] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#14E0A8]">
              UTXO FORENSIC REGISTRY • DETERMINISTIC DEMO
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#002A24] tracking-tight">
            Bitcoin Transaction Intelligence
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time multi-input, multi-output heuristic monitoring, peeling chain tracking, and network broadcast correlation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-600 border border-slate-200">
            {filteredTransactions.length} of {stats.total} Loaded
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Zap className="w-4 h-4 text-[#FF4F00]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Total Transactions</span>
          </div>
          <p className="text-2xl font-black text-[#002A24]">{stats.total}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Deterministic demo sample</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Total Observed Volume</span>
          </div>
          <p className="text-2xl font-black text-[#002A24]">{stats.totalVol.toFixed(2)} <span className="text-xs text-slate-400">BTC</span></p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Aggregated UTXO output</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <ShieldAlert className="w-4 h-4 text-[#FF4F00]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Anomalous / Flagged</span>
          </div>
          <p className="text-2xl font-black text-[#FF4F00]">{stats.anomalous}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {((stats.anomalous / stats.total) * 100).toFixed(1)}% anomalous patterns
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Radio className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Avg Mining Fee</span>
          </div>
          <p className="text-2xl font-black text-[#002A24]">{stats.avgFee.toFixed(5)} <span className="text-xs text-slate-400">BTC</span></p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Network congestion baseline</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TXID, wallet address, IP, pattern..."
            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#FF4F00] rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-[#002A24] outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pattern Filter */}
          <select
            value={patternFilter}
            onChange={(e) => setPatternFilter(e.target.value)}
            className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none cursor-pointer"
          >
            <option value="ALL">All Patterns</option>
            <option value="NORMAL">Normal</option>
            <option value="PEELING">Peeling</option>
            <option value="FAN-IN">Fan-In</option>
            <option value="FAN-OUT">Fan-Out</option>
            <option value="MIXING-LIKE">Mixing-Like</option>
            <option value="HIGH VELOCITY">High Velocity</option>
            <option value="AMOUNT ANOMALY">Amount Anomaly</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none cursor-pointer"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="CRITICAL">Critical (80+)</option>
            <option value="HIGH">High (70-79)</option>
            <option value="MEDIUM">Medium (50-69)</option>
            <option value="LOW">Low (&lt;50)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="FLAGGED">Flagged</option>
            <option value="ESCALATED">Escalated</option>
          </select>

          {(patternFilter !== 'ALL' || riskFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setPatternFilter('ALL');
                setRiskFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-xs font-bold text-[#FF4F00] hover:bg-slate-100 rounded-xl transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8FAFC] text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-3">Timestamp (UTC)</th>
                <th className="py-3.5 px-3">I / O</th>
                <th className="py-3.5 px-3 text-right">Amount BTC</th>
                <th className="py-3.5 px-3 text-right">Fee BTC</th>
                <th className="py-3.5 px-3 text-center">Risk</th>
                <th className="py-3.5 px-3">Pattern</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    No transactions match your current search and filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  return (
                    <tr
                      key={tx.txid}
                      onClick={() => setSelectedTx(tx)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* TXID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#002A24] group-hover:text-[#FF4F00] transition-colors">
                            {truncateHash(tx.txid, 8, 6)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(tx.txid);
                            }}
                            className="text-slate-300 hover:text-slate-600 p-0.5"
                            title="Copy TXID"
                          >
                            {copiedId === tx.txid ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                        {tx.timestamp.replace(' UTC', '')}
                      </td>

                      {/* I/O */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {tx.inputs} in → {tx.outputs} out
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-[#002A24] whitespace-nowrap">
                        {tx.amountBtc.toFixed(4)}
                      </td>

                      {/* Fee */}
                      <td className="py-3.5 px-3 text-right font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {tx.feeBtc.toFixed(5)}
                      </td>

                      {/* Risk */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black font-mono ${getRiskBadge(
                            getRiskLevel(tx.riskScore)
                          )}`}
                        >
                          {tx.riskScore}
                        </span>
                      </td>

                      {/* Pattern */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider border ${getPatternBadge(
                            tx.pattern
                          )}`}
                        >
                          {tx.pattern}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === 'FLAGGED'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : tx.status === 'ESCALATED'
                              ? 'bg-[#FF4F00]/10 text-[#FF4F00] border border-[#FF4F00]/20'
                              : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTx(tx);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-[#FF4F00] hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Slide-Over Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-[#002A24] text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#14E0A8] animate-pulse" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#14E0A8]">
                    UTXO TRANSACTION INSPECTOR
                  </span>
                </div>
                <h3 className="text-lg font-black mt-1">Transaction Deep Dive</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* TXID Banner */}
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Transaction Hash (TXID)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#002A24] break-all">
                    {selectedTx.txid}
                  </span>
                  <button
                    onClick={() => handleCopy(selectedTx.txid)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800"
                    title="Copy TXID"
                  >
                    {copiedId === selectedTx.txid ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Amount</span>
                  <p className="text-sm font-black text-[#002A24] mt-0.5">{selectedTx.amountBtc.toFixed(4)} BTC</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Fee</span>
                  <p className="text-sm font-black text-[#002A24] mt-0.5">{selectedTx.feeBtc.toFixed(5)} BTC</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Risk Score</span>
                  <p className="text-sm font-black text-[#FF4F00] mt-0.5">{selectedTx.riskScore}/100</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Pattern</span>
                  <p className="text-xs font-black text-[#002A24] mt-0.5 uppercase">{selectedTx.pattern}</p>
                </div>
              </div>

              {/* Inputs & Outputs Breakdown */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                  UTXO Semantics ({selectedTx.inputs} Inputs → {selectedTx.outputs} Outputs)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Inputs */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Inputs ({selectedTx.inputs})
                    </span>
                    <div className="space-y-2">
                      {[
                        { address: selectedTx.relatedWallets[0] || 'bc1qa0fa87eac1de3da717bcfdc46ebb04276a', value: Number((selectedTx.amountBtc + selectedTx.feeBtc).toFixed(4)) },
                        ...(selectedTx.inputs > 1 ? [{ address: selectedTx.relatedWallets[1] || 'bc1q9d8x64k084q2p0a6y0r8j2m6e4w1t9q7u3419c', value: 0.0500 }] : [])
                      ].slice(0, selectedTx.inputs).map((inp: { address: string; value: number }, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-bold text-slate-700 truncate max-w-[160px]" title={inp.address}>
                              {truncateHash(inp.address, 6, 4)}
                            </span>
                            <span className="font-mono font-bold text-[#002A24]">{inp.value.toFixed(4)} BTC</span>
                          </div>
                          {onSelectWallet && (
                            <button
                              onClick={() => {
                                onSelectWallet(inp.address);
                                setSelectedTx(null);
                              }}
                              className="text-[10px] font-bold text-[#FF4F00] hover:underline flex items-center gap-1"
                            >
                              <span>Investigate</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Outputs */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Outputs ({selectedTx.outputs})
                    </span>
                    <div className="space-y-2">
                      {selectedTx.relatedWallets.slice(1).length > 0
                        ? selectedTx.relatedWallets.slice(1).map((outAddr: string, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono font-bold text-slate-700 truncate max-w-[160px]" title={outAddr}>
                                  {truncateHash(outAddr, 6, 4)}
                                </span>
                                <span className="font-mono font-bold text-[#002A24]">
                                  {(selectedTx.amountBtc / Math.max(selectedTx.outputs, 1)).toFixed(4)} BTC
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono text-slate-400 uppercase">P2WPKH (Native SegWit)</span>
                                {onSelectWallet && (
                                  <button
                                    onClick={() => {
                                      onSelectWallet(outAddr);
                                      setSelectedTx(null);
                                    }}
                                    className="text-[10px] font-bold text-[#FF4F00] hover:underline flex items-center gap-1"
                                  >
                                    <span>Investigate</span>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        : (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-mono font-bold text-slate-700 truncate max-w-[160px]">
                                  {truncateHash(selectedTx.relatedWallets[0] || 'bc1qa0fa87eac1de3da717bcfdc46ebb04276a', 6, 4)}
                                </span>
                                <span className="font-mono font-bold text-[#002A24]">{selectedTx.amountBtc.toFixed(4)} BTC</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-mono text-slate-400 uppercase">P2WPKH (Native SegWit)</span>
                              </div>
                            </div>
                          )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Network Observation */}
              {selectedTx.broadcastingIp && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <h5 className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                      Correlated Network Broadcast
                    </h5>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Relay IP:</span>
                      <p className="font-mono font-bold text-[#002A24]">{selectedTx.broadcastingIp}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Autonomous System:</span>
                      <p className="font-mono font-bold text-[#002A24]">{selectedTx.asn || 'AS14061 (DigitalOcean)'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Jurisdiction:</span>
                      <p className="font-bold text-[#002A24]">{selectedTx.country || 'Netherlands (NL)'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Client Protocol:</span>
                      <p className="font-mono text-[11px] text-slate-600">Bitcoin Core / 26.0 (P2P)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Related Wallets Action Bar */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Investigation Conduits ({selectedTx.relatedWallets.length} Wallets)
                </span>
                <div className="space-y-2">
                  {selectedTx.relatedWallets.map((walletAddr: string) => (
                    <div
                      key={walletAddr}
                      className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                    >
                      <span className="font-mono text-xs font-bold text-[#002A24] truncate">
                        {walletAddr}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {onExploreInGraph && (
                          <button
                            onClick={() => {
                              onExploreInGraph(walletAddr);
                              setSelectedTx(null);
                            }}
                            className="px-2.5 py-1 bg-[#002A24] text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#FF4F00] transition-colors inline-flex items-center gap-1"
                          >
                            <Network className="w-3 h-3" />
                            <span>Graph</span>
                          </button>
                        )}
                        {onSelectWallet && (
                          <button
                            onClick={() => {
                              onSelectWallet(walletAddr);
                              setSelectedTx(null);
                            }}
                            className="px-2.5 py-1 bg-[#FF4F00] text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#e04500] transition-colors inline-flex items-center gap-1"
                          >
                            <span>Investigate</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                NIRIKSHAK UTXO ENGINE • 09 SEP 2026
              </span>
              <button
                onClick={() => setSelectedTx(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

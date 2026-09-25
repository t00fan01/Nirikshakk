import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  Copy,
  Download,
  FileText,
  Globe,
  Layers,
  Network,
  Search,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import { DEMO_REPORTS, DemoReport } from '../demo/demoDashboardData';

interface ReportsPageProps {
  onSelectWallet?: (walletAddress: string) => void;
  onExploreInGraph?: (walletAddress: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  onSelectWallet,
  onExploreInGraph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedReport, setSelectedReport] = useState<DemoReport | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredReports = useMemo(() => {
    return DEMO_REPORTS.filter((rpt) => {
      if (riskFilter !== 'ALL' && rpt.riskLevel !== riskFilter) return false;
      if (statusFilter !== 'ALL' && rpt.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mId = rpt.reportId.toLowerCase().includes(q);
        const mTitle = rpt.title.toLowerCase().includes(q);
        const mEntity = rpt.primaryEntity.toLowerCase().includes(q);
        const mSum = rpt.executiveSummary.toLowerCase().includes(q);
        return mId || mTitle || mEntity || mSum;
      }
      return true;
    });
  }, [searchQuery, riskFilter, statusFilter]);

  const getRiskBadge = (level: DemoReport['riskLevel']) => {
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
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F00] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF4F00]">
              FORENSIC CASEFILES & AUDIT REPORTS
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#002A24] tracking-tight">
            Investigation Intelligence Reports
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Compiled cyber-forensic dossiers, syndicate topologies, UTXO peeling audits, and cross-border law-enforcement packages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-600 border border-slate-200">
            {filteredReports.length} Reports Available
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <FileText className="w-4 h-4 text-[#002A24]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Total Reports</span>
          </div>
          <p className="text-2xl font-black text-[#002A24]">{DEMO_REPORTS.length}</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Automated ML + Analyst Audits</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <ShieldAlert className="w-4 h-4 text-[#FF4F00]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Critical / High Severity</span>
          </div>
          <p className="text-2xl font-black text-[#FF4F00]">4</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Actionable criminal intelligence</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Entities Cataloged</span>
          </div>
          <p className="text-2xl font-black text-[#002A24]">172</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Across 7 behavioral communities</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Primary Target Status</span>
          </div>
          <p className="text-2xl font-black text-[#002A24]">ACTIVE</p>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Dossier NIR-INV-0007 open</p>
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
            placeholder="Search report ID, title, entity, keyword..."
            className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-[#FF4F00] rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-[#002A24] outline-none"
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
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none cursor-pointer"
          >
            <option value="ALL">All Risk Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F8FAFC] border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="FINALIZED">Finalized</option>
            <option value="ACTIVE FORENSICS">Active Forensics</option>
            <option value="PENDING REVIEW">Pending Review</option>
          </select>

          {(riskFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setRiskFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-xs font-bold text-[#FF4F00] hover:bg-slate-100 rounded-xl transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredReports.map((report) => (
          <div
            key={report.reportId}
            onClick={() => setSelectedReport(report)}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#FF4F00]/50 transition-all p-6 flex flex-col justify-between cursor-pointer group"
          >
            <div className="space-y-4">
              {/* Top Meta Bar */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-black text-[#002A24] px-2.5 py-1 bg-slate-100 rounded-lg group-hover:bg-[#002A24] group-hover:text-white transition-colors">
                  {report.reportId}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${getRiskBadge(
                      report.riskLevel
                    )}`}
                  >
                    {report.riskLevel}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      report.status === 'ACTIVE FORENSICS'
                        ? 'bg-[#FF4F00]/10 text-[#FF4F00]'
                        : 'bg-emerald-500/10 text-emerald-700'
                    }`}
                  >
                    {report.status}
                  </span>
                </div>
              </div>

              {/* Title & Date */}
              <div>
                <h3 className="text-base font-black text-[#002A24] leading-snug group-hover:text-[#FF4F00] transition-colors">
                  {report.title}
                </h3>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{report.created}</span>
                </div>
              </div>

              {/* Summary Snippet */}
              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {report.executiveSummary}
              </p>

              {/* Primary Entity */}
              <div className="p-3 bg-[#F8FAFC] rounded-xl border border-slate-100">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                  Primary Subject
                </span>
                <span className="font-mono text-[11px] font-bold text-[#002A24] truncate block">
                  {report.primaryEntity}
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">
                {report.entitiesCount} Entities Mapped
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedReport(report);
                }}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#FF4F00] text-slate-700 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>Preview Report</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Report Preview Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 bg-[#002A24] text-white flex items-center justify-between sticky top-0 z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#14E0A8]/20 text-[#14E0A8] font-mono text-[10px] font-bold uppercase tracking-wider">
                    {selectedReport.reportId}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    Created: {selectedReport.created}
                  </span>
                </div>
                <h2 className="text-xl font-black">{selectedReport.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Demo export ready: ${selectedReport.reportId} — PDF generation available in production build.`)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Report</span>
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 flex-1">
              {/* Executive Summary */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-[#002A24] text-white rounded-2xl space-y-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#14E0A8]">
                    EXECUTIVE FORENSIC SUMMARY
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black font-mono ${getRiskBadge(
                      selectedReport.riskLevel
                    )}`}
                  >
                    {selectedReport.riskLevel} RISK TIER
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {selectedReport.executiveSummary}
                </p>
              </div>

              {/* Primary Investigated Entity */}
              <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Primary Target Subject
                  </span>
                  <div className="font-mono text-xs font-bold text-[#002A24] break-all mt-0.5">
                    {selectedReport.primaryEntity}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(selectedReport.primaryEntity)}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900"
                    title="Copy Address"
                  >
                    {copiedText === selectedReport.primaryEntity ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {selectedReport.primaryEntity.startsWith('bc1') && onSelectWallet && (
                    <button
                      onClick={() => {
                        onSelectWallet(selectedReport.primaryEntity);
                        setSelectedReport(null);
                      }}
                      className="px-3 py-1.5 bg-[#FF4F00] text-white rounded-xl text-xs font-bold hover:bg-[#e04500] transition-colors"
                    >
                      Investigate
                    </button>
                  )}
                  {selectedReport.primaryEntity.startsWith('bc1') && onExploreInGraph && (
                    <button
                      onClick={() => {
                        onExploreInGraph(selectedReport.primaryEntity);
                        setSelectedReport(null);
                      }}
                      className="px-3 py-1.5 bg-[#002A24] text-white rounded-xl text-xs font-bold hover:bg-[#FF4F00] transition-colors flex items-center gap-1"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Graph</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Risk Indicators */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                  Key Risk & Anomaly Indicators
                </h4>
                <div className="space-y-2">
                  {selectedReport.riskIndicators.map((ind, i) => (
                    <div
                      key={i}
                      className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-start gap-2.5 text-xs"
                    >
                      <AlertTriangle className="w-4 h-4 text-[#FF4F00] shrink-0 mt-0.5" />
                      <span className="text-slate-800 font-medium">{ind}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction Summary Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                  Transaction & Flow Metrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Volume</span>
                    <p className="text-sm font-black text-[#002A24] mt-0.5">{selectedReport.transactionSummary.volumeBtc}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Transaction Count</span>
                    <p className="text-sm font-black text-[#002A24] mt-0.5">{selectedReport.transactionSummary.txCount} txs</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Average Fee</span>
                    <p className="text-sm font-black text-[#002A24] mt-0.5">{selectedReport.transactionSummary.avgFee}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Suspicious Txs</span>
                    <p className="text-sm font-black text-[#FF4F00] mt-0.5">{selectedReport.transactionSummary.suspiciousCount}</p>
                  </div>
                </div>
              </div>

              {/* Network Correlations */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-700">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                    Network & P2P Telemetry Correlations
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Routing ASN:</span>
                    <p className="font-mono font-bold text-[#002A24] mt-0.5">{selectedReport.networkCorrelations.asn}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Broadcasting IPs:</span>
                    <p className="font-mono font-bold text-[#002A24] mt-0.5">
                      {selectedReport.networkCorrelations.ips.join(', ')}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Jurisdictions:</span>
                    <p className="font-bold text-[#002A24] mt-0.5">
                      {selectedReport.networkCorrelations.jurisdictions.join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Connected Entities */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                  Key Syndicate & Bridge Entities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedReport.connectedEntities.map((ent, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-mono font-bold text-[#002A24] transition-colors"
                    >
                      {ent}
                    </span>
                  ))}
                </div>
              </div>

              {/* Investigation Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                  Forensic Timeline Events
                </h4>
                <div className="space-y-2 border-l-2 border-slate-200 pl-4">
                  {selectedReport.timeline.map((evt, i) => (
                    <div key={i} className="text-xs space-y-0.5">
                      <span className="font-mono font-bold text-slate-400 text-[10px]">{evt.time}</span>
                      <p className="font-medium text-slate-700">{evt.event}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyst Notes */}
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                  Lead Forensic Analyst Notes
                </span>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {selectedReport.analystNotes}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                NIRIKSHAK INTELLIGENCE REPORT • CLASSIFIED CASEFILE
              </span>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

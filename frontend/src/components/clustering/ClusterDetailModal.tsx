import React, { useState, useEffect } from 'react';
import { X, Network, ArrowRight, Loader2, Copy, Check, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { api, ClusterDetailResponse, WalletClusterAssignment } from '../../lib/api';

interface ClusterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusterId: number;
  onInvestigateWallet?: (walletAddress: string) => void;
  onExploreInGraph?: (walletAddress: string) => void;
}

export const ClusterDetailModal: React.FC<ClusterDetailModalProps> = ({
  isOpen,
  onClose,
  clusterId,
  onInvestigateWallet,
  onExploreInGraph,
}) => {
  const [data, setData] = useState<ClusterDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'distance' | 'address'>('distance');
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const limit = 25;

  const fetchDetail = async (pageOffset = offset, sort = sortBy) => {
    if (clusterId === undefined || clusterId === null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getClusterDetail(clusterId, limit, pageOffset, sort);
      setData(res);
    } catch (err: unknown) {
      console.error('Failed to fetch cluster detail:', err);
      setError('Unable to retrieve cluster members and archetype metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setOffset(0);
      fetchDetail(0, sortBy);
    }
  }, [isOpen, clusterId, sortBy]);

  const handleNextPage = () => {
    if (!data) return;
    const nextOffset = offset + limit;
    if (nextOffset < data.total_wallets) {
      setOffset(nextOffset);
      fetchDetail(nextOffset, sortBy);
    }
  };

  const handlePrevPage = () => {
    const prevOffset = Math.max(0, offset - limit);
    setOffset(prevOffset);
    fetchDetail(prevOffset, sortBy);
  };

  const handleSortChange = (newSort: 'distance' | 'address') => {
    setSortBy(newSort);
    setOffset(0);
    fetchDetail(0, newSort);
  };

  const handleCopy = (addr: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr);
      setCopiedAddr(addr);
      setTimeout(() => setCopiedAddr(null), 2000);
    }
  };

  if (!isOpen) return null;

  const cluster = data?.cluster;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = data ? Math.ceil(data.total_wallets / limit) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#002A24] text-emerald-400 font-mono font-black text-sm flex items-center justify-center shadow-xs">
              C{clusterId}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Archetype Inspection
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {data ? `${data.total_wallets.toLocaleString()} total wallets` : 'Loading...'}
                </span>
              </div>
              <h3 className="text-lg font-black text-[#002A24] mt-0.5">
                {cluster?.label || `Cluster Archetype C${clusterId}`}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Archetype Macro Summary */}
        {cluster && (
          <div className="p-5 bg-gradient-to-r from-emerald-50/40 via-teal-50/20 to-slate-50 border-b border-slate-100 space-y-3">
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {cluster.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
              <span className="text-[11px] text-slate-500">
                Avg Risk: <strong className="text-[#FF4F00]">{cluster.average_risk_score.toFixed(1)}/100</strong>
              </span>
              <span className="text-[11px] text-slate-500">
                Anomaly Rate: <strong className="text-[#002A24]">{(cluster.anomaly_rate * 100).toFixed(1)}%</strong>
              </span>
              <span className="text-[11px] text-slate-500">
                Mean Centroid Distance: <strong className="text-emerald-700">{cluster.centroid_distance_mean.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Member Table Control Bar */}
        <div className="px-6 py-3 bg-slate-50/90 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Sort By:
            </span>
            <button
              onClick={() => handleSortChange('distance')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                sortBy === 'distance'
                  ? 'bg-[#002A24] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Centroid Distance (Asc)
            </button>
            <button
              onClick={() => handleSortChange('address')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                sortBy === 'address'
                  ? 'bg-[#002A24] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Wallet Address
            </button>
          </div>

          {/* Pagination Controls */}
          {data && data.total_wallets > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-slate-600 font-mono">
              <span>
                {offset + 1}–{Math.min(offset + limit, data.total_wallets)} of {data.total_wallets.toLocaleString()}
              </span>
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={handlePrevPage}
                  disabled={offset === 0 || loading}
                  className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold px-1">{currentPage}/{totalPages}</span>
                <button
                  onClick={handleNextPage}
                  disabled={offset + limit >= data.total_wallets || loading}
                  className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Body / Member Wallets Table */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                Loading Cluster Members...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
              <p className="text-xs font-bold text-rose-800">{error}</p>
              <button
                onClick={() => fetchDetail(offset, sortBy)}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : !data || data.wallets.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No wallets found in this cluster.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.wallets.map((wallet: WalletClusterAssignment, idx: number) => (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-[#002A24] break-all select-all">
                        {wallet.wallet_address}
                      </span>
                      <button
                        onClick={() => handleCopy(wallet.wallet_address)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                        title="Copy address"
                      >
                        {copiedAddr === wallet.wallet_address ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                      <span>Centroid Distance: <strong className="text-emerald-700">{wallet.distance_to_centroid.toFixed(4)}</strong></span>
                      <span>PCA: ({wallet.pca_x.toFixed(2)}, {wallet.pca_y.toFixed(2)})</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {onInvestigateWallet && (
                      <button
                        onClick={() => {
                          onClose();
                          onInvestigateWallet(wallet.wallet_address);
                        }}
                        className="px-3 py-1.5 bg-[#FF4F00] hover:bg-[#e04500] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {onExploreInGraph && (
                      <button
                        onClick={() => {
                          onClose();
                          onExploreInGraph(wallet.wallet_address);
                        }}
                        className="px-3 py-1.5 bg-[#002A24] hover:bg-[#003830] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        title="View 1-hop neighborhood in 3D Graph"
                      >
                        <Network className="w-3.5 h-3.5 text-emerald-400" />
                        <span>3D Graph</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Backend pagination: {limit} records per page.</span>
          <span className="font-mono text-slate-400">Cluster members only</span>
        </div>
      </div>
    </div>
  );
};

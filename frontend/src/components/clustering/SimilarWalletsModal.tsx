import React, { useState, useEffect } from 'react';
import { X, Sparkles, Network, ArrowRight, Loader2, Copy, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { api, SimilarWalletsResponse, SimilarWallet } from '../../lib/api';

interface SimilarWalletsModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  onInvestigateWallet?: (walletAddress: string) => void;
  onExploreInGraph?: (walletAddress: string) => void;
}

export const SimilarWalletsModal: React.FC<SimilarWalletsModalProps> = ({
  isOpen,
  onClose,
  walletId,
  onInvestigateWallet,
  onExploreInGraph,
}) => {
  const [topN, setTopN] = useState<number>(5);
  const [data, setData] = useState<SimilarWalletsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const cleanWallet = (walletId || '').replace(/^wallet:/, '').trim();

  const fetchSimilar = async (count = topN) => {
    if (!cleanWallet) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSimilarWallets(cleanWallet, count);
      setData(res);
    } catch (err: unknown) {
      console.error('Failed to fetch similar wallets:', err);
      setError('Unable to retrieve similar wallets for this entity.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSimilar(topN);
    }
  }, [isOpen, cleanWallet, topN]);

  const handleCopy = (addr: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr);
      setCopiedAddr(addr);
      setTimeout(() => setCopiedAddr(null), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Cosine Similarity Engine
                </span>
                <span className="text-[10px] font-mono text-slate-400">22 Scaled Features</span>
              </div>
              <h3 className="text-lg font-black text-[#002A24] mt-0.5">
                Behaviorally Similar Wallets
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

        {/* Query Controls Bar */}
        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold text-[11px] uppercase tracking-wider">Candidate Count:</span>
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                className={`px-3 py-1 rounded-lg font-mono font-bold text-xs transition-colors ${
                  topN === n
                    ? 'bg-[#002A24] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono text-slate-500 truncate max-w-[280px]">
            Target: <span className="font-bold text-[#002A24]">{cleanWallet}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-black uppercase tracking-wider text-[#002A24]">
                Computing Multi-Dimensional Feature Similarity...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
              <p className="text-xs font-bold text-rose-800">{error}</p>
              <button
                onClick={() => fetchSimilar(topN)}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : !data || data.similar_wallets.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              No behaviorally similar wallets found for this address.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.similar_wallets.map((wallet: SimilarWallet, idx: number) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          {wallet.similarity_percent.toFixed(1)}% Match
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          (Cosine: {wallet.similarity_score.toFixed(4)})
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                          C{wallet.cluster_id} • {wallet.cluster_label}
                        </span>
                      </div>

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

                  {/* Shared Traits Chips */}
                  {wallet.shared_behavioral_traits && wallet.shared_behavioral_traits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {wallet.shared_behavioral_traits.map((trait, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600"
                        >
                          ✓ {trait}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-6 py-3 bg-[#F8FAFC] border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Similarity calculated on 22 independent normalized behavioral dimensions.</span>
          <span className="font-mono text-slate-400">Deterministic metric</span>
        </div>
      </div>
    </div>
  );
};

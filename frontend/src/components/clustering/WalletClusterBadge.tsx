import React from 'react';
import { Layers, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { WalletClusterDetailResponse } from '../../lib/api';

interface WalletClusterBadgeProps {
  clusterData: WalletClusterDetailResponse | null;
  loading: boolean;
  error: string | null;
  onOpenSimilar: () => void;
  onOpenClusterDetail: () => void;
}

export const WalletClusterBadge: React.FC<WalletClusterBadgeProps> = ({
  clusterData,
  loading,
  error,
  onOpenSimilar,
  onOpenClusterDetail,
}) => {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl animate-pulse">
        <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-slate-200 rounded" />
          <div className="h-2.5 w-44 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !clusterData) {
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-50/90 border border-slate-200/70 rounded-2xl text-[11px] text-slate-500 font-medium">
        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Behavioral cluster: Unassigned or outside analytical baseline</span>
      </div>
    );
  }

  const { cluster_id, cluster_label, distance_to_centroid } = clusterData;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-200/70 rounded-2xl shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#002A24] text-emerald-400 font-mono font-black text-xs flex items-center justify-center shadow-sm">
          C{cluster_id}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
              Behavioral Archetype
            </span>
            <span className="text-[11px] font-mono text-slate-500 font-bold">
              Dist: {distance_to_centroid.toFixed(2)}
            </span>
          </div>
          <p className="text-xs md:text-sm font-black text-[#002A24] mt-0.5">
            {cluster_label}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSimilar}
          className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
          title="Find wallets with nearest behavioral feature vectors"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Similar Wallets</span>
        </button>

        <button
          onClick={onOpenClusterDetail}
          className="px-3 py-1.5 bg-[#002A24] hover:bg-[#003830] text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
          title="Inspect full cluster archetype metrics and members"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Explore Cluster</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { Layers, Sparkles, TrendingUp, Crosshair, ArrowRight, Loader2, Info } from 'lucide-react';
import { WalletClusterDetailResponse } from '../../lib/api';

interface WalletClusterProfileSectionProps {
  clusterData: WalletClusterDetailResponse | null;
  loading: boolean;
  error: string | null;
  onOpenSimilar: () => void;
  onOpenClusterDetail: () => void;
}

export const WalletClusterProfileSection: React.FC<WalletClusterProfileSectionProps> = ({
  clusterData,
  loading,
  error,
  onOpenSimilar,
  onOpenClusterDetail,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 animate-pulse">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl mx-auto flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
        <h4 className="text-sm font-black uppercase tracking-wider text-[#002A24]">
          Loading Behavioral Cluster Intelligence...
        </h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Resolving statistical archetype centroids and multi-dimensional feature representations.
        </p>
      </div>
    );
  }

  if (error || !clusterData) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-4">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-400">
          <Info className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-black uppercase tracking-wider text-[#002A24]">
          Behavioral Profile Unavailable
        </h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          {error || 'Behavioral clustering is not available for this entity (outside the normalized analytical population).'}
        </p>
      </div>
    );
  }

  const { cluster_id, cluster_label, distance_to_centroid, pca_x, pca_y, cluster_profile } = clusterData;

  return (
    <section className="space-y-6">
      {/* Archetype Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#002A24] text-emerald-400 font-mono">
                Cluster Archetype C{cluster_id}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Unsupervised K-Means (K=6)
              </span>
            </div>
            <h3 className="text-xl font-black text-[#002A24] tracking-tight">
              {cluster_label}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenSimilar}
              className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-2 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Find Similar Wallets</span>
            </button>
            <button
              onClick={onOpenClusterDetail}
              className="px-4 py-2 bg-[#002A24] hover:bg-[#003830] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-2 shadow-xs"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Explore Archetype Members</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Narrative Description */}
        <div className="p-6 space-y-4">
          <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
            {cluster_profile.description}
          </p>

          {/* Differentiating Traits Badges */}
          {cluster_profile.top_differentiating_features && cluster_profile.top_differentiating_features.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Key Measured Traits & Population Deviations:
              </span>
              <div className="flex flex-wrap gap-2">
                {cluster_profile.top_differentiating_features.map((trait, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200/80"
                  >
                    • {trait}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Statistical Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 border-t border-slate-100 bg-[#F8FAFC]/50 text-center">
          <div className="p-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Archetype Population
            </span>
            <span className="text-xl font-black text-[#002A24]">
              {cluster_profile.wallet_count.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">member wallets</span>
          </div>

          <div className="p-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Avg Cluster Risk
            </span>
            <span className="text-xl font-black text-[#FF4F00]">
              {cluster_profile.average_risk_score.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">/ 100 population</span>
          </div>

          <div className="p-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Anomaly Rate
            </span>
            <span className="text-xl font-black text-[#002A24]">
              {(cluster_profile.anomaly_rate * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Isolation Forest flagged</span>
          </div>

          <div className="p-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Centroid Distance
            </span>
            <span className="text-xl font-black text-emerald-700">
              {distance_to_centroid.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              mean: {cluster_profile.centroid_distance_mean.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Spatial Coordinates & Centroid Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <Crosshair className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                2D PCA Spatial Coordinates
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              Principal Components
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono text-center">
              <span className="text-[10px] text-slate-400 block">Component X</span>
              <span className="text-base font-black text-[#002A24]">{pca_x.toFixed(4)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono text-center">
              <span className="text-[10px] text-slate-400 block">Component Y</span>
              <span className="text-base font-black text-[#002A24]">{pca_y.toFixed(4)}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Projected coordinates from the 22-dimensional RobustScaled behavioral feature matrix.
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400">
              <TrendingUp className="w-4 h-4 text-[#FF4F00]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Centroid Distance Position
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              Euclidean Metric
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">Wallet to Centroid</span>
              <span className="font-mono text-emerald-700">{distance_to_centroid.toFixed(4)}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(10, (distance_to_centroid / (cluster_profile.centroid_distance_mean * 2 || 1)) * 100))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
              <span>Cluster Core</span>
              <span>Median: {cluster_profile.centroid_distance_median.toFixed(2)}</span>
              <span>Periphery</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Wallets closer to 0 represent typical archetype behavior; higher distances indicate peripheral variance.
          </p>
        </div>
      </div>
    </section>
  );
};

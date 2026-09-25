import React, { useRef } from 'react';
import { Terminal, ShieldAlert, Activity, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DEMO_INVESTIGATION_ACTIVITIES, InvestigationActivityEvent } from '../demo/demoInvestigationActivity';

interface LiveThreatFeedProps {
  onSelectWallet?: (wallet: string) => void;
  onExploreInGraph?: (entity: string) => void;
}

const severityConfig = {
  CRITICAL: {
    bg: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
    text: 'text-rose-400',
  },
  HIGH: {
    bg: 'bg-[#FF4F00]/15 text-[#FF4F00] border-[#FF4F00]/30',
    dot: 'bg-[#FF4F00] shadow-[0_0_8px_rgba(255,79,0,0.6)]',
    text: 'text-[#FF4F00]',
  },
  MEDIUM: {
    bg: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    text: 'text-amber-400',
  },
  INFO: {
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    text: 'text-emerald-400',
  },
};

const LiveThreatFeed: React.FC<LiveThreatFeedProps> = ({
  onSelectWallet,
  onExploreInGraph,
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleEntityClick = (evt: InvestigationActivityEvent) => {
    const target = evt.targetWallet || (evt.entity?.startsWith('bc1q') ? evt.entity : undefined);
    if (target) {
      if (onSelectWallet) {
        onSelectWallet(target);
      } else {
        navigate(`/dashboard?account=${encodeURIComponent(target)}`);
      }
    } else if (evt.entity && onExploreInGraph) {
      onExploreInGraph(evt.entity);
    }
  };

  return (
    <div className="bg-[#001411]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col relative overflow-hidden group">
      {/* Background cyber grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#14E0A8_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      {/* Header Strip */}
      <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(20,224,168,0.8)]" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#FF4F00]" />
                INVESTIGATION ACTIVITY
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-mono font-bold tracking-wider border border-emerald-500/30">
                LIVE FORENSIC TIMELINE
              </span>
            </div>
            <p className="text-[10px] text-white/40 font-mono tracking-wider mt-0.5">
              12 DETERMINISTIC TELEMETRY & LINK-ANALYSIS MILESTONES
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-emerald-400 font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#FF4F00] animate-pulse" />
            DEMO ANALYSIS ACTIVE
          </span>
        </div>
      </div>

      {/* Timeline Stream */}
      <div
        ref={scrollRef}
        className="max-h-[340px] overflow-y-auto space-y-2.5 pr-2 relative z-10 custom-scrollbar scroll-smooth"
      >
        {DEMO_INVESTIGATION_ACTIVITIES.map((evt, idx) => {
          const cfg = severityConfig[evt.severity] || severityConfig.INFO;
          const isClickable = !!evt.targetWallet || (evt.entity?.startsWith('bc1q'));

          return (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.2 }}
              onClick={() => handleEntityClick(evt)}
              className={`p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/15 transition-all text-left group/item flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isClickable ? 'cursor-pointer hover:shadow-lg' : ''
              }`}
            >
              {/* Left Column: Timestamp & Type */}
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <span className="font-mono text-[10px] text-white/40 font-bold tracking-wider">
                    {evt.time}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider border ${cfg.bg}`}
                    >
                      {evt.badgeLabel}
                    </span>
                    <h5 className="text-xs font-bold text-white tracking-wide truncate">
                      {evt.title}
                    </h5>
                  </div>
                  <p className="text-[11px] text-white/60 font-medium leading-relaxed mt-0.5 line-clamp-2">
                    {evt.description}
                  </p>
                </div>
              </div>

              {/* Right Column: Entity Chip */}
              {evt.entity && (
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="font-mono text-[10px] font-bold text-white/80 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 group-hover/item:border-[#FF4F00]/50 transition-colors flex items-center gap-1.5">
                    {evt.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-3 h-3 text-rose-500" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#14E0A8]" />
                    )}
                    <span className="truncate max-w-[170px]">{evt.entity}</span>
                    {isClickable && (
                      <ChevronRight className="w-3 h-3 text-white/40 group-hover/item:text-[#FF4F00] transition-colors" />
                    )}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveThreatFeed;

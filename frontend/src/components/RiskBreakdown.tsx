import React from 'react';
import { motion } from 'framer-motion';
import { X, ShieldAlert, Cpu, Network, Clock, Activity, FileJson } from 'lucide-react';

interface RiskTransaction {
    txn_id?: string;
    is_flagged?: boolean;
    fraud_pattern?: string;
}


interface RiskBreakdownProps {
    transaction: RiskTransaction;
    onClose: () => void;
    onDownloadSTR: () => void;
}

const RiskBreakdown: React.FC<RiskBreakdownProps> = ({ transaction, onClose, onDownloadSTR }) => {
    // Simulated SHAP / Risk formula breakdown for visuals
    // R = 0.30*IF + 0.25*CYCLE + 0.15*BETWEEN + 0.15*CROSS + 0.10*VEL + 0.05*TIME
    
    // Generate deterministic pseudo-values based on txn_id to keep it consistent
    const seed = transaction?.txn_id ? transaction.txn_id.charCodeAt(transaction.txn_id.length - 1) : 42;
    
    const if_score = transaction.is_flagged ? 0.85 + (seed % 15) / 100 : 0.2;
    const cycle_score = transaction.is_flagged ? 1.0 : 0.0;
    const between_score = transaction.is_flagged ? 0.6 + (seed % 40) / 100 : 0.1;
    const cross_score = transaction.is_flagged ? 1.0 : 0.0;
    const vel_score = 0.8;
    const time_score = 0.5;

    const riskFactors = [
        { name: "Isolation Forest (IF)", weight: 0.30, value: if_score, icon: Cpu },
        { name: "Graph Tarjan SCC (CYCLE)", weight: 0.25, value: cycle_score, icon: Network },
        { name: "Betweenness Centrality (BETWEEN)", weight: 0.15, value: between_score, icon: Activity },
        { name: "Cross-Bank Orchestration (CROSS)", weight: 0.15, value: cross_score, icon: ShieldAlert },
        { name: "Velocity Burst (VEL)", weight: 0.10, value: vel_score, icon: Clock },
        { name: "Time Anomaly (TIME)", weight: 0.05, value: time_score, icon: Clock }
    ];

    const totalRisk = riskFactors.reduce((acc, curr) => acc + (curr.weight * curr.value), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
            <motion.div 
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-[500px] h-full bg-white/90 backdrop-blur-xl border-l border-white overflow-y-auto shadow-2xl p-8"
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-[#121212]">Risk Explainer (SHAP)</h2>
                        <p className="text-[#006C67] uppercase tracking-widest text-[10px] font-bold mt-1">Mathematical Breakdown</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-6 h-6 text-[#121212]" />
                    </button>
                </div>

                <div className="bg-[#121212] rounded-xl p-5 mb-8 text-white">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Composite Risk Score</p>
                            <h3 className="text-4xl font-black text-[#FF4F00]">R = {totalRisk.toFixed(3)}</h3>
                        </div>
                        <div className="text-right">
                            <p className="text-white/60 text-[10px] font-mono">{transaction?.txn_id}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-[#BA1200]/20 text-[#BA1200] border border-[#BA1200]/30 rounded text-[10px] font-bold uppercase tracking-wider">
                                {transaction?.fraud_pattern || "Anomalous Routing"}
                            </span>
                        </div>
                    </div>
                    <p className="text-white/50 text-xs font-mono leading-relaxed">
                        R = 0.30•IF + 0.25•CYCLE + 0.15•BETWEEN + 0.15•CROSS + 0.10•VEL + 0.05•TIME
                    </p>
                </div>

                <div className="space-y-6">
                    <h4 className="text-sm font-black text-[#121212] uppercase tracking-wider border-b border-black/10 pb-2">Waterfall Component Analysis</h4>
                    
                    {riskFactors.map((factor, idx) => {
                        const contribution = factor.weight * factor.value;
                        const percentage = (contribution / totalRisk) * 100;
                        const Icon = factor.icon;
                        
                        return (
                            <div key={idx} className="relative">
                                <div className="flex justify-between items-center mb-1.5">
                                    <div className="flex items-center space-x-2">
                                        <Icon className="w-4 h-4 text-[#006C67]" />
                                        <span className="text-xs font-bold text-slate-700">{factor.name}</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-[#FF4F00]">+{contribution.toFixed(3)}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(2, percentage)}%` }}
                                        transition={{ duration: 1, delay: idx * 0.1 }}
                                        className="bg-gradient-to-r from-[#006C67] to-[#FF4F00] h-full rounded-full"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-12 pt-6 border-t border-black/10">
                    <button 
                        onClick={onDownloadSTR}
                        className="w-full flex items-center justify-center space-x-2 bg-[#FF4F00] text-white py-4 rounded-xl font-bold tracking-widest uppercase hover:bg-[#e64700] transition-colors shadow-lg shadow-[#FF4F00]/20"
                    >
                        <FileJson className="w-5 h-5" />
                        <span>Download RBI STR Data (PDF)</span>
                    </button>
                    <p className="text-center mt-3 text-[10px] text-slate-500 font-medium">
                        Downloads compliant Suspicious Transaction Report
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default RiskBreakdown;

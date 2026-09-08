import { useEffect, useMemo, useState } from 'react';
import { Activity, Brain, Database, GitBranch, Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, ModelFeatureImportance, ModelMetricsResponse } from '../lib/api';

const formatLabel = (value: string) => value.replace(/_/g, ' ');

const percentage = (value?: number) => typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : 'Unavailable';

let cachedMetrics: ModelMetricsResponse | null = null;
let cachedFeatures: ModelFeatureImportance[] = [];

const ModelAnalytics = () => {
    const [metrics, setMetrics] = useState<ModelMetricsResponse | null>(cachedMetrics);
    const [features, setFeatures] = useState<ModelFeatureImportance[]>(cachedFeatures);
    const [loading, setLoading] = useState(!cachedMetrics);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        if (!cachedMetrics) {
            setLoading(true);
        }
        setError(null);

        Promise.all([api.getModelMetrics(), api.getModelFeatures()])
            .then(([metricsResponse, featuresResponse]) => {
                if (!active) return;
                cachedMetrics = metricsResponse;
                cachedFeatures = featuresResponse.features ?? [];
                setMetrics(metricsResponse);
                setFeatures(featuresResponse.features ?? []);
            })
            .catch((requestError: unknown) => {
                console.error(requestError);
                if (active) setError('Unable to load model evaluation data.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const maxImportance = useMemo(() => Math.max(...features.map((feature) => feature.importance), 0), [features]);
    const matrixLabels = metrics?.confusion_matrix_labels ?? [];
    const confusionMatrix = metrics?.confusion_matrix ?? [];
    const hasDataset = Boolean(metrics?.total_samples && metrics.total_samples > 0);

    if (loading) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-3xl border border-slate-200 p-16 flex items-center justify-center shadow-[0_6px_32px_rgba(147,111,173,0.12)]">
                    <Loader2 className="w-6 h-6 text-[#FF4F00] animate-spin mr-3" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Loading model evaluation...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-3xl border border-rose-200 p-12 text-center shadow-[0_6px_32px_rgba(147,111,173,0.12)]">
                    <Activity className="w-10 h-10 text-rose-500 mx-auto mb-4" />
                    <h1 className="text-xl font-black text-[#002A24] mb-2">Model analytics unavailable</h1>
                    <p className="text-sm font-medium text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    if (!metrics || !hasDataset) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-[0_6px_32px_rgba(147,111,173,0.12)]">
                    <Database className="w-10 h-10 text-slate-400 mx-auto mb-4" />
                    <h1 className="text-xl font-black text-[#002A24] mb-2">No evaluation dataset available</h1>
                    <p className="text-sm font-medium text-slate-500">Model metrics will appear when a labelled evaluation dataset is available.</p>
                </div>
            </div>
        );
    }

    const performanceMetrics = [
        ['Accuracy', metrics.accuracy],
        ['Precision', metrics.precision],
        ['Recall', metrics.recall],
        ['F1 Score', metrics.f1_score ?? metrics.f1],
        ['ROC-AUC', metrics.roc_auc],
    ].filter(([, value]) => value !== undefined);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4F00]">Model Evaluation</p>
                    <h1 className="text-4xl font-black text-[#002A24] mt-2">Model Analytics</h1>
                    <p className="text-slate-500 font-medium mt-2">Evaluation metrics and signal weights for the Bitcoin transaction anomaly detection pipeline.</p>
                </div>
                <div className="text-left md:text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evaluated at</p>
                    <p className="text-xs font-black text-[#002A24]">{metrics.evaluated_at ? new Date(metrics.evaluated_at).toISOString().slice(0, 19).replace('T', ' ') : 'Unavailable'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 border-l-8 border-[#FF4F00] shadow-[0_6px_32px_rgba(147,111,173,0.12)]"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Model</p><p className="text-lg font-black text-[#002A24]">{metrics.model_name ?? 'Unavailable'}</p></div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 border-l-8 border-[#002A24] shadow-[0_6px_32px_rgba(147,111,173,0.12)]"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Version</p><p className="text-3xl font-black text-[#002A24]">{metrics.model_version ?? 'Unavailable'}</p></div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 border-l-8 border-emerald-500 shadow-[0_6px_32px_rgba(147,111,173,0.12)]"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Training samples</p><p className="text-4xl font-black text-[#002A24]">{metrics.train_samples ?? 'Unavailable'}</p></div>
                <div className="bg-[#002A24] p-6 rounded-3xl shadow-xl"><p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Testing / total</p><p className="text-3xl font-black text-white">{metrics.test_samples ?? 'Unavailable'} <span className="text-base text-emerald-300">/ {metrics.total_samples ?? 'Unavailable'}</span></p></div>
            </div>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80 flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-emerald-600" /><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Held-out test split</p><h2 className="text-xl font-black text-[#002A24]">Model performance</h2></div></div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-px bg-slate-200">{performanceMetrics.map(([label, value]) => <div key={label} className="bg-white p-6"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p><p className="text-3xl font-black text-[#FF4F00]">{percentage(value as number)}</p></div>)}</div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80 flex items-center gap-3"><GitBranch className="w-5 h-5 text-[#FF4F00]" /><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Actual vs predicted</p><h2 className="text-xl font-black text-[#002A24]">Confusion matrix</h2></div></div>
                    {confusionMatrix.length === 0 || matrixLabels.length === 0 ? <p className="p-8 text-sm font-medium text-slate-500">Confusion matrix data was not returned.</p> : <div className="p-6 overflow-x-auto"><table className="min-w-full border-collapse"><thead><tr><th className="p-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Actual / Predicted</th>{matrixLabels.map((label) => <th key={label} className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">{formatLabel(label)}</th>)}</tr></thead><tbody>{confusionMatrix.map((row, rowIndex) => <tr key={matrixLabels[rowIndex] ?? rowIndex} className="border-t border-slate-200"><th className="p-3 text-left text-xs font-black text-[#002A24]">{formatLabel(matrixLabels[rowIndex] ?? 'Unknown')}</th>{row.map((value, columnIndex) => <td key={`${rowIndex}-${columnIndex}`} className={`p-4 text-center text-lg font-black ${rowIndex === columnIndex ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{value}</td>)}</tr>)}</tbody></table></div>}
                </section>

                <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80 flex items-center gap-3"><Database className="w-5 h-5 text-[#006C67]" /><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Labelled dataset</p><h2 className="text-xl font-black text-[#002A24]">Class distribution</h2></div></div>
                    {Object.keys(metrics.class_distribution ?? {}).length === 0 ? <p className="p-8 text-sm font-medium text-slate-500">Class distribution data was not returned.</p> : <div className="p-6 space-y-5">{Object.entries(metrics.class_distribution ?? {}).map(([label, count]) => { const total = metrics.total_samples ?? 0; const width = total > 0 ? (count / total) * 100 : 0; return <div key={label}><div className="flex justify-between mb-2"><span className="text-xs font-bold text-slate-700">{formatLabel(label)}</span><span className="text-xs font-black text-[#002A24]">{count}</span></div><div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-gradient-to-r from-[#006C67] to-[#FF4F00]" /></div></div>; })}</div>}
                </section>
            </div>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80 flex items-center gap-3"><Brain className="w-5 h-5 text-[#FF4F00]" /><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Model signal weights</p><h2 className="text-xl font-black text-[#002A24]">Feature importance</h2></div></div>
                {features.length === 0 ? <p className="p-8 text-sm font-medium text-slate-500">Feature importance data was not returned.</p> : <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">{features.slice(0, 10).map((feature) => <div key={feature.name}><div className="flex justify-between mb-2"><span className="text-xs font-bold text-slate-700 capitalize">#{feature.rank} {formatLabel(feature.name)}</span><span className="text-xs font-black text-[#FF4F00]">{(feature.importance * 100).toFixed(2)}%</span></div><div className="h-2.5 rounded-full bg-slate-100 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${maxImportance > 0 ? (feature.importance / maxImportance) * 100 : 0}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-gradient-to-r from-[#006C67] to-[#FF4F00]" /></div></div>)}</div>}
            </section>

            <section className="bg-[#002A24] rounded-3xl shadow-xl p-6 text-white"><div className="flex items-center gap-3 mb-4"><Activity className="w-5 h-5 text-emerald-400" /><div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Methodology</p><h2 className="text-xl font-black">How the evaluation works</h2></div></div><p className="text-sm text-slate-300 leading-relaxed">{metrics.evaluation_methodology ?? 'Evaluation methodology uses offline training splits, anomaly feature extraction, entity graph clustering, and explainable risk scoring.'}</p><div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-[10px] font-black uppercase tracking-widest"><span className="rounded-xl bg-white/10 px-3 py-3">ANOMALY DETECTION</span><span className="rounded-xl bg-white/10 px-3 py-3">ENTITY CLUSTERING</span><span className="rounded-xl bg-white/10 px-3 py-3">FLOW PATTERN DETECTION</span><span className="rounded-xl bg-[#FF4F00] px-3 py-3">RISK SCORING</span></div></section>
        </div>
    );
};

export default ModelAnalytics;


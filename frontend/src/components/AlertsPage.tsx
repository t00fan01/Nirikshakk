import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, Loader2, Search, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api, AlertRecord } from '../lib/api';

const formatDate = (value?: string) => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 19).replace('T', ' ');
};

const severityStyle = (severity?: string) => severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : severity === 'HIGH' ? 'bg-[#FF4F00]/10 text-[#FF4F00]' : severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700';

let cachedAlerts: AlertRecord[] = [];

const AlertsPage = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<AlertRecord[]>(cachedAlerts);
    const [loading, setLoading] = useState(cachedAlerts.length === 0);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [severity, setSeverity] = useState('ALL');
    const [status, setStatus] = useState('ALL');
    const [classification, setClassification] = useState('ALL');

    useEffect(() => {
        let active = true;
        const loadAlerts = async (force = false) => {
            if (!force && document.visibilityState === 'hidden') return;
            try {
                const nextAlerts = await api.getAlerts();
                if (active) {
                    cachedAlerts = nextAlerts;
                    setAlerts(nextAlerts);
                    setError(null);
                }
            } catch (requestError: unknown) {
                console.error(requestError);
                if (active) setError('Unable to load alerts.');
            } finally {
                if (active) setLoading(false);
            }
        };

        if (cachedAlerts.length === 0) {
            setLoading(true);
        }
        loadAlerts(true);
        const interval = window.setInterval(loadAlerts, 5000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, []);

    const filteredAlerts = useMemo(() => alerts.filter((alert) => {
        const haystack = [alert.alert_id, alert.account_id, alert.classification, alert.alert_type, alert.reason].filter(Boolean).join(' ').toLowerCase();
        return (!search || haystack.includes(search.toLowerCase()))
            && (severity === 'ALL' || alert.severity === severity)
            && (status === 'ALL' || alert.status === status)
            && (classification === 'ALL' || alert.classification === classification);
    }), [alerts, classification, search, severity, status]);

    const activeAlerts = alerts.filter((alert) => !['RESOLVED', 'DISMISSED'].includes(alert.status ?? '')).length;
    const criticalAlerts = alerts.filter((alert) => alert.severity === 'CRITICAL').length;
    const highAlerts = alerts.filter((alert) => alert.severity === 'HIGH').length;
    const mediumAlerts = alerts.filter((alert) => alert.severity === 'MEDIUM').length;
    const resolvedAlerts = alerts.filter((alert) => alert.status === 'RESOLVED').length;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4F00]">Detection Operations</p>
                <h1 className="text-4xl font-black text-[#002A24] mt-2">Alerts</h1>
                <p className="text-slate-500 font-medium mt-2">Backend-generated detection events requiring analyst review.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5">
                {[['Active alerts', activeAlerts, '#FF4F00'], ['Critical', criticalAlerts, '#BA1200'], ['High', highAlerts, '#FF4F00'], ['Medium', mediumAlerts, '#E2A13B'], ['Resolved', resolvedAlerts, '#006C67']].map(([label, value, color]) => <div key={String(label)} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)]" style={{ borderLeft: `8px solid ${color}` }}><p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p><p className="text-4xl font-black text-[#002A24]">{value}</p></div>)}
            </div>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-[#F8FAFC]/80 flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
                    <div className="flex items-center gap-3"><BellRing className="w-5 h-5 text-[#FF4F00]" /><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alert review queue</p><h2 className="text-xl font-black text-[#002A24]">Detection events</h2></div></div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alerts or wallets" className="w-full sm:w-64 bg-white border border-slate-200 focus:border-[#FF4F00] rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-[#002A24] outline-none" /></div>
                        <select value={severity} onChange={(event) => setSeverity(event.target.value)} className="bg-white border border-slate-200 focus:border-[#FF4F00] rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none"><option value="ALL">All severities</option><option value="CRITICAL">Critical</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></select>
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-white border border-slate-200 focus:border-[#FF4F00] rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none"><option value="ALL">All statuses</option><option value="NEW">New</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option></select>
                        <select value={classification} onChange={(event) => setClassification(event.target.value)} className="bg-white border border-slate-200 focus:border-[#FF4F00] rounded-xl px-3 py-2 text-xs font-bold text-[#002A24] outline-none"><option value="ALL">All classifications</option><option value="MULE_SUSPECTED">Anomalous lead</option><option value="SUSPICIOUS">Suspicious</option></select>
                    </div>
                </div>

                {loading ? <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-[#FF4F00] animate-spin mr-3" /><span className="text-xs font-black uppercase tracking-widest text-slate-500">Loading alerts...</span></div> : error ? <div className="p-8 text-center bg-rose-50 text-rose-700 text-sm font-medium">{error}</div> : filteredAlerts.length === 0 ? <div className="p-12 text-center"><ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-3" /><p className="text-sm font-bold text-slate-500">No alerts match the current filters.</p></div> : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-[#F8FAFC]"><tr>{['Alert ID', 'Time', 'Wallet / Entity', 'Severity', 'Classification', 'Risk score', 'Alert type', 'Reason', 'Status'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{filteredAlerts.map((alert) => <tr key={alert.alert_id} onClick={() => alert.account_id && navigate(`/dashboard?account=${encodeURIComponent(alert.account_id)}`)} className={`transition-colors ${alert.account_id ? 'cursor-pointer hover:bg-slate-50' : ''}`}><td className="px-5 py-4 text-xs font-black text-[#002A24]">{alert.alert_id ?? 'Unknown'}</td><td className="px-5 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{formatDate(alert.timestamp)}</td><td className="px-5 py-4 text-xs font-black text-[#002A24]"><button type="button" onClick={(event) => { event.stopPropagation(); if (alert.account_id) navigate(`/dashboard?account=${encodeURIComponent(alert.account_id)}`); }} className="font-black text-[#002A24] hover:text-[#FF4F00] transition-colors">{alert.account_id ?? 'Unknown'}</button></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${severityStyle(alert.severity)}`}>{alert.severity ?? 'Unknown'}</span></td><td className="px-5 py-4 text-xs font-bold text-slate-600">{alert.classification ?? 'Unknown'}</td><td className="px-5 py-4 text-xs font-black text-[#002A24]">{typeof alert.risk_score === 'number' ? alert.risk_score.toFixed(1) : 'Unknown'}</td><td className="px-5 py-4 text-xs font-bold text-slate-600">{alert.alert_type ?? 'Unknown'}</td><td className="px-5 py-4 text-xs font-medium text-slate-600">{alert.reason ?? 'Unknown'}</td><td className="px-5 py-4 text-xs font-black uppercase tracking-widest text-slate-500">{alert.status ?? 'Unknown'}</td></tr>)}</tbody></table></div>}
            </section>

            <div className="flex items-center gap-3 text-xs font-medium text-slate-500"><AlertTriangle className="w-4 h-4 text-[#FF4F00]" /> Alerts shown here are sourced from the backend detection pipeline.</div>
        </div>
    );
};

export default AlertsPage;

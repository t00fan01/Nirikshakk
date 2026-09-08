import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Clock3, ExternalLink, Network, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { api, AccountInvestigationResponse, InvestigationTransaction, API_BASE_URL } from '../lib/api';

interface AccountInvestigationProps {
    accountId: string;
    onBack: () => void;
}

const formatLabel = (value: string) => value.replace(/_/g, ' ');

const formatDate = (value?: string) => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 19).replace('T', ' ');
};

const classificationStyle = (classification?: string) => {
    if (classification === 'LEGITIMATE') return 'bg-emerald-100 text-emerald-700';
    if (classification === 'SUSPICIOUS') return 'bg-[#FF4F00]/10 text-[#FF4F00]';
    return 'bg-rose-100 text-rose-700';
};

const riskStyle = (riskLevel?: string) => {
    if (riskLevel === 'LOW') return 'bg-sky-100 text-sky-700';
    if (riskLevel === 'MEDIUM') return 'bg-amber-100 text-amber-700';
    if (riskLevel === 'HIGH') return 'bg-orange-100 text-orange-700';
    if (riskLevel === 'VERY HIGH') return 'bg-[#FF4F00]/10 text-[#FF4F00]';
    return 'bg-rose-100 text-rose-700';
};

const AccountInvestigation = ({ accountId, onBack }: AccountInvestigationProps) => {
    const [investigation, setInvestigation] = useState<AccountInvestigationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [containmentStatus, setContainmentStatus] = useState<string>('CLEAN');

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);

        api.getAccountInvestigation(accountId)
            .then((result) => {
                if (active) {
                    setInvestigation(result);
                    if (result.containment_status) {
                        setContainmentStatus(result.containment_status);
                    }
                }
            })
            .catch((requestError: unknown) => {
                console.error(requestError);
                if (active) setError('Unable to load investigation data for this account.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [accountId]);

    const handleContainmentChange = async (newStatus: string) => {
        try {
            const token = localStorage.getItem('nirikshak_token');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            };
            const res = await fetch(`${API_BASE_URL}/api/accounts/${accountId}/containment`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ status: newStatus, reason: "Manual containment action via analyst investigation" })
            });
            if (res.ok) {
                const data = await res.json();
                setContainmentStatus(data.status);
            }
        } catch (err) {
            console.error("Failed to update containment status:", err);
        }
    };

    const rankedFeatures = useMemo(() => Object.entries(investigation?.feature_importance ?? {})
        .filter(([, value]) => Number.isFinite(value))
        .sort(([, first], [, second]) => second - first)
        .slice(0, 6), [investigation]);

    const accountFeatures = investigation?.features ?? {};
    const statistics = [
        ['Total transactions', accountFeatures.total_txn_count],
        ['Inbound transactions', accountFeatures.inbound_txn_count],
        ['Outbound transactions', accountFeatures.outbound_txn_count],
        ['Total inbound amount', accountFeatures.total_inbound_amount],
        ['Total outbound amount', accountFeatures.total_outbound_amount],
        ['Average transaction amount', accountFeatures.avg_txn_amount],
        ['Unique counterparties', accountFeatures.unique_counterparties],
        ['Pass-through ratio', accountFeatures.pass_through_ratio],
        ['Fund dwell time', accountFeatures.fund_dwell_time],
    ].filter(([, value]) => value !== undefined && value !== null);

    if (loading) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button onClick={onBack} className="mb-8 inline-flex items-center text-xs font-black uppercase tracking-widest text-slate-500 hover:text-[#FF4F00] transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to risk table
                </button>
                <div className="bg-white rounded-3xl border border-slate-200 p-16 flex items-center justify-center shadow-[0_6px_32px_rgba(147,111,173,0.12)]">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Loading account investigation...</div>
                </div>
            </div>
        );
    }

    if (error || !investigation) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button onClick={onBack} className="mb-8 inline-flex items-center text-xs font-black uppercase tracking-widest text-slate-500 hover:text-[#FF4F00] transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to risk table
                </button>
                <div className="bg-white rounded-3xl border border-rose-200 p-12 text-center shadow-[0_6px_32px_rgba(147,111,173,0.12)]">
                    <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-xl font-black text-[#002A24] mb-2">Account investigation unavailable</h2>
                    <p className="text-sm font-medium text-slate-500">{error ?? 'The requested account could not be found.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                <div>
                    <button onClick={onBack} className="mb-5 inline-flex items-center text-xs font-black uppercase tracking-widest text-slate-500 hover:text-[#FF4F00] transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to entity table
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4F00]">Wallet / Entity Investigation</p>
                    <h1 className="text-4xl font-black text-[#002A24] mt-2">{investigation.account_id}</h1>
                    <p className="text-slate-500 font-medium mt-2">Analyst evidence and model output for the selected wallet entity.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${classificationStyle(investigation.classification)}`}>{formatLabel(investigation.classification ?? 'UNKNOWN')}</span>
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${riskStyle(investigation.risk_level)}`}>{investigation.risk_level ?? 'UNKNOWN'}</span>
                </div>
            </div>

            {/* Containment Control Panel */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-black text-[#002A24] uppercase tracking-widest">Entity Isolation Status</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Simulate wallet isolation status during investigation.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
                        containmentStatus === 'FROZEN' ? 'bg-rose-100 text-rose-700' :
                        containmentStatus === 'MANUAL_REVIEW' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                    }`}>
                        {containmentStatus === 'FROZEN' ? 'FLAGGED / ISOLATED' :
                         containmentStatus === 'MANUAL_REVIEW' ? 'MANUAL REVIEW' :
                         'CLEAN / ACTIVE'}
                    </span>
                    <select 
                        value={containmentStatus} 
                        onChange={(e) => handleContainmentChange(e.target.value)}
                        className="text-xs font-bold text-[#002A24] border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-[#FF4F00] cursor-pointer"
                    >
                        <option value="CLEAN">CLEAN / ACTIVE</option>
                        <option value="MANUAL_REVIEW">MANUAL REVIEW</option>
                        <option value="FROZEN">FLAGGED / ISOLATED</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 border-l-8 border-[#FF4F00] shadow-[0_6px_32px_rgba(147,111,173,0.12)]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Anomaly probability</p>
                    <p className="text-4xl font-black text-[#FF4F00]">{((investigation.probability ?? 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 border-l-8 border-[#002A24] shadow-[0_6px_32px_rgba(147,111,173,0.12)]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Risk score</p>
                    <p className="text-4xl font-black text-[#002A24]">{(investigation.risk_score ?? 0).toFixed(1)} <span className="text-lg text-slate-400">/ 100</span></p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 border-l-8 border-emerald-500 shadow-[0_6px_32px_rgba(147,111,173,0.12)]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Model confidence</p>
                    <p className="text-4xl font-black text-[#002A24]">{((investigation.confidence ?? 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-[#002A24] p-6 rounded-3xl shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Risk level</p>
                    <p className="text-3xl font-black text-white">{investigation.risk_level ?? 'UNKNOWN'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evidence trail</p>
                        <h2 className="text-xl font-black text-[#002A24]">Why this entity was flagged</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        {(investigation.reasons ?? []).map((reason) => (
                            <div key={reason} className="flex items-start gap-3 rounded-2xl bg-[#FF4F00]/5 border border-[#FF4F00]/10 p-4">
                                <AlertTriangle className="w-4 h-4 text-[#FF4F00] mt-0.5 shrink-0" />
                                <span className="text-sm font-bold text-slate-700">{reason}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Model evidence</p>
                        <h2 className="text-xl font-black text-[#002A24]">Feature importance</h2>
                    </div>
                    <div className="p-6 space-y-5">
                        {rankedFeatures.length === 0 ? (
                            <p className="text-sm font-medium text-slate-500">Feature importance was not returned for this model response.</p>
                        ) : rankedFeatures.map(([feature, importance]) => (
                            <div key={feature}>
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-700 capitalize">{formatLabel(feature)}</span>
                                    <span className="text-xs font-black text-[#FF4F00]">{(importance * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, importance * 100)}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-gradient-to-r from-[#006C67] to-[#FF4F00]" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entity telemetry</p>
                    <h2 className="text-xl font-black text-[#002A24]">Entity statistics</h2>
                </div>
                {statistics.length === 0 ? (
                    <p className="p-6 text-sm font-medium text-slate-500">No entity statistics were returned.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-px bg-slate-200">
                        {statistics.map(([label, value]) => (
                            <div key={label} className="bg-white p-5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
                                <p className="text-lg font-black text-[#002A24]">{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent entity activity</p>
                        <h2 className="text-xl font-black text-[#002A24]">Transaction history</h2>
                    </div>
                    <Clock3 className="w-5 h-5 text-[#FF4F00]" />
                </div>
                {(investigation.transactions ?? []).length === 0 ? (
                    <p className="p-8 text-center text-sm font-medium text-slate-500">No transactions were returned for this entity.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-[#F8FAFC]"><tr>{['Timestamp', 'Transaction ID', 'Sender', 'Receiver', 'Amount', 'Channel', 'Risk status'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">{heading}</th>)}</tr></thead>
                            <tbody className="divide-y divide-slate-200">
                                {(investigation.transactions ?? []).map((transaction: InvestigationTransaction) => (
                                    <tr key={transaction.transaction_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 text-xs font-medium text-slate-600 whitespace-nowrap">{formatDate(transaction.timestamp)}</td>
                                        <td className="px-5 py-4 text-xs font-black text-[#002A24]">{transaction.transaction_id ?? 'Unknown'}</td>
                                        <td className="px-5 py-4 text-xs font-medium text-slate-600">{transaction.sender_account_id ?? 'Unknown'}</td>
                                        <td className="px-5 py-4 text-xs font-medium text-slate-600">{transaction.receiver_account_id ?? 'Unknown'}</td>
                                        <td className="px-5 py-4 text-xs font-black text-[#002A24]">{typeof transaction.amount === 'number' ? transaction.amount.toLocaleString() : 'Unknown'}</td>
                                        <td className="px-5 py-4 text-xs font-bold text-slate-600">{transaction.channel ?? 'Unknown'}</td>
                                        <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${transaction.risk_flag ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{transaction.risk_flag ? 'Flagged' : 'Clear'}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80 flex items-center gap-3"><Network className="w-5 h-5 text-[#006C67]" /><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Graph context</p><h2 className="text-xl font-black text-[#002A24]">Network connections</h2></div></div>
                    {(investigation.network?.links ?? []).length === 0 ? <p className="p-8 text-sm font-medium text-slate-500">No network data was returned for this entity.</p> : <div className="p-6 space-y-3">{investigation.network?.links?.map((link, index) => <div key={`${link.source}-${link.target}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 hover:bg-slate-50 transition-colors"><div><p className="text-xs font-black text-[#002A24]">{link.source} <span className="text-[#FF4F00]">→</span> {link.target}</p><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{link.direction ?? 'CONNECTION'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${link.suspicious ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{link.suspicious ? 'Suspicious' : 'Clear'}</span></div>)}</div>}
                </section>

                <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_6px_32px_rgba(147,111,173,0.12)] overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-[#F8FAFC]/80 flex items-center gap-3"><ShieldAlert className="w-5 h-5 text-[#FF4F00]" /><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entity alerts</p><h2 className="text-xl font-black text-[#002A24]">Investigation alerts</h2></div></div>
                    {(investigation.alerts ?? []).length === 0 ? <p className="p-8 text-sm font-medium text-slate-500">No alerts exist for this entity.</p> : <div className="p-6 space-y-3">{investigation.alerts?.map((alert) => <div key={alert.alert_id} className="rounded-2xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><span className="text-xs font-black text-[#002A24]">{alert.alert_id ?? 'Alert'}</span><span className="text-[10px] font-black uppercase tracking-widest text-rose-600">{alert.severity ?? 'Unknown'}</span></div><p className="text-xs font-medium text-slate-600 mt-2">{alert.reason ?? 'No reason supplied'}</p><p className="text-[10px] text-slate-400 mt-2">{formatDate(alert.timestamp)} · {alert.status ?? 'Unknown'}</p></div>)}</div>}
                </section>
            </div>

            <div className="flex justify-end"><button onClick={onBack} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#FF4F00] hover:text-[#002A24] transition-colors"><ExternalLink className="w-4 h-4" /> Return to entity review</button></div>
        </div>
    );
};

export default AccountInvestigation;


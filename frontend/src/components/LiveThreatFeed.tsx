import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api, AlertRecord } from '../lib/api';

const formatTime = (value?: string) => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleTimeString();
};

const LiveThreatFeed = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<AlertRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wsStatus, setWsStatus] = useState<'LIVE' | 'RECONNECTING' | 'FALLBACK'>('FALLBACK');
    const scrollRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const reconnectDelayRef = useRef<number>(1000);

    const handleNewAlerts = (newAlerts: AlertRecord[]) => {
        setAlerts((previous) => {
            const merged = new Map<string, AlertRecord>();
            [...newAlerts, ...previous].forEach((alert) => {
                if (alert.alert_id) merged.set(alert.alert_id, alert);
            });
            return Array.from(merged.values())
                .sort((first, second) => new Date(second.timestamp ?? 0).getTime() - new Date(first.timestamp ?? 0).getTime())
                .slice(0, 50);
        });
    };

    useEffect(() => {
        let isMounted = true;
        const token = localStorage.getItem('nirikshak_token');

        const loadAlerts = async (force = false) => {
            if (!force && document.visibilityState === 'hidden') return;
            try {
                const nextAlerts = await api.getAlerts();
                if (isMounted) {
                    handleNewAlerts(nextAlerts);
                    setError(null);
                }
            } catch (requestError: unknown) {
                console.error(requestError);
                if (isMounted) setError('Unable to load investigation events.');
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadAlerts(true);

        const interval = window.setInterval(() => {
            if (isMounted && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
                loadAlerts();
            }
        }, 5000);

        const connectWS = async () => {
            if (!isMounted) return;
            if (!token) {
                setWsStatus('FALLBACK');
                return;
            }

            let ticket = '';
            try {
                const res = await api.getWebSocketTicket();
                if (!isMounted) return;
                ticket = res.ticket;
            } catch (err) {
                console.error('Failed to retrieve WebSocket ticket:', err);
                if (isMounted) {
                    setWsStatus('FALLBACK');
                    const delay = reconnectDelayRef.current;
                    reconnectDelayRef.current = Math.min(delay * 2, 16000);
                    reconnectTimeoutRef.current = window.setTimeout(connectWS, delay);
                }
                return;
            }

            if (!isMounted) return;
            const apiBase = import.meta.env.VITE_API_BASE_URL || window.location.origin;
            const wsScheme = apiBase.startsWith('https') ? 'wss' : 'ws';
            const wsUrl = `${apiBase.replace(/^https?/, wsScheme)}/ws/alerts?ticket=${encodeURIComponent(ticket)}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                if (isMounted) {
                    setWsStatus('LIVE');
                    reconnectDelayRef.current = 1000;
                    if (reconnectTimeoutRef.current) {
                        window.clearTimeout(reconnectTimeoutRef.current);
                        reconnectTimeoutRef.current = null;
                    }
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data.type === 'alert.created' && data.alert) {
                        const alert: AlertRecord = data.alert;
                        handleNewAlerts([alert]);
                    }
                } catch (err) {
                    console.error('Failed to parse WebSocket event:', err);
                }
            };

            ws.onclose = () => {
                if (isMounted) {
                    setWsStatus('RECONNECTING');
                    const delay = reconnectDelayRef.current;
                    reconnectDelayRef.current = Math.min(delay * 2, 16000);
                    reconnectTimeoutRef.current = window.setTimeout(connectWS, delay);
                }
            };

            ws.onerror = (err) => {
                console.error('WebSocket connection error:', err);
                ws.close();
            };
        };

        connectWS();

        return () => {
            isMounted = false;
            window.clearInterval(interval);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                window.clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [alerts.length]);

    return (
        <div className="bg-[#001411]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 h-[300px] flex flex-col shadow-2xl overflow-hidden group">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${wsStatus === 'LIVE' ? 'bg-emerald-500 animate-pulse' : wsStatus === 'RECONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400'}`} />
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Terminal className="w-3 h-3 text-[#FF4F00]" /> INVESTIGATION ACTIVITY
                    </span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${wsStatus === 'LIVE' ? 'text-emerald-400' : 'text-slate-400'}`}>
                    ANALYSIS STREAM
                </span>
            </div>
            <div ref={scrollRef} className="flex-grow overflow-y-auto font-mono text-[11px] space-y-2 pr-2 custom-scrollbar scroll-smooth">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-white/40 uppercase tracking-widest font-black text-xs">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading event stream...
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full text-rose-400 uppercase tracking-widest font-black text-xs text-center">
                        <AlertTriangle className="w-4 h-4 mr-2 shrink-0" /> {error}
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-white/30 uppercase tracking-widest font-black text-xs text-center">
                        No active events. Ready for analysis.
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {alerts.map((alert) => (
                            <motion.button 
                                key={alert.alert_id} 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                onClick={() => alert.account_id && navigate(`/dashboard?account=${encodeURIComponent(alert.account_id)}`)} 
                                className="w-full text-left flex gap-3 leading-relaxed hover:bg-white/5 rounded-lg p-2 transition-colors"
                            >
                                <span className="text-white/20 shrink-0">[{formatTime(alert.timestamp)}]</span>
                                <span className="text-[#FF4F00] shrink-0 uppercase font-black tracking-widest text-[9px] w-16">
                                    {alert.severity ?? 'EVENT'}:
                                </span>
                                <span className="text-white/80">
                                    <strong className="text-white">{alert.account_id ?? 'WALLET / IP'}</strong> · {alert.classification ?? alert.alert_type ?? 'DETECTION'} · Risk {typeof alert.risk_score === 'number' ? alert.risk_score.toFixed(1) : 'Unknown'}
                                    <span className="block text-white/40 mt-0.5">{alert.reason ?? alert.alert_type ?? 'Investigation event'}</span>
                                </span>
                            </motion.button>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default LiveThreatFeed;


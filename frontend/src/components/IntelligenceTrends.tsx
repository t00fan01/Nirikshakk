import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Shield } from 'lucide-react';

const alertData = [
    { day: 'Mon', alerts: 12 },
    { day: 'Tue', alerts: 19 },
    { day: 'Wed', alerts: 15 },
    { day: 'Thu', alerts: 45 }, // Spike
    { day: 'Fri', alerts: 22 },
    { day: 'Sat', alerts: 18 },
    { day: 'Sun', alerts: 25 },
];

const typologyData = [
    { name: 'Smurfing', value: 45, color: '#006C67' },
    { name: 'Cycles', value: 30, color: '#E27C37' },
    { name: 'Velocity', value: 25, color: '#121212' },
];

const riskData = [
    { time: '08:00', score: 0.42 },
    { time: '10:00', score: 0.55 },
    { time: '12:00', score: 0.88 }, // Risk increase
    { time: '14:00', score: 0.65 },
    { time: '16:00', score: 0.48 },
    { time: '18:00', score: 0.52 },
];

const IntelligenceTrends = () => {
    return (
        <div className="space-y-8 p-1">
            <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-[#006C67]" />
                <h2 className="text-3xl font-black text-[#121212]">Intelligence Trends</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 30-Day Alert Volume */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-6 h-[400px] flex flex-col"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-[#121212]/80 uppercase tracking-widest text-xs">Alert Volume (7-Day View)</h3>
                        <div className="px-3 py-1 bg-orange-500/10 text-orange-600 text-[10px] font-black rounded-full border border-orange-500/20">SENSITIVE</div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={alertData}>
                            <defs>
                                <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#006C67" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#006C67" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#12121210" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#12121260', fontSize: 12, fontWeight: 700}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#12121260', fontSize: 12, fontWeight: 700}} />
                            <Tooltip 
                                contentStyle={{background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #12121210', fontWeight: 'bold'}}
                            />
                            <Area type="monotone" dataKey="alerts" stroke="#006C67" strokeWidth={4} fillOpacity={1} fill="url(#colorAlerts)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                {/* Threat Typology */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel p-6 h-[400px] flex flex-col"
                >
                    <h3 className="font-black text-[#121212]/80 uppercase tracking-widest text-xs mb-6">Threat Typology Breakdown</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={typologyData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#12121210" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#12121260', fontSize: 12, fontWeight: 700}} width={80} />
                            <Tooltip cursor={{fill: '#12121205'}} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                                {typologyData.map((entry, index) => (
                                    <Bar key={`cell-${index}`} dataKey="value" fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>

            {/* Risk Score Trends */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-panel p-6 h-[350px] flex flex-col"
            >
                <div className="flex items-center gap-2 mb-6">
                    <Shield className="w-5 h-5 text-[#E27C37]" />
                    <h3 className="font-black text-[#121212]/80 uppercase tracking-widest text-xs">Composite Risk Score (Intraday)</h3>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={riskData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#12121210" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#12121260', fontSize: 12, fontWeight: 700}} />
                        <YAxis domain={[0, 1]} axisLine={false} tickLine={false} tick={{fill: '#12121260', fontSize: 12, fontWeight: 700}} />
                        <Tooltip />
                        <Line type="stepAfter" dataKey="score" stroke="#E27C37" strokeWidth={4} dot={{ r: 6, fill: '#E27C37', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </motion.div>
        </div>
    );
};

export default IntelligenceTrends;

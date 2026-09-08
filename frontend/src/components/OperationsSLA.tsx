import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Clock, Zap, Server } from 'lucide-react';

const opsData = [
    { time: '00:00', throughput: 120, latency: 18 },
    { time: '04:00', throughput: 80, latency: 15 },
    { time: '08:00', throughput: 450, latency: 32 },
    { time: '12:00', throughput: 980, latency: 48 }, // Load spike
    { time: '16:00', throughput: 650, latency: 28 },
    { time: '20:00', throughput: 320, latency: 22 },
];

const OperationsSLA = () => {
    return (
        <div className="space-y-8 p-1">
            <div className="flex items-center gap-3 mb-2">
                <Activity className="w-8 h-8 text-[#121212]" />
                <h2 className="text-3xl font-black text-[#121212]">Operations SLA</h2>
            </div>

            {/* SLA Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "System Uptime", value: "99.99%", icon: Server, color: "#006C67" },
                    { label: "Edge Latency", value: "24ms", icon: Clock, color: "#E27C37" },
                    { label: "Active Nodes", value: "3", icon: Zap, color: "#121212" }
                ].map((stat, idx) => (
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        key={idx}
                        className="glass-panel p-6 flex flex-col items-center text-center border-b-4"
                        style={{ borderBottomColor: stat.color }}
                    >
                        <stat.icon className="w-8 h-8 mb-4" style={{ color: stat.color }} />
                        <p className="text-[10px] font-black text-[#121212]/40 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <h3 className="text-3xl font-black text-[#121212]">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            {/* Throughput vs Latency */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-8 h-[450px] flex flex-col"
            >
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="font-black text-[#121212] tracking-tight">Node Ingestion Performance</h3>
                        <p className="text-xs font-medium text-[#121212]/50 italic">Throughput (TPS) vs Multi-hop Latency (ms)</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-[#121212] rounded-sm"></div>
                            <span className="text-[10px] font-bold text-[#121212]/60">TPS</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                            <span className="text-[10px] font-bold text-[#121212]/60">SLA LIMIT (50ms)</span>
                        </div>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={opsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#12121210" />
                        <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#12121260', fontSize: 12, fontWeight: 700}} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#12121260', fontSize: 12, fontWeight: 700}} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#E27C37', fontSize: 12, fontWeight: 700}} />
                        <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)'}}
                        />
                        <Bar yAxisId="left" dataKey="throughput" fill="#121212" radius={[4, 4, 0, 0]} barSize={50} />
                        <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#E27C37" strokeWidth={3} dot={{r: 5, fill: '#E27C37'}} />
                        <Line yAxisId="right" type="monotone" dataKey={() => 50} stroke="red" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </motion.div>
        </div>
    );
};

export default OperationsSLA;

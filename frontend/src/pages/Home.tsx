import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import PlatformMetrics from '../components/dashboard/PlatformMetrics';
import { Marquee } from '../components/ui/marquee';
import { FlickeringGrid } from '../components/ui/flickering-grid';

const Home = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLElement>(null);
    const [mouse, setMouse] = useState({ x: 0, y: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ['start start', 'end start']
    });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setMouse({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleInvestigateSearch = () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResult(null);
        setTimeout(() => {
            setIsSearching(false);
            setSearchResult(`Query "${searchQuery}" queued for investigation. Navigating to investigation console...`);
            setTimeout(() => {
                navigate(`/dashboard?account=${encodeURIComponent(searchQuery)}`);
            }, 1000);
        }, 800);
    };

    const yBackground = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
    const yText = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);

    const analysisLayers = [
        "BLOCKCHAIN",
        "NETWORK",
        "GRAPH",
        "AI / ML",
        "INVESTIGATION"
    ];

    return (
        <motion.div
            className="w-full flex flex-col bg-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
            {/* Hero Section */}
            <section 
                ref={containerRef} 
                onMouseMove={handleMouseMove}
                className="relative w-full min-h-[90vh] flex flex-col justify-center items-center text-center overflow-hidden pt-24 px-6 bg-transparent rounded-[3rem] md:rounded-[4rem] mx-auto max-w-[98%]"
            >
                {/* Base Grid (Layer 1) */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                    style={{ 
                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                        backgroundSize: '4rem 4rem'
                    }}
                />

                {/* Spotlight Grid (Layer 2) */}
                <div className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                    style={{ 
                        backgroundImage: `linear-gradient(to right, rgba(255, 79, 0, 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 79, 0, 0.6) 1px, transparent 1px)`,
                        backgroundSize: '4rem 4rem',
                        WebkitMaskImage: `radial-gradient(600px circle at ${mouse.x}px ${mouse.y}px, black 0%, transparent 100%)`,
                        maskImage: `radial-gradient(600px circle at ${mouse.x}px ${mouse.y}px, black 0%, transparent 100%)`
                    }}
                />

                <motion.div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{ y: yBackground }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF4F00]/5 rounded-full blur-[120px]"></div>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-5xl relative z-10"
                    style={{ y: yText }}
                >
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-8 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-1000">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">AI Network Core Operational</span>
                    </div>

                    <h1 className="text-6xl md:text-8xl font-black text-black mb-4 leading-tight tracking-tight drop-shadow-sm">
                        Bitcoin Transaction <br /> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4F00] to-[#FF8C00]">
                            Intelligence.
                        </span>
                    </h1>
                    <p className="text-2xl font-black uppercase text-[#FF4F00] tracking-widest mb-6">
                        Find the hidden patterns.
                    </p>
                    <p className="text-lg md:text-xl text-black/80 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
                        An offline AI-powered investigation platform for analyzing Bitcoin transaction and network activity, discovering suspicious entities, tracing fund flows, and generating explainable investigative leads.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pointer-events-auto">
                        <Link
                            to="/dashboard"
                            className="group relative px-10 py-5 bg-[#FF4F00] text-white rounded-2xl font-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,79,0,0.3)] hover:shadow-[0_0_60px_rgba(255,79,0,0.5)] overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            <span className="relative flex items-center space-x-3 text-lg uppercase tracking-wider">
                                <span>START INVESTIGATION</span>
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </Link>
                        
                        <Link
                            to="/about"
                            className="px-10 py-5 bg-black border border-white/10 text-white rounded-2xl font-black transition-all hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(255,255,255,0.15)] text-lg uppercase tracking-wider backdrop-blur-xl"
                        >
                            EXPLORE NETWORK
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* IMPACT TELEMETRY SUITE */}
            <section className="bg-white pt-12 border-t border-slate-100">
                <PlatformMetrics />
            </section>

            {/* BITCOIN INVESTIGATION PLACEHOLDER */}
            <section className="py-24 px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <div className="glass-panel p-12 rounded-[3.5rem] border border-[#FF4F00]/10 bg-white/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(255,79,0,0.05)] text-center relative overflow-hidden">
                        <FlickeringGrid 
                            className="absolute inset-0 z-0"
                            squareSize={3}
                            gridGap={5}
                            color="#FF4F00"
                            maxOpacity={0.15}
                            flickerChance={0.2}
                        />
                        
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4F00]/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black text-[#002A24] mb-3 uppercase tracking-tight">Investigate Bitcoin Activity</h2>
                            <p className="text-slate-500 font-medium mb-10 max-w-2xl mx-auto">Explore transaction relationships, wallet activity, network observations, and AI-generated investigative leads.</p>
                            
                            <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto mb-8">
                                <div className="relative flex-grow">
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleInvestigateSearch()}
                                        placeholder="Enter TXID, Wallet Address, or IP..."
                                        className="w-full px-8 py-5 bg-white/80 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/50 focus:border-[#FF4F00] transition-all font-mono font-bold text-xs text-[#002A24]"
                                    />
                                    <Search className="w-5 h-5 text-slate-400 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                                <button 
                                    onClick={handleInvestigateSearch}
                                    disabled={isSearching}
                                    className="px-10 py-5 bg-[#002A24] text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-black transition-all hover:shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex items-center justify-center min-w-[180px] disabled:opacity-50"
                                >
                                    {isSearching ? 'ANALYZING...' : 'INVESTIGATE'}
                                </button>
                            </div>
                            
                            {searchResult && (
                                <div className="max-w-2xl mx-auto p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-bold font-mono animate-in fade-in duration-300">
                                    {searchResult}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ANALYSIS LAYERS MARQUEE */}
            <section className="bg-white pb-24 relative z-10 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <h3 className="text-center text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8">
                        THE ANALYSIS LAYERS
                    </h3>
                </div>
                <Marquee speed={40} pauseOnHover className="mt-0 opacity-90 hover:opacity-100 transition-opacity duration-700">
                    {analysisLayers.concat(analysisLayers).map((layer, index) => (
                        <div key={index} className="mx-8 px-8 py-4 bg-[#002A24] text-white rounded-2xl font-black tracking-[0.25em] text-sm border border-emerald-500/20 shadow-lg flex items-center justify-center space-x-3">
                            <span className="w-2 h-2 rounded-full bg-[#FF4F00]"></span>
                            <span>{layer}</span>
                        </div>
                    ))}
                </Marquee>
            </section>

            {/* Problem Section */}
            <section id="problem" className="py-24 px-6 md:px-12 lg:px-24 relative z-10 bg-white rounded-[3rem] md:rounded-[4rem] mx-auto max-w-[98%] mb-8 shadow-sm border border-[#121212]/5">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <motion.div
                        className="glass-panel h-96 flex items-center justify-center p-4 relative overflow-hidden shadow-[0_6px_32px_rgba(147,111,173,0.12)] hover:shadow-[0_8px_40px_rgba(147,111,173,0.20)] transition-all duration-300"
                        animate={{ y: [-15, 5, -15] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#E27C37]/10 to-transparent z-0"></div>
                        <img
                            src="/threat_simulation.jpg"
                            alt="Bitcoin Network Investigation Visual"
                            className="relative z-10 w-full h-full object-cover rounded-lg shadow-2xl drop-shadow-[0_15px_15px_rgba(18,18,18,0.3)]"
                        />
                    </motion.div>
                    <div>
                        <h2 className="text-4xl md:text-6xl font-black text-[#121212] mb-6 leading-tight">
                            Bitcoin activity is easy to record. Hard to investigate.
                        </h2>
                        <p className="text-lg text-[#121212]/80 leading-relaxed font-medium">
                            Bitcoin transaction records are publicly observable, but large transaction networks can conceal complex movement patterns across wallets. NIRIKSHAK turns large-scale transaction and network metadata into explainable investigative leads.
                        </p>
                    </div>
                </div>
            </section>

            {/* The Engine Section */}
            <section id="solution" className="py-32 px-6 md:px-12 lg:px-24 relative z-10 bg-white rounded-[3rem] md:rounded-[4rem] mx-auto max-w-[98%] mb-8 shadow-sm border border-[#121212]/5">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-4xl md:text-6xl font-black text-[#121212] mb-20 tracking-tight">The Engine</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
                        {/* Card 1 */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 hover:border-[#006C67]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-mono font-black text-[#006C67] tracking-widest uppercase block mb-4">01</span>
                                <h3 className="text-xl font-bold text-[#121212] mb-3 tracking-tight">DATA CORRELATION</h3>
                                <p className="text-[#121212]/80 text-sm font-medium leading-relaxed">
                                    Correlates Bitcoin transaction data with network observations including IP, port, timing, ASN, and geographic context.
                                </p>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 hover:border-[#006C67]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-mono font-black text-[#006C67] tracking-widest uppercase block mb-4">02</span>
                                <h3 className="text-xl font-bold text-[#121212] mb-3 tracking-tight">GRAPH INTELLIGENCE</h3>
                                <p className="text-[#121212]/80 text-sm font-medium leading-relaxed">
                                    Builds a multi-layer graph connecting wallets, transactions, IPs, network observations, and related entities.
                                </p>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 hover:border-[#006C67]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-mono font-black text-[#006C67] tracking-widest uppercase block mb-4">03</span>
                                <h3 className="text-xl font-bold text-[#121212] mb-3 tracking-tight">AI ANOMALY DETECTION</h3>
                                <p className="text-[#121212]/80 text-sm font-medium leading-relaxed">
                                    Uses machine learning to identify unusual transaction and behavioural patterns in large datasets.
                                </p>
                            </div>
                        </div>

                        {/* Card 4 */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 hover:border-[#006C67]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-mono font-black text-[#006C67] tracking-widest uppercase block mb-4">04</span>
                                <h3 className="text-xl font-bold text-[#121212] mb-3 tracking-tight">EXPLAINABLE INVESTIGATION</h3>
                                <p className="text-[#121212]/80 text-sm font-medium leading-relaxed">
                                    Ranks investigative leads and explains the evidence, confidence, relationships, and transaction paths behind each alert.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </motion.div>
    );
};

export default Home;


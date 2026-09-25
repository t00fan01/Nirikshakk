import React from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  ShieldAlert, 
  ShieldCheck, 
  Network, 
  Shapes,
  Activity
} from "lucide-react";
import { AnimatedGradient } from "../ui/animated-gradient-with-svg";

interface BentoCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  colors: string[];
  delay: number;
  icon: React.ReactNode;
  className?: string;
}

const BentoCard: React.FC<BentoCardProps> = ({
  title,
  value,
  subtitle,
  colors,
  delay,
  icon,
  className
}) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay + 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      className={`relative overflow-hidden h-full bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-[#FF4F00]/10 group shadow-[0_8px_30px_rgb(255,79,0,0.08)] hover:shadow-[0_8px_40px_rgb(255,79,0,0.2)] transition-all duration-700 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <AnimatedGradient colors={colors} speed={0.03} blur="light" />
      <motion.div
        className="relative z-10 p-8 text-slate-900 h-full flex flex-col justify-end"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div 
            className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FF4F00]/5 border border-[#FF4F00]/10 backdrop-blur-md group-hover:scale-110 transition-transform duration-500 shadow-sm shadow-[#FF4F00]/20"
            variants={item}
        >
          {icon}
        </motion.div>
        
        <div>
            <motion.h3 
                className="text-xs font-black uppercase tracking-[0.2em] text-black mb-2" 
                variants={item}
            >
                {title}
            </motion.h3>
            <motion.p
                className="text-4xl md:text-5xl font-black mb-4 leading-none tracking-tighter text-[#002A24]"
                variants={item}
            >
                {value}
            </motion.p>
            {subtitle && (
                <motion.p 
                    className="text-sm font-medium text-[#FF4F00]/80 leading-relaxed max-w-[280px]" 
                    variants={item}
                >
                    {subtitle}
                </motion.p>
            )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const ImpactDashboard: React.FC = () => {
  return (
    <div className="w-full bg-transparent py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Investigation Telemetry</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-emerald-600 leading-[0.9] tracking-tight mb-4">
            Analysis Metrics <br />
            <span className="text-slate-600 uppercase text-3xl md:text-4xl">Network Intelligence Suite</span>
          </h2>
          <p className="text-[#FF4F00]/60 font-medium text-lg leading-relaxed">
            Offline analysis metrics and graph structure coverage across ingested Bitcoin transactions and network observations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <BentoCard
            title="TRANSACTIONS ANALYZED"
            value="1,250,000+"
            subtitle="Ingested Bitcoin transaction records and metadata."
            colors={["#2C33FF", "#1A1453", "#936FAD"]}
            delay={0.1}
            icon={<BarChart3 className="w-6 h-6 text-[#2C33FF]" />}
          />
        </div>
        
        <BentoCard
          title="HIGH-RISK LEADS"
          value="18 LEADS"
          subtitle="Top prioritized investigative leads requiring manual analyst review."
          colors={["#ea580c", "#FF4F00", "#7B3FE0"]}
          delay={0.2}
          icon={<ShieldAlert className="w-6 h-6 text-[#ea580c]" />}
        />

        <BentoCard
          title="WALLETS DISCOVERED"
          value="84,500+"
          subtitle="Unique wallet addresses indexed in the multi-layer graph."
          colors={["#00D68F", "#002A24", "#05040B"]}
          delay={0.3}
          icon={<ShieldCheck className="w-6 h-6 text-[#00D68F]" />}
        />

        <BentoCard
          title="NETWORK OBSERVATIONS"
          value="450,000+"
          subtitle="Associated IP addresses, timing records, and ASN metadata nodes."
          colors={["#2C33FF", "#002A24", "#05040B"]}
          delay={0.4}
          icon={<Activity className="w-6 h-6 text-[#2C33FF]" />}
        />

        <BentoCard
          title="ENTITIES IDENTIFIED"
          value="12,800+"
          subtitle="Grouped wallet clusters and entity classifications."
          colors={["#FF4F00", "#7B3FE0", "#05040B"]}
          delay={0.5}
          icon={<Network className="w-6 h-6 text-[#FF4F00]" />}
        />
        
        <BentoCard
          title="ANOMALIES DETECTED"
          value="340+"
          subtitle="Behavioral and structural transaction anomalies flagged by ML model."
          colors={["#00D68F", "#2C33FF", "#0B0B12"]}
          delay={0.6}
          icon={<ShieldCheck className="w-6 h-6 text-[#00D68F]" />}
        />
        
        <div className="md:col-span-3">
          <BentoCard
            title="GRAPH RELATIONSHIPS"
            value="Multi-Layer Topology"
            subtitle="Correlating wallet-to-wallet transactions, wallet-to-IP observations, and geographic clustering in a unified investigation graph."
            colors={["#2C33FF", "#936FAD", "#05040B"]}
            delay={0.7}
            icon={<Shapes className="w-6 h-6 text-[#2C33FF]" />}
            className="min-h-[280px]"
          />
        </div>
      </div>
    </div>
  );
};

export default ImpactDashboard;


import { motion } from 'framer-motion';

const teamMembers = [
    {
        name: "Anuj Malviya",
        role: "DATA / BACKEND ENGINEER",
        description: "Engineered the high-throughput asynchronous API pipeline and the core Graph-Network anomaly detection logic.",
        image: "/Anuj Malviya.jpeg"
    },
    {
        name: "Ishan Singh Tomar",
        role: "AI / ML ENGINEER",
        description: "Crafted the AI model architecture, anomaly scoring algorithms, and feature importance pipeline.",
        image: "/Ishan Singh Tomar.png.jpeg"
    },
    {
        name: "Amay Mishra",
        role: "CORE ARCHITECT",
        description: "Contributing to the architecture, design, and investigative capabilities of the NIRIKSHAK platform.",
        image: "/Amay Mishra.jpeg"
    },
    {
        name: "Abhishek Verma",
        role: "PLATFORM ENGINEER",
        description: "Contributing to the system implementation, reliability, and investigative capabilities of the NIRIKSHAK platform.",
        image: "/Abhishek Verma.jpeg"
    },
    {
        name: "Aditi Jain",
        role: "RESEARCH & DEVELOPMENT",
        description: "Contributing to platform research, analytical workflows, and investigative capabilities of the NIRIKSHAK platform.",
        image: "/Aditi Jain.jpeg"
    },
    {
        name: "Lakshya Malviya",
        role: "SYSTEMS ARCHITECT",
        description: "Contributing to system integration, workflow optimization, and investigative capabilities of the NIRIKSHAK platform.",
        image: "/Lakshya Malviya.jpeg"
    },
];

const AboutUs = () => {
    return (
        <div className="w-full flex justify-center items-center py-20 px-4 md:px-8 mt-12 mb-24 min-h-screen">
            <div className="max-w-6xl w-full flex flex-col items-center">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <h1 className="text-5xl md:text-7xl font-black text-[#121212] mb-6 tracking-tight">The Architects</h1>
                    <div className="w-24 h-1 bg-[#E27C37] mx-auto rounded-full mb-8"></div>

                    <p className="text-sm md:text-base text-[#121212]/70 max-w-2xl mx-auto font-medium leading-relaxed italic">
                        "NIRIKSHAK is an intelligence platform for analyzing complex digital transaction networks and turning large-scale financial data into actionable, explainable investigative leads."
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-y-12 md:gap-x-8 w-full">
                    {teamMembers.map((member, index) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.12 }}
                            className="flex flex-col items-center text-center"
                        >
                            <motion.div
                                className="w-48 h-48 mb-6 rounded-2xl overflow-hidden glass-panel p-2 flex items-center justify-center bg-white/40 shadow-[0_15px_30px_rgba(0,0,0,0.1)]"
                                animate={{ y: [-10, 10, -10] }}
                                transition={{ duration: 5 + (index % 2), repeat: Infinity, ease: "easeInOut" }}
                            >
                                <img
                                    src={member.image}
                                    alt={member.name}
                                    className="w-full h-full object-cover rounded-xl filter drop-shadow-md brightness-95"
                                    onError={(e) => {
                                        const initials = member.name.split(' ').map((n) => n[0]).join('');
                                        (e.target as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23006C67"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="28" font-weight="bold">${initials}</text></svg>`;
                                    }}
                                />
                            </motion.div>

                            <h3 className="text-2xl font-black text-[#121212] tracking-tight">{member.name}</h3>
                            <p className="text-[#006C67] font-bold text-xs uppercase tracking-widest mt-2 mb-4">{member.role}</p>
                            <p className="text-[#121212]/70 text-sm font-medium leading-relaxed px-2">
                                {member.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

            </div>
        </div>
    );
};

export default AboutUs;

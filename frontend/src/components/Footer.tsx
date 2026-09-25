import { Link } from 'react-router-dom';

const Footer = () => {
    return (
        <footer className="bg-gradient-to-b from-[#0A1F18] to-[#040A08] mt-24 py-16 px-6 border-t border-white/10 relative overflow-hidden">
            {/* Structural ambient details */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"></div>

            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
                <div className="mb-8 md:mb-0">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white p-1 rounded-xl shadow-md flex-shrink-0 flex items-center justify-center">
                            <img src="/branding/logo.png" alt="NIRIKSHAK Logo" className="w-8 h-8 object-contain" />
                        </div>
                        <h2 className="text-3xl font-['Playfair_Display'] text-white tracking-[0.2em] font-bold">NIRIKSHAK</h2>
                    </div>
                    <p className="text-slate-400 text-sm font-medium tracking-wide">Bitcoin Transaction Intelligence &bull; AI Investigation Platform</p>
                    <p className="text-slate-500 text-xs mt-4 max-w-sm">An offline AI-powered Bitcoin transaction investigation platform for analyzing transaction traffic, discovering suspicious entities, and tracing fund flows.</p>
                </div>

                <div className="flex flex-col md:items-end space-y-4">
                    <div className="flex space-x-6">
                        <Link to="/#problem" className="text-slate-400 hover:text-orange-400 transition-colors text-sm font-medium">The Problem</Link>
                        <Link to="/#solution" className="text-slate-400 hover:text-orange-400 transition-colors text-sm font-medium">Architecture</Link>
                        <Link to="/dashboard" className="text-slate-400 hover:text-orange-400 transition-colors text-sm font-medium">Investigation Console</Link>
                    </div>

                    <div className="pt-6 border-t border-white/10 w-full md:w-auto text-left md:text-right">
                        <p className="text-xs text-slate-500 font-mono tracking-wider">
                            ENGINEERED BY <br className="md:hidden" />
                            <span className="text-slate-300 font-bold ml-0 md:ml-2 text-sm text-orange-500/80">Anuj Malviya &bull; Ishan Singh Tomar &bull; Amay Mishra &bull; Abhishek Verma &bull; Aditi Jain &bull; Lakshya Malviya</span>
                        </p>
                        <p className="text-xs text-slate-600 mt-2">&copy; {new Date().getFullYear()} NIRIKSHAK Platform. All rights reserved.</p>
                    </div>
                </div>
            </div>

            {/* Cyberpunk abstract elements */}
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-12 left-12 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>
        </footer>
    );
};

export default Footer;

import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

const NavigationBar = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 py-6 px-8 md:px-12 ${scrolled ? 'bg-white/80 backdrop-blur-2xl py-4 shadow-xl border-b border-[#006C67]/5' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link to="/" className="flex items-center group">
                    <img src="/logo.png" alt="NIRIKSHAK Logo" className="h-12 md:h-14 w-auto group-hover:scale-105 transition-transform duration-300" />
                </Link>

                <div className="hidden md:flex items-center space-x-10">
                    <Link to="/" className="text-sm font-bold text-[#121212]/60 hover:text-[#121212] transition-colors tracking-wide uppercase">Home</Link>
                    <Link to="/about" className="text-sm font-bold text-[#121212]/60 hover:text-[#121212] transition-colors tracking-wide uppercase">Network</Link>
                    <Link
                        to="/dashboard"
                        className="px-8 py-3.5 rounded-2xl bg-[#FF4F00] text-white font-black text-xs tracking-widest uppercase hover:bg-[#e04500] transition-all shadow-lg hover:shadow-[0_0_30px_rgba(255,79,0,0.4)] flex items-center gap-2 active:scale-95"
                    >
                        <Shield className="w-4 h-4" /> Console
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default NavigationBar;


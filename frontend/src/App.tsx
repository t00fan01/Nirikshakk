import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NavigationBar from './components/NavigationBar.tsx';
import Home from './pages/Home.tsx';
import AboutUs from './pages/AboutUs.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Footer from './components/Footer.tsx';
import Preloader from './components/Preloader.tsx';
import SmoothScroll from './components/SmoothScroll.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="min-h-screen"
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/register" element={<Navigate to="/dashboard" replace />} />
          <Route path="/bank-workspace" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const AppContent = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  useEffect(() => {
  }, []);

  return (
    <div id="app">
      {!isDashboard && <NavigationBar />}
      <main className={!isDashboard ? "pt-24 min-h-screen px-4 md:px-8 relative" : "relative"}>
        <AnimatedRoutes />
      </main>
      {!isDashboard && <Footer />}
    </div>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && <Preloader key="preloader" />}
      </AnimatePresence>
      <Router>
        <SmoothScroll>
          <AppContent />
        </SmoothScroll>
      </Router>
    </>
  );
}

export default App;


import React from 'react';
import { ReactLenis } from '@studio-freight/react-lenis';
import { useLocation } from 'react-router-dom';

interface SmoothScrollProps {
    children: React.ReactNode;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
    const location = useLocation();
    // Dashboard uses its own internal overflow-y-auto scroll container inside
    // a h-screen overflow-hidden root div. Lenis running in root mode with
    // smoothWheel:true intercepts wheel events before they reach that container.
    // Disabling smoothWheel on dashboard lets native scrolling work correctly
    // within the dashboard's <main className="flex-grow overflow-y-auto"> container.
    const isDashboard = location.pathname.startsWith('/dashboard');

    const lenisOptions = {
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: !isDashboard,
        wheelMultiplier: 1.0,
        touchMultiplier: 2.0,
    };

    return (
        <ReactLenis root options={lenisOptions}>
            {children}
        </ReactLenis>
    );
}

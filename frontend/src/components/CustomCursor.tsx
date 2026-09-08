import { useEffect, useRef } from 'react';
import './Cursor.css';

const CustomCursor = () => {
    const dotRef = useRef<HTMLDivElement>(null);
    const circleRef = useRef<HTMLDivElement>(null);

    // Track positions globally without component re-renders
    const mousePos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const trailingPos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const requestRef = useRef<number>(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current.x = e.clientX;
            mousePos.current.y = e.clientY;
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName.toLowerCase() === 'button' ||
                target.tagName.toLowerCase() === 'a' ||
                target.tagName.toLowerCase() === 'input' ||
                target.closest('button') ||
                target.closest('a') ||
                target.classList.contains('hover-target')
            ) {
                if (circleRef.current) circleRef.current.classList.add('hovering');
            } else {
                if (circleRef.current) circleRef.current.classList.remove('hovering');
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseover', handleMouseOver);

        const updateCursor = () => {
            // Apply easing trailing calculation
            trailingPos.current.x += (mousePos.current.x - trailingPos.current.x) * 0.15;
            trailingPos.current.y += (mousePos.current.y - trailingPos.current.y) * 0.15;

            // Direct DOM manipulation - zero React State renders
            if (dotRef.current) {
                dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
            }

            if (circleRef.current) {
                circleRef.current.style.transform = `translate3d(${trailingPos.current.x}px, ${trailingPos.current.y}px, 0) translate(-50%, -50%)`;
            }

            requestRef.current = requestAnimationFrame(updateCursor);
        };

        requestRef.current = requestAnimationFrame(updateCursor);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseover', handleMouseOver);
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Ensure this component does not crash on mobile by hiding it
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
        return null; // the gooey cursor can be intense for mobile browsers
    }

    return (
        <div className="gooey-container">
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="0" height="0" style={{ position: 'absolute', display: 'none' }}>
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 35 -15" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            //  not in use as of now
            <div ref={circleRef} className="custom-cursor-circle" />
            <div ref={dotRef} className="custom-cursor-dot" />
        </div>
    );
};

export default CustomCursor;

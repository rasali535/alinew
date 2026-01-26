import React, { useEffect, useState } from 'react';

const Preloader = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // Initial wait before starting fade out to allow logo + tagline sequence
        const timer = setTimeout(() => {
            setIsFading(true);
        }, 4500);

        // Remove from DOM after fade completes
        const removeTimer = setTimeout(() => {
            setIsVisible(false);
        }, 5500);

        return () => {
            clearTimeout(timer);
            clearTimeout(removeTimer);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[99999] bg-brand-dark flex items-center justify-center transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'
                }`}
        >
            <div className="flex flex-col items-center">
                {/* Animated Rings (Restored) */}
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 border border-white/20 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute inset-2 border border-white/40 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s', animationDelay: '0.3s' }}></div>
                    <div className="absolute inset-4 border border-brand-green/60 rounded-full animate-pulse"></div>
                </div>

                {/* Logo/Name Reveal */}
                <div className="overflow-hidden mb-8">
                    <div className="flex flex-col items-center">
                        <span className="text-white text-2xl font-light tracking-[0.3em] mb-2">RAS ALI</span>
                        <div className="w-12 h-[1px] bg-brand-green"></div>
                    </div>
                </div>

                {/* Tagline Reveal with Zoom In/Out effect */}
                <div className="overflow-hidden mt-4">
                    <p className="text-brand-green/90 text-sm md:text-base font-medium tracking-[0.4em] uppercase opacity-0"
                        style={{ animation: 'zoomInOut 3s ease-in-out forwards', animationDelay: '0.5s' }}
                    >
                        THE FUTURE IS HARMONY AND LOGIC
                    </p>
                </div>
            </div>

            {/* Global style for the zoom animation if not in tailwind config */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes zoomInOut {
                    0% { transform: scale(0.8); opacity: 0; filter: blur(10px); }
                    30% { transform: scale(1.1); opacity: 1; filter: blur(0px); }
                    70% { transform: scale(1); opacity: 1; filter: blur(0px); }
                    100% { transform: scale(1.2); opacity: 0; filter: blur(5px); }
                }
            `}} />
        </div>
    );
};

export default Preloader;

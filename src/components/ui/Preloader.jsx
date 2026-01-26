import React, { useEffect, useState } from 'react';

const Preloader = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // Initial wait before starting fade out to allow tagline animation
        const timer = setTimeout(() => {
            setIsFading(true);
        }, 3000);

        // Remove from DOM after fade completes
        const removeTimer = setTimeout(() => {
            setIsVisible(false);
        }, 4000);

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
                {/* Logo/Name Reveal */}
                <div className="overflow-hidden mb-6">
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <span className="text-white text-3xl font-light tracking-[0.3em] mb-4">RAS ALI</span>
                        <div className="w-16 h-[1px] bg-brand-green"></div>
                    </div>
                </div>

                {/* Tagline Reveal with Zoom In/Out effect */}
                <div className="overflow-hidden">
                    <p className="text-brand-green/90 text-sm md:text-base font-medium tracking-[0.4em] uppercase 
                        animate-[zoomInOut_2s_ease-in-out_infinite] opacity-0"
                        style={{ animation: 'zoomInOut 2.5s ease-in-out forwards' }}
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

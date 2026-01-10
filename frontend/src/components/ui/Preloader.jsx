import React, { useEffect, useState } from 'react';

const Preloader = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        // Initial wait before starting fade out
        const timer = setTimeout(() => {
            setIsFading(true);
        }, 1500);

        // Remove from DOM after fade completes
        const removeTimer = setTimeout(() => {
            setIsVisible(false);
        }, 2500);

        return () => {
            clearTimeout(timer);
            clearTimeout(removeTimer);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[99999] bg-[#0a0a0a] flex items-center justify-center transition-opacity duration-1000 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'
                }`}
        >
            <div className="flex flex-col items-center">
                {/* Animated Rings */}
                <div className="relative w-24 h-24 mb-8">
                    <div className="absolute inset-0 border border-white/20 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s' }}></div>
                    <div className="absolute inset-2 border border-white/40 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s', animationDelay: '0.3s' }}></div>
                    <div className="absolute inset-4 border border-lime-400/60 rounded-full animate-pulse"></div>
                </div>

                {/* Text Reveal */}
                <div className="overflow-hidden">
                    <div className="flex flex-col items-center animate-[slideUp_1s_ease-out_forwards]">
                        <span className="text-white text-2xl font-light tracking-[0.2em] mb-2">RAS ALI</span>
                        <div className="w-12 h-[1px] bg-lime-400"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Preloader;

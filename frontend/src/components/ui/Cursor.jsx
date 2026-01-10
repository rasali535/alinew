import React, { useEffect, useState, useRef } from 'react';

const Cursor = () => {
    const cursorRef = useRef(null);
    const cursorDotRef = useRef(null);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const cursor = cursorRef.current;
        const cursorDot = cursorDotRef.current;

        let mouseX = 0;
        let mouseY = 0;
        let cursorX = 0;
        let cursorY = 0;

        const onMouseMove = (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            // Move dot instantly
            if (cursorDot) {
                cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
            }
        };

        const onMouseDown = () => {
            if (cursor) cursor.style.transform = `translate(${cursorX - 25}px, ${cursorY - 25}px) scale(0.8)`;
        };

        const onMouseUp = () => {
            if (cursor) cursor.style.transform = `translate(${cursorX - 25}px, ${cursorY - 25}px) scale(${isHovering ? 1.5 : 1})`;
        };

        // Add event listeners for hover effects on interactive elements
        const handleMouseOver = (e) => {
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a') || e.target.closest('button')) {
                setIsHovering(true);
            }
        };

        const handleMouseOut = (e) => {
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a') || e.target.closest('button')) {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);

        // Animation loop for smooth following
        const animate = () => {
            const dx = mouseX - cursorX;
            const dy = mouseY - cursorY;

            cursorX += dx * 0.15; // Smooth factor
            cursorY += dy * 0.15;

            if (cursor) {
                // Adjust for center of the circle (50px width/height -> 25px offset)
                const scale = isHovering ? 1.5 : 1;
                cursor.style.transform = `translate(${cursorX - 25}px, ${cursorY - 25}px) scale(${scale})`;
            }

            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
            cancelAnimationFrame(animationId);
        };
    }, [isHovering]);

    // Hide on touch devices
    if (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return null;
    }

    return (
        <>
            {/* Outer Circle */}
            <div
                ref={cursorRef}
                className="fixed top-0 left-0 w-[50px] h-[50px] border border-lime-400 rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:block transition-transform duration-100 ease-out will-change-transform"
            />

            {/* Inner Dot */}
            <div
                ref={cursorDotRef}
                className="fixed top-0 left-0 w-2 h-2 bg-lime-400 rounded-full pointer-events-none z-[9999] -ml-1 -mt-1 hidden md:block"
            />
        </>
    );
};

export default Cursor;

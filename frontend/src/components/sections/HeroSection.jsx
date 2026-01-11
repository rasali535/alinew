import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { heroWords, companyInfo } from '../../data/mock';

const HeroSection = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % heroWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen bg-[#0a0a0a] pt-32 pb-20 px-6 lg:px-12 flex flex-col justify-between overflow-hidden">
      {/* Background Moving Graphics */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-brand-green/10 rounded-full blur-[120px] transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${mousePos.x * -20}px, ${mousePos.y * 20}px)`
          }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px] transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${mousePos.x * 20}px, ${mousePos.y * -20}px)`
          }}
        />
      </div>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto w-full relative z-10"
        style={{
          transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)`,
          transition: 'transform 0.1s ease-out'
        }}>
        <div className="mb-20">
          <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-light italic tracking-tight leading-tight">
            MULTI-DISCIPLINARY
          </h1>
          <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-light italic tracking-tight leading-tight">
            CREATIVE &
          </h1>
          <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-light italic tracking-tight leading-tight">
            TECHNOLOGIST.
          </h1>
        </div>
      </div>

      {/* Animated Words Section */}
      <div className="overflow-hidden py-8 relative z-10">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="text-white/10 text-6xl md:text-8xl lg:text-9xl font-light tracking-tight mx-8 transition-colors duration-300 hover:text-white/20"
            >
              {heroWords[i % heroWords.length]}
            </span>
          ))}
        </div>
      </div>

      {/* Large Brand Name */}
      <div className="relative overflow-hidden z-10">
        <h2
          className="text-white text-[12vw] md:text-[14vw] lg:text-[16vw] font-light tracking-tighter leading-none transition-transform duration-100 ease-out"
          style={{
            transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 10}px)`
          }}
        >
          ras ali
        </h2>
      </div>

      {/* Bottom Info */}
      <div className="max-w-7xl mx-auto w-full mt-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-end">
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-2">
              {companyInfo.tagline}
            </p>
            <p className="text-white/50 text-xs">{companyInfo.location}</p>
          </div>
          <div className="lg:col-span-2">
            <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
              {companyInfo.description}
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-white mt-4 text-sm hover:text-brand-green transition-colors duration-300 group"
            >
              About ME
              <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

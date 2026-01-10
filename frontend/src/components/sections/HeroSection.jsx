import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { heroWords, companyInfo } from '../../data/mock';

const HeroSection = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % heroWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="min-h-screen bg-[#0a0a0a] pt-32 pb-20 px-6 lg:px-12 flex flex-col justify-between">
      {/* Hero Content */}
      <div className="max-w-7xl mx-auto w-full">
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
      <div className="overflow-hidden py-8">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="text-white/10 text-6xl md:text-8xl lg:text-9xl font-light tracking-tight mx-8"
            >
              {heroWords[i % heroWords.length]}
            </span>
          ))}
        </div>
      </div>

      {/* Large Brand Name */}
      <div className="relative overflow-hidden">
        <h2 className="text-white text-[12vw] md:text-[14vw] lg:text-[16vw] font-light tracking-tighter leading-none">
          ras ali
        </h2>
      </div>

      {/* Bottom Info */}
      <div className="max-w-7xl mx-auto w-full mt-12">
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
              className="inline-flex items-center gap-2 text-white mt-4 text-sm hover:text-lime-400 transition-colors duration-300 group"
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

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Cpu, Bot, TrendingUp, Layers } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative pt-36 pb-24 px-6 lg:px-12 bg-gradient-to-b from-[#181818] via-[#141414] to-[#181818] overflow-hidden text-white">
      {/* Dynamic Background Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[480px] bg-gradient-to-r from-brand-gold/15 via-amber-500/10 to-purple-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 text-center">
        {/* Flagship Brand Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles size={14} className="animate-pulse text-brand-gold" />
          <span>RALION OS • EMPOWERED TO PROSPER</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto mb-6 leading-[1.08] bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
          AI Business Operating Systems for the Next Generation of Companies
        </h1>

        {/* Descriptive Subheadline */}
        <p className="text-white/75 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
          Run your business with one intelligent operating system for customers, operations, growth, social intelligence and AI-powered decision making.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            to="/products/ralion"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-brand-gold/20 flex items-center gap-2"
          >
            Explore Ralion OS <ArrowRight size={18} />
          </Link>

          <Link
            to="/request-demo"
            className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all border border-white/15 flex items-center gap-2 backdrop-blur-sm"
          >
            Book an Enterprise Demo
          </Link>
        </div>

        {/* One Command Center Architecture Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto pt-8 border-t border-white/10 text-left">
          <div className="bg-[#1c1c1c]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:border-brand-gold/30 transition-colors">
            <div className="text-brand-gold font-bold text-sm mb-1 flex items-center gap-1.5">
              <Cpu size={16} /> Ralion OS
            </div>
            <div className="text-white/60 text-xs">Unified workspace for operations, CRM, growth and automation.</div>
          </div>

          <div className="bg-[#1c1c1c]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:border-purple-400/30 transition-colors">
            <div className="text-purple-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <Bot size={16} /> Mari AI
            </div>
            <div className="text-white/60 text-xs">Your AI Business Growth Partner embedded in every workflow.</div>
          </div>

          <div className="bg-[#1c1c1c]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:border-emerald-400/30 transition-colors">
            <div className="text-emerald-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <TrendingUp size={16} /> Growth & Social
            </div>
            <div className="text-white/60 text-xs">Closed-loop AI campaigns, creative generation & social analytics.</div>
          </div>

          <div className="bg-[#1c1c1c]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 hover:border-blue-400/30 transition-colors">
            <div className="text-blue-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <ShieldCheck size={16} /> Enterprise Security
            </div>
            <div className="text-white/60 text-xs">Bank-grade multi-tenant isolation, row-level security & auditability.</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

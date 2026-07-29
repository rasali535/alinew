import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShieldCheck, Cpu, Bot, CheckCircle2 } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative pt-36 pb-24 px-6 lg:px-12 bg-gradient-to-b from-[#1c1c1c] via-[#181818] to-[#1c1c1c] overflow-hidden text-white">
      {/* Background Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-r from-brand-gold/15 via-purple-500/10 to-emerald-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles size={14} /> Enterprise AI Technology & Operating Systems
        </div>

        {/* Task 5 Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto mb-6 leading-[1.1] bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
          AI-Powered Operating Systems for Modern Enterprises
        </h1>

        {/* Task 5 Subheadline */}
        <p className="text-white/70 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
          Ras Ali Labs builds intelligent platforms that automate operations, connect teams, and help organisations make smarter decisions through AI.
        </p>

        {/* Task 5 CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            to="/request-demo"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
          >
            Request Enterprise Demo <ArrowRight size={18} />
          </Link>

          <Link
            to="/products/ralion"
            className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/10 flex items-center gap-2"
          >
            Explore Ralion OS
          </Link>

          <Link
            to="/solutions"
            className="px-6 py-4 rounded-xl bg-purple-600/20 text-purple-300 font-bold text-sm hover:bg-purple-600/30 transition-all border border-purple-500/30 flex items-center gap-2"
          >
            Industry Solutions
          </Link>
        </div>

        {/* Enterprise Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-white/10 text-left">
          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
            <div className="text-brand-gold font-bold text-sm mb-1 flex items-center gap-1.5">
              <Cpu size={16} /> Ralion OS
            </div>
            <div className="text-white/60 text-xs">AI Business Operating System for unified enterprise management.</div>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
            <div className="text-purple-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <Bot size={16} /> Mari AI Engine
            </div>
            <div className="text-white/60 text-xs">Reasoning agents for document RAG & automated insights.</div>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
            <div className="text-emerald-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <ShieldCheck size={16} /> Enterprise Security
            </div>
            <div className="text-white/60 text-xs">Bank-grade tenant isolation, row-level security & encrypted vaults.</div>
          </div>

          <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
            <div className="text-blue-400 font-bold text-sm mb-1 flex items-center gap-1.5">
              <CheckCircle2 size={16} /> 4 Industry OS
            </div>
            <div className="text-white/60 text-xs">Tailored suites for Funeral, Logistics, Healthcare & Trade.</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

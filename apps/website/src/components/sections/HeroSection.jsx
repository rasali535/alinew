import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Video, Code, Music, Bot, Layers } from 'lucide-react';
import { companyInfo } from '../../data/mock';

const HeroSection = () => {
  return (
    <section className="relative pt-36 pb-24 px-6 lg:px-12 bg-gradient-to-b from-[#141414] via-[#101010] to-[#141414] overflow-hidden text-white border-b border-white/10">
      {/* Dynamic Background Glow Effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[480px] bg-gradient-to-r from-brand-gold/15 via-amber-500/10 to-purple-600/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 text-center">
        {/* Parent Brand Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase tracking-wider mb-6">
          <Sparkles size={14} className="animate-pulse text-brand-gold" />
          <span>RAS ALI LABS • TECHNOLOGY. FILM. SOUND. INNOVATION.</span>
        </div>

        {/* Primary Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto mb-6 leading-[1.08] bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
          {companyInfo.headline}
        </h1>

        {/* Descriptive Subheadline */}
        <p className="text-white/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
          {companyInfo.subheadline}
        </p>

        {/* Primary & Secondary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link
            to="/services"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-sm hover:scale-105 transition-all shadow-xl shadow-brand-gold/20 flex items-center gap-2"
          >
            Explore Our Services <ArrowRight size={18} />
          </Link>

          <Link
            to="/work"
            className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all border border-white/15 flex items-center gap-2 backdrop-blur-sm"
          >
            View Our Work
          </Link>

          <Link
            to="/products/ralion-os"
            className="px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-brand-gold font-semibold text-sm transition-all border border-brand-gold/30 flex items-center gap-2"
          >
            <Sparkles size={15} /> Discover Ralion OS
          </Link>
        </div>

        {/* 4 Core Pillars Preview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto pt-8 border-t border-white/10 text-left">
          <Link
            to="/services/film-video"
            className="bg-[#1a1a1a]/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-brand-gold/40 hover:-translate-y-1 transition-all group"
          >
            <div className="text-brand-gold font-bold text-sm mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Video size={18} /> Film & Production
              </span>
              <span className="text-white/30 text-xs group-hover:text-brand-gold transition-colors">→</span>
            </div>
            <div className="text-white/65 text-xs leading-relaxed">Cinematic films, commercials, multi-camera shoots and post-production.</div>
          </Link>

          <Link
            to="/services/web-app-development"
            className="bg-[#1a1a1a]/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-brand-gold/40 hover:-translate-y-1 transition-all group"
          >
            <div className="text-emerald-400 font-bold text-sm mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Code size={18} /> Web & App Dev
              </span>
              <span className="text-white/30 text-xs group-hover:text-emerald-400 transition-colors">→</span>
            </div>
            <div className="text-white/65 text-xs leading-relaxed">Modern web applications, mobile apps, business portals and platforms.</div>
          </Link>

          <Link
            to="/services/music-audio"
            className="bg-[#1a1a1a]/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-brand-gold/40 hover:-translate-y-1 transition-all group"
          >
            <div className="text-purple-400 font-bold text-sm mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Music size={18} /> Music & Audio
              </span>
              <span className="text-white/30 text-xs group-hover:text-purple-400 transition-colors">→</span>
            </div>
            <div className="text-white/65 text-xs leading-relaxed">Original music composition, studio recording, sound design and audio engineering.</div>
          </Link>

          <Link
            to="/services/ai-automation"
            className="bg-[#1a1a1a]/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 hover:border-brand-gold/40 hover:-translate-y-1 transition-all group"
          >
            <div className="text-amber-400 font-bold text-sm mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bot size={18} /> AI & Automation
              </span>
              <span className="text-white/30 text-xs group-hover:text-amber-400 transition-colors">→</span>
            </div>
            <div className="text-white/65 text-xs leading-relaxed">Intelligent workflows, reasoning systems and enterprise digital transformation.</div>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Video, Code, Music, Bot, Layers, Brain, TrendingUp, Share2, Database } from 'lucide-react';
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
            <div className="text-white/65 text-xs leading-relaxed">Cinematic films, commercials, television productions and post-production.</div>
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

        {/* Mari AI Product Moment */}
        <div className="mt-12 max-w-6xl mx-auto text-left rounded-[2rem] border border-purple-400/20 bg-gradient-to-br from-[#111827] via-[#151525] to-[#111111] overflow-hidden shadow-2xl shadow-purple-950/30 relative">
          <div className="absolute -top-24 right-12 w-72 h-72 rounded-full bg-purple-500/20 blur-[90px] pointer-events-none"></div>
          <div className="absolute -bottom-20 left-16 w-64 h-64 rounded-full bg-brand-gold/10 blur-[100px] pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-7 md:p-10 relative z-10">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-400/25 text-purple-300 text-[11px] font-bold uppercase tracking-[0.18em] mb-5">
                <Bot size={14} /> Meet Mari AI
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-5">
                Your business already has information. <span className="text-purple-300">Mari helps you use it.</span>
              </h2>
              <p className="text-white/70 text-sm md:text-base leading-relaxed max-w-2xl mb-7">
                Mari is the AI intelligence inside Ralion OS. She works with the business context Ralion has been given to help you understand what is happening, plan marketing, generate ideas and move decisions toward action across the platform.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <Brain size={17} className="text-purple-300 shrink-0" />
                  <span className="text-xs text-white/80">Understands your business context</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                  <TrendingUp size={17} className="text-brand-gold shrink-0" />
                  <span className="text-xs text-white/80">Turns insight into growth direction</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/mari-ai"
                  className="px-6 py-3.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  Meet Mari <ArrowRight size={15} />
                </Link>
                <a
                  href="/ralion/register"
                  className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all flex items-center gap-2"
                >
                  Start with Ralion OS <Sparkles size={14} className="text-brand-gold" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5 md:p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Ralion Intelligence Layer</span>
                  <span className="text-[10px] text-emerald-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Connected</span>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="space-y-2">
                    {[
                      ['Business profile', Database],
                      ['Goals & activity', TrendingUp],
                      ['Approved sources', Layers],
                    ].map(([label, Icon]) => (
                      <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-2">
                        <Icon size={14} className="text-white/55" />
                        <span className="text-[10px] text-white/65">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="relative flex items-center justify-center px-1">
                    <div className="absolute w-24 h-24 rounded-full bg-purple-500/30 blur-2xl animate-pulse"></div>
                    <div className="relative w-20 h-20 rounded-full border border-purple-300/50 bg-gradient-to-br from-purple-400/30 via-purple-600/20 to-brand-gold/20 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.25)]">
                      <Bot size={30} className="text-white" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      ['Growth', TrendingUp],
                      ['Social', Share2],
                      ['Action', Sparkles],
                    ].map(([label, Icon]) => (
                      <div key={label} className="rounded-xl border border-purple-400/15 bg-purple-400/5 p-3 flex items-center gap-2">
                        <Icon size={14} className="text-purple-300" />
                        <span className="text-[10px] text-white/75">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-white/[0.04] border border-white/10 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-purple-300 font-bold mb-2">You</div>
                  <p className="text-xs text-white/80 mb-3">“Mari, what should we focus our marketing on this month?”</p>
                  <div className="text-[10px] uppercase tracking-wider text-brand-gold font-bold mb-2">Mari</div>
                  <p className="text-xs text-white/60 leading-relaxed">“Based on your business context and growth goals, here are the three opportunities I would prioritise…”</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

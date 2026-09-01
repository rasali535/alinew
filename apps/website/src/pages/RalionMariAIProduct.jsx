import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Bot, Sparkles, ArrowRight, Brain, Zap, Layers, TrendingUp, ShieldCheck, CheckCircle2, Activity } from 'lucide-react';

const RalionMariAIProduct = () => {
  return (
    <div className="min-h-screen bg-[#181818] text-white pt-32 pb-24 px-6 lg:px-12">
      <SEO
        title="Mari AI — Your AI Business Growth Partner | Ralion OS"
        description="Mari AI is the embedded reasoning partner in Ralion OS. Strategic growth recommendations, automated market intelligence, creative direction, and closed-loop learning."
        url="/products/ralion-mari-ai"
      />

      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Bot size={14} /> Flagship AI Partner • Mari AI
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
            Mari AI — Your AI Business Growth Partner
          </h1>
          <p className="text-brand-gold font-bold text-xl md:text-2xl mb-6">
            Empowered to Prosper — Executive intelligence embedded directly inside your operating system.
          </p>
          <p className="text-white/70 text-base md:text-lg max-w-3xl mx-auto leading-relaxed mb-10">
            Mari AI is not just a chatbot. Working within your organization's permission-bounded business context, Mari acts as an executive growth partner: analyzing deal velocity, discovering untapped market opportunities, formulating marketing campaigns, and directing automated creative production.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/ralion/register"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-purple-600/25 flex items-center gap-2"
            >
              Start Free with Mari AI <ArrowRight size={16} />
            </Link>
            <Link
              to="/request-demo"
              className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all border border-white/15"
            >
              Book an Enterprise Walkthrough
            </Link>
          </div>
        </div>

        {/* 4 Pillars of Mari AI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <div className="bg-[#1f1f1f] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Bot size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Strategic Intelligence</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Executive business partner analyzing pipeline signals, deal bottlenecks, and revenue growth paths.
            </p>
          </div>

          <div className="bg-[#1f1f1f] border border-white/10 rounded-3xl p-6 hover:border-brand-gold/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
              <Brain size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Tenant Knowledge Vault</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Private, vector-indexed memory of your company offerings, catalogs, client notes, and past deals.
            </p>
          </div>

          <div className="bg-[#1f1f1f] border border-white/10 rounded-3xl p-6 hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Creative Direction</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Directs FLUX commercial poster generation and CogVideoX reels tailored to your target demographics.
            </p>
          </div>

          <div className="bg-[#1f1f1f] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Activity size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Closed-Loop Learning</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Learns from social engagement and customer conversions to continuously improve future recommendations.
            </p>
          </div>
        </div>

        {/* Security & Governance Notice */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-4">
            <ShieldCheck size={32} className="text-purple-400 shrink-0" />
            <div>
              <h4 className="text-white font-bold text-sm mb-0.5">Tenant-Scoped & Permission-Aware AI</h4>
              <p>Mari AI respects organization boundaries. Your proprietary business data is never shared across tenants or used for public AI model training.</p>
            </div>
          </div>
          <Link
            to="/request-demo"
            className="py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shrink-0"
          >
            Deploy Mari AI
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RalionMariAIProduct;

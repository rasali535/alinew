import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { generateMariAIResponse } from '../lib/mariAI';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import {
  UserCheck,
  Bot,
  BarChart3,
  Database,
  Zap,
  TrendingUp,
  PieChart,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Send,
  MessageSquare
} from 'lucide-react';

const RalionCRMProduct = () => {
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const handleTestMariAI = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setLoadingAi(true);
    analytics.trackProductEvent('mari_ai_crm_demo', { query: aiQuery });
    const res = await generateMariAIResponse(
      `Analyze lead opportunity and suggest next sales action for: ${aiQuery}`,
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'You are Mari AI Sales Assistant inside Ralion CRM. Provide a concise, actionable lead opportunity analysis and next follow-up action.'
    );
    setAiResponse(res);
    setLoadingAi(false);
  };

  return (
    <div className="min-h-screen bg-[#181818] text-white pt-32 pb-24 px-6 lg:px-12">
      <SEO
        title="Ralion CRM — Customer & Pipeline Intelligence | Ralion OS"
        description="Accelerate deal closing with Ralion CRM. Contextual customer memory, dynamic pipelines, predictive opportunity scoring, and automated follow-ups."
        canonical="https://rasalilabs.com/products/ralion-crm"
      />

      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <UserCheck size={14} /> Core Workspace Suite • Ralion CRM
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
            Customer & Pipeline Intelligence
          </h1>
          <p className="text-brand-gold font-bold text-xl md:text-2xl mb-6">
            Empowered to Prosper — Turn every customer interaction into revenue momentum.
          </p>
          <p className="text-white/70 text-base md:text-lg max-w-3xl mx-auto leading-relaxed mb-10">
            Access deep customer memory, visualize your deal pipeline, score opportunity velocity, and trigger automated client follow-ups from one intelligent workspace powered by Mari AI.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/ralion/register"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-brand-gold/25 flex items-center gap-2"
            >
              Start Free CRM <ArrowRight size={16} />
            </Link>
            <Link
              to="/request-demo"
              className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all border border-white/15"
            >
              Book an Enterprise Demo
            </Link>
          </div>
        </div>

        {/* Interactive Mari AI Sales Co-Pilot Sandbox */}
        <div className="bg-[#1f1f1f] border border-brand-gold/30 rounded-3xl p-8 mb-20 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Interactive Sales Opportunity Analyzer</h3>
              <p className="text-white/50 text-xs">Simulate Mari AI opportunity scoring and recommended follow-up strategy.</p>
            </div>
          </div>

          <form onSubmit={handleTestMariAI} className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. Inquired about enterprise fleet transport cover for 40 cross-border trucks..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-brand-gold"
              />
              <button
                type="submit"
                disabled={loadingAi}
                className="px-6 py-3 rounded-xl bg-brand-gold hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition-colors"
              >
                {loadingAi ? 'Analyzing Deal...' : 'Analyze Opportunity'} <Send size={14} />
              </button>
            </div>
          </form>

          {aiResponse && (
            <div className="p-6 rounded-2xl bg-black/60 border border-brand-gold/20 text-xs text-white/90 leading-relaxed whitespace-pre-wrap">
              <div className="text-brand-gold font-bold mb-2">Mari AI Deal Analysis:</div>
              {aiResponse}
            </div>
          )}
        </div>

        {/* 4 Core Pillars of Ralion CRM */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <div className="bg-[#1f1f1f] border border-white/10 rounded-3xl p-6 hover:border-brand-gold/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
              <Database size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Customer Memory</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Unified client profiles recording interaction history, contracts, quotes, and notes in sub-second search.
            </p>
          </div>

          <div className="bg-[#1f1f1f] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <BarChart3 size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Deal Progression</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Visual Kanban boards with automatic stale-deal warnings, deal bottleneck detection, and forecasting.
            </p>
          </div>

          <div className="bg-[#1f1f1f] border border-white/10 rounded-3xl p-6 hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Zap size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Automated Triggers</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Event-driven follow-up alerts and task creation ensure no high-value leads are dropped.
            </p>
          </div>

          <div className="bg-[#1f1f1f] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Predictive Scoring</h4>
            <p className="text-white/60 text-xs leading-relaxed">
              Algorithmic scoring that ranks prospective clients based on engagement signals and conversion readiness.
            </p>
          </div>
        </div>

        {/* Enterprise Bottom Banner */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-4">
            <ShieldCheck size={32} className="text-brand-gold shrink-0" />
            <div>
              <h4 className="text-white font-bold text-sm mb-0.5">Sovereign Multi-Tenant Data Protection</h4>
              <p>Customer data is strictly isolated using Supabase row-level security and encrypted at rest.</p>
            </div>
          </div>
          <Link
            to="/ralion/register"
            className="py-3 px-6 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform shrink-0"
          >
            Launch Ralion CRM
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RalionCRMProduct;

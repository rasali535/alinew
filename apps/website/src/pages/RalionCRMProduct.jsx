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
      'openai/gpt-4o',
      'You are Mari AI Sales Assistant inside Ralion CRM. Provide a concise, actionable lead opportunity analysis and next follow-up action.'
    );
    setAiResponse(res);
    setLoadingAi(false);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Ralion CRM — AI Customer Intelligence & Sales Assistant | Ras Ali Labs"
        description="Accelerate deal closing with Ralion CRM. AI customer intelligence, smart pipeline management, customer memory, and opportunity scoring."
      />

      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <UserCheck size={14} /> Priority Core Product • Ralion CRM
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            Turn every customer interaction into business intelligence.
          </h1>
          <p className="text-brand-gold font-bold text-lg mb-6">
            "Ralion does not just manage contacts. It understands your business, predicts opportunities, and helps you grow."
          </p>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed mb-8">
            Access deep customer profiles, manage your sales pipeline, track customer history, receive AI recommendations, and execute automated follow-ups—all in one place.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/request-demo"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
            >
              Request Enterprise Demo <ArrowRight size={16} />
            </Link>
            <Link
              to="/ralion/community"
              className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/10"
            >
              Start Free Community Edition
            </Link>
          </div>
        </div>

        {/* Live Mari AI Sales Assistant Sandbox */}
        <div className="bg-[#252525] border border-brand-gold/30 rounded-3xl p-8 mb-20 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Interactive AI Sales Assistant Sandbox</h3>
              <p className="text-white/50 text-xs">Test Mari AI lead scoring & opportunity reasoning powered by AIML API GPT-4o.</p>
            </div>
          </div>

          <form onSubmit={handleTestMariAI} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. Client requested quote for 50 fleet transport units in Botswana..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
              />
              <button
                type="submit"
                disabled={loadingAi}
                className="py-3 px-6 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform flex items-center gap-2"
              >
                {loadingAi ? 'Reasoning...' : <><Send size={14} /> Analyze Lead</>}
              </button>
            </div>
          </form>

          {aiResponse && (
            <div className="mt-4 p-4 rounded-xl bg-black/60 border border-brand-gold/20 text-xs text-white/90 leading-relaxed font-mono">
              <div className="text-brand-gold font-bold mb-1 flex items-center gap-1.5">
                <Sparkles size={14} /> Mari AI Sales Intelligence Output:
              </div>
              {aiResponse}
            </div>
          )}
        </div>

        {/* Core Features Grid */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-brand-gold text-xs font-bold uppercase tracking-widest block mb-2">
              Capabilities & Features
            </span>
            <h2 className="text-3xl font-extrabold text-white">AI-Powered Sales Engine</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-6">
                <UserCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Customer Intelligence</h3>
              <p className="text-white/60 text-sm">Deep client profiling with automated intent detection, behavioral history, and predictive buying signals.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
                <Bot size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Sales Assistant</h3>
              <p className="text-white/60 text-sm">Mari AI co-pilot drafts tailored email responses, prepares meeting briefs, and recommends next follow-up actions.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Smart Pipeline Management</h3>
              <p className="text-white/60 text-sm">Dynamic Kanban views with automated stage progression, stale deal alerts, and bottleneck detection.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
                <Database size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Contextual Customer Memory</h3>
              <p className="text-white/60 text-sm">Sub-second vector search across past emails, call logs, contracts, and support tickets for instant memory.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Follow-ups</h3>
              <p className="text-white/60 text-sm">Event-driven follow-up triggers ensuring zero leads are forgotten or dropped across long sales cycles.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-6">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Predictive Opportunity Scoring</h3>
              <p className="text-white/60 text-sm">Algorithmic lead scoring ranking high-probability revenue deals based on engagement and budget markers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RalionCRMProduct;

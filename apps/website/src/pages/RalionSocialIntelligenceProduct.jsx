import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { generateMariAIResponse } from '../lib/mariAI';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import {
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Users,
  Activity,
  Layers,
  Share2,
  Zap,
  Globe,
  Bot,
  ArrowRight,
  Send,
  CheckCircle2
} from 'lucide-react';

const RalionSocialIntelligenceProduct = () => {
  const [strategyPrompt, setStrategyPrompt] = useState('');
  const [aiStrategy, setAiStrategy] = useState('');
  const [loadingStrategy, setLoadingStrategy] = useState(false);

  const handleGenerateStrategy = async (e) => {
    e.preventDefault();
    if (!strategyPrompt.trim()) return;
    setLoadingStrategy(true);
    analytics.trackProductEvent('mari_ai_growth_demo', { prompt: strategyPrompt });
    const res = await generateMariAIResponse(
      `Develop an enterprise AI growth strategy and content campaign plan for: ${strategyPrompt}`,
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'You are Mari AI Marketing Strategist inside Ralion AI Growth Engine. Provide a high-impact, brand intelligence strategy, audience analysis, and CRM-connected campaign plan.'
    );
    setAiStrategy(res);
    setLoadingStrategy(false);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Ralion Social Intelligence Marketing — The AI Marketing Strategist | Ras Ali Labs"
        description="Scale your enterprise with Ralion Social Intelligence Marketing. AI campaign planning, brand intelligence, social listening, and CRM-connected campaigns."
      />

      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <TrendingUp size={14} /> Priority Core Product • Ralion Social Intelligence
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            Ralion Social Intelligence
          </h1>
          <p className="text-brand-gold font-bold text-lg mb-6">
            "Ralion does not just manage your business activity. It understands your business, predicts opportunities, and helps you grow."
          </p>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed mb-8">
            Positioned as your autonomous AI marketing strategist. Beyond basic social scheduling, Ralion performs brand intelligence, social listening, audience analysis, and executes CRM-connected growth campaigns.
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

        {/* Live Mari AI Growth Strategist Sandbox */}
        <div className="bg-[#252525] border border-purple-500/30 rounded-3xl p-8 mb-20 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Interactive AI Marketing Strategist Sandbox</h3>
              <p className="text-white/50 text-xs">Generate enterprise growth campaigns powered by Llama 3.3 70B & Mari AI Reasoning.</p>
            </div>
          </div>

          <form onSubmit={handleGenerateStrategy} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="e.g. Launch SADC cross-border B2B trade campaign targeting logistics directors..."
                value={strategyPrompt}
                onChange={(e) => setStrategyPrompt(e.target.value)}
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                disabled={loadingStrategy}
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-brand-gold text-white font-bold text-xs hover:scale-105 transition-transform flex items-center gap-2"
              >
                {loadingStrategy ? 'Generating Strategy...' : <><Send size={14} /> Generate Growth Plan</>}
              </button>
            </div>
          </form>

          {aiStrategy && (
            <div className="mt-4 p-4 rounded-xl bg-black/60 border border-purple-500/20 text-xs text-white/90 leading-relaxed font-mono">
              <div className="text-purple-400 font-bold mb-1 flex items-center gap-1.5">
                <Bot size={14} /> Mari AI Growth Strategist Output:
              </div>
              {aiStrategy}
            </div>
          )}
        </div>

        {/* Growth Engine Features Grid */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-brand-gold text-xs font-bold uppercase tracking-widest block mb-2">
              Autonomous Growth Architecture
            </span>
            <h2 className="text-3xl font-extrabold text-white">Features Beyond Traditional Schedulers</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <Sparkles size={20} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">AI Campaign Planning</h4>
              <p className="text-white/60 text-xs leading-relaxed">Strategic multi-channel campaign blueprints generated automatically from your revenue targets.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
                <ShieldCheck size={20} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Brand Intelligence</h4>
              <p className="text-white/60 text-xs leading-relaxed">Continuous monitoring of your brand positioning, tone of voice, and competitive market share.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Users size={20} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Audience Analysis</h4>
              <p className="text-white/60 text-xs leading-relaxed">Deep customer demographic & psychographic segmentation derived directly from CRM data.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <Activity size={20} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Social Listening</h4>
              <p className="text-white/60 text-xs leading-relaxed">Real-time sentiment monitoring tracking brand mentions, industry keywords, and purchase intent.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <Layers size={20} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Content Strategy</h4>
              <p className="text-white/60 text-xs leading-relaxed">Data-driven editorial calendars and topical clusters tailored to your target markets.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                <Share2 size={20} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Multi-Platform Creation</h4>
              <p className="text-white/60 text-xs leading-relaxed">Automated generation of long-form articles, executive posts, press releases, and visual assets.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                <Zap size={20} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Marketing Automation</h4>
              <p className="text-white/60 text-xs leading-relaxed">Multi-step nurture workflows connecting engagement signals to sales demo bookings.</p>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Globe size={20} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">CRM-Connected</h4>
              <p className="text-white/60 text-xs leading-relaxed">Direct revenue attribution linking marketing campaigns to closed-won deals in Ralion CRM.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RalionSocialIntelligenceProduct;

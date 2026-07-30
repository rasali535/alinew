import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Bot, Sparkles, ArrowRight, Brain, Zap, Layers } from 'lucide-react';

const RalionMariAIProduct = () => {
  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Mari AI — The Intelligence Layer Powering Ralion | Ras Ali Labs"
        description="Mari AI provides business assistance, knowledge memory, recommendations, and AI workflows for your enterprise."
      />

      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Bot size={14} /> Priority Core Product • Mari AI
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            The intelligence layer powering Ralion.
          </h1>
          <p className="text-brand-gold font-bold text-lg mb-6">
            "Your intelligent business assistant."
          </p>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed mb-8">
            Mari AI brings deep reasoning, knowledge memory, recommendations, and advanced automation to every part of your business OS.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/request-demo"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
            >
              Request Enterprise Demo <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Bot size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Business Assistant</h4>
            <p className="text-white/60 text-xs leading-relaxed">Always available AI co-pilot to help draft emails, analyze reports, and execute tasks.</p>
          </div>
          
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
              <Brain size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Knowledge Memory</h4>
            <p className="text-white/60 text-xs leading-relaxed">Secure, vector-based retrieval that remembers past interactions and company documents.</p>
          </div>

          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Sparkles size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Recommendations</h4>
            <p className="text-white/60 text-xs leading-relaxed">Proactive insights identifying sales opportunities, operational bottlenecks, and risk factors.</p>
          </div>

          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Zap size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">AI Workflows</h4>
            <p className="text-white/60 text-xs leading-relaxed">Autonomous agents capable of chaining together complex actions across your organization.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RalionMariAIProduct;

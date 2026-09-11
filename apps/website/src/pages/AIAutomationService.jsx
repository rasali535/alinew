import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Bot, Cpu, Workflow, Database, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

const AIAutomationService = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="AI & Automation Systems | Ras Ali Labs"
        description="AI-powered business systems, workflow automation, intelligent integrations and enterprise digital transformation by Ras Ali Labs in Botswana."
        url="/services/ai-automation"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Bot size={14} /> Intelligence Discipline
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            AI & Automation Systems
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            AI-powered business systems, workflow automation, intelligent integrations and enterprise digital transformation. We build sovereign AI architectures that transform administrative bottlenecks into autonomous, high-efficiency workflows.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-amber-400/40 transition-all">
            <Workflow className="w-10 h-10 text-amber-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Autonomous Workflow Orchestration</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Automating multi-step operational flows: document ingestion, invoice routing, CRM state transitions, and instant stakeholder notifications.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Event-Driven Triggers & Webhooks</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Automated Document Generation</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Third-Party API Integrations</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-amber-400/40 transition-all">
            <Bot className="w-10 h-10 text-amber-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">AI Reasoning & Agentic Systems</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Custom LLM embeddings, domain-specific retrieval-augmented generation (RAG), and proactive agents like Mari AI that assist leadership with data insights.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Domain-Specific Knowledge Graphs</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Proactive Executive Decision Support</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Context-Aware Conversation Agents</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-amber-400/40 transition-all">
            <ShieldCheck className="w-10 h-10 text-amber-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Sovereign Data Governance</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Row-level security, isolated tenant vaults, encrypted token architecture, and compliance with the Botswana Data Protection Act (Act 32).
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Row-Level Tenant Isolation</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Encrypted Credentials Vault</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-amber-400" /> Immutable Audit & Access Logs</li>
            </ul>
          </div>
        </div>

        {/* Flagship Product Link */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-bold uppercase">
                <Sparkles size={12} /> Flagship Enterprise System
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                Ralion OS — Created by Ras Ali Labs
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Looking for a ready-to-deploy enterprise operating system? Explore Ralion OS, our flagship product that brings CRM, operations, Mari AI, and growth into one platform.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/products/ralion-os"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-105 transition-all"
                >
                  Explore Ralion OS
                </Link>
                <a
                  href="/ralion"
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all"
                >
                  Launch Ralion Platform
                </a>
              </div>
            </div>
            <div className="lg:col-span-4 flex justify-center">
              <img src="/assets/images/logo.png" alt="Ralion OS" className="w-40 h-40 object-contain" />
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Transform Your Business Operations</h2>
          <p className="text-white/70 text-sm mb-6">
            Consult with our engineering team on automated pipelines, AI integrations, or custom enterprise architecture.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
          >
            Schedule an AI Consultation <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AIAutomationService;

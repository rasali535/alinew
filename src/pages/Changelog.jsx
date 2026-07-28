import React from 'react';
import SEO from '../components/common/SEO';
import { GitCommit, Sparkles, ShieldCheck, Zap, Bot, Layers } from 'lucide-react';

const Changelog = () => {
  const releases = [
    {
      version: 'Ralion 1.0.0 Stable Public Release',
      date: 'July 28, 2026',
      badge: 'Public Launch',
      highlights: [
        {
          type: 'New Feature',
          tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          title: 'Full Product Ecosystem & Single Sign-On (SSO)',
          desc: 'Unified authentication across Ralion OS, Mari AI, TradeGrid Africa, and DFS Platform powered by Supabase.'
        },
        {
          type: 'New Feature',
          tagColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          title: 'Mari AI Reasoning Studio & Vector RAG',
          desc: 'Embedded Mari AI LLM reasoning assistant with sub-200ms document knowledge retrieval.'
        },
        {
          type: 'New Feature',
          tagColor: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
          title: 'Industry Modules (Growth, Logistics, Health, Trade)',
          desc: 'Pre-packaged industry dashboards for SADC cross-border logistics, healthcare consultations, and B2B trade.'
        },
        {
          type: 'Improvement',
          tagColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          title: 'USSD-to-Web Protocol Gateway',
          desc: 'Bi-directional session state sync bridging feature phones to Ralion web dashboards.'
        },
        {
          type: 'Bug Fix',
          tagColor: 'bg-white/10 text-white/70 border-white/20',
          title: 'Supabase RLS Policy Resolution',
          desc: 'Fixed tenant isolation policy checks and optimized JWT session auto-refresh.'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Ralion Changelog & Release Notes | Ras Ali Labs"
        description="Stay updated with the latest Ralion OS releases, features, improvements, and bug fixes."
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <GitCommit size={14} /> Release History & Updates
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Ralion Product Changelog
          </h1>
          <p className="text-white/60 text-lg">
            Track new features, module updates, performance enhancements, and security fixes.
          </p>
        </div>

        {/* Release Cards List */}
        <div className="space-y-12">
          {releases.map((rel, idx) => (
            <div key={idx} className="bg-[#252525] border border-white/10 rounded-3xl p-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
                <div>
                  <span className="px-3 py-1 rounded-full bg-brand-gold text-black font-bold text-[10px] uppercase tracking-wider mb-2 inline-block">
                    {rel.badge}
                  </span>
                  <h2 className="text-2xl font-extrabold text-white">{rel.version}</h2>
                </div>
                <div className="text-white/40 text-xs font-mono">{rel.date}</div>
              </div>

              <div className="space-y-6">
                {rel.highlights.map((h, hIdx) => (
                  <div key={hIdx} className="bg-black/40 border border-white/10 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${h.tagColor}`}>
                        {h.type}
                      </span>
                      <h3 className="text-base font-bold text-white">{h.title}</h3>
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed">{h.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Changelog;

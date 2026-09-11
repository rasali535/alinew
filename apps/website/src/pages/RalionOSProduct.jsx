import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { ralionModules, pricingPlans, faqs, ralionOSOverview } from '../data/mock';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Layers,
  Cpu,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Database
} from 'lucide-react';

const RalionOSProduct = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Ralion OS — Empowered to Prosper | Ras Ali Labs"
        description="Ralion OS is the flagship AI business operating system created by Ras Ali Labs. Unifies CRM, operations, Mari AI, growth intelligence and social workflows."
        canonical="https://rasalilabs.com/products/ralion-os"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Flagship Header */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={14} /> A Flagship Innovation by Ras Ali Labs
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Ralion OS
          </h1>

          <p className="text-2xl font-bold text-brand-gold mb-6">
            Empowered to Prosper • Your AI Business Operating System
          </p>

          <p className="text-white/75 text-lg md:text-xl leading-relaxed mb-10 max-w-3xl mx-auto">
            Ralion OS brings business intelligence, Mari AI, growth, social media, customer management and operational tools into one connected platform.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/ralion"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-sm hover:scale-105 transition-all shadow-xl shadow-brand-gold/25 flex items-center gap-2"
            >
              <Sparkles size={16} /> Launch Ralion Application <ArrowRight size={16} />
            </a>

            <Link
              to="/request-demo"
              className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all border border-white/15"
            >
              Book an Enterprise Demo
            </Link>
          </div>
        </div>

        {/* Mari AI Section */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-bold uppercase">
                <Bot size={14} /> Embedded AI
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white">
                Mari — Your AI Business Growth Partner
              </h2>
              <p className="text-white/75 text-base leading-relaxed">
                Mari AI is not just another isolated chatbot. Working with your tenant-scoped business context, Mari analyzes pipeline trends, formulates high-conversion campaign briefs, and directs automated creative rendering across all channels.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-white font-bold text-sm mb-1">Strategic Reasoning</div>
                  <div className="text-white/60 text-xs">Identifies revenue opportunities and bottlenecks in your pipeline.</div>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-white font-bold text-sm mb-1">Autonomous Creatives</div>
                  <div className="text-white/60 text-xs">Generates campaign posters and video concepts automatically.</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full bg-[#121212] border border-white/15 rounded-2xl p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 mx-auto flex items-center justify-center font-bold text-2xl">
                  M
                </div>
                <div className="text-white font-bold text-lg">Mari Executive Assistant</div>
                <div className="text-xs text-brand-gold font-mono">Status: Connected to Ralion Core</div>
                <p className="text-white/60 text-xs">
                  "Ready to analyze your Q3 pipeline and generate multi-channel creative assets."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Core Modules Grid */}
        <div className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              Platform Modules & Capabilities
            </h2>
            <p className="text-white/60 text-sm">
              Explore the interconnected tools inside Ralion OS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ralionModules.map((mod) => (
              <div
                key={mod.id}
                className="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-brand-gold/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-full bg-white/5 text-brand-gold text-[10px] font-bold uppercase">
                      {mod.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{mod.name}</h3>
                  <div className="text-xs font-semibold text-brand-gold/90 mb-3">{mod.tagline}</div>
                  <p className="text-white/65 text-xs leading-relaxed mb-6">{mod.description}</p>
                </div>
                <Link
                  to={mod.href}
                  className="text-xs font-bold text-white hover:text-brand-gold transition-colors flex items-center gap-1"
                >
                  Learn More <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="mb-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              Transparent Plans for Every Stage
            </h2>
            <p className="text-white/60 text-sm">
              Choose the right tier for your organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 flex flex-col justify-between border ${
                  plan.popular
                    ? 'bg-[#202020] border-brand-gold/60 shadow-xl'
                    : 'bg-[#181818] border-white/10'
                }`}
              >
                <div>
                  {plan.popular && (
                    <span className="px-3 py-1 rounded-full bg-brand-gold text-black text-[10px] font-extrabold uppercase mb-4 inline-block">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  <div className="text-xs text-white/50 mb-4">{plan.tagline}</div>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-extrabold text-white">${plan.priceUsd}</span>
                    <span className="text-xs text-white/50">/month</span>
                  </div>
                  <p className="text-xs text-white/60 mb-6">{plan.description}</p>
                  <ul className="space-y-2 text-xs text-white/70 mb-8 border-t border-white/10 pt-4">
                    {plan.features.slice(0, 5).map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={13} className="text-brand-gold shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={plan.ctaHref}
                  className={`w-full py-3 rounded-xl font-bold text-xs text-center transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-brand-gold to-amber-500 text-black hover:shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {plan.ctaText}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Parent Brand Relationship Note */}
        <div className="bg-[#141414] border border-brand-gold/20 rounded-3xl p-8 text-center max-w-3xl mx-auto">
          <div className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-2">
            Engineered & Maintained by Ras Ali Labs
          </div>
          <p className="text-white/70 text-sm leading-relaxed mb-6">
            Ralion OS is continuously developed, secured, and supported by Ras Ali Labs in Gaborone, Botswana. We also provide bespoke customizations, dedicated sovereign hosting, and enterprise integrations.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 text-xs font-bold text-white hover:text-brand-gold underline"
          >
            Inquire About Custom Enterprise Modules →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RalionOSProduct;

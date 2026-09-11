import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import { pricingPlans, faqs } from '../data/mock';
import { CheckCircle2, ArrowRight, Sparkles, ShieldCheck, Zap, Lock, HelpCircle } from 'lucide-react';

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectPlan = (planId, href) => {
    analytics.trackConversion('pricing_plan_click', { planId });

    if (planId === 'COMMUNITY') {
      user ? navigate('/ralion/dashboard') : navigate('/ralion/register');
    } else if (planId === 'ENTERPRISE') {
      navigate('/request-demo');
    } else {
      user ? navigate(`/ralion/billing?tier=${planId}`) : navigate('/ralion/register');
    }
  };

  return (
    <div className="min-h-screen bg-[#181818] text-white pt-32 pb-24 px-6 lg:px-12">
      <SEO
        title="Ralion OS Pricing | Community Free, Starter, Professional & Enterprise"
        description="Transparent subscription plans for Ralion OS. Start Free Forever with 100 monthly credits or unlock full commercial AI power."
        canonical="https://rasalilabs.com/pricing"
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Transparent Commercial Subscriptions
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
            Empowered to Prosper on Every Scale
          </h1>
          <p className="text-white/70 text-base md:text-lg">
            Choose the right plan for your business. Every tier includes Mari AI, multi-tenant security, and recurring monthly AI credits.
          </p>
        </div>

        {/* Pricing Cards Grid (4 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-[#1f1f1f] border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                plan.popular
                  ? 'border-brand-gold shadow-2xl shadow-brand-gold/15 ring-1 ring-brand-gold/50'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-gold text-black text-[10px] font-bold uppercase tracking-widest shadow-md">
                  Most Popular
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                </div>
                <p className="text-white/50 text-xs min-h-[44px] mb-4 leading-relaxed">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-white">${plan.priceUsd}</span>
                  <span className="text-white/40 text-xs">/ month</span>
                </div>

                <div className="inline-block px-3 py-1 rounded-lg bg-brand-gold/15 text-brand-gold text-xs font-bold mb-6">
                  {plan.monthlyCredits.toLocaleString()} AI Credits / mo
                </div>

                <div className="space-y-2.5 mb-6 border-t border-white/10 pt-4">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-white/80">
                      <CheckCircle2 size={14} className="text-brand-gold shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id, plan.ctaHref)}
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-brand-gold to-amber-500 text-black shadow-lg shadow-brand-gold/20 hover:scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {plan.ctaText} <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* How Monthly Credits Work */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="text-brand-gold" size={24} />
            <div>
              <h3 className="text-xl font-bold text-white">How Ralion Monthly AI Credits Work</h3>
              <p className="text-xs text-white/60">Transparent, usage-based consumption for AI operations.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="font-bold text-brand-gold mb-1">Mari Strategic Reasoning</div>
              <div className="text-white/80 mb-2">1 - 5 Credits per prompt</div>
              <div className="text-white/50 text-[11px]">Deep market research, deal analysis, and campaign formulation.</div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="font-bold text-brand-gold mb-1">FLUX Commercial Poster</div>
              <div className="text-white/80 mb-2">10 Credits per image</div>
              <div className="text-white/50 text-[11px]">Studio-grade advertising graphics and social creatives.</div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="font-bold text-brand-gold mb-1">CogVideoX Video Reels</div>
              <div className="text-white/80 mb-2">50 Credits per video</div>
              <div className="text-white/50 text-[11px]">AI-generated 6-second commercial reels for TikTok & Instagram.</div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="font-bold text-brand-gold mb-1">Monthly Auto-Replenish</div>
              <div className="text-white/80 mb-2">Included with subscription</div>
              <div className="text-white/50 text-[11px]">Quotas automatically reset and replenish each monthly billing cycle.</div>
            </div>
          </div>
        </div>

        {/* Security & RLS Enterprise Guarantee */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-4">
            <ShieldCheck size={32} className="text-brand-gold shrink-0" />
            <div>
              <h4 className="text-white font-bold text-sm mb-0.5">Secure Live Subscription Gateway</h4>
              <p>Encrypted multi-tenant isolation, automated invoice tracking, and seamless self-service subscription management.</p>
            </div>
          </div>
          <Link to="/request-demo" className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors shrink-0">
            Book Enterprise Consultation
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

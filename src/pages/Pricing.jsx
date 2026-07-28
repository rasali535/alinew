import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import { CheckCircle2, ArrowRight, Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';

const Pricing = () => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'

  const plans = [
    {
      id: 'community',
      name: 'Community',
      price: 'Free',
      period: 'forever',
      description: 'Ideal for small teams and developers starting with Ralion OS.',
      features: [
        'Core CRM & Customer Contacts',
        'Tasks & Project Workspace',
        'Document Vault (5 GB Storage)',
        'Basic Mari AI (1,000 Executions/mo)',
        'Single Admin User Account',
        'Community Forum & Docs Support'
      ],
      ctaText: 'Start Community Edition',
      popular: false
    },
    {
      id: 'professional',
      name: 'Professional',
      price: billingCycle === 'annual' ? '$39' : '$49',
      period: 'per month',
      description: 'For growing businesses requiring unlimited users, automation, and advanced reports.',
      features: [
        'Everything in Community Plan',
        'Unlimited Users & Team Seats',
        'Advanced Operational Reports',
        'Automated Workflow Triggers',
        '50,000 Mari AI Executions/mo',
        'USSD & API Gateway Access',
        'Priority 24/7 Support Response'
      ],
      ctaText: 'Start 14-Day Free Trial',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Custom',
      period: 'billed annually',
      description: 'Custom industry modules, private deployment, and dedicated SLA support.',
      features: [
        'Everything in Professional Plan',
        'Custom Industry Modules (Logistics/Health/Trade)',
        'Dedicated Private Supabase Cloud',
        'Custom Mari AI Model Fine-Tuning',
        'SLA Guarantee & Dedicated Account Manager',
        'Air-Gapped / On-Premise Support'
      ],
      ctaText: 'Contact Enterprise Sales',
      popular: false
    }
  ];

  const handleSelectPlan = (planId) => {
    analytics.trackConversion('pricing_plan_click', { planId, billingCycle });
    if (planId === 'community') {
      user ? navigate('/ralion/dashboard') : navigate('/ralion/community');
    } else {
      user ? navigate('/onboarding') : openAuthModal('signup');
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Ralion Pricing Plans | Free Community, Professional & Enterprise"
        description="Transparent pricing for Ralion Business OS. Choose Community Free, Professional, or Enterprise."
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Transparent SaaS Pricing
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
            Choose the Right Plan for Your Business
          </h1>
          <p className="text-white/60 text-lg">
            Start with Community Edition for free, or scale with Professional and Enterprise power.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-xs font-semibold ${billingCycle === 'monthly' ? 'text-white' : 'text-white/50'}`}>Monthly Billing</span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative w-14 h-7 rounded-full bg-[#252525] border border-white/20 p-1 transition-colors"
            >
              <div className={`w-5 h-5 rounded-full bg-brand-gold transition-transform ${billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-0'}`}></div>
            </button>
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-white' : 'text-white/50'}`}>
              Annual Billing <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-[#252525] border rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                plan.popular
                  ? 'border-brand-gold shadow-2xl shadow-brand-gold/15 ring-1 ring-brand-gold/50'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-gold text-black text-[10px] font-bold uppercase tracking-widest">
                  Most Popular for Growing Teams
                </span>
              )}

              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-white/50 text-xs min-h-[36px] mb-6">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-white/40 text-xs">/ {plan.period}</span>
                </div>

                <div className="space-y-3 mb-8 border-t border-white/10 pt-6">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                      <CheckCircle2 size={16} className="text-brand-gold shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full py-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
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

        {/* Security & RLS Enterprise Guarantee */}
        <div className="bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-4">
            <ShieldCheck size={32} className="text-brand-gold shrink-0" />
            <div>
              <h4 className="text-white font-bold text-sm mb-0.5">Bank-Grade Supabase Row-Level Security (RLS)</h4>
              <p>Every tenant database is cryptographically isolated and backed up continuously.</p>
            </div>
          </div>
          <Link to="/support" className="text-brand-gold font-bold hover:underline shrink-0">
            Have questions? Talk to Support
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Pricing;

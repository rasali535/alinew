import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import { CheckCircle2, ArrowRight, Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';

const Pricing = () => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'daily' | 'weekly' | 'monthly' | 'annual'

  const getPriceAndPeriod = (planId) => {
    switch (planId) {
      case 'community':
        return { price: 'Free', period: 'forever' };
      case 'standard':
        if (billingCycle === 'daily') return { price: '$1', period: 'per day' };
        if (billingCycle === 'weekly') return { price: '$5', period: 'per week' };
        if (billingCycle === 'annual') return { price: '$15', period: 'per month ($190/yr)' };
        return { price: '$19', period: 'per month' };
      case 'professional':
        if (billingCycle === 'daily') return { price: '$3', period: 'per day' };
        if (billingCycle === 'weekly') return { price: '$15', period: 'per week' };
        if (billingCycle === 'annual') return { price: '$39', period: 'per month ($468/yr)' };
        return { price: '$49', period: 'per month' };
      case 'enterprise':
        return { price: 'Custom', period: 'billed annually' };
      default:
        return { price: '$0', period: 'per month' };
    }
  };

  const plans = [
    {
      id: 'community',
      name: 'Community',
      ...getPriceAndPeriod('community'),
      badge: 'Free Forever',
      description: 'Ideal for solo entrepreneurs, developers, and micro-teams starting with Ralion OS.',
      features: [
        'Core CRM & Contact Management',
        'Task Board & Calendar Scheduling',
        'Document Vault (5 GB Cloud Storage)',
        'Basic Mari AI (1,000 Executions/mo)',
        '1 Administrator Seat',
        'Community Forum & Docs Support'
      ],
      ctaText: 'Start Free Community',
      popular: false,
      tier: 'COMMUNITY'
    },
    {
      id: 'standard',
      name: 'Standard',
      ...getPriceAndPeriod('standard'),
      badge: 'Most Affordable',
      description: 'Cheaper, affordable starter plan with hints of Pro for emerging small businesses.',
      features: [
        'Everything in Community Plan',
        'Growth AI Starter (5 AI Posts/Reels daily)',
        'Connect up to 2 Social Channels (Facebook + LinkedIn)',
        '3 Visual Automated Workflows',
        '10,000 Mari AI Executions/mo',
        'Standard Sales & Customer BI Reports',
        'Up to 3 Team User Seats',
        'Email & Help Center Support'
      ],
      ctaText: billingCycle === 'daily' ? 'Start for $1/day' : 'Get Standard Plan',
      popular: true,
      tier: 'STANDARD'
    },
    {
      id: 'professional',
      name: 'Professional',
      ...getPriceAndPeriod('professional'),
      badge: 'Full Power',
      description: 'For scaling companies requiring unlimited marketing campaigns and automation.',
      features: [
        'Everything in Standard Plan',
        'Unlimited Growth AI Campaigns & Media',
        'All Social Channels (Facebook, IG, X, TikTok, LinkedIn)',
        'Unlimited Automated Workflow Rules',
        '50,000 Mari AI Executions/mo',
        'Advanced Cohort Reports & PDF Exports',
        'Unlimited Team Seats & Role Permissions',
        'Priority 24/7 Support Response'
      ],
      ctaText: 'Start 14-Day Free Trial',
      popular: false,
      tier: 'PROFESSIONAL'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      ...getPriceAndPeriod('enterprise'),
      badge: 'Sovereign Multi-Branch',
      description: 'Custom industry modules, private cloud infrastructure, and dedicated SLA support.',
      features: [
        'Everything in Professional Plan',
        'All Industry Verticals (Health, Funeral, Logistics, Trade)',
        'Multi-Branch Tenant Isolation & SADC Corridors',
        'Dedicated Private Supabase Cloud Instance',
        'Custom Mari AI Model Fine-Tuning',
        'SAML SSO & Sovereign Government Cloud',
        'Dedicated Account Manager & 99.99% SLA'
      ],
      ctaText: 'Contact Enterprise Sales',
      popular: false,
      tier: 'ENTERPRISE'
    }
  ];

  const handleSelectPlan = (planId) => {
    analytics.trackConversion('pricing_plan_click', { planId, billingCycle });
    
    if (planId === 'community') {
      user ? navigate('/ralion/dashboard') : navigate('/ralion/community');
    } else if (planId === 'enterprise') {
      navigate('/contact');
    } else {
      // Standard or Professional Plan
      if (typeof window !== 'undefined') {
        localStorage.setItem('ralion_user_tier', planId.toUpperCase());
        localStorage.setItem('ralion_billing_frequency', billingCycle.toUpperCase());
      }
      user ? navigate(`/ralion/billing?tier=${planId}`) : openAuthModal('signup');
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Ralion Pricing Plans | Affordable Standard, Community, Professional & Enterprise"
        description="Affordable daily, weekly, monthly, and yearly pricing for Ralion Business OS. Choose Standard for $1/day, Community Free, Professional, or Enterprise."
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Affordable & Flexible SaaS Pricing
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
            Empowered to Prosper on Any Budget
          </h1>
          <p className="text-white/60 text-lg">
            Pay daily, weekly, monthly, or yearly. Start free or unlock affordable Pro features starting at just $1/day.
          </p>

          {/* Billing Cycle 4-Tab Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 rounded-2xl bg-[#252525] border border-white/10 max-w-md mx-auto">
            {[
              { id: 'daily', label: 'Daily ($1/d)' },
              { id: 'weekly', label: 'Weekly ($5/w)' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'annual', label: 'Yearly (-20%)' },
            ].map((cycle) => (
              <button
                key={cycle.id}
                onClick={() => setBillingCycle(cycle.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  billingCycle === cycle.id
                    ? 'bg-gradient-to-r from-brand-gold to-amber-500 text-black shadow-md'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {cycle.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Cards Grid (4 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-[#252525] border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                plan.popular
                  ? 'border-brand-gold shadow-2xl shadow-brand-gold/15 ring-1 ring-brand-gold/50'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-gold text-black text-[10px] font-bold uppercase tracking-widest">
                  {plan.badge}
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                  {!plan.popular && plan.badge && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white/70">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="text-white/50 text-xs min-h-[48px] mb-4 leading-relaxed">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-white/40 text-xs">/ {plan.period}</span>
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
                onClick={() => handleSelectPlan(plan.id)}
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

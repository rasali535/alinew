import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import {
  Sparkles,
  Cpu,
  Bot,
  Globe,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  Building2,
  Users,
  ShieldCheck
} from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const [step, setStep] = useState(1);
  const [selectedSolution, setSelectedSolution] = useState('ralion');
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('Technology & Services');
  const [teamSize, setTeamSize] = useState('1-10');
  const [loading, setLoading] = useState(false);

  const solutions = [
    {
      id: 'ralion',
      name: 'Ralion',
      title: 'AI Business Operating System',
      description: 'Unified CRM, project management, document vaults, and operational workflow automation.',
      icon: Cpu,
      badge: 'Featured OS',
      color: 'text-brand-gold bg-brand-gold/10 border-brand-gold/30'
    },
    {
      id: 'mari-ai',
      name: 'Mari AI',
      title: 'Conversational AI & Reasoning',
      description: 'Gemini LLM reasoning agents for customer support, document parsing, and RAG search.',
      icon: Bot,
      badge: 'AI Agents',
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
    },
    {
      id: 'tradegrid',
      name: 'TradeGrid Africa',
      title: 'Cross-Border Supply Chain',
      description: 'B2B supplier verification, escrow settlement, and corridor logistics tracking.',
      icon: Globe,
      badge: 'Trade Protocol',
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    },
    {
      id: 'dfs',
      name: 'DFS Platform',
      title: 'USSD & Telecom Gateway',
      description: 'Connect feature phone USSD sessions directly to modern web platforms.',
      icon: CreditCard,
      badge: 'Fintech Gateway',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    }
  ];

  const handleCompleteOnboarding = (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('signup');
      return;
    }

    setLoading(true);
    analytics.trackConversion('onboarding_complete', {
      solution: selectedSolution,
      orgName,
      industry
    });

    setTimeout(() => {
      setLoading(false);
      navigate('/ralion/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12 flex flex-col justify-center">
      <SEO
        title="Welcome Onboarding | Ras Ali Labs"
        description="Choose your solution and set up your organization workspace."
      />

      <div className="max-w-4xl mx-auto w-full">
        {/* Onboarding Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Welcome to Ras Ali Labs
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2">
            Empowered to Prosper.
          </h1>
          <p className="text-white/60 text-sm md:text-base max-w-xl mx-auto">
            Set up your organization workspace and activate your product solution suite.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between max-w-md mx-auto mb-10 text-xs">
          <div className={`flex items-center gap-2 font-semibold ${step >= 1 ? 'text-brand-gold' : 'text-white/40'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-[11px] ${step >= 1 ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/20'}`}>1</span>
            Select Solution
          </div>
          <div className={`h-0.5 w-16 ${step >= 2 ? 'bg-brand-gold' : 'bg-white/10'}`}></div>
          <div className={`flex items-center gap-2 font-semibold ${step >= 2 ? 'text-brand-gold' : 'text-white/40'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-[11px] ${step >= 2 ? 'bg-brand-gold text-black border-brand-gold' : 'border-white/20'}`}>2</span>
            Organization Setup
          </div>
        </div>

        {/* Step 1: Solution Selection */}
        {step === 1 && (
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 text-center">Choose your primary solution:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {solutions.map((sol) => {
                const Icon = sol.icon;
                const isSelected = selectedSolution === sol.id;
                return (
                  <div
                    key={sol.id}
                    onClick={() => setSelectedSolution(sol.id)}
                    className={`cursor-pointer p-6 rounded-2xl border transition-all duration-300 ${
                      isSelected
                        ? 'border-brand-gold bg-brand-gold/10 shadow-xl shadow-brand-gold/10'
                        : 'border-white/10 bg-black/30 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-brand-gold flex items-center justify-center">
                        <Icon size={24} />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${sol.color}`}>
                        {sol.badge}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                      {sol.name} {isSelected && <CheckCircle2 size={16} className="text-brand-gold" />}
                    </h4>
                    <p className="text-brand-gold/80 text-xs font-semibold mb-2">{sol.title}</p>
                    <p className="text-white/60 text-xs leading-relaxed">{sol.description}</p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
            >
              Continue to Organization Setup <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Organization Configuration */}
        {step === 2 && (
          <form onSubmit={handleCompleteOnboarding} className="bg-[#252525] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-white mb-2 text-center">Configure Your Organization</h3>
            <p className="text-white/50 text-xs text-center mb-6">Create your isolated enterprise tenant on Supabase.</p>

            <div>
              <label className="block text-white/70 text-xs font-semibold mb-2">Organization Name</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Enterprise Ltd"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Industry Sector</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold transition-colors"
                >
                  <option value="Technology & Services">Technology & Services</option>
                  <option value="Cross-Border Trade & Logistics">Cross-Border Trade & Logistics</option>
                  <option value="Fintech & Financial Services">Fintech & Financial Services</option>
                  <option value="Government & Public Sector">Government & Public Sector</option>
                  <option value="Small Business & Retail">Small Business & Retail</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Estimated Team Size</label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold transition-colors"
                >
                  <option value="1-10">1 - 10 Members</option>
                  <option value="11-50">11 - 50 Members</option>
                  <option value="51-200">51 - 200 Members</option>
                  <option value="200+">200+ Enterprise Seats</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center gap-3 text-xs text-brand-gold">
              <ShieldCheck size={20} className="shrink-0" />
              <span>Unified SSO Account Enabled — Supabase Row-Level Security (RLS) active.</span>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Activate Ralion Workspace <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Onboarding;

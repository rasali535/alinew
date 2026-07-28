import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../lib/analytics';
import { marketing } from '../lib/marketing';
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
  ShieldCheck,
  Check,
  HeartPulse,
  TrendingUp,
  Truck
} from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Technology & Services');
  const [companySize, setCompanySize] = useState('1-10');
  const [country, setCountry] = useState('Botswana');
  const [businessGoals, setBusinessGoals] = useState('Automate operations & CRM');

  // Selected Modules (Checkboxes)
  const [selectedModules, setSelectedModules] = useState({
    core: true,
    growth: true,
    logistics: false,
    health: false,
    trade: false
  });

  const [loading, setLoading] = useState(false);

  const moduleOptions = [
    {
      key: 'core',
      name: 'Core Business',
      desc: 'CRM, Tasks, Projects, Documents, and Mari AI core assistant.',
      icon: Cpu,
      required: true
    },
    {
      key: 'growth',
      name: 'Growth',
      desc: 'Lead generation, marketing automation, and email campaigns.',
      icon: TrendingUp,
      required: false
    },
    {
      key: 'logistics',
      name: 'Logistics',
      desc: 'Fleet telemetry, shipments, border tracking, and inventory.',
      icon: Truck,
      required: false
    },
    {
      key: 'health',
      name: 'Health',
      desc: 'Client case management, appointment scheduling, and health records.',
      icon: HeartPulse,
      required: false
    },
    {
      key: 'trade',
      name: 'Trade',
      desc: 'Cross-border B2B escrow, KYB supplier verification, and SADC corridors.',
      icon: Globe,
      required: false
    }
  ];

  const toggleModule = (key) => {
    if (key === 'core') return; // Core Business required
    setSelectedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreateWorkspace = (e) => {
    if (e) e.preventDefault();
    if (!user) {
      openAuthModal('signup');
      return;
    }

    setLoading(true);
    analytics.trackConversion('onboarding_4step_complete', {
      companyName,
      industry,
      companySize,
      country,
      selectedModules
    });

    marketing.triggerSignupLifecycle(user.email, companyName);

    setTimeout(() => {
      setLoading(false);
      navigate('/ralion/dashboard');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12 flex flex-col justify-center">
      <SEO
        title="Ralion Onboarding | Ras Ali Labs"
        description="Set up your Ralion business workspace in 4 easy steps."
      />

      <div className="max-w-4xl mx-auto w-full">
        {/* Progress Bar (4 Steps) */}
        <div className="flex items-center justify-between max-w-lg mx-auto mb-10 text-xs">
          {[
            { num: 1, label: 'Welcome' },
            { num: 2, label: 'Profile' },
            { num: 3, label: 'Modules' },
            { num: 4, label: 'Workspace' }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className={`flex items-center gap-1.5 font-semibold ${step >= s.num ? 'text-brand-gold' : 'text-white/40'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-[11px] ${step >= s.num ? 'bg-brand-gold text-black border-brand-gold font-bold' : 'border-white/20'}`}>{s.num}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {idx < 3 && <div className={`h-0.5 w-8 sm:w-12 ${step > s.num ? 'bg-brand-gold' : 'bg-white/10'}`}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 md:p-12 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mx-auto mb-6">
              <Cpu size={32} />
            </div>
            <span className="text-brand-gold text-xs font-bold uppercase tracking-widest block mb-2">
              Empowered to Prosper
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              Welcome to Ralion
            </h1>
            <p className="text-white/70 text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Your AI-powered business operating system. In 4 quick steps, we will set up your organization workspace, configure default dashboards, and seed starter business data.
            </p>

            <button
              onClick={() => setStep(2)}
              className="py-4 px-8 rounded-2xl bg-gradient-to-r from-brand-gold to-amber-500 text-black text-sm font-bold shadow-xl shadow-brand-gold/20 hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto"
            >
              Get Started <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Business Profile */}
        {step === 2 && (
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Business Profile Setup</h2>
            <p className="text-white/50 text-xs text-center mb-6">Tell us about your organization to customize default templates.</p>

            <div>
              <label className="block text-white/70 text-xs font-semibold mb-2">Company Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Eagle Touch Tours or Pameltex Enterprise"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Industry Sector</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                >
                  <option value="Technology & Services">Technology & Services</option>
                  <option value="Tourism & Hospitality">Tourism & Hospitality</option>
                  <option value="Health & Wellness">Health & Wellness</option>
                  <option value="Logistics & Supply Chain">Logistics & Supply Chain</option>
                  <option value="Cross-Border B2B Trade">Cross-Border B2B Trade</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Company Size</label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                >
                  <option value="1-10">1 - 10 Employees</option>
                  <option value="11-50">11 - 50 Employees</option>
                  <option value="51-200">51 - 200 Employees</option>
                  <option value="200+">200+ Enterprise</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Primary Business Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Automate CRM & Mari AI search"
                  value={businessGoals}
                  onChange={(e) => setBusinessGoals(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 py-3.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-2/3 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
              >
                Continue to Module Selection <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Select Modules */}
        {step === 3 && (
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Select Industry Modules</h2>
            <p className="text-white/50 text-xs text-center mb-6">Choose active modules to include in your workspace dashboard.</p>

            <div className="space-y-3">
              {moduleOptions.map((mod) => {
                const Icon = mod.icon;
                const isChecked = selectedModules[mod.key];
                return (
                  <div
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`cursor-pointer p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      isChecked
                        ? 'border-brand-gold bg-brand-gold/10'
                        : 'border-white/10 bg-black/30 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 text-brand-gold flex items-center justify-center shrink-0">
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{mod.name}</h4>
                          {mod.required && (
                            <span className="px-2 py-0.5 rounded bg-brand-gold/20 text-brand-gold text-[9px] font-bold">Included</span>
                          )}
                        </div>
                        <p className="text-white/60 text-xs">{mod.desc}</p>
                      </div>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                      isChecked ? 'bg-brand-gold border-brand-gold text-black' : 'border-white/30'
                    }`}>
                      {isChecked && <Check size={14} className="stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 py-3.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-2/3 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
              >
                Review Workspace Setup <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Create Workspace */}
        {step === 4 && (
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">Create Workspace Environment</h2>
            <p className="text-white/60 text-sm max-w-md mx-auto">
              Ready to initialize tenant <strong className="text-white">{companyName || 'My Organization'}</strong> on Supabase PostgreSQL.
            </p>

            <div className="bg-black/40 border border-white/10 p-5 rounded-2xl text-left max-w-md mx-auto text-xs space-y-2 text-white/80">
              <div className="flex justify-between">
                <span>Organization:</span>
                <span className="font-bold text-brand-gold">{companyName || 'My Organization'}</span>
              </div>
              <div className="flex justify-between">
                <span>Industry & Goals:</span>
                <span>{industry}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Modules:</span>
                <span className="text-emerald-400 font-bold">
                  {Object.keys(selectedModules).filter(k => selectedModules[k]).join(', ')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Supabase RLS Policy:</span>
                <span className="text-emerald-400">Strict Tenant Isolation</span>
              </div>
            </div>

            <div className="flex gap-4 max-w-md mx-auto pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-1/3 py-3.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={loading}
                className="w-2/3 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Launch Workspace <Sparkles size={16} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;

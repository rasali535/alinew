import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import {
  Cpu,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Bot,
  UserCheck,
  ShieldCheck,
  Zap,
  Download,
  Users,
  Database,
  Lock
} from 'lucide-react';

const CommunityEdition = () => {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();

  const communityFeatures = [
    { title: 'Core CRM & Customer Contacts', desc: 'Manage up to 1,000 lead contacts and interaction histories.' },
    { title: 'Tasks & Project Workspace', desc: 'Sprint board, project timelines, and task assignments.' },
    { title: 'Mari AI Reasoning (1,000 execs/mo)', desc: 'Standard Gemini LLM reasoning assistant for business documents.' },
    { title: 'Document Vault (5 GB Storage)', desc: 'Secure cloud storage backed by Supabase PostgreSQL.' },
    { title: 'Single Admin User Account', desc: 'Full workspace access with single-sign-on credentials.' },
    { title: 'Community Support & Documentation', desc: 'Access to searchable developer guides and user forums.' }
  ];

  const handleLaunchCommunity = () => {
    analytics.trackConversion('community_edition_start');
    if (user) {
      navigate('/ralion/dashboard');
    } else {
      openAuthModal('signup');
    }
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Ralion Community Edition | Free AI Business OS | Ras Ali Labs"
        description="Launch Ralion Community Edition for free. Core CRM, project management, and Mari AI for small businesses and developers."
      />

      <div className="max-w-6xl mx-auto">
        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Free Forever • No Credit Card Required
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            Ralion Community Edition
          </h1>
          <p className="text-brand-gold font-bold text-sm uppercase tracking-widest mb-6">
            Empowered to Prosper — Free AI Business Operating System
          </p>
          <p className="text-white/70 text-lg leading-relaxed mb-8">
            Experience the core power of Ralion without any financial commitment. Ideal for solo entrepreneurs, small teams, and developers exploring AI workflow automation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleLaunchCommunity}
              className="py-4 px-8 rounded-2xl bg-gradient-to-r from-brand-gold to-amber-500 text-black text-sm font-bold shadow-xl shadow-brand-gold/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              Launch Community Edition Free <ArrowRight size={16} />
            </button>
            <Link
              to="/downloads"
              className="py-4 px-8 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-sm font-semibold transition-all flex items-center gap-2"
            >
              <Download size={16} className="text-brand-gold" /> Download Desktop App
            </Link>
          </div>
        </div>

        {/* Included Features Matrix */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl mb-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">What's Included in Community Edition</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communityFeatures.map((feat, idx) => (
              <div key={idx} className="bg-black/40 border border-white/10 p-6 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="text-base font-bold text-white mb-2">{feat.title}</h4>
                <p className="text-white/60 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Seamless Upgrade Path */}
        <div className="bg-gradient-to-r from-brand-gold/20 via-[#252525] to-[#1c1c1c] border border-brand-gold/30 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <span className="text-brand-gold text-xs font-bold uppercase tracking-wider block mb-1">
              Seamless Upgrade Path
            </span>
            <h3 className="text-2xl font-extrabold text-white mb-2">Need Unlimited Users & Priority Support?</h3>
            <p className="text-white/70 text-sm max-w-xl">
              Upgrade to Ralion Professional or Enterprise anytime with 1-click dataset migration and zero downtime.
            </p>
          </div>

          <Link
            to="/pricing"
            className="py-3.5 px-7 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform shadow-lg shadow-brand-gold/20 shrink-0"
          >
            Compare All Pricing Plans
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CommunityEdition;

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/common/SEO';
import {
  User,
  ShieldCheck,
  Building2,
  Cpu,
  Bot,
  Globe,
  CreditCard,
  Key,
  LogOut,
  Sparkles,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const Account = () => {
  const { user, openAuthModal, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] text-white pt-32 pb-20 px-6 text-center flex flex-col items-center justify-center">
        <SEO title="Account Sign In | Ras Ali Labs" />
        <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-6">
          <User size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Ras Ali Labs SSO Account</h2>
        <p className="text-white/60 text-sm max-w-md mb-6">
          Please sign in to access your single-sign-on profile, active organization workspace, and solution licenses.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="py-3.5 px-8 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform shadow-lg shadow-brand-gold/20"
        >
          Sign In to Ecosystem
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO title={`${user.email} Account | Ras Ali Labs`} />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10">
          <div>
            <span className="text-brand-gold text-xs font-semibold uppercase tracking-wider block mb-1">
              Unified Single Sign-On Account
            </span>
            <h1 className="text-3xl font-extrabold text-white">{user.email}</h1>
            <p className="text-white/50 text-xs mt-1">User ID: <span className="font-mono">{user.id}</span></p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/ralion/dashboard"
              className="py-2.5 px-5 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform shadow-lg shadow-brand-gold/20 flex items-center gap-2"
            >
              Launch Ralion OS <Sparkles size={14} />
            </Link>
            <button
              onClick={signOut}
              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/70 hover:text-red-400 border border-white/10 text-xs transition-colors flex items-center gap-1.5"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* User Account Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Active Organization Card */}
          <div className="bg-[#252525] border border-white/10 p-6 rounded-3xl">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
              <Building2 size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Active Organization</h3>
            <p className="text-brand-gold text-xs font-semibold mb-3">Ras Ali Labs Enterprise Tenant</p>
            <p className="text-white/60 text-xs leading-relaxed mb-6">
              Row-Level Security (RLS) active on Supabase PostgreSQL.
            </p>
            <Link
              to="/onboarding"
              className="text-brand-gold text-xs font-bold hover:underline flex items-center gap-1"
            >
              Manage Organization Setup <ArrowRight size={12} />
            </Link>
          </div>

          {/* Subscription Tier */}
          <div className="bg-[#252525] border border-white/10 p-6 rounded-3xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Subscription Plan</h3>
            <p className="text-emerald-400 text-xs font-semibold mb-3">Community Plan (Free Forever)</p>
            <p className="text-white/60 text-xs leading-relaxed mb-6">
              Includes Ralion OS core, 1,000 Mari AI executions, and Supabase auth.
            </p>
            <Link
              to="/products/ralion#pricing"
              className="text-brand-gold text-xs font-bold hover:underline flex items-center gap-1"
            >
              Upgrade to Professional <ArrowRight size={12} />
            </Link>
          </div>

          {/* Security & API Keys */}
          <div className="bg-[#252525] border border-white/10 p-6 rounded-3xl">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Key size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Security Credentials</h3>
            <p className="text-purple-400 text-xs font-semibold mb-3">Supabase JWT Session Active</p>
            <p className="text-white/60 text-xs leading-relaxed mb-6">
              OAuth2 & JWT tokens persist across all Ras Ali Labs products.
            </p>
            <Link
              to="/developers"
              className="text-purple-400 text-xs font-bold hover:underline flex items-center gap-1"
            >
              Developer API Keys <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Activated Ecosystem Products */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6">Ecosystem Activated Products</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                  <Cpu size={20} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Ralion Operating System</h4>
                  <p className="text-white/50 text-xs">Primary Business OS & Workspace</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                Activated
              </span>
            </div>

            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Mari AI Agents</h4>
                  <p className="text-white/50 text-xs">Conversational Reasoning Engine</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                Public Beta
              </span>
            </div>

            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Globe size={20} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Ralion Trade</h4>
                  <p className="text-white/50 text-xs">SADC B2B Trade Protocol</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-white/10 text-white/60 text-[10px] font-bold">
                Pre-Registered
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Account;

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  Bot,
  Database,
  Layers,
  ShieldCheck,
  Zap,
  Activity,
  Terminal,
  Server,
  UserCheck,
  Lock,
  ArrowRight,
  LogOut,
  Sparkles,
  Smartphone,
  BarChart2,
  Settings,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const RalionApp = () => {
  const { user, openAuthModal, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-[#141414] text-white pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Operational Header */}
        <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 mb-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-gold to-amber-600 text-black flex items-center justify-center font-black shadow-lg shadow-brand-gold/20">
              <Cpu size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-wide">Ralion Operating System</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                  v2.4.0 Live Engine
                </span>
              </div>
              <p className="text-white/50 text-xs mt-0.5">
                rasalilabs.com/ralion — Unified Enterprise Intelligence Entry Point
              </p>
            </div>
          </div>

          {/* User Auth Profile Status */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <UserCheck size={14} className="text-emerald-400" />
                  <span className="text-white font-medium max-w-[120px] truncate">{user.email}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold font-bold">SSO</span>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/60 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-xs hidden sm:inline">Guest Preview</span>
                <button
                  onClick={() => openAuthModal('login')}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black text-xs font-bold hover:shadow-lg hover:shadow-brand-gold/20 transition-all flex items-center gap-1.5"
                >
                  <Lock size={12} /> Sign In via SSO
                </button>
              </div>
            )}

            <button
              onClick={handleRefresh}
              className={`p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-transform ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              title="Refresh System Metrics"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* System Health Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase font-semibold">Core Kernel</div>
              <div className="text-white text-sm font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Operational
              </div>
            </div>
          </div>

          <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Bot size={20} />
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase font-semibold">AI Multi-Agents</div>
              <div className="text-white text-sm font-bold">12 Workers Active</div>
            </div>
          </div>

          <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
              <Database size={20} />
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase font-semibold">Supabase PostgreSQL</div>
              <div className="text-white text-sm font-bold">Connected (pgvector)</div>
            </div>
          </div>

          <div className="bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <div className="text-white/50 text-[10px] uppercase font-semibold">USSD Bridge Mesh</div>
              <div className="text-white text-sm font-bold">Gateway Online</div>
            </div>
          </div>
        </div>

        {/* Main Application Shell Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-3 bg-[#1c1c1c] border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="px-3 py-2 text-white/40 text-[10px] font-semibold uppercase tracking-wider">
              Workspace Modules
            </div>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-brand-gold text-black font-bold shadow-md shadow-brand-gold/10'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart2 size={16} /> Executive Command Dashboard
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'agents'
                  ? 'bg-brand-gold text-black font-bold shadow-md shadow-brand-gold/10'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bot size={16} /> AI Multi-Agent Studio
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'data'
                  ? 'bg-brand-gold text-black font-bold shadow-md shadow-brand-gold/10'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database size={16} /> Data Pipelines & Vector DB
            </button>

            <button
              onClick={() => setActiveTab('ussd')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'ussd'
                  ? 'bg-brand-gold text-black font-bold shadow-md shadow-brand-gold/10'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone size={16} /> USSD Protocol Bridge
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-brand-gold text-black font-bold shadow-md shadow-brand-gold/10'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings size={16} /> Ecosystem Settings
            </button>

            {/* Ecosystem Cross-Links */}
            <div className="pt-4 mt-4 border-t border-white/10 space-y-1">
              <div className="px-3 py-1 text-white/40 text-[10px] font-semibold uppercase tracking-wider">
                Cross-Product Launchers
              </div>
              <a
                href="/products/mari-ai"
                className="flex items-center justify-between px-3 py-2 text-xs text-white/60 hover:text-purple-400 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span>Mari AI Studio</span> <ExternalLink size={12} />
              </a>
              <a
                href="/products/tradegrid-africa"
                className="flex items-center justify-between px-3 py-2 text-xs text-white/60 hover:text-blue-400 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span>TradeGrid Africa</span> <ExternalLink size={12} />
              </a>
              <a
                href="/products/dfs-platform"
                className="flex items-center justify-between px-3 py-2 text-xs text-white/60 hover:text-amber-400 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span>DFS Gateway</span> <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Interactive Workspace Panel */}
          <div className="lg:col-span-9 bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 shadow-xl">
            {activeTab === 'overview' && (
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-xl font-bold text-white">Executive Command Dashboard</h2>
                    <p className="text-white/50 text-xs">Live operational overview for Ras Ali Labs Enterprise Ecosystem</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold">
                    Real-Time Telemetry
                  </span>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-black/40 border border-white/10 rounded-xl p-5">
                    <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                      <Bot size={16} className="text-purple-400" /> Active AI Agent Tasks
                    </h4>
                    <div className="space-y-2 text-xs text-white/70">
                      <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg">
                        <span>Trade Document Parser</span>
                        <span className="text-emerald-400 font-medium">Running (99.2%)</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg">
                        <span>USSD Session Synchronizer</span>
                        <span className="text-emerald-400 font-medium">Active (Idle)</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-lg">
                        <span>Semantic Vector Embedder</span>
                        <span className="text-amber-400 font-medium">Processing Batch</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/10 rounded-xl p-5">
                    <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                      <Server size={16} className="text-brand-gold" /> Database & Storage Health
                    </h4>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between text-white/70 mb-1">
                          <span>PostgreSQL Pool Capacity</span>
                          <span className="text-brand-gold font-bold">24%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-brand-gold w-1/4 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-white/70 mb-1">
                          <span>pgvector Query Cache</span>
                          <span className="text-emerald-400 font-bold">98.6% Hit Rate</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-emerald-400 w-full rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated Terminal Output */}
                <div className="bg-black border border-white/10 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-1">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 text-white/40">
                    <span className="flex items-center gap-1.5"><Terminal size={14} /> System Console Logs</span>
                    <span>rasalilabs.com/ralion</span>
                  </div>
                  <div>[SYS_INIT] Ralion OS Kernel initialized successfully.</div>
                  <div>[SUPABASE] Connected to postgres.wctqmtwaoaugxlqkslhn.supabase.co:6543</div>
                  <div>[AUTH] Single Sign-On (SSO) tenant provider ready.</div>
                  <div>[READY] System operational. Awaiting command inputs...</div>
                </div>
              </div>
            )}

            {activeTab === 'agents' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">AI Multi-Agent Studio</h2>
                <p className="text-white/50 text-xs mb-6">Orchestrate and deploy specialized Gemini LLM reasoning agents.</p>
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 text-center">
                  <Bot size={48} className="mx-auto text-purple-400 mb-4 animate-bounce" />
                  <h3 className="text-lg font-bold text-white mb-2">Multi-Agent Engine Active</h3>
                  <p className="text-white/60 text-xs max-w-md mx-auto mb-6">
                    Connect Mari AI LLM agents directly to your Ralion enterprise workflows.
                  </p>
                  <a
                    href="/products/mari-ai"
                    className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 transition-colors"
                  >
                    Configure Mari AI Agents <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Data Pipelines & Vector DB</h2>
                <p className="text-white/50 text-xs mb-6">PostgreSQL vector embeddings and low-latency data streaming.</p>
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 text-center">
                  <Database size={48} className="mx-auto text-blue-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">Supabase PostgreSQL Connected</h3>
                  <p className="text-white/60 text-xs max-w-md mx-auto mb-4">
                    Target Instance: postgres.wctqmtwaoaugxlqkslhn.supabase.co
                  </p>
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                    pgvector & uuid-ossp enabled
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'ussd' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">USSD Protocol Bridge</h2>
                <p className="text-white/50 text-xs mb-6">Synchronize USSD feature phone sessions with web platform state.</p>
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 text-center">
                  <Smartphone size={48} className="mx-auto text-amber-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">USSD Gateway Ready</h3>
                  <p className="text-white/60 text-xs max-w-md mx-auto mb-6">
                    Bridging feature phone USSD sessions directly into Ralion enterprise web state.
                  </p>
                  <a
                    href="/case-study/ussd-web-gap"
                    className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
                  >
                    View USSD-Web Case Study <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Ecosystem Settings</h2>
                <p className="text-white/50 text-xs mb-6">Single Sign-On and workspace preferences.</p>
                <div className="space-y-4 text-xs text-white/80">
                  <div className="bg-black/40 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Domain Policy</div>
                      <div className="text-white/50 text-[11px]">Subdomains disabled — running on rasalilabs.com/ralion</div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-brand-gold/10 text-brand-gold font-bold">Active</span>
                  </div>

                  <div className="bg-black/40 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">Supabase Auth SSO</div>
                      <div className="text-white/50 text-[11px]">One account across all products</div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold">Connected</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RalionApp;

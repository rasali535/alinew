import React from 'react';
import { Code, Terminal, Key, Shield, BookOpen, Cpu, ExternalLink, Copy } from 'lucide-react';

const DeveloperPortal = () => {
  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-brand-gold text-xs font-semibold uppercase tracking-widest block mb-3">
            Developer Ecosystem
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
            Developer Portal & API Docs
          </h1>
          <p className="text-white/60 text-lg">
            Build on top of Ras Ali Labs products. Integrate Supabase Auth, Mari AI endpoints, USSD bridges, and Ralion micro-frontends.
          </p>
        </div>

        {/* Quickstart Snippet Card */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 mb-12 shadow-2xl">
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-brand-gold font-bold text-sm">
              <Code size={18} /> Supabase Auth & Ralion API Quickstart
            </div>
            <span className="text-white/40 text-xs font-mono">rasalilabs.com/developers</span>
          </div>

          <pre className="bg-black/80 p-5 rounded-2xl overflow-x-auto text-xs font-mono text-emerald-400 border border-white/5 leading-relaxed">
{`// 1. Initialize Ras Ali Labs Supabase Single Sign-On Client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wctqmtwaoaugxlqkslhn.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY
);

// 2. Authenticate User across Ralion & Mari AI Ecosystem
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'developer@rasalilabs.com',
  password: 'user_secure_password'
});

// 3. Invoke Ralion Operating System Micro-Service Endpoint
const response = await fetch('https://rasalilabs.com/api/v1/ralion/execute', {
  headers: { Authorization: \`Bearer \${data.session.access_token}\` }
});`}
          </pre>
        </div>

        {/* Developer Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#252525] border border-white/10 p-6 rounded-2xl">
            <Key className="text-brand-gold mb-4" size={28} />
            <h3 className="text-lg font-bold text-white mb-2">Unified Authentication</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Implement single sign-on (SSO) using the shared Supabase authentication cluster.
            </p>
            <a href="/products/ralion" className="text-brand-gold text-xs font-semibold hover:underline flex items-center gap-1">
              Auth Docs <ExternalLink size={12} />
            </a>
          </div>

          <div className="bg-[#252525] border border-white/10 p-6 rounded-2xl">
            <Terminal className="text-purple-400 mb-4" size={28} />
            <h3 className="text-lg font-bold text-white mb-2">Mari AI Webhooks</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Stream LLM agent reasoning directly into your backend webhooks or USSD handlers.
            </p>
            <a href="/products/mari-ai" className="text-purple-400 text-xs font-semibold hover:underline flex items-center gap-1">
              AI Webhook Docs <ExternalLink size={12} />
            </a>
          </div>

          <div className="bg-[#252525] border border-white/10 p-6 rounded-2xl">
            <Shield className="text-amber-400 mb-4" size={28} />
            <h3 className="text-lg font-bold text-white mb-2">USSD-to-Web Protocol</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Connect Mascom, Orange, and BTC telecom USSD sessions to modern web platforms.
            </p>
            <a href="/case-study/ussd-web-gap" className="text-amber-400 text-xs font-semibold hover:underline flex items-center gap-1">
              USSD Protocol Docs <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperPortal;

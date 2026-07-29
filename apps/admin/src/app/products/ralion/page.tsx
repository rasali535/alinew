'use client';

import React, { useEffect, useState } from 'react';
import { Button, Card, Badge } from '@ralion/ui';
import { Download, Sparkles, Shield, Truck, HeartPulse, ShoppingBag, TrendingUp, Check, ArrowRight, Monitor, Globe, CheckCircle2 } from 'lucide-react';

interface LatestRelease {
  version: string;
  platform: string;
  download_url: string;
  checksum: string;
  size: string;
  release_notes: string;
}

export default function RalionProductPage() {
  const [release, setRelease] = useState<LatestRelease>({
    version: '2.4.2',
    platform: 'windows',
    download_url: 'https://yidsfihagwttlmhfynmf.supabase.co/storage/v1/object/public/ralion-releases/windows/2.4.2/ralion-desktop-2.4.2-setup.exe',
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    size: '152MB',
    release_notes: 'Production Windows PE x64 NSIS Installer release.'
  });

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch('/api/releases/latest?platform=windows');
        if (res.ok) {
          const data = await res.json();
          if (data.version) setRelease(data);
        }
      } catch (err) {
        console.warn('Could not load dynamic release metadata:', err);
      }
    }
    fetchLatest();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-emerald-400 flex items-center justify-center font-black text-white text-base">
              R
            </div>
            <div>
              <div className="text-sm font-black tracking-wide text-white">RAS ALI LABS</div>
              <div className="text-[10px] text-zinc-400">Ralion Business Operating System</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="/portal" className="text-xs text-zinc-400 hover:text-white transition-colors font-medium">Customer Portal</a>
            <a href="#downloads" className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/20">
              Download Ralion OS
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center gap-6">
          <Badge variant="purple" className="px-3 py-1 text-xs">Ralion OS v{release.version} · Community & Enterprise</Badge>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight">
            The AI-Powered Business Operating System
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl italic font-serif">
            "Empowered to Prosper" — Seamlessly manage CRM, tasks, projects, logistics, health, trade, and AI marketing from one platform.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-4" id="downloads">
            <a
              href={release.download_url}
              className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-xl shadow-blue-600/25"
            >
              <Download className="w-4 h-4" /> Download for Windows (x64 Setup)
            </a>
            <a href="/ralion/dashboard" className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-sm flex items-center gap-2 transition-all">
              Launch Web Workspace <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="text-xs text-zinc-500 font-mono flex items-center gap-4 mt-2">
            <span>Version: {release.version}</span>
            <span>·</span>
            <span>Size: {release.size}</span>
            <span>·</span>
            <span>Windows 10/11 x64 NSIS</span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-zinc-900">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-black text-white">Product Modules</h2>
          <p className="text-xs text-zinc-400 mt-1">Modular business capabilities powered by Mari AI.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Mari AI Intelligence', icon: <Sparkles className="w-5 h-5 text-purple-400" />, desc: 'Autonomous executive advisory agent providing daily business summaries, risk detection, and natural language query responses.' },
            { title: 'Ralion Growth AI', icon: <TrendingUp className="w-5 h-5 text-blue-400" />, desc: 'Social media management, campaign planning, and automated post generation across LinkedIn, Facebook, Instagram.' },
            { title: 'Ralion Logistics', icon: <Truck className="w-5 h-5 text-amber-400" />, desc: 'Fleet vehicle tracking, driver allocation, shipment monitoring, and AI customs document verification.' },
            { title: 'Ralion Health', icon: <HeartPulse className="w-5 h-5 text-emerald-400" />, desc: 'Client intake, appointment scheduling, confidential case notes, and HIPAA-ready clinical workflows.' },
            { title: 'Ralion Trade', icon: <ShoppingBag className="w-5 h-5 text-purple-400" />, desc: 'Supplier database, product catalogue, procurement order tracking, and trade intelligence.' },
            { title: 'Ralion Core CRM', icon: <Shield className="w-5 h-5 text-blue-400" />, desc: 'Customer profiles, sales pipeline stages, task boards, document vaults, and operational reports.' },
          ].map((feat, i) => (
            <Card key={i} className="p-6 hover:border-blue-500/30 transition-all">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 w-fit mb-3">{feat.icon}</div>
              <h3 className="font-bold text-white text-base">{feat.title}</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{feat.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Community & Paid Editions */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-zinc-900">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-black text-white">Choose Your Ralion Edition</h2>
          <p className="text-xs text-zinc-400 mt-1">Scale from individual startup to multi-national enterprise.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Community Edition', price: 'Free', cycle: 'forever', features: ['CRM & Customers', 'Task Management', 'Documents & Reports', 'Mari AI (100 queries/mo)', 'Windows Desktop App'] },
            { name: 'Professional Edition', price: 'BWP 999', cycle: '/month', badge: 'Most Popular', features: ['Everything in Community', 'Unlimited Mari AI Queries', 'Ralion Growth AI', 'Automation Workflows', '100GB Cloud Storage'] },
            { name: 'Enterprise Edition', price: 'BWP 2,500', cycle: '/month', badge: 'Full Ecosystem', features: ['Everything in Professional', 'SAML 2.0 / SSO', 'Multi-Organization Control', 'Government & Health Modules', 'Dedicated SLA Support'] },
          ].map((plan, i) => (
            <Card key={i} className={`p-6 flex flex-col justify-between ${plan.badge ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
              <div>
                {plan.badge && <Badge variant="primary" className="mb-3">{plan.badge}</Badge>}
                <h3 className="font-black text-white text-lg">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-4">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-zinc-400">{plan.cycle}</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant={plan.badge ? 'primary' : 'outline'} size="sm" className="w-full justify-center mt-6">
                {plan.price === 'Free' ? 'Download Community' : 'Start 14-Day Free Trial'}
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

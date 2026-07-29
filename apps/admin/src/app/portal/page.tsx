'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@ralion/ui';
import { CreditCard, Download, Shield, Star, ArrowRight, User, Building2, Check } from 'lucide-react';

const plans = [
  {
    slug: 'community',
    name: 'Community',
    price: 'Free',
    cycle: 'forever',
    badge: null,
    features: ['CRM & Customers', 'Task Management', 'Calendar', 'Documents (50 files)', 'Basic Reports', 'Mari AI (100 queries/mo)', 'Up to 3 users'],
    color: 'zinc',
  },
  {
    slug: 'professional',
    name: 'Professional',
    price: 'BWP 999',
    cycle: '/month',
    badge: 'Most Popular',
    features: ['Everything in Community', 'Unlimited users', 'Advanced AI Reports', 'Mari AI Unlimited', 'Automation Workflows', '100GB Storage', 'Advanced Permissions', '14-day free trial'],
    color: 'blue',
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    price: 'BWP 2,500',
    cycle: '/month',
    badge: 'Full Power',
    features: ['Everything in Professional', 'Unlimited storage', 'API Access', 'Custom Modules', 'Multi-org', 'Dedicated Support', 'Custom Deployment', 'SLA guarantee'],
    color: 'purple',
  },
];

export default function PortalPage() {
  const [currentPlan] = useState('community');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SUBSCRIPTION' | 'LICENSES' | 'DOWNLOADS'>('OVERVIEW');

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-black text-sm">R</div>
            <div>
              <div className="text-sm font-black text-white">Ras Ali Labs</div>
              <div className="text-[10px] text-zinc-500">Customer Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default">Community Plan</Badge>
            <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-blue-400">R</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-black text-white">Welcome to your Portal</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your account, subscription, licenses, and downloads.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
          {(['OVERVIEW', 'SUBSCRIPTION', 'LICENSES', 'DOWNLOADS'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: <Star className="w-5 h-5 text-amber-400" />, title: 'Current Plan', value: 'Community', sub: 'Free forever', action: 'Upgrade', tab: 'SUBSCRIPTION' as const },
              { icon: <Shield className="w-5 h-5 text-blue-400" />, title: 'Active Licenses', value: '1', sub: 'Ralion Community', action: 'Manage', tab: 'LICENSES' as const },
              { icon: <Download className="w-5 h-5 text-emerald-400" />, title: 'Desktop App', value: 'v1.0.0', sub: 'Available for download', action: 'Download', tab: 'DOWNLOADS' as const },
            ].map((item, i) => (
              <Card key={i} className="p-6 hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => setActiveTab(item.tab)}>
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800">{item.icon}</div>
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="mt-4">
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold">{item.title}</div>
                  <div className="text-xl font-black text-white mt-1">{item.value}</div>
                  <div className="text-xs text-zinc-400 mt-0.5">{item.sub}</div>
                </div>
                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  <span className="text-xs font-bold text-blue-400">{item.action} →</span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'SUBSCRIPTION' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map(plan => (
                <div key={plan.slug} className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-all ${plan.slug === currentPlan ? 'border-blue-500/50 bg-blue-500/5' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'}`}>
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-[10px] font-black text-white">{plan.badge}</div>
                  )}
                  <div>
                    <h3 className="font-black text-white text-lg">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-white">{plan.price}</span>
                      <span className="text-xs text-zinc-400">{plan.cycle}</span>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-[11px] text-zinc-300">
                        <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.slug === currentPlan ? 'outline' : 'primary'}
                    size="sm"
                    className="mt-auto"
                    disabled={plan.slug === currentPlan}
                  >
                    {plan.slug === currentPlan ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Licenses Tab */}
        {activeTab === 'LICENSES' && (
          <Card>
            <CardHeader><CardTitle>Active Licenses</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">Ralion Community</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">License: RALION-COM-XXXX-XXXX</div>
                      <div className="text-[11px] text-zinc-500 mt-1">Valid · 1 device registered · No expiry</div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-800/60 flex gap-2">
                    <Button variant="outline" size="sm">View Devices</Button>
                    <Button variant="outline" size="sm">Copy License Key</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Downloads Tab */}
        {activeTab === 'DOWNLOADS' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Ralion Desktop Application</h2>
              <p className="text-xs text-zinc-400 mt-1">Version 1.0.0 · Released July 28, 2026 · Empowered to Prosper</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { platform: 'Windows', icon: '🪟', ext: '.exe', size: '~125 MB', arch: 'x64 & ARM64', hint: 'Windows 10/11' },
                { platform: 'macOS', icon: '🍎', ext: '.dmg', size: '~140 MB', arch: 'Intel & Apple Silicon', hint: 'macOS 12+' },
                { platform: 'Linux', icon: '🐧', ext: '.AppImage', size: '~115 MB', arch: 'x64', hint: 'Ubuntu/Debian/Fedora' },
              ].map((p, i) => (
                <Card key={i} className="p-6 hover:border-emerald-500/30 transition-all">
                  <div className="text-4xl mb-3">{p.icon}</div>
                  <h3 className="font-black text-white">{p.platform}</h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{p.hint} · {p.arch}</p>
                  <div className="text-[10px] text-zinc-500 mt-1">Format: {p.ext} · {p.size}</div>
                  <Button variant="primary" size="sm" className="mt-4 w-full justify-center">
                    <Download className="w-3.5 h-3.5" /> Download for {p.platform}
                  </Button>
                </Card>
              ))}
            </div>
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
              ⚠️ After downloading, install and login with your Ras Ali Labs account. Your license key will be verified automatically.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

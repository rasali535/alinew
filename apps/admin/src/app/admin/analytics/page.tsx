'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@ralion/ui';
import { TrendingUp, Users, Cpu, Activity, Globe, Zap } from 'lucide-react';

const metrics = [
  { label: 'Total Registered Users', value: '58', change: '+8 this month', trend: 'up' },
  { label: 'Active Organizations', value: '5', change: '+2 this month', trend: 'up' },
  { label: 'Total MRR', value: 'BWP 4,498', change: '+BWP 999 MoM', trend: 'up' },
  { label: 'Mari AI Queries (Month)', value: '1,284', change: '+340 vs last month', trend: 'up' },
  { label: 'Total Documents', value: '342', change: 'Across all orgs', trend: 'neutral' },
  { label: 'Desktop Installs', value: '7', change: '3 platforms', trend: 'up' },
];

const planDistribution = [
  { plan: 'Community', count: 2, color: 'bg-zinc-600' },
  { plan: 'Professional', count: 2, color: 'bg-blue-600' },
  { plan: 'Enterprise', count: 1, color: 'bg-purple-600' },
];

const recentEvents = [
  { time: '2 min ago', event: 'New org registered: TransAfrica Freight', type: 'success' },
  { time: '14 min ago', event: 'Subscription upgraded: Doves Funeral → Professional', type: 'success' },
  { time: '1 hr ago', event: 'Failed payment: Smith & Co Enterprises', type: 'danger' },
  { time: '3 hrs ago', event: 'License activated: Device B (Windows) — Kalahari Mining', type: 'info' },
  { time: '6 hrs ago', event: 'New user signup: Dr. Lesego Moagi (Pameltex)', type: 'success' },
  { time: 'Yesterday', event: 'Trial started: Pameltex Psychosocial (14 days)', type: 'warning' },
];

export default function AdminAnalyticsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="border-b border-red-900/30 bg-red-950/20 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <Activity className="w-4 h-4 text-red-400" />
          <span className="font-black text-sm text-white">Ras Ali Labs Admin — Analytics</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        <h1 className="text-2xl font-black text-white">Platform Analytics</h1>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m, i) => (
            <Card key={i} className="p-5">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{m.label}</div>
              <div className="text-2xl font-black text-white mt-1">{m.value}</div>
              <div className={`text-[11px] mt-0.5 font-semibold ${m.trend === 'up' ? 'text-emerald-400' : 'text-zinc-500'}`}>{m.change}</div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Distribution */}
          <Card>
            <CardHeader><CardTitle>Plan Distribution</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {planDistribution.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 font-semibold">{p.plan}</span>
                    <span className="text-zinc-400">{p.count} org{p.count > 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div className={`h-full rounded-full ${p.color}`} style={{ width: `${(p.count / 5) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Live Event Feed */}
          <Card>
            <CardHeader><CardTitle>Live Event Feed</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2">
              {recentEvents.map((e, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-zinc-800/50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${e.type === 'success' ? 'bg-emerald-500' : e.type === 'danger' ? 'bg-red-500' : e.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-zinc-200 leading-snug">{e.event}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{e.time}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

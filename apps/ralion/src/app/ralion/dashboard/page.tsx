'use client';

import React, { useState } from 'react';
import { 
  StatsCard, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Badge, 
  Button 
} from '@ralion/ui';
import { DashboardViewMode, DEFAULT_DASHBOARD_TEMPLATES } from '@ralion/core';
import { DollarSign, Users, CheckSquare, Sparkles, TrendingUp, Activity, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

const sampleSalesData = [
  { month: 'Jan', revenue: 24000, leads: 40 },
  { month: 'Feb', revenue: 32000, leads: 55 },
  { month: 'Mar', revenue: 28000, leads: 48 },
  { month: 'Apr', revenue: 45000, leads: 70 },
  { month: 'May', revenue: 52000, leads: 85 },
  { month: 'Jun', revenue: 68000, leads: 110 },
];

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<DashboardViewMode>('CEO');

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header View Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Executive Dashboard</h1>
            <Badge variant="primary">Real-Time Engine</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Ras Ali Labs Enterprise Intelligence & Operations Command Center
          </p>
        </div>

        {/* Quick Actions & View Mode */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm">Add Customer</Button>
            <Button variant="outline" size="sm">Create Task</Button>
            <Button variant="outline" size="sm">Upload Document</Button>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['CEO', 'OPERATIONS', 'MARKETING'] as DashboardViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode} View
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Monthly Revenue"
          value="$68,450"
          change="+18.4%"
          trend="up"
          description="vs last month ($57,800)"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatsCard
          title="Active Customers"
          value="428"
          change="+12"
          trend="up"
          description="18 new leads in pipeline"
          icon={<Users className="w-4 h-4" />}
        />
        <StatsCard
          title="Operations Pending"
          value="24 Tasks"
          change="-4"
          trend="up"
          description="5 urgent tasks due today"
          icon={<CheckSquare className="w-4 h-4" />}
        />
        <Card className="bg-gradient-to-br from-blue-900/30 via-zinc-900 to-purple-900/30 border-blue-500/30">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Mari AI Insight
              </span>
              <Badge variant="purple">Live</Badge>
            </div>
            <p className="text-xs text-zinc-200 mt-2 font-medium">
              "Revenue growth is pacing +18%. High conversion observed in Professional SaaS tiers."
            </p>
            <span className="text-[10px] text-zinc-400 mt-3 flex items-center gap-1">
              Updated 5 mins ago by Mari AI
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Revenue Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue & Pipeline Growth</CardTitle>
                <CardDescription>Monthly performance analytics across branches</CardDescription>
              </div>
              <Badge variant="success" className="gap-1">
                <TrendingUp className="w-3 h-3" /> +24% YoY
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampleSalesData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Live Workflow & Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> Activity Feed
              </span>
              <Badge variant="default">Realtime</Badge>
            </CardTitle>
            <CardDescription>Automated workflow executions and team updates</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {[
              { title: 'New Customer Intake', desc: 'Apex Logistics added by CRM Workflow', time: '10m ago', type: 'WORKFLOW' },
              { title: 'Invoice Paid', desc: 'Inv #1042 ($4,500) received via Botswana Gateway', time: '25m ago', type: 'BILLING' },
              { title: 'Mari AI Social Post Scheduled', desc: 'LinkedIn post queued for 4:00 PM', time: '1h ago', type: 'GROWTH' },
              { title: 'Logistics Customs Cleared', desc: 'Shipment #LOG-882 cleared Gaborone border', time: '2h ago', type: 'LOGISTICS' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0">
                <div className="p-1.5 rounded-lg bg-zinc-800 text-blue-400 mt-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{item.title}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

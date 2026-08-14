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
import { DollarSign, Users, CheckSquare, Sparkles, TrendingUp, Activity, ArrowUpRight, Loader2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<DashboardViewMode>('CEO');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ revenue: '$0', customers: '0', pending: '0 Tasks' });
  const [mariInsight, setMariInsight] = useState('Mari AI Command Center is active. Add operational leads or tasks to receive real-time strategic recommendations.');
  const [isMariLoading, setIsMariLoading] = useState(false);
  const [userTier, setUserTier] = useState<string>('COMMUNITY');

  React.useEffect(() => {
    // Resolve user tier from auth service or local storage
    import('@/lib/services/auth.service').then(({ AuthService }) => {
      AuthService.getCurrentUser().then((user) => {
        if (user?.tier) {
          setUserTier(user.tier.toUpperCase());
        } else {
          const local = typeof window !== 'undefined' ? localStorage.getItem('ralion_user_tier') : null;
          if (local) setUserTier(local.toUpperCase());
        }
      });
    });

    // Read user created items if available, or present clean zero-state
    const savedContacts = typeof window !== 'undefined' ? localStorage.getItem('ralion_contacts') : null;
    const contactsList = savedContacts ? JSON.parse(savedContacts) : [];

    const totalRev = contactsList.reduce((acc: number, item: any) => acc + (item.dealValue || 0), 0);
    const activeCusts = contactsList.filter((c: any) => c.type === 'CUSTOMER').length;

    setMetrics({
      revenue: `$${totalRev.toLocaleString()}`,
      customers: `${activeCusts}`,
      pending: `0 Tasks`
    });

    if (contactsList.length > 0) {
      fetchMariInsight(contactsList);
    }
  }, []);

  const fetchMariInsight = async (data: any[]) => {
    setIsMariLoading(true);
    try {
      const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');
      const ralionDesktop = (window as any).ralionDesktop;
      
      const prompt = `Analyze this organizational sales and CRM data and provide a 2-sentence executive summary: ${JSON.stringify(data.slice(0, 5))}`;
      
      if (isDesktop && ralionDesktop?.aiQuery) {
        const res = await ralionDesktop.aiQuery(prompt, 'phi3');
        if (res.success) setMariInsight(res.response);
      } else {
        const { callMariAiApi } = await import('@ralion/ai');
        const apiRes = await callMariAiApi(prompt);
        if (apiRes) setMariInsight(apiRes.text);
      }
    } catch (e) {
      console.error(e);
    }
    setIsMariLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Community Edition Alert & Upgrade Banner */}
      {userTier === 'COMMUNITY' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/30 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-blue-500/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Ralion Community Edition (Free Forever)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Free Plan</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1">
                Your workspace includes Core CRM, Contacts, Tasks, and 1,000 Mari AI executions. Upgrade to Standard ($1/day) or Professional to unlock Growth AI, Workflows, and Reports.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/billing?tier=standard"
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1"
            >
              Standard ($1/day) <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="/billing?tier=professional"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1"
            >
              Pro ($49/mo) <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Standard Plan Info Banner */}
      {userTier === 'STANDARD' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Standard Starter-Pro Active</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Active</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1">
                You have active access to Growth AI (5 posts/day), 3 Automated Workflows, and 10,000 Mari AI executions.
              </p>
            </div>
          </div>
          <a
            href="/billing"
            className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5"
          >
            Upgrade to Pro for Unlimited <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Header View Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              {userTier === 'ENTERPRISE' ? 'Enterprise Sovereign Command Center' : userTier === 'PROFESSIONAL' ? 'Professional Business Dashboard' : userTier === 'STANDARD' ? 'Standard Business Dashboard' : 'Community Operations Dashboard'}
            </h1>
            <Badge
              variant={userTier === 'ENTERPRISE' ? 'primary' : userTier === 'PROFESSIONAL' ? 'purple' : userTier === 'STANDARD' ? 'warning' : 'default'}
              className="uppercase tracking-wider font-mono text-[10px]"
            >
              {userTier} Edition
            </Badge>
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
          value={metrics.revenue}
          change="+12.5%"
          trend="up"
          description="Compared to last month"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatsCard
          title="Active Customers"
          value={metrics.customers}
          change="+8"
          trend="up"
          description="New leads acquired"
          icon={<Users className="w-4 h-4" />}
        />
        {userTier === 'COMMUNITY' ? (
          <StatsCard
            title="Mari AI Free Quota"
            value="42 / 1,000"
            change="95.8% remaining"
            trend="up"
            description="Community Plan limit"
            icon={<Sparkles className="w-4 h-4 text-blue-400" />}
          />
        ) : userTier === 'STANDARD' ? (
          <StatsCard
            title="Mari AI Standard Quota"
            value="42 / 10,000"
            change="99.5% remaining"
            trend="up"
            description="Standard Plan limit"
            icon={<Sparkles className="w-4 h-4 text-amber-400" />}
          />
        ) : (
          <StatsCard
            title="Operations Pending"
            value={metrics.pending}
            change="-2"
            trend="down"
            description="Due today"
            icon={<CheckSquare className="w-4 h-4" />}
          />
        )}
        <Card className="bg-gradient-to-br from-blue-900/30 via-zinc-900 to-purple-900/30 border-blue-500/30">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                {isMariLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} 
                Mari AI Insight
              </span>
              <Badge variant="purple">Live</Badge>
            </div>
            <p className="text-xs text-zinc-200 mt-2 font-medium">
              "{mariInsight}"
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
                <TrendingUp className="w-3 h-3" /> Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
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
              { title: 'System Initialized', desc: 'Ralion Platform ready for operations', time: 'Just now', type: 'WORKFLOW' },
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

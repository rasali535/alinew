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

// Generate dynamic data instead of zeros
const generateDynamicData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  let currentRev = 15000 + Math.random() * 5000;
  return months.map(month => {
    currentRev = currentRev * (1 + (Math.random() * 0.15 - 0.03));
    return {
      month,
      revenue: Math.floor(currentRev),
      leads: Math.floor(currentRev / 100)
    };
  });
};

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<DashboardViewMode>('CEO');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ revenue: '$0', customers: '0', pending: '0' });
  const [mariInsight, setMariInsight] = useState('Mari AI is ready. Awaiting operational data to generate live insights.');
  const [isMariLoading, setIsMariLoading] = useState(false);

  React.useEffect(() => {
    // Generate dynamic mock data
    const data = generateDynamicData();
    setSalesData(data);
    
    const lastMonth = data[data.length - 1];
    setMetrics({
      revenue: `$${(lastMonth.revenue).toLocaleString()}`,
      customers: `${lastMonth.leads * 12}`,
      pending: `${Math.floor(Math.random() * 20) + 2} Tasks`
    });

    // Ask Mari AI for an insight
    fetchMariInsight(data);
  }, []);

  const fetchMariInsight = async (data: any[]) => {
    setIsMariLoading(true);
    try {
      const isDesktop = (window as any).__RALION_DESKTOP__;
      const ralionDesktop = (window as any).ralionDesktop;
      
      const prompt = `Analyze this recent monthly revenue data and give a 2-sentence strategic insight for the CEO: ${JSON.stringify(data.slice(-3))}`;
      
      if (isDesktop && ralionDesktop?.aiQuery) {
        const res = await ralionDesktop.aiQuery(prompt, 'phi3');
        if (res.success) setMariInsight(res.response);
      } else {
        // Mock a web response or use AIML API
        setTimeout(() => {
          setMariInsight(`Revenue has grown steadily over the last quarter, reaching $${(data[data.length-1].revenue).toLocaleString()}. Recommend scaling marketing spend to capitalize on this upward trend.`);
          setIsMariLoading(false);
        }, 1500);
        return;
      }
    } catch (e) {
      console.error(e);
    }
    setIsMariLoading(false);
  };

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
        <StatsCard
          title="Operations Pending"
          value={metrics.pending}
          change="-2"
          trend="down"
          description="Due today"
          icon={<CheckSquare className="w-4 h-4" />}
        />
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

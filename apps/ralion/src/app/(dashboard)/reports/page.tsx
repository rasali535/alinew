'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { TrendingUp, Sparkles, Download, BarChart2, CheckCircle2, DollarSign, Users, Activity } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const customerGrowthData = [
  { month: 'Jan', customers: 210 },
  { month: 'Feb', customers: 245 },
  { month: 'Mar', customers: 280 },
  { month: 'Apr', customers: 340 },
  { month: 'May', customers: 385 },
  { month: 'Jun', customers: 428 },
];

const salesActivityData = [
  { stage: 'New Leads', count: 18, value: 85000 },
  { stage: 'Qualified', count: 12, value: 64000 },
  { stage: 'Proposals', count: 8, value: 45000 },
  { stage: 'Won', count: 14, value: 68450 },
];

const COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Analytics & Executive Reports</h1>
            <Badge variant="primary">Ralion Core</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Empowered to Prosper — Comprehensive reports on customer growth, sales activity, and performance metrics.
          </p>
        </div>

        <Button variant="glass" size="sm" className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-blue-500/40 text-blue-300">
          <Download className="w-4 h-4" /> Export Executive PDF Report
        </Button>
      </div>

      {/* Mari AI Performance Summary Banner */}
      <Card className="bg-gradient-to-r from-blue-950/40 via-zinc-900 to-purple-950/40 border-blue-500/40">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Mari AI Business Summary</span>
              <h3 className="text-lg font-bold text-white mt-0.5">Overall Business Performance: Strong Growth (+18%)</h3>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed max-w-2xl">
                Customer base grew by <strong className="text-emerald-400">+18%</strong>, task completion rate reached <strong className="text-purple-400">92%</strong>, and total revenue pacing <strong className="text-blue-400">+12%</strong> MoM.
                <br /><em className="text-zinc-400 mt-1 block">Mari Recommendation: Focus follow-ups on 5 high-value qualified leads currently in proposal stage.</em>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 border-l border-zinc-800/80 pl-6">
            <span className="text-xs text-zinc-400 font-medium">Customer Growth: <strong className="text-emerald-400">+18%</strong></span>
            <span className="text-xs text-zinc-400 font-medium">Task Completion: <strong className="text-purple-400">92%</strong></span>
            <span className="text-xs text-zinc-400 font-medium">Revenue Growth: <strong className="text-blue-400">+12% MoM</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Growth Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Base Growth</CardTitle>
            <CardDescription>Active organizations and clients (Monthly)</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={customerGrowthData}>
                <defs>
                  <linearGradient id="colorCust" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="customers" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCust)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Activity Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline Distribution</CardTitle>
            <CardDescription>Total deal value by pipeline stage</CardDescription>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesActivityData}>
                <XAxis dataKey="stage" stroke="#71717a" fontSize={12} />
                <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                <Bar dataKey="value" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

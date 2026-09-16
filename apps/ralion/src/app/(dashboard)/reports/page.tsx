'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Download, DollarSign, Users, CheckCircle2, Briefcase, Loader2, FileText, Zap } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TierAccessGate } from '@/components/TierAccessGate';
import { authFetch } from '@/lib/api-config';

interface ReportData {
  generatedAt: string;
  workspace: { id: string; name: string };
  kpis: Record<string, number>;
  salesByStage: Array<{ stage: string; count: number; value: number }>;
  monthlyCustomerGrowth: Array<{ month: string; customers: number; dealsCreated: number; wonValue: number }>;
  billing?: any;
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    const res = await authFetch('/api/reports/overview');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error || 'Failed to load report.');
    else { setReport(body); setError(null); }
    setLoading(false);
  };

  useEffect(() => { void loadReport(); }, []);

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Metric', 'Value'],
      ...Object.entries(report.kpis).map(([key, value]) => [key, String(value)]),
      [],
      ['Pipeline Stage', 'Deal Count', 'Value'],
      ...report.salesByStage.map(row => [row.stage, String(row.count), String(row.value)]),
      [],
      ['Month', 'Customers Added', 'Deals Created', 'Won Value'],
      ...report.monthlyCustomerGrowth.map(row => [row.month, String(row.customers), String(row.dealsCreated), String(row.wonValue)]),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ralion-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TierAccessGate requiredTier="PROFESSIONAL" featureName="Advanced Reports & BI Analytics" description="Executive analytics are built from your live workspace data. Upgrade to Professional to unlock.">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
          <div><div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-white">Analytics & Executive Reports</h1><Badge variant="success">Canonical Data</Badge></div><p className="text-xs text-zinc-400 mt-1">No sample KPIs: every metric below is aggregated from the active workspace.</p></div>
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void loadReport()}>Refresh</Button><Button variant="glass" size="sm" disabled={!report} onClick={exportCsv}><Download className="w-4 h-4" /> Export CSV</Button></div>
        </div>
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>}
        {loading && <div className="flex items-center justify-center py-20 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Building report from live data…</div>}
        {!loading && report && <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5"><div className="flex items-center gap-2 text-zinc-400 text-xs"><Users className="w-4 h-4 text-blue-400" /> Customers</div><div className="text-2xl font-black text-white mt-2">{report.kpis.customers || 0}</div></Card>
            <Card className="p-5"><div className="flex items-center gap-2 text-zinc-400 text-xs"><DollarSign className="w-4 h-4 text-emerald-400" /> Won Deal Value</div><div className="text-2xl font-black text-white mt-2">${Number(report.kpis.wonRevenue || 0).toLocaleString()}</div></Card>
            <Card className="p-5"><div className="flex items-center gap-2 text-zinc-400 text-xs"><Briefcase className="w-4 h-4 text-purple-400" /> Open Pipeline</div><div className="text-2xl font-black text-white mt-2">${Number(report.kpis.openPipelineValue || 0).toLocaleString()}</div></Card>
            <Card className="p-5"><div className="flex items-center gap-2 text-zinc-400 text-xs"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Task Completion</div><div className="text-2xl font-black text-white mt-2">{Number(report.kpis.taskCompletionRate || 0).toFixed(1)}%</div></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>Customer & Deal Activity</CardTitle><CardDescription>Records created during the last six calendar months</CardDescription></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={report.monthlyCustomerGrowth}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="month" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} /><Area type="monotone" dataKey="customers" stroke="#10b981" fill="#10b981" fillOpacity={0.15} /><Area type="monotone" dataKey="dealsCreated" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} /></AreaChart></ResponsiveContainer></CardContent></Card>
            <Card><CardHeader><CardTitle>Sales Pipeline Distribution</CardTitle><CardDescription>Current canonical deal value by stage</CardDescription></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.salesByStage}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="stage" stroke="#71717a" fontSize={10} /><YAxis stroke="#71717a" fontSize={11} tickFormatter={v => `$${Number(v) / 1000}k`} /><Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} /><Bar dataKey="value" fill="#a855f7" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5"><div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" /><span className="text-xs font-bold text-white">Knowledge Base</span></div><p className="text-xs text-zinc-400 mt-2">{report.kpis.ragReadyDocuments || 0} of {report.kpis.documents || 0} documents searchable</p></Card>
            <Card className="p-5"><div className="flex items-center gap-2"><Zap className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold text-white">Workflow Runs</span></div><p className="text-xs text-zinc-400 mt-2">{report.kpis.workflowSuccesses || 0} succeeded · {report.kpis.workflowFailures || 0} failed</p></Card>
            <Card className="p-5"><div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-xs font-bold text-white">Operations</span></div><p className="text-xs text-zinc-400 mt-2">{report.kpis.completedTasks || 0} completed · {report.kpis.overdueTasks || 0} overdue</p></Card>
          </div>
          <p className="text-[10px] text-zinc-600 text-right">Generated {new Date(report.generatedAt).toLocaleString()}</p>
        </>}
      </div>
    </TierAccessGate>
  );
}

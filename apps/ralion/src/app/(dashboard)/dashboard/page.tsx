'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Modal } from '@ralion/ui';
import { DollarSign, Users, CheckSquare, Sparkles, TrendingUp, Plus, Calendar, FileText, Zap, Loader2, ArrowRight, Briefcase } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { authFetch } from '@/lib/api-config';

interface Overview {
  generatedAt: string;
  workspace: { id: string; name: string };
  organization: { id: string; name: string };
  kpis: Record<string, number>;
  salesByStage: Array<{ stage: string; count: number; value: number }>;
  monthlyCustomerGrowth: Array<{ month: string; customers: number; dealsCreated: number; wonValue: number }>;
  recentTasks: any[];
  upcomingEvents: any[];
  recentDocuments: any[];
  billing?: { subscription?: any; credits?: any };
}

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState({ name: '', email: '', company: '', phone: '' });
  const [task, setTask] = useState({ title: '', project: 'General Operations', priority: 'MEDIUM', dueDate: '' });

  const loadOverview = async () => {
    setLoading(true);
    const res = await authFetch('/api/reports/overview');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error || 'Failed to load command centre.');
    else { setOverview(body); setError(null); }
    setLoading(false);
  };

  useEffect(() => { void loadOverview(); }, []);

  const addCustomer = async () => {
    if (!customer.name.trim() || !customer.email.trim()) return;
    setSaving(true);
    const res = await authFetch('/api/crm/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customer) });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(body.error || 'Failed to add customer.');
    setCustomer({ name: '', email: '', company: '', phone: '' });
    setCustomerOpen(false);
    await loadOverview();
  };

  const addTask = async () => {
    if (!task.title.trim()) return;
    setSaving(true);
    const res = await authFetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(body.error || 'Failed to create task.');
    setTask({ title: '', project: 'General Operations', priority: 'MEDIUM', dueDate: '' });
    setTaskOpen(false);
    await loadOverview();
  };

  const kpis = overview?.kpis || {};
  const credits = overview?.billing?.credits;
  const creditBalance = credits ? Number(credits.remaining_plan_credits || 0) + Number(credits.remaining_bonus_credits || 0) - Number(credits.reserved_credits || 0) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div><div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-white">Ralion Command Centre</h1><Badge variant="success">Live Data</Badge></div><p className="text-xs text-zinc-400 mt-1">{overview ? `${overview.organization.name} · ${overview.workspace.name}` : 'Loading tenant context…'} — Empowered to Prosper.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => void loadOverview()}>Refresh</Button><Button variant="glass" size="sm" onClick={() => setCustomerOpen(true)}><Plus className="w-4 h-4" /> Customer</Button><Button variant="primary" size="sm" onClick={() => setTaskOpen(true)}><Plus className="w-4 h-4" /> Task</Button></div>
      </div>
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>}
      {loading ? <div className="flex items-center justify-center py-24 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading canonical workspace data…</div> : overview && <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-5"><div className="flex items-center gap-2 text-xs text-zinc-400"><Users className="w-4 h-4 text-blue-400" /> Customers</div><div className="text-2xl font-black text-white mt-2">{kpis.customers || 0}</div></Card>
          <Card className="p-5"><div className="flex items-center gap-2 text-xs text-zinc-400"><Briefcase className="w-4 h-4 text-purple-400" /> Open Pipeline</div><div className="text-2xl font-black text-white mt-2">${Number(kpis.openPipelineValue || 0).toLocaleString()}</div></Card>
          <Card className="p-5"><div className="flex items-center gap-2 text-xs text-zinc-400"><DollarSign className="w-4 h-4 text-emerald-400" /> Won Value</div><div className="text-2xl font-black text-white mt-2">${Number(kpis.wonRevenue || 0).toLocaleString()}</div></Card>
          <Card className="p-5"><div className="flex items-center gap-2 text-xs text-zinc-400"><CheckSquare className="w-4 h-4 text-blue-400" /> Open Tasks</div><div className="text-2xl font-black text-white mt-2">{Math.max(0, Number(kpis.tasks || 0) - Number(kpis.completedTasks || 0))}</div></Card>
          <Card className="p-5"><div className="flex items-center gap-2 text-xs text-zinc-400"><Sparkles className="w-4 h-4 text-purple-400" /> Credits</div><div className="text-2xl font-black text-white mt-2">{creditBalance.toLocaleString()}</div></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle>Workspace Growth</CardTitle><CardDescription>Customers and deals created over the last six months</CardDescription></CardHeader><CardContent className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={overview.monthlyCustomerGrowth}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="month" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: 8 }} /><Area type="monotone" dataKey="customers" stroke="#10b981" fill="#10b981" fillOpacity={0.14} /><Area type="monotone" dataKey="dealsCreated" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} /></AreaChart></ResponsiveContainer></CardContent></Card>
          <Card><CardHeader><CardTitle>Sales Pipeline</CardTitle><CardDescription>Current deal value by stage</CardDescription></CardHeader><CardContent className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.salesByStage}><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="stage" stroke="#71717a" fontSize={10} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: 8 }} /><Bar dataKey="value" fill="#a855f7" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card><CardHeader><CardTitle className="justify-between"><span className="flex gap-2 items-center"><CheckSquare className="w-4 h-4 text-blue-400" /> Tasks</span><button onClick={() => router.push('/tasks')} className="text-xs text-blue-400 flex items-center">Open <ArrowRight className="w-3 h-3 ml-1" /></button></CardTitle></CardHeader><CardContent className="space-y-2">{overview.recentTasks.slice(0,5).map(t => <div key={t.id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800"><div className="flex justify-between gap-2"><span className="text-xs font-semibold text-white">{t.title}</span><Badge variant={t.status === 'COMPLETED' ? 'success' : 'default'}>{t.status}</Badge></div><p className="text-[10px] text-zinc-500 mt-1">{t.project || 'General'} · {t.due_date || 'No due date'}</p></div>)}{!overview.recentTasks.length && <p className="text-xs text-zinc-500 py-6 text-center">No tasks yet.</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="justify-between"><span className="flex gap-2 items-center"><Calendar className="w-4 h-4 text-purple-400" /> Upcoming</span><button onClick={() => router.push('/calendar')} className="text-xs text-blue-400 flex items-center">Calendar <ArrowRight className="w-3 h-3 ml-1" /></button></CardTitle></CardHeader><CardContent className="space-y-2">{overview.upcomingEvents.slice(0,5).map(e => <div key={e.id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800"><span className="text-xs font-semibold text-white">{e.title}</span><p className="text-[10px] text-zinc-500 mt-1">{new Date(e.start_at).toLocaleString()} · {e.category}</p></div>)}{!overview.upcomingEvents.length && <p className="text-xs text-zinc-500 py-6 text-center">No upcoming events.</p>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="justify-between"><span className="flex gap-2 items-center"><FileText className="w-4 h-4 text-emerald-400" /> Documents</span><button onClick={() => router.push('/documents')} className="text-xs text-blue-400 flex items-center">Files <ArrowRight className="w-3 h-3 ml-1" /></button></CardTitle></CardHeader><CardContent className="space-y-2">{overview.recentDocuments.slice(0,5).map(d => <div key={d.id} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800"><div className="flex justify-between gap-2"><span className="text-xs font-semibold text-white truncate">{d.name}</span><Badge variant={d.rag_status === 'READY' ? 'purple' : 'default'}>{d.rag_status}</Badge></div></div>)}{!overview.recentDocuments.length && <p className="text-xs text-zinc-500 py-6 text-center">No documents yet.</p>}</CardContent></Card>
        </div>

        <Card className="border-blue-500/20"><CardContent className="p-5"><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><button onClick={() => router.push('/crm')} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 text-left"><TrendingUp className="w-5 h-5 text-blue-400 mb-2" /><span className="text-xs font-bold text-white block">CRM Pipeline</span><span className="text-[10px] text-zinc-500">{kpis.openDeals || 0} open deals</span></button><button onClick={() => router.push('/documents')} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 text-left"><FileText className="w-5 h-5 text-emerald-400 mb-2" /><span className="text-xs font-bold text-white block">Knowledge</span><span className="text-[10px] text-zinc-500">{kpis.ragReadyDocuments || 0} searchable docs</span></button><button onClick={() => router.push('/workflows')} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 text-left"><Zap className="w-5 h-5 text-purple-400 mb-2" /><span className="text-xs font-bold text-white block">Workflows</span><span className="text-[10px] text-zinc-500">{kpis.activeWorkflows || 0} active</span></button><button onClick={() => router.push('/reports')} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/40 text-left"><Sparkles className="w-5 h-5 text-amber-400 mb-2" /><span className="text-xs font-bold text-white block">Reports</span><span className="text-[10px] text-zinc-500">Live executive BI</span></button></div></CardContent></Card>
        <p className="text-[10px] text-zinc-600 text-right">Snapshot generated {new Date(overview.generatedAt).toLocaleString()}</p>
      </>}

      <Modal isOpen={customerOpen} onClose={() => setCustomerOpen(false)} title="Add Customer"><div className="flex flex-col gap-4"><input value={customer.name} onChange={e => setCustomer(v => ({ ...v, name: e.target.value }))} placeholder="Customer name" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><input type="email" value={customer.email} onChange={e => setCustomer(v => ({ ...v, email: e.target.value }))} placeholder="Email" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><input value={customer.company} onChange={e => setCustomer(v => ({ ...v, company: e.target.value }))} placeholder="Company" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><input value={customer.phone} onChange={e => setCustomer(v => ({ ...v, phone: e.target.value }))} placeholder="Phone" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setCustomerOpen(false)}>Cancel</Button><Button variant="primary" size="sm" disabled={saving} onClick={() => void addCustomer()}>Save Customer</Button></div></div></Modal>
      <Modal isOpen={taskOpen} onClose={() => setTaskOpen(false)} title="Create Task"><div className="flex flex-col gap-4"><input value={task.title} onChange={e => setTask(v => ({ ...v, title: e.target.value }))} placeholder="Task title" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><input value={task.project} onChange={e => setTask(v => ({ ...v, project: e.target.value }))} placeholder="Project" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><div className="grid grid-cols-2 gap-3"><select value={task.priority} onChange={e => setTask(v => ({ ...v, priority: e.target.value }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option><option>CRITICAL</option></select><input type="date" value={task.dueDate} onChange={e => setTask(v => ({ ...v, dueDate: e.target.value }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /></div><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setTaskOpen(false)}>Cancel</Button><Button variant="primary" size="sm" disabled={saving} onClick={() => void addTask()}>Create Task</Button></div></div></Modal>
    </div>
  );
}

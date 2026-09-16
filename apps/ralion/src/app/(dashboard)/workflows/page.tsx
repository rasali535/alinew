'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Zap, Plus, Play, ArrowRight, Trash2, Loader2 } from 'lucide-react';
import { TierAccessGate } from '@/components/TierAccessGate';
import { authFetch } from '@/lib/api-config';

type TriggerEvent = 'CUSTOMER_CREATED' | 'DEAL_STAGE_CHANGED' | 'TASK_COMPLETED' | 'MANUAL';
type ActionType = 'CREATE_TASK' | 'CREATE_CALENDAR_EVENT' | 'AUDIT_LOG';

interface WorkflowItem {
  id: string;
  name: string;
  trigger_event: TriggerEvent;
  actions: Array<{ type: ActionType; config: Record<string, any> }>;
  executions_count: number;
  is_active: boolean;
  last_executed_at?: string | null;
}
interface WorkflowRun { id: string; workflow_id: string; trigger_event: string; status: string; started_at: string; error?: string | null; }

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', triggerEvent: 'CUSTOMER_CREATED' as TriggerEvent, actionType: 'CREATE_TASK' as ActionType, actionTitle: '', dueDays: '1' });

  const load = async () => {
    setLoading(true);
    const res = await authFetch('/api/workflows');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error || 'Failed to load workflows.');
    else { setWorkflows(body.workflows || []); setRuns(body.runs || []); setError(null); }
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const createWorkflow = async () => {
    if (!form.name.trim()) return;
    const config: Record<string, any> = {};
    if (form.actionTitle.trim()) config.title = form.actionTitle.trim();
    if (form.actionType === 'CREATE_TASK') { config.project = 'Workflow Automation'; config.priority = 'MEDIUM'; config.dueDays = Number(form.dueDays) || 1; }
    if (form.actionType === 'CREATE_CALENDAR_EVENT') { config.category = 'REMINDER'; config.startMinutesFromNow = 60; config.durationMinutes = 30; }
    if (form.actionType === 'AUDIT_LOG') { config.action = 'WORKFLOW_NOTE'; config.module = 'WORKFLOWS'; config.note = form.actionTitle.trim() || form.name.trim(); }
    const res = await authFetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, triggerEvent: form.triggerEvent, actions: [{ type: form.actionType, config }] }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error || 'Failed to create workflow.');
    setWorkflows(prev => [body.workflow, ...prev]);
    setModalOpen(false);
    setForm({ name: '', triggerEvent: 'CUSTOMER_CREATED', actionType: 'CREATE_TASK', actionTitle: '', dueDays: '1' });
  };

  const toggleWorkflow = async (workflow: WorkflowItem) => {
    const res = await authFetch('/api/workflows', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: workflow.id, isActive: !workflow.is_active }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error || 'Failed to update workflow.');
    setWorkflows(prev => prev.map(w => w.id === workflow.id ? body.workflow : w));
  };

  const runWorkflow = async (workflow: WorkflowItem) => {
    setRunningId(workflow.id);
    const res = await authFetch('/api/workflows/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workflowId: workflow.id, input: { source: 'manual_ui' } }) });
    const body = await res.json().catch(() => ({}));
    setRunningId(null);
    if (!res.ok) return setError(body.error || 'Workflow execution failed.');
    await load();
  };

  const deleteWorkflow = async (id: string) => {
    const res = await authFetch(`/api/workflows?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error || 'Delete failed.');
    setWorkflows(prev => prev.filter(w => w.id !== id));
  };

  return (
    <TierAccessGate requiredTier="STANDARD" featureName="No-Code Automated Workflows" description="Automate customer, CRM and task events with bounded server-side actions.">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5"><div><div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-white">Visual No-Code Workflows</h1><Badge variant="success">Execution Engine</Badge></div><p className="text-xs text-zinc-400 mt-1">Durable definitions and run history. Supported actions execute on the server and are audited.</p></div><Button variant="primary" size="sm" onClick={() => setModalOpen(true)}><Plus className="w-4 h-4" /> Build Workflow</Button></div>
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>}
        {loading ? <div className="flex justify-center py-16 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading workflows…</div> : <div className="grid grid-cols-1 gap-4">{workflows.map(workflow => <Card key={workflow.id} className="p-5"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div className="flex flex-col gap-2"><div className="flex items-center gap-3"><div className={`p-2 rounded-xl border ${workflow.is_active ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}><Zap className="w-5 h-5" /></div><div><h3 className="text-sm font-bold text-white flex items-center gap-2">{workflow.name}<Badge variant={workflow.is_active ? 'success' : 'default'}>{workflow.is_active ? 'Active' : 'Paused'}</Badge></h3><p className="text-xs text-zinc-400 font-mono mt-1">Trigger: <span className="text-blue-400">{workflow.trigger_event}</span></p></div></div><div className="mt-2 flex flex-wrap items-center gap-2 pl-12"><span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-200">{workflow.trigger_event}</span>{workflow.actions.map((action, index) => <React.Fragment key={index}><ArrowRight className="w-3.5 h-3.5 text-zinc-500" /><span className="px-2.5 py-1 rounded-lg bg-blue-900/30 border border-blue-500/30 text-[11px] text-blue-300">{action.type}</span></React.Fragment>)}</div></div><div className="flex items-center gap-2"><div className="text-right mr-2"><span className="text-[10px] text-zinc-500 block">Executions</span><span className="text-sm font-mono font-bold text-white">{workflow.executions_count}</span></div><Button variant="outline" size="sm" disabled={!workflow.is_active || runningId === workflow.id} onClick={() => void runWorkflow(workflow)}><Play className="w-3.5 h-3.5" /> {runningId === workflow.id ? 'Running…' : 'Run'}</Button><Button variant={workflow.is_active ? 'outline' : 'primary'} size="sm" onClick={() => void toggleWorkflow(workflow)}>{workflow.is_active ? 'Pause' : 'Enable'}</Button><button onClick={() => void deleteWorkflow(workflow.id)} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button></div></div></Card>)}{!workflows.length && <Card className="p-10 text-center text-sm text-zinc-500">No workflows yet. Build one to connect customer, deal or task events to server-side actions.</Card>}</div>}

        <Card><CardHeader><CardTitle>Recent Workflow Runs</CardTitle><CardDescription>Real execution history from the active workspace</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-xs text-zinc-300"><thead className="bg-zinc-900 border-b border-zinc-800"><tr><th className="p-4">Started</th><th className="p-4">Trigger</th><th className="p-4">Status</th><th className="p-4">Error</th></tr></thead><tbody className="divide-y divide-zinc-800/60">{runs.slice(0, 20).map(run => <tr key={run.id}><td className="p-4">{new Date(run.started_at).toLocaleString()}</td><td className="p-4 font-mono">{run.trigger_event}</td><td className="p-4"><Badge variant={run.status === 'SUCCEEDED' ? 'success' : run.status === 'FAILED' ? 'danger' : 'default'}>{run.status}</Badge></td><td className="p-4 text-rose-300">{run.error || '—'}</td></tr>)}{!runs.length && <tr><td colSpan={4} className="p-8 text-center text-zinc-500">No executions yet.</td></tr>}</tbody></table></div></CardContent></Card>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Build Workflow"><div className="flex flex-col gap-4"><input value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} placeholder="Workflow name" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><select value={form.triggerEvent} onChange={e => setForm(v => ({ ...v, triggerEvent: e.target.value as TriggerEvent }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"><option value="CUSTOMER_CREATED">Customer created</option><option value="DEAL_STAGE_CHANGED">Deal stage changed</option><option value="TASK_COMPLETED">Task completed</option><option value="MANUAL">Manual only</option></select><select value={form.actionType} onChange={e => setForm(v => ({ ...v, actionType: e.target.value as ActionType }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"><option value="CREATE_TASK">Create task</option><option value="CREATE_CALENDAR_EVENT">Create calendar reminder</option><option value="AUDIT_LOG">Write audit event</option></select><input value={form.actionTitle} onChange={e => setForm(v => ({ ...v, actionTitle: e.target.value }))} placeholder={form.actionType === 'AUDIT_LOG' ? 'Audit note' : 'Task / event title'} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />{form.actionType === 'CREATE_TASK' && <input type="number" min="0" max="365" value={form.dueDays} onChange={e => setForm(v => ({ ...v, dueDays: e.target.value }))} placeholder="Due in days" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />}<div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-[10px] text-zinc-400">Supported actions are intentionally bounded: create task, create calendar reminder, or write audit event. Email/WhatsApp are not shown as executed unless a provider action is implemented.</div><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="primary" size="sm" onClick={() => void createWorkflow()}>Save Workflow</Button></div></div></Modal>
      </div>
    </TierAccessGate>
  );
}

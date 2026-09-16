'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { CheckSquare, Plus, LayoutGrid, List, Clock, Trash2, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELED';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  project?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  created_at?: string;
}

const columns: { status: TaskStatus; label: string }[] = [
  { status: 'TODO', label: 'To Do' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'IN_REVIEW', label: 'In Review' },
  { status: 'COMPLETED', label: 'Completed' },
];

const priorityBadges: Record<TaskPriority, 'danger' | 'warning' | 'primary' | 'default'> = {
  CRITICAL: 'danger',
  URGENT: 'danger',
  HIGH: 'warning',
  MEDIUM: 'primary',
  LOW: 'default',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({ title: '', project: 'General Operations', priority: 'MEDIUM' as TaskPriority, assignedTo: '', dueDate: '' });

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    const res = await authFetch('/api/tasks');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error || 'Failed to load tasks.');
    else setTasks(body.tasks || []);
    setLoading(false);
  };

  useEffect(() => { void loadTasks(); }, []);

  const counts = useMemo(() => ({
    open: tasks.filter(t => !['COMPLETED', 'CANCELED'].includes(t.status)).length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  }), [tasks]);

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    setSaving(true);
    const res = await authFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(body.error || 'Failed to create task.');
    setTasks(prev => [body.task, ...prev]);
    setNewTask({ title: '', project: 'General Operations', priority: 'MEDIUM', assignedTo: '', dueDate: '' });
    setIsModalOpen(false);
  };

  const updateTask = async (id: string, patch: Record<string, unknown>) => {
    const res = await authFetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error || 'Failed to update task.');
    setTasks(prev => prev.map(t => t.id === id ? body.task : t));
  };

  const deleteTask = async (id: string) => {
    const res = await authFetch(`/api/tasks?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error || 'Failed to delete task.');
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Task & Project Management</h1>
            <Badge variant="success">Live</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Workspace-scoped tasks with durable status, priorities, deadlines and workflow triggers.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-400"><strong className="text-white">{counts.open}</strong> open · <strong className="text-emerald-400">{counts.completed}</strong> completed</div>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button onClick={() => setViewMode('KANBAN')} className={`p-1.5 rounded-lg ${viewMode === 'KANBAN' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-lg ${viewMode === 'LIST' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}><List className="w-4 h-4" /></button>
          </div>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4" /> Create Task</Button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>}
      {loading && <div className="flex items-center justify-center py-16 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading tasks…</div>}

      {!loading && viewMode === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => {
            const items = tasks.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="flex flex-col gap-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 min-h-48">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2"><span className="text-xs font-bold text-white">{col.label}</span><Badge>{items.length}</Badge></div>
                {items.map(task => (
                  <Card key={task.id} className="p-4">
                    <div className="flex items-start justify-between gap-2"><div><span className="text-[10px] font-bold text-zinc-500 uppercase">{task.project || 'General'}</span><h4 className="text-xs font-bold text-white mt-1">{task.title}</h4></div><Badge variant={priorityBadges[task.priority]}>{task.priority}</Badge></div>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-400"><span>{task.assigned_to || 'Unassigned'}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{task.due_date || 'No due date'}</span></div>
                    <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3">
                      <select value={task.status} onChange={e => void updateTask(task.id, { status: e.target.value })} className="flex-1 rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1 text-[10px] text-white">
                        {columns.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}<option value="CANCELED">Canceled</option>
                      </select>
                      <button onClick={() => void deleteTask(task.id)} className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </Card>
                ))}
                {!items.length && <div className="p-6 border border-dashed border-zinc-800 rounded-lg text-center text-xs text-zinc-600">No tasks</div>}
              </div>
            );
          })}
        </div>
      )}

      {!loading && viewMode === 'LIST' && (
        <Card><CardHeader><CardTitle>Task List</CardTitle><CardDescription>Canonical workspace assignments</CardDescription></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-left text-xs text-zinc-300"><thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400"><tr><th className="p-4">Task</th><th className="p-4">Project</th><th className="p-4">Priority</th><th className="p-4">Status</th><th className="p-4">Assigned</th><th className="p-4">Due</th></tr></thead><tbody className="divide-y divide-zinc-800/60">{tasks.map(task => <tr key={task.id}><td className="p-4 font-bold text-white">{task.title}</td><td className="p-4">{task.project || '—'}</td><td className="p-4"><Badge variant={priorityBadges[task.priority]}>{task.priority}</Badge></td><td className="p-4"><select value={task.status} onChange={e => void updateTask(task.id, { status: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white">{columns.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}<option value="CANCELED">Canceled</option></select></td><td className="p-4">{task.assigned_to || '—'}</td><td className="p-4">{task.due_date || '—'}</td></tr>)}</tbody></table></div></CardContent></Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Task">
        <div className="flex flex-col gap-4">
          <input value={newTask.title} onChange={e => setNewTask(v => ({ ...v, title: e.target.value }))} placeholder="Task title" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
          <input value={newTask.project} onChange={e => setNewTask(v => ({ ...v, project: e.target.value }))} placeholder="Project / category" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
          <div className="grid grid-cols-2 gap-3"><select value={newTask.priority} onChange={e => setNewTask(v => ({ ...v, priority: e.target.value as TaskPriority }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option><option>CRITICAL</option></select><input type="date" value={newTask.dueDate} onChange={e => setNewTask(v => ({ ...v, dueDate: e.target.value }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /></div>
          <input value={newTask.assignedTo} onChange={e => setNewTask(v => ({ ...v, assignedTo: e.target.value }))} placeholder="Assigned to (optional)" className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
          <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button variant="primary" size="sm" disabled={saving} onClick={() => void createTask()}>{saving ? 'Saving…' : 'Create Task'}</Button></div>
        </div>
      </Modal>
    </div>
  );
}

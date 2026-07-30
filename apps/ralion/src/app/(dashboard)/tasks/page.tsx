'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { CheckSquare, Plus, LayoutGrid, List, Calendar as CalendarIcon, Clock, AlertTriangle, User } from 'lucide-react';
import { TaskStatus, TaskPriority } from '@ralion/database';

interface TaskItem {
  id: string;
  title: string;
  project: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  dueDate: string;
}

const initialTasks: TaskItem[] = [
  { id: 't1', title: 'Deploy Mari AI RAG Vector pipeline to Firebase Functions', project: 'Mari Platform', status: 'IN_PROGRESS', priority: 'URGENT', assignedTo: 'Ras Ali AI Engineer', dueDate: 'Today' },
  { id: 't2', title: 'Finalize Botswana Billing Provider Gateway integration', project: 'Billing Core', status: 'TODO', priority: 'HIGH', assignedTo: 'Finance Lead', dueDate: 'Tomorrow' },
  { id: 't3', title: 'Setup Ralion Funeral Hearse Fleet dispatch schedule', project: 'Industry Funeral', status: 'IN_REVIEW', priority: 'MEDIUM', assignedTo: 'Ops Manager', dueDate: 'Jul 26' },
  { id: 't4', title: 'Configure Ralion Health client intake assessment forms', project: 'Industry Health', status: 'COMPLETED', priority: 'LOW', assignedTo: 'Clinical Admin', dueDate: 'Jul 22' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST'>('KANBAN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', project: 'General Operations', priority: 'MEDIUM' as TaskPriority, assignedTo: 'Ras Ali Admin' });

  const columns: { status: TaskStatus; label: string }[] = [
    { status: 'TODO', label: 'To Do' },
    { status: 'IN_PROGRESS', label: 'In Progress' },
    { status: 'IN_REVIEW', label: 'In Review' },
    { status: 'COMPLETED', label: 'Completed' },
  ];

  const priorityBadges: Record<TaskPriority, 'danger' | 'warning' | 'primary' | 'default'> = {
    URGENT: 'danger',
    HIGH: 'warning',
    MEDIUM: 'primary',
    LOW: 'default'
  };

  const handleCreateTask = () => {
    if (!newTask.title) return;
    const created: TaskItem = {
      id: `t-${Date.now()}`,
      title: newTask.title,
      project: newTask.project,
      status: 'TODO',
      priority: newTask.priority,
      assignedTo: newTask.assignedTo,
      dueDate: 'Jul 28'
    };
    setTasks(prev => [created, ...prev]);
    setIsModalOpen(false);
    setNewTask({ title: '', project: 'General Operations', priority: 'MEDIUM', assignedTo: 'Ras Ali Admin' });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Task & Project Management</h1>
            <Badge variant="primary">Phase 1 Core</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Kanban boards, project task tracking, priorities, and deadlines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`p-1.5 rounded-lg text-xs font-semibold ${viewMode === 'KANBAN' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded-lg text-xs font-semibold ${viewMode === 'LIST' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" /> Create Task
          </Button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'KANBAN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.status);

            return (
              <div key={col.status} className="flex flex-col gap-3 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-white tracking-wider">{col.label}</span>
                  <Badge variant="default" className="text-[10px]">{colTasks.length}</Badge>
                </div>

                <div className="flex flex-col gap-3">
                  {colTasks.map((task) => (
                    <Card key={task.id} className="p-4 hover:border-blue-500/50 cursor-pointer transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{task.project}</span>
                        <Badge variant={priorityBadges[task.priority]} className="text-[9px]">{task.priority}</Badge>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-snug">{task.title}</h4>
                      <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-800/60">
                        <span className="flex items-center gap-1"><User className="w-3 h-3 text-blue-400" /> {task.assignedTo}</span>
                        <span className="flex items-center gap-1 font-mono"><Clock className="w-3 h-3 text-zinc-500" /> {task.dueDate}</span>
                      </div>
                    </Card>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="p-6 border border-dashed border-zinc-800 rounded-lg text-center text-xs text-zinc-600">
                      No tasks in this column
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'LIST' && (
        <Card>
          <CardHeader>
            <CardTitle>Task List</CardTitle>
            <CardDescription>Comprehensive list of enterprise assignments</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Task Title</th>
                    <th className="p-4">Project</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assigned To</th>
                    <th className="p-4">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-4 font-bold text-white">{task.title}</td>
                      <td className="p-4 text-zinc-400">{task.project}</td>
                      <td className="p-4">
                        <Badge variant={priorityBadges[task.priority]}>{task.priority}</Badge>
                      </td>
                      <td className="p-4 font-bold text-blue-400">{task.status}</td>
                      <td className="p-4 text-zinc-300">{task.assignedTo}</td>
                      <td className="p-4 font-mono text-zinc-400">{task.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Enterprise Task">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Task Title</label>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="e.g. Audit Q3 financial statements"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Project / Category</label>
            <input
              type="text"
              value={newTask.project}
              onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Priority Level</label>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreateTask}>Create Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

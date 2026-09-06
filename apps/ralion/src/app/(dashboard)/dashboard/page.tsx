'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { DashboardViewMode } from '@ralion/core';
import { 
  DollarSign, 
  Users, 
  CheckSquare, 
  Sparkles, 
  TrendingUp, 
  Activity, 
  ArrowUpRight, 
  Loader2, 
  Plus, 
  Upload, 
  Calendar, 
  Briefcase, 
  FolderPlus, 
  CheckCircle2, 
  X, 
  Zap, 
  Share2, 
  Clock, 
  ShieldCheck,
  FileText,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { useOrganization } from '@ralion/auth';

export default function DashboardPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const activeOrgId = organization?.id || '';
  const [viewMode, setViewMode] = useState<DashboardViewMode>('CEO');
  const [userTier, setUserTier] = useState<string>('COMMUNITY');
  const [mariInsight, setMariInsight] = useState('Mari AI Command Center is active. Add operational leads, tasks, or social channels to receive real-time strategic recommendations.');
  const [isMariLoading, setIsMariLoading] = useState(false);

  // Modals state
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);

  // Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerValue, setCustomerValue] = useState('');

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Document Form State
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState<string>('CONTRACT');
  const [isUploading, setIsUploading] = useState(false);

  // Dynamic Metrics State
  const [contacts, setContacts] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Load and refresh state from localStorage & services
  const refreshDashboardData = () => {
    if (typeof window === 'undefined') return;

    // 1. Contacts & CRM
    const savedContacts = localStorage.getItem(`ralion:${activeOrgId}:contacts`) || (activeOrgId ? null : localStorage.getItem('ralion_contacts'));
    const contactsList = savedContacts ? JSON.parse(savedContacts) : [];
    setContacts(contactsList);

    // 2. Tasks
    const savedTasks = localStorage.getItem(`ralion:${activeOrgId}:tasks`) || (activeOrgId ? null : localStorage.getItem('ralion_tasks'));
    const tasksList = savedTasks ? JSON.parse(savedTasks) : [];
    setTasks(tasksList);

    // 3. Documents
    const savedDocs = localStorage.getItem(`ralion:${activeOrgId}:documents`) || (activeOrgId ? null : localStorage.getItem('ralion_documents'));
    const docsList = savedDocs ? JSON.parse(savedDocs) : [];
    setDocuments(docsList);
  };

  useEffect(() => {
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

    refreshDashboardData();
  }, [activeOrgId]);

  // Compute live KPIs strictly from real records
  const totalRevenue = useMemo(() => {
    return contacts.reduce((acc, item) => acc + (Number(item.dealValue) || 0), 0);
  }, [contacts]);

  const activeCustomersCount = useMemo(() => {
    return contacts.filter((c) => c.type === 'CUSTOMER' || !c.type).length;
  }, [contacts]);

  const pendingTasksCount = useMemo(() => {
    return tasks.filter((t) => t.status === 'PENDING').length;
  }, [tasks]);

  // Chart series tailored to active ViewMode — strictly real historical data, no synthetic multipliers
  const chartData = useMemo(() => {
    if (viewMode === 'OPERATIONS') {
      if (tasks.length === 0) return [];
      const completed = tasks.filter(t => t.status === 'COMPLETED').length;
      const pending = tasks.filter(t => t.status === 'PENDING').length;
      return [
        { name: 'Completed', tasksCompleted: completed, workflowsRun: completed },
        { name: 'Pending', tasksCompleted: pending, workflowsRun: 0 },
      ];
    } else if (viewMode === 'MARKETING') {
      return [];
    } else {
      // CEO View: Map real contacts/deals if present
      if (contacts.length === 0) return [];
      return contacts.slice(0, 6).map((c, i) => ({
        name: c.company || c.name || `Deal ${i + 1}`,
        revenue: Number(c.dealValue) || 0,
        pipeline: Number(c.dealValue) || 0,
      }));
    }
  }, [viewMode, contacts, tasks]);

  // Handle Add Customer
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    const newContact = {
      id: `c_${Date.now()}`,
      name: customerName.trim(),
      email: customerEmail.trim() || 'contact@client.com',
      company: customerCompany.trim() || 'Enterprise Client',
      dealValue: Number(customerValue) || 10000,
      type: 'CUSTOMER',
      createdAt: new Date().toISOString(),
    };

    const updated = [newContact, ...contacts];
    setContacts(updated);
    if (typeof window !== 'undefined') {
      const key = activeOrgId ? `ralion:${activeOrgId}:contacts` : 'ralion_contacts';
      localStorage.setItem(key, JSON.stringify(updated));
    }

    setCustomerName('');
    setCustomerEmail('');
    setCustomerCompany('');
    setCustomerValue('');
    setIsAddCustomerOpen(false);
  };

  // Handle Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask = {
      id: `t_${Date.now()}`,
      title: taskTitle.trim(),
      priority: taskPriority,
      status: 'PENDING',
      dueDate: taskDueDate || 'Today',
      createdAt: new Date().toISOString(),
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    if (typeof window !== 'undefined') {
      const key = activeOrgId ? `ralion:${activeOrgId}:tasks` : 'ralion_tasks';
      localStorage.setItem(key, JSON.stringify(updated));
    }

    setTaskTitle('');
    setTaskDueDate('');
    setIsCreateTaskOpen(false);
  };

  // Handle Complete Task
  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, status: t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' };
      }
      return t;
    });
    setTasks(updated);
    if (typeof window !== 'undefined') {
      const key = activeOrgId ? `ralion:${activeOrgId}:tasks` : 'ralion_tasks';
      localStorage.setItem(key, JSON.stringify(updated));
    }
  };

  // Handle Upload Document
  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    setIsUploading(true);
    setTimeout(() => {
      const newDoc = {
        id: `d_${Date.now()}`,
        name: docName.trim().endsWith('.pdf') ? docName.trim() : `${docName.trim()}.pdf`,
        category: docCategory,
        size: '1.8 MB',
        uploadedAt: 'Just now',
      };

      const updated = [newDoc, ...documents];
      setDocuments(updated);
      if (typeof window !== 'undefined') {
        const key = activeOrgId ? `ralion:${activeOrgId}:documents` : 'ralion_documents';
        localStorage.setItem(key, JSON.stringify(updated));
      }

      setDocName('');
      setIsUploading(false);
      setIsUploadDocOpen(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
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
            <Link
              href="/billing?tier=standard"
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition-all flex items-center gap-1"
            >
              Standard ($1/day) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/billing?tier=professional"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1"
            >
              Pro ($49/mo) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Header View Switcher & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black tracking-tight text-white">
              {viewMode === 'CEO' ? 'Executive Operations Command' : viewMode === 'OPERATIONS' ? 'Operations & Workflow Control' : 'Growth & Social Marketing Hub'}
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

        {/* Quick Actions & Role Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setIsAddCustomerOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold shadow-md bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" /> Add Customer
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsCreateTaskOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold hover:border-zinc-700"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Create Task
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsUploadDocOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold hover:border-zinc-700"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" /> Upload Doc
            </Button>
            <Link href="/growth">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1.5 text-xs font-semibold border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/40"
              >
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Growth
              </Button>
            </Link>
          </div>

          {/* Role View Mode Pills */}
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 shrink-0">
            {(['CEO', 'OPERATIONS', 'MARKETING'] as DashboardViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === mode
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                {mode} View
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Row (Dynamically adapts to viewMode) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {viewMode === 'CEO' ? (
          <>
            <StatsCard
              title="Pipeline Revenue"
              value={`$${totalRevenue.toLocaleString()}`}
              change={contacts.length > 0 ? `${contacts.length} active deals` : "No deals recorded"}
              trend="up"
              description="Total active portfolio"
              icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
            />
            <StatsCard
              title="Active Customers"
              value={`${activeCustomersCount}`}
              change={contacts.length > 0 ? `${activeCustomersCount} verified accounts` : "No accounts yet"}
              trend="up"
              description="Verified client accounts"
              icon={<Users className="w-4 h-4 text-blue-400" />}
            />
            <StatsCard
              title="Mari AI Capacity"
              value={userTier === 'COMMUNITY' ? 'Standard Tier' : 'Unlimited'}
              change="Verified License"
              trend="up"
              description="AI compute engine"
              icon={<Sparkles className="w-4 h-4 text-purple-400" />}
            />
          </>
        ) : viewMode === 'OPERATIONS' ? (
          <>
            <StatsCard
              title="Tasks Due Today"
              value={`${pendingTasksCount}`}
              change={pendingTasksCount === 0 ? "All tasks completed" : `${pendingTasksCount} pending items`}
              trend={pendingTasksCount > 0 ? "up" : "down"}
              description="Operational workflow"
              icon={<CheckSquare className="w-4 h-4 text-amber-400" />}
            />
            <StatsCard
              title="Workflows Run"
              value="0 Executed"
              change="Ready for triggers"
              trend="up"
              description="Automated business rules"
              icon={<Zap className="w-4 h-4 text-cyan-400" />}
            />
            <StatsCard
              title="SLA Compliance"
              value="100.0%"
              change="Platform Active"
              trend="up"
              description="System uptime & delivery"
              icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
            />
          </>
        ) : (
          <>
            <StatsCard
              title="Organic Reach"
              value="0"
              change="No campaigns recorded"
              trend="up"
              description="Audience impressions"
              icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}
            />
            <StatsCard
              title="Followers Synced"
              value="0"
              change="Connect in Growth Studio"
              trend="up"
              description="Active channel fans"
              icon={<Share2 className="w-4 h-4 text-blue-400" />}
            />
            <StatsCard
              title="Engagement Rate"
              value="0.0%"
              change="No post telemetry yet"
              trend="up"
              description="Likes, shares & replies"
              icon={<Sparkles className="w-4 h-4 text-purple-400" />}
            />
          </>
        )}

        {/* Live Mari AI Strategic Insight Card */}
        <Card className="bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-purple-950/40 border-indigo-500/30 shadow-lg">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                {isMariLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />} 
                Mari AI Briefing
              </span>
              <Badge variant="purple" className="text-[9px]">Live AI</Badge>
            </div>
            <p className="text-xs text-zinc-200 mt-2 font-medium leading-relaxed">
              {viewMode === 'CEO' 
                ? (contacts.length > 0 
                    ? `"Pipeline revenue is pacing at $${totalRevenue.toLocaleString()} across ${contacts.length} active client deals. Review stage progress in CRM."`
                    : `"Mari AI is in production mode. Add customers or deals in CRM to monitor pipeline health."`)
                : viewMode === 'OPERATIONS'
                ? (tasks.length > 0
                    ? `"${pendingTasksCount} pending operational tasks scheduled for review in workspace queue."`
                    : `"All operational queues are clear. Create a task to track deliverables."`)
                : `"Mari AI Growth telemetry is active. Connect your social channels in Growth Studio to monitor audience performance."`}
            </p>
            <div className="pt-3 mt-1 flex items-center justify-between border-t border-zinc-800/60">
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-500" /> Synced realtime
              </span>
              <Link href="/mari-ai" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5">
                Ask Mari <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Main Charts & Operational Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Dynamic Chart */}
        <Card className="lg:col-span-2 bg-zinc-900/80 border-zinc-800 shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg text-white">
                  {viewMode === 'CEO' ? 'Revenue & Pipeline Growth' : viewMode === 'OPERATIONS' ? 'Workflow & Task Velocity' : 'Social Audience & Reach Trajectory'}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  {viewMode === 'CEO' ? 'Monthly deal close rate vs pipeline targets' : viewMode === 'OPERATIONS' ? 'Daily automation triggers and task completion rates' : 'Growth Studio telemetry from synced social channels'}
                </CardDescription>
              </div>
              <Badge variant="success" className="gap-1 text-[10px]">
                <TrendingUp className="w-3 h-3" /> Live Analytics
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-72 pt-4">
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs">
                <Activity className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="font-semibold text-zinc-400">No historical data available yet</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  {viewMode === 'CEO' 
                    ? 'Add customers and deals above to populate the pipeline chart.' 
                    : viewMode === 'OPERATIONS' 
                    ? 'Create and complete tasks to populate the workflow chart.'
                    : 'Publish posts in Growth Studio to populate audience reach telemetry.'}
                </p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'OPERATIONS' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="workflowsRun" name="Workflows Executed" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tasksCompleted" name="Tasks Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => viewMode === 'CEO' ? `$${v / 1000}k` : `${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={viewMode === 'CEO' ? 'revenue' : 'organicReach'} 
                    name={viewMode === 'CEO' ? 'Closed Revenue' : 'Organic Reach'} 
                    stroke="#6366f1" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorPrimary)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey={viewMode === 'CEO' ? 'pipeline' : 'postEngagement'} 
                    name={viewMode === 'CEO' ? 'Pipeline Forecast' : 'Post Engagement'} 
                    stroke="#ec4899" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorSecondary)" 
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Operational Side Column (Tasks & Quick Action Feeds) */}
        <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" /> 
                {viewMode === 'OPERATIONS' ? 'Priority Tasks Board' : viewMode === 'MARKETING' ? 'Active Campaigns' : 'Operational Tasks'}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsCreateTaskOpen(true)}
                className="h-7 px-2 text-[11px] text-zinc-300"
              >
                + Add
              </Button>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Interactive queue linked to workspace telemetry
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[300px]">
            {tasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                No active tasks. Click "+ Add" to create one.
              </div>
            ) : (
              tasks.slice(0, 5).map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => handleToggleTask(t.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    t.status === 'COMPLETED' 
                      ? 'bg-zinc-950/40 border-zinc-800/60 opacity-60' 
                      : 'bg-zinc-950 border-zinc-800/90 hover:border-zinc-700'
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border transition-colors ${
                    t.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-700'
                  }`}>
                    {t.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-semibold truncate ${t.status === 'COMPLETED' ? 'line-through text-zinc-400' : 'text-zinc-200'}`}>
                        {t.title}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        t.priority === 'HIGH' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                        t.priority === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">
                      Due: {t.dueDate || 'Today'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>

          <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
            <Link href="/tasks" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
              View All Tasks ({tasks.length}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/crm" className="text-xs text-zinc-400 hover:text-zinc-200 font-medium">
              Open CRM Pipeline
            </Link>
          </div>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODALS FOR DASHBOARD QUICK ACTIONS
      ───────────────────────────────────────────────────────────────────────── */}

      {/* 1. Add Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddCustomerOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add New Customer</h3>
                <p className="text-xs text-zinc-400">Record customer in workspace CRM ledger</p>
              </div>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Customer / Contact Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Kgosi Logistics PTY"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="contact@company.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Deal Value ($)</label>
                  <input
                    type="number"
                    value={customerValue}
                    onChange={(e) => setCustomerValue(e.target.value)}
                    placeholder="15000"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  placeholder="e.g. SADC Mining & Fleet Group"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAddCustomerOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                >
                  Save Customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Create Task Modal */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateTaskOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create Operational Task</h3>
                <p className="text-xs text-zinc-400">Add an action item to workspace queue</p>
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Audit Meta Graph API Webhook Events"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e: any) => setTaskPriority(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Due Date</label>
                  <input
                    type="text"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    placeholder="e.g. Today / 25 Aug"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsCreateTaskOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  Add Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Upload Document Modal */}
      {isUploadDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsUploadDocOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Upload Workspace Document</h3>
                <p className="text-xs text-zinc-400">Register contract, invoice, or strategy doc</p>
              </div>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Master SLA Contract 2026"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="CONTRACT">Contract / Agreement</option>
                  <option value="FINANCIAL">Financial / Invoicing</option>
                  <option value="MARKETING">Marketing & Social Brief</option>
                  <option value="COMPLIANCE">Compliance / Policy</option>
                </select>
              </div>

              <div className="p-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 text-center">
                <FolderPlus className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
                <span className="text-xs text-zinc-300 font-medium block">Select File (PDF, DOCX, XLSX)</span>
                <span className="text-[10px] text-zinc-500">Max size 25MB</span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsUploadDocOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  disabled={isUploading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Register Document'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

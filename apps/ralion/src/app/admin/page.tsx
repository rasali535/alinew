'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Coins,
  CreditCard,
  Eye,
  FileText,
  RefreshCw,
  Server,
  Share2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type Tab = 'overview' | 'customers' | 'mari' | 'social' | 'billing' | 'system' | 'audit';

interface MetricsData {
  totalCustomers: number;
  activeCustomers: number;
  payingCustomers?: number;
  suspendedCustomers: number;
  estimatedMRR: number;
  estimatedARR?: number;
  totalCreditsIssued: number;
  totalCreditsConsumed: number;
  creativeGenerations: { total: number; images: number; videos: number; successRate: number };
  connectedUsers?: any[];
  connectedUserCount?: number;
  activeSocialConnections: number;
  connectedMetaAccounts: number;
  connectedFacebookAccounts?: number;
  connectedInstagramAccounts?: number;
  connectedZernioProfiles: number;
  socialProviderCounts?: Record<string, number>;
  socialAttentionCount?: number;
  socialAlerts?: Array<{
    id: string;
    provider: string;
    accountName: string;
    organizationId?: string | null;
    connectionStatus: string;
    tokenStatus: string;
    lastSyncAt?: string | null;
  }>;
  allConnections?: any[];
  apiErrorRatePct: number;
  recentSecurityEvents: number;
  metricNotes?: Record<string, string>;
  timestamp?: string;
}

interface CustomerRow {
  organizationId: string;
  name: string;
  owner?: string;
  ownerEmail?: string;
  plan: string;
  credits: number;
  creditsConsumed: number;
  websiteIngestionStatus: string;
  facebookStatus?: string;
  metaStatus?: string;
  facebookPage?: string;
  facebookFollowers?: number;
  instagramStatus?: string;
  zernioStatus?: string;
  socialConnectionCount?: number;
  socialAttentionCount?: number;
  socialProviderCounts?: Record<string, number>;
  socialConnections?: Array<{
    id: string;
    provider: string;
    accountName: string;
    connectionStatus: string;
    tokenStatus: string;
    lastSyncAt?: string | null;
  }>;
  status: string;
  workspaceCount?: number;
  lastActive?: string;
}

interface HealthMetric {
  service: string;
  status: 'UP' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  lastChecked: string;
  lastError?: string;
  verification?: 'PROBED' | 'CONFIG_ONLY';
}

interface MariWidgetRow {
  id: string;
  organizationId: string;
  organizationName: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  assistantName: string;
  allowedDomains: string[];
  observedOrigins: string[];
  status: string;
  health: string;
  createdAt: string;
  lastSeenAt?: string | null;
  lastSuccessfulAt?: string | null;
  lastSessionAt?: string | null;
  monthlyRequestLimit: number;
  lifetimeRequestCount: number;
  requestsToday: number;
  requests30d: number;
  successful30d: number;
  failed30d: number;
  errorRatePct: number;
  uniqueSessions30d: number;
  creditsUsed30d: number;
  totalTokens30d: number;
  avgLatencyMs: number;
  models: string[];
  remainingCredits: number;
  monthlyCreditQuota: number;
  plan: string;
  alerts: any[];
}

interface MariTelemetryData {
  summary: {
    totalWidgets: number;
    activeWidgets: number;
    liveWidgets: number;
    connectedWidgets: number;
    configuredNoTraffic: number;
    errorWidgets: number;
    widgetRequests30d: number;
    widgetFailures30d: number;
    widgetCredits30d: number;
    uniqueWidgetSessions30d: number;
    averageWidgetLatencyMs: number;
    activeApiKeys: number;
    apiRequests30d: number;
    apiFailures30d: number;
    apiCredits30d: number;
  };
  widgets: MariWidgetRow[];
  api: { keys: any[]; requests30d: number; failures30d: number; credits30d: number };
  alerts: any[];
  generatedAt?: string;
}

const statusStyle = (status: string) => {
  if (status === 'UP' || status === 'ACTIVE' || status === 'CONNECTED' || status === 'SUCCESS' || status === 'LIVE' || status === 'TOKEN_VALID') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'DEGRADED' || status === 'PAST_DUE' || status === 'CONFIGURED' || status === 'IDLE' || status === 'PAUSED' || status === 'TOKEN_EXPIRING' || status === 'NEEDS_ATTENTION' || status === 'RECONNECT_REQUIRED' || status === 'REAUTH_REQUIRED') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-rose-500/30 bg-rose-500/10 text-rose-300';
};

export default function PlatformAdminPortal() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [mariTelemetry, setMariTelemetry] = useState<MariTelemetryData | null>(null);
  const [health, setHealth] = useState<HealthMetric[]>([]);
  const [overallHealth, setOverallHealth] = useState('UNKNOWN');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [inspectReason, setInspectReason] = useState('Support inspection');
  const [creditOrg, setCreditOrg] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(500);
  const [creditReason, setCreditReason] = useState('Administrative credit adjustment');

  const json = async (res: Response) => {
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) throw new Error(`Expected JSON, received HTTP ${res.status}.`);
    return JSON.parse(text);
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const responses = await Promise.all([
        authFetch('/api/admin/metrics'),
        authFetch('/api/admin/customers'),
        authFetch('/api/admin/system/health'),
        authFetch('/api/admin/audit-logs?limit=100'),
        authFetch('/api/admin/mari/overview'),
      ]);
      const bodies = await Promise.all(responses.map(json));
      const failed = responses.findIndex(res => !res.ok);
      if (failed >= 0) throw new Error(bodies[failed]?.error || `Admin API returned HTTP ${responses[failed].status}.`);
      setMetrics(bodies[0].data || null);
      setCustomers(bodies[1].data || []);
      setOverallHealth(bodies[2].data?.overallStatus || 'UNKNOWN');
      setHealth(bodies[2].data?.services || []);
      setAuditLogs(bodies[3].data || []);
      setMariTelemetry(bodies[4].data || null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Command Centre.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, []);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => `${c.name} ${c.owner || ''} ${c.ownerEmail || ''} ${c.organizationId}`.toLowerCase().includes(q));
  }, [customers, search]);

  const updateTenantStatus = async (customer: CustomerRow) => {
    const next = customer.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const reason = window.prompt(`Reason for setting ${customer.name} to ${next}:`, `Administrative ${next.toLowerCase()} action`);
    if (!reason || reason.trim().length < 5) return;
    const res = await authFetch(`/api/admin/customers/${customer.organizationId}/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next, reason: reason.trim() }),
    });
    const body = await json(res);
    if (!res.ok) return setError(body.error || 'Status update failed.');
    setMessage(body.message || `Tenant updated to ${next}.`);
    await loadAll();
  };

  const inspectTenant = async (organizationId: string) => {
    const reason = inspectReason.trim();
    if (reason.length < 5) return setError('Inspection reason must be at least 5 characters.');
    const res = await authFetch(`/api/admin/organizations/${organizationId}?reason=${encodeURIComponent(reason)}`);
    const body = await json(res);
    if (!res.ok) return setError(body.error || 'Tenant inspection failed.');
    setInspectData(body.data);
    setMessage(`Loaded durable tenant telemetry for ${organizationId}.`);
    await loadAll();
  };

  const adjustCredits = async () => {
    if (!creditOrg || !Number.isFinite(creditAmount) || creditAmount === 0 || creditReason.trim().length < 5) return;
    const res = await authFetch('/api/admin/credits/adjust', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId: creditOrg, amount: creditAmount, reason: creditReason.trim() }),
    });
    const body = await json(res);
    if (!res.ok) return setError(body.error || 'Credit adjustment failed.');
    setCreditOrg(null);
    setMessage(body.message || 'Credits adjusted.');
    await loadAll();
  };

  const tabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'customers', label: `Tenants (${customers.length})`, icon: Users },
    { id: 'mari', label: `Mari & API (${mariTelemetry?.summary.liveWidgets || 0} live)`, icon: Sparkles },
    { id: 'social', label: 'Social', icon: Share2 },
    { id: 'billing', label: 'Billing & Credits', icon: CreditCard },
    { id: 'system', label: 'System Health', icon: Server },
    { id: 'audit', label: `Audit (${auditLogs.length})`, icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-5 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-indigo-400" /><h1 className="text-xl font-black">Ralion Platform Command Centre</h1><span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusStyle(overallHealth)}`}>{overallHealth}</span></div>
            <p className="text-xs text-zinc-500 mt-1">Durable platform telemetry, tenant controls and immutable operational audit history.</p>
          </div>
          <div className="flex gap-2"><button onClick={() => void loadAll()} disabled={loading} className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><button onClick={() => router.push('/dashboard')} className="px-3 py-2 rounded-lg bg-indigo-600 text-xs font-bold">Exit Admin</button></div>
        </div>
      </header>

      <div className="border-b border-zinc-800 bg-zinc-900/30 px-5 py-2 overflow-x-auto"><div className="max-w-7xl mx-auto flex gap-1">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${tab === item.id ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}><Icon className="w-3.5 h-3.5" />{item.label}</button>; })}</div></div>

      <main className="max-w-7xl mx-auto p-5 space-y-5">
        {error && <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex justify-between"><span>{error}</span><button onClick={() => setError(null)}>×</button></div>}
        {message && <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex justify-between"><span>{message}</span><button onClick={() => setMessage(null)}>×</button></div>}
        {loading && !metrics && <div className="py-24 text-center text-sm text-zinc-500"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" />Loading durable platform telemetry…</div>}

        {tab === 'overview' && metrics && <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric title="Customer Tenants" value={metrics.totalCustomers} detail={`${metrics.activeCustomers} active · ${metrics.suspendedCustomers} suspended`} icon={Building2} />
            <Metric title="Estimated MRR" value={`$${Number(metrics.estimatedMRR || 0).toLocaleString()}`} detail={`${metrics.payingCustomers || 0} paying tenants · USD plans only`} icon={TrendingUp} />
            <Metric title="Credits" value={Number(metrics.totalCreditsIssued || 0).toLocaleString()} detail={`${Number(metrics.totalCreditsConsumed || 0).toLocaleString()} consumed`} icon={Coins} />
            <Metric title="Finalized Creatives (30d)" value={metrics.creativeGenerations?.total || 0} detail={`${metrics.creativeGenerations?.images || 0} image · ${metrics.creativeGenerations?.videos || 0} video · ${metrics.creativeGenerations?.successRate || 0}% finalized success`} icon={Sparkles} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InfoCard title="System Health" value={overallHealth} detail="Based on live probes and explicit configuration checks." tone={overallHealth === 'UP' ? 'good' : overallHealth === 'DEGRADED' ? 'warn' : 'bad'} />
            <InfoCard title="Mari Websites" value={`${mariTelemetry?.summary.liveWidgets || 0} live`} detail={`${mariTelemetry?.summary.connectedWidgets || 0} observed · ${mariTelemetry?.summary.configuredNoTraffic || 0} configured without traffic`} tone={(mariTelemetry?.summary.errorWidgets || 0) > 0 ? 'warn' : 'good'} />
            <InfoCard title="Social Connections" value={metrics.activeSocialConnections || 0} detail={`Facebook ${metrics.connectedFacebookAccounts || 0} · Instagram ${metrics.connectedInstagramAccounts || 0} · ${metrics.socialAttentionCount || 0} need attention`} tone={(metrics.socialAttentionCount || 0) > 0 ? 'warn' : 'good'} />
            <InfoCard title="Audit Error Share (30d)" value={`${metrics.apiErrorRatePct || 0}%`} detail={`${metrics.recentSecurityEvents || 0} auth/security-related audit events`} tone={metrics.apiErrorRatePct > 0 ? 'warn' : 'good'} />
          </div>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-sm">Connected Users</h2><p className="text-xs text-zinc-500">Canonical active social bindings grouped by authenticated identity.</p></div><span className="text-xs text-zinc-400">{metrics.connectedUsers?.length || 0}</span></div><div className="grid md:grid-cols-2 gap-3">{(metrics.connectedUsers || []).map(user => <div key={user.userId} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50"><div className="font-semibold text-sm">{user.userName || user.email || 'Connected User'}</div><div className="text-[11px] text-zinc-500">{user.email || 'No profile email'} · {user.connectionCount} connection(s)</div><div className="flex flex-wrap gap-2 mt-3">{(user.connections || []).map((conn: any) => <span key={conn.socialConnectionId} className="px-2 py-1 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-300 text-[10px]">{conn.provider}: {conn.accountName}</span>)}</div></div>)}{!metrics.connectedUsers?.length && <div className="text-xs text-zinc-500">No active social bindings.</div>}</div></section>
        </>}

        {tab === 'customers' && <section className="space-y-4"><div className="flex flex-col md:flex-row gap-3 md:items-center justify-between"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenant, owner, email or ID…" className="w-full md:max-w-md px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs" /><div className="text-xs text-zinc-500">{filteredCustomers.length} visible tenants</div></div><div className="overflow-x-auto rounded-2xl border border-zinc-800"><table className="w-full text-xs"><thead className="bg-zinc-900 text-zinc-400"><tr><th className="p-3 text-left">Tenant</th><th className="p-3 text-left">Plan</th><th className="p-3 text-left">Credits</th><th className="p-3 text-left">Knowledge</th><th className="p-3 text-left">Mari</th><th className="p-3 text-left">Social</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-zinc-800">{filteredCustomers.map(customer => { const tenantWidgets = (mariTelemetry?.widgets || []).filter(widget => widget.organizationId === customer.organizationId); const liveWidgets = tenantWidgets.filter(widget => widget.health === 'LIVE').length; return <tr key={customer.organizationId} className="bg-zinc-950/40"><td className="p-3"><div className="font-semibold text-white">{customer.name}</div><div className="font-mono text-[10px] text-zinc-600">{customer.organizationId}</div><div className="text-[10px] text-zinc-500">{customer.ownerEmail || 'No owner email'}</div></td><td className="p-3">{customer.plan}</td><td className="p-3 font-mono">{customer.credits || 0}<div className="text-[10px] text-zinc-600">{customer.creditsConsumed || 0} consumed</div></td><td className="p-3"><Pill text={customer.websiteIngestionStatus || 'NONE'} status={customer.websiteIngestionStatus === 'VERIFIED' ? 'ACTIVE' : 'UNKNOWN'} /></td><td className="p-3"><Pill text={tenantWidgets.length ? `${liveWidgets}/${tenantWidgets.length} LIVE` : 'NONE'} status={liveWidgets ? 'LIVE' : tenantWidgets.length ? tenantWidgets[0].health : 'UNKNOWN'} /></td><td className="p-3"><div className="flex flex-wrap gap-1">{(customer.socialConnections || []).map(connection => <Pill key={connection.id} text={`${connection.provider.toUpperCase()} · ${connection.accountName}`} status={connection.connectionStatus} />)}{!customer.socialConnections?.length && <Pill text="NO CHANNELS" status="DISCONNECTED" />}{Boolean(customer.socialAttentionCount) && <Pill text={`${customer.socialAttentionCount} NEED ATTENTION`} status="DEGRADED" />}</div></td><td className="p-3"><Pill text={customer.status} status={customer.status} /></td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => void inspectTenant(customer.organizationId)} className="p-2 rounded-lg border border-zinc-700 bg-zinc-900" title="Inspect"><Eye className="w-3.5 h-3.5" /></button><button onClick={() => setCreditOrg(customer.organizationId)} className="p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300" title="Adjust credits"><Coins className="w-3.5 h-3.5" /></button><button onClick={() => void updateTenantStatus(customer)} className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${customer.status === 'ACTIVE' ? 'border-rose-500/30 text-rose-300' : 'border-emerald-500/30 text-emerald-300'}`}>{customer.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}</button></div></td></tr>})}{!filteredCustomers.length && <tr><td colSpan={8} className="p-10 text-center text-zinc-500">No matching organizations.</td></tr>}</tbody></table></div><div className="flex items-center gap-2"><input value={inspectReason} onChange={e => setInspectReason(e.target.value)} className="flex-1 max-w-lg px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs" placeholder="Reason recorded when inspecting a tenant" /><span className="text-[10px] text-zinc-600">Inspection is audit logged.</span></div></section>}

        {tab === 'mari' && mariTelemetry && <section className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric title="Live Website Mari" value={mariTelemetry.summary.liveWidgets} detail={`${mariTelemetry.summary.connectedWidgets} sites observed · ${mariTelemetry.summary.totalWidgets} configured`} icon={Sparkles} />
            <Metric title="Website Requests (30d)" value={mariTelemetry.summary.widgetRequests30d.toLocaleString()} detail={`${mariTelemetry.summary.widgetFailures30d} failed · ${mariTelemetry.summary.uniqueWidgetSessions30d} visitor sessions`} icon={Activity} />
            <Metric title="Website Credits (30d)" value={mariTelemetry.summary.widgetCredits30d.toLocaleString()} detail={`Avg latency ${mariTelemetry.summary.averageWidgetLatencyMs.toLocaleString()} ms`} icon={Coins} />
            <Metric title="API Keys" value={mariTelemetry.summary.activeApiKeys} detail={`${mariTelemetry.summary.apiRequests30d} API requests · ${mariTelemetry.summary.apiCredits30d} credits`} icon={CreditCard} />
          </div>

          {mariTelemetry.alerts.length > 0 && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"><div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-400" /><h2 className="font-bold text-sm">Mari connection alerts</h2></div><div className="grid md:grid-cols-2 gap-2">{mariTelemetry.alerts.slice(0, 12).map((alert: any, index: number) => <div key={`${alert.widgetId}-${alert.code}-${index}`} className={`rounded-xl border p-3 text-xs ${alert.severity === 'critical' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}><div className="font-bold">{alert.organizationName} · {alert.widgetName}</div><div className="mt-1 opacity-80">{alert.message}</div></div>)}</div></div>}

          <div className="overflow-x-auto rounded-2xl border border-zinc-800"><table className="w-full text-xs"><thead className="bg-zinc-900 text-zinc-400"><tr><th className="p-3 text-left">Tenant / Website</th><th className="p-3 text-left">Health</th><th className="p-3 text-right">Requests 30d</th><th className="p-3 text-right">Sessions</th><th className="p-3 text-right">Credits</th><th className="p-3 text-right">Latency</th><th className="p-3 text-left">Last seen</th></tr></thead><tbody className="divide-y divide-zinc-800">{mariTelemetry.widgets.map(widget => <tr key={widget.id} className="bg-zinc-950/40"><td className="p-3"><div className="font-semibold text-white">{widget.organizationName}</div><div className="text-[10px] text-indigo-300">{widget.name} · {widget.assistantName}</div><div className="text-[10px] text-zinc-500 max-w-md truncate">Allowed: {widget.allowedDomains.join(', ') || 'None'}</div>{widget.observedOrigins.length > 0 && <div className="text-[10px] text-emerald-500/80 max-w-md truncate">Observed: {widget.observedOrigins.join(', ')}</div>}</td><td className="p-3"><Pill text={widget.health} status={widget.health} /><div className="text-[10px] text-zinc-600 mt-1">{widget.status}</div></td><td className="p-3 text-right font-mono">{widget.requests30d.toLocaleString()}<div className="text-[10px] text-zinc-600">{widget.successful30d} ok · {widget.failed30d} fail</div></td><td className="p-3 text-right font-mono">{widget.uniqueSessions30d.toLocaleString()}</td><td className="p-3 text-right font-mono">{widget.creditsUsed30d.toLocaleString()}<div className="text-[10px] text-zinc-600">{widget.remainingCredits.toLocaleString()} left</div></td><td className="p-3 text-right font-mono">{widget.avgLatencyMs.toLocaleString()} ms</td><td className="p-3 whitespace-nowrap">{widget.lastSeenAt ? new Date(widget.lastSeenAt).toLocaleString() : 'Never'}<div className="text-[10px] text-zinc-600">{widget.plan}</div></td></tr>)}{!mariTelemetry.widgets.length && <tr><td colSpan={7} className="p-10 text-center text-zinc-500">No website widgets configured yet.</td></tr>}</tbody></table></div>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"><div className="flex items-center justify-between mb-3"><div><h2 className="font-bold text-sm">Customer API Keys</h2><p className="text-[10px] text-zinc-500">Safe prefixes only. Full secrets are never exposed to Admin.</p></div><span className="text-xs text-zinc-500">{mariTelemetry.api.keys.length} total</span></div><div className="grid md:grid-cols-2 gap-3">{mariTelemetry.api.keys.map((key: any) => <div key={key.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3"><div className="flex items-center justify-between gap-3"><div><div className="font-semibold text-xs">{key.organizationName} · {key.name}</div><div className="font-mono text-[10px] text-zinc-500">{key.keyPrefix}</div></div><Pill text={key.status} status={key.status} /></div><div className="text-[10px] text-zinc-600 mt-2">Lifetime requests: {Number(key.lifetimeRequestCount || 0).toLocaleString()} · Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</div></div>)}{!mariTelemetry.api.keys.length && <div className="text-xs text-zinc-500">No customer API keys yet.</div>}</div></section>
        </section>}

        {tab === 'social' && metrics && <section className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric title="Active Bindings" value={metrics.activeSocialConnections || 0} detail="Canonical usable social accounts" icon={Share2} />
            <Metric title="Facebook" value={metrics.connectedFacebookAccounts || 0} detail="Active Facebook bindings" icon={Share2} />
            <Metric title="Instagram" value={metrics.connectedInstagramAccounts || 0} detail="Active professional accounts" icon={Share2} />
            <Metric title="Needs Attention" value={metrics.socialAttentionCount || 0} detail={`${metrics.connectedZernioProfiles || 0} active delivery profiles`} icon={AlertTriangle} />
          </div>
          {(metrics.socialAlerts || []).length > 0 && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"><div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4 text-amber-400" /><h2 className="font-bold text-sm">Reconnect required</h2></div><div className="grid md:grid-cols-2 gap-2">{(metrics.socialAlerts || []).map(alert => <div key={alert.id} className="rounded-xl border border-amber-500/20 bg-zinc-950/40 p-3"><div className="flex items-center justify-between gap-3"><div className="font-semibold text-xs">{alert.accountName}</div><Pill text={alert.provider.toUpperCase()} status="DEGRADED" /></div><div className="text-[10px] text-zinc-500 mt-1">{alert.connectionStatus} · {alert.tokenStatus} · tenant {alert.organizationId || 'unbound'}</div><div className="text-[10px] text-zinc-600 mt-1">Last sync: {alert.lastSyncAt ? new Date(alert.lastSyncAt).toLocaleString() : 'Never'}</div></div>)}</div></div>}
          <div className="grid md:grid-cols-2 gap-3">{(metrics.allConnections || []).map(conn => <div key={conn.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50"><div className="flex justify-between gap-3"><div><div className="font-semibold text-sm">{conn.accountName}</div><div className="text-[10px] text-zinc-500">{String(conn.provider || 'unknown').toUpperCase()} · {conn.accountTypeLabel || conn.accountType || 'Account'} · {conn.providerAccountId}</div></div><Pill text={conn.tokenStatus || conn.connectionStatus} status={conn.tokenStatus || conn.connectionStatus} /></div><div className="text-[10px] text-zinc-600 mt-2">Tenant: {conn.organizationId || 'unbound'} · {Number(conn.followersCount || 0).toLocaleString()} followers · sync {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString() : 'never'}</div></div>)}{!metrics.allConnections?.length && <div className="text-xs text-zinc-500">No active social connections.</div>}</div>
        </section>}

        {tab === 'billing' && <section className="space-y-4"><div className="grid grid-cols-2 lg:grid-cols-3 gap-4"><Metric title="Estimated MRR" value={`$${Number(metrics?.estimatedMRR || 0).toLocaleString()}`} detail="Active USD-priced subscriptions" icon={TrendingUp} /><Metric title="Credits Issued" value={Number(metrics?.totalCreditsIssued || 0).toLocaleString()} detail="Lifetime durable wallet grants" icon={Coins} /><Metric title="Credits Consumed" value={Number(metrics?.totalCreditsConsumed || 0).toLocaleString()} detail="Lifetime durable consumption" icon={Coins} /><Metric title="Website Mari (30d)" value={Number(mariTelemetry?.summary.widgetCredits30d || 0).toLocaleString()} detail={`${Number(mariTelemetry?.summary.widgetRequests30d || 0).toLocaleString()} website requests`} icon={Sparkles} /><Metric title="Mari API (30d)" value={Number(mariTelemetry?.summary.apiCredits30d || 0).toLocaleString()} detail={`${Number(mariTelemetry?.summary.apiRequests30d || 0).toLocaleString()} API requests`} icon={Activity} /><Metric title="Paying Tenants" value={metrics?.payingCustomers || 0} detail="Active plans with non-zero price" icon={CreditCard} /></div><div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs text-zinc-400"><strong className="text-zinc-200">Accounting note:</strong> MRR excludes non-USD prices rather than inventing an exchange rate. Credit totals come directly from durable tenant wallets. Website/API breakdown comes from Mari usage telemetry and does not replace the wallet ledger as the billing source of truth.</div></section>}

        {tab === 'system' && <section className="space-y-3"><div className="flex items-center justify-between"><div><h2 className="font-bold">System Health</h2><p className="text-xs text-zinc-500">PROBED means a live request ran. CONFIG_ONLY verifies configuration only and does not claim provider availability.</p></div><Pill text={overallHealth} status={overallHealth} /></div>{health.map(service => <div key={service.service} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="font-semibold text-sm">{service.service}</div><div className="text-[10px] text-zinc-500">{service.verification || 'PROBED'} · {service.latencyMs} ms · checked {new Date(service.lastChecked).toLocaleString()}</div>{service.lastError && <div className="text-[10px] text-amber-300 mt-1">{service.lastError}</div>}</div><Pill text={service.status} status={service.status} /></div>)}</section>}

        {tab === 'audit' && <section className="overflow-x-auto rounded-2xl border border-zinc-800"><table className="w-full text-xs"><thead className="bg-zinc-900 text-zinc-400"><tr><th className="p-3 text-left">Time</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Module</th><th className="p-3 text-left">Target</th><th className="p-3 text-left">Result / Reason</th></tr></thead><tbody className="divide-y divide-zinc-800">{auditLogs.map(log => <tr key={log.id}><td className="p-3 whitespace-nowrap">{new Date(log.timestamp || log.createdAt).toLocaleString()}</td><td className="p-3 font-mono text-indigo-300">{log.action}</td><td className="p-3">{log.module}</td><td className="p-3 font-mono text-[10px]">{log.targetType}: {log.targetId || '—'}</td><td className="p-3"><Pill text={log.result || 'SUCCESS'} status={log.result || 'SUCCESS'} /> <span className="text-zinc-500 ml-2">{log.reason || ''}</span></td></tr>)}{!auditLogs.length && <tr><td colSpan={5} className="p-10 text-center text-zinc-500">No durable audit events found.</td></tr>}</tbody></table></section>}
      </main>

      {creditOrg && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4"><h3 className="font-bold">Adjust Tenant Credits</h3><p className="text-[10px] text-zinc-500 font-mono">{creditOrg}</p><input type="number" value={creditAmount} onChange={e => setCreditAmount(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-sm" /><textarea value={creditReason} onChange={e => setCreditReason(e.target.value)} className="w-full min-h-24 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs" /><div className="flex justify-end gap-2"><button onClick={() => setCreditOrg(null)} className="px-3 py-2 text-xs rounded-lg border border-zinc-700">Cancel</button><button onClick={() => void adjustCredits()} className="px-3 py-2 text-xs rounded-lg bg-indigo-600 font-bold">Apply Adjustment</button></div></div></div>}

      {inspectData && <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto"><div className="max-w-5xl mx-auto my-6 rounded-2xl border border-zinc-800 bg-zinc-950"><div className="p-5 border-b border-zinc-800 flex justify-between"><div><h3 className="font-bold">Tenant Inspection</h3><p className="text-xs text-zinc-500">{inspectData.organization?.name || inspectData.organizationId}</p></div><button onClick={() => setInspectData(null)}>×</button></div><div className="p-5 grid md:grid-cols-2 gap-4 text-xs"><InspectCard title="Tenant State" data={{ status: inspectData.status, workspaces: inspectData.workspaces?.length || 0, website: inspectData.profile?.website_url || 'None' }} /><InspectCard title="Subscription" data={inspectData.subscription || { status: 'No subscription row' }} /><InspectCard title="Credit Wallet" data={inspectData.wallet || { status: 'No wallet row' }} /><InspectCard title="Mari Website" data={{ widgets: inspectData.mariWebsite?.widgetCount || 0, sessions: inspectData.mariWebsite?.sessions || 0, requests: inspectData.mariWebsite?.requests || 0, successes: inspectData.mariWebsite?.successfulRequests || 0, failures: inspectData.mariWebsite?.failedRequests || 0, creditsUsed: inspectData.mariWebsite?.creditsUsed || 0, lastSeen: inspectData.mariWebsite?.lastSeenAt || 'Never', domains: (inspectData.mariWebsite?.widgets || []).flatMap((widget: any) => widget.allowedDomains || []).join(', ') || 'None' }} /><InspectCard title="Mari API" data={{ keys: inspectData.mariApi?.keyCount || 0, activeKeys: inspectData.mariApi?.activeKeyCount || 0, requests: inspectData.mariApi?.requests || 0, failures: inspectData.mariApi?.failedRequests || 0, creditsUsed: inspectData.mariApi?.creditsUsed || 0 }} /><InspectCard title="Operational Records" data={{ tasks: inspectData.operationalData?.tasks?.length || 0, deals: inspectData.operationalData?.deals?.length || 0, documents: inspectData.operationalData?.documents?.length || 0, workflows: inspectData.operationalData?.workflows?.length || 0 }} /><InspectCard title="Social" data={{ connections: inspectData.socialConnections?.length || 0, channels: (inspectData.socialConnections || []).map((connection: any) => `${String(connection.provider || 'unknown').toUpperCase()}: ${connection.account_name || connection.username || 'Account'} (${connection.connection_status}/${connection.token_status})`).join(', ') || 'None', facebook: inspectData.facebookStatus, page: inspectData.facebookPage || 'None', followers: inspectData.facebookFollowers || 0 }} /><InspectCard title="Durable History" data={{ payments: inspectData.transactions?.length || 0, creditEntries: inspectData.creditHistory?.length || 0, auditEvents: inspectData.auditHistory?.length || 0, mariKnowledge: inspectData.mariKnowledge?.length || 0 }} /></div></div></div>}
    </div>
  );
}

function Metric({ title, value, detail, icon: Icon }: { title: string; value: React.ReactNode; detail: string; icon: any }) {
  return <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60"><div className="flex items-center justify-between text-zinc-400"><span className="text-[10px] uppercase tracking-wider font-bold">{title}</span><Icon className="w-4 h-4 text-indigo-400" /></div><div className="text-2xl font-black text-white mt-2">{value}</div><div className="text-[10px] text-zinc-500 mt-1">{detail}</div></div>;
}

function InfoCard({ title, value, detail, tone }: { title: string; value: React.ReactNode; detail: string; tone: 'good' | 'warn' | 'bad' }) {
  const Icon = tone === 'good' ? CheckCircle2 : tone === 'warn' ? AlertTriangle : XCircle;
  const cls = tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-rose-400';
  return <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex gap-3"><Icon className={`w-4 h-4 mt-0.5 ${cls}`} /><div><div className="font-semibold text-xs text-white">{title}: {value}</div><div className="text-[10px] text-zinc-500 mt-1">{detail}</div></div></div>;
}

function Pill({ text, status }: { text: string; status: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusStyle(String(status).toUpperCase())}`}>{text}</span>;
}

function InspectCard({ title, data }: { title: string; data: Record<string, any> }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"><h4 className="text-xs font-bold text-indigo-300 mb-3">{title}</h4><div className="space-y-2">{Object.entries(data || {}).slice(0, 12).map(([key, value]) => <div key={key} className="flex justify-between gap-4"><span className="text-zinc-500">{key}</span><span className="text-right text-zinc-200 break-all">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—')}</span></div>)}</div></div>;
}

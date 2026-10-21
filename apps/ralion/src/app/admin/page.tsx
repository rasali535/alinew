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
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Package,
  DollarSign,
  TrendingDown,
  Lock,
  KeyRound,
  Copy,
  Check,
  Truck,
  Plus,
  Clock,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type Tab = 'overview' | 'products' | 'trials' | 'customers' | 'retail' | 'mari' | 'social' | 'billing' | 'system' | 'audit';

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
  workspaceId?: string | null;
  workspaces?: Array<{ id: string; name: string; organizationId?: string }>;
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
  const [retailData, setRetailData] = useState<any | null>(null);
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

  const [productsData, setProductsData] = useState<any | null>(null);
  const [trialsData, setTrialsData] = useState<any | null>(null);
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false);
  const [generatedCodeSecret, setGeneratedCodeSecret] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [codeForm, setCodeForm] = useState({
    eligibleProducts: ['retail', 'trade'] as Array<'retail' | 'trade'>,
    durationDays: 14,
    maxRedemptions: 1,
    workspaceMode: 'DEMO_DATA' as 'DEMO_DATA' | 'CLEAN_WORKSPACE',
    restrictedEmail: '',
    restrictedOrganizationId: '',
    restrictedWorkspaceId: '',
    notes: '',
  });

  const [showGrantDemoModal, setShowGrantDemoModal] = useState(false);
  const [grantDemoForm, setGrantDemoForm] = useState({
    organizationId: '',
    workspaceId: '',
    eligibleProducts: ['retail'] as Array<'retail' | 'trade'>,
    durationDays: 14,
    currency: 'USD' as 'USD' | 'BWP' | 'ZAR',
    workspaceMode: 'CLEAN_WORKSPACE' as 'CLEAN_WORKSPACE' | 'DEMO_DATA',
    reason: '',
    notes: '',
    confirmDemoDataSafety: false,
  });

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
        authFetch('/api/admin/retail/overview').catch(() => null),
        authFetch('/api/admin/products/overview').catch(() => null),
        authFetch('/api/admin/trials').catch(() => null),
      ]);
      const bodies: any[] = await Promise.all(responses.map(r => r ? json(r).catch(() => ({})) : {}));
      const failed = responses.findIndex((res, i) => i < 5 && (!res || !res.ok));
      if (failed >= 0) throw new Error(bodies[failed]?.error || `Admin API returned HTTP ${responses[failed]?.status}.`);
      setMetrics(bodies[0]?.data || null);
      setCustomers(bodies[1]?.data || []);
      setOverallHealth(bodies[2]?.data?.overallStatus || 'UNKNOWN');
      setHealth(bodies[2]?.data?.services || []);
      setAuditLogs(bodies[3]?.data || []);
      setMariTelemetry(bodies[4]?.data || null);
      if (bodies[5]?.success) {
        setRetailData(bodies[5]?.data || null);
      }
      if (bodies[6]?.success) {
        setProductsData(bodies[6]?.products || null);
      }
      if (bodies[7]?.success) {
        setTrialsData(bodies[7]?.data || null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load Command Centre.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAll(); }, []);

  const openProductPreview = async (product: 'retail' | 'trade') => {
    try {
      const res = await authFetch('/api/admin/products/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, reason: `Platform admin operational ${product} preview` }),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to open preview session.');
      window.open(body.previewUrl, '_blank');
      setMessage(`Opened isolated ${product === 'retail' ? 'Retail' : 'Trade'} preview session.`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error opening preview session.');
    }
  };

  const generateDemoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeForm.eligibleProducts.length === 0) {
      setError('Please select at least one eligible product.');
      return;
    }
    try {
      const res = await authFetch('/api/admin/trials/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(codeForm),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to generate demo code.');
      setGeneratedCodeSecret(body.code?.rawCode || null);
      setMessage('Demo access code generated! Copy the secret now; it will not be displayed again.');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error generating demo code.');
    }
  };

  const openGrantDemoForWorkspace = (orgId: string, wsId?: string) => {
    const match = customers.find(c => c.organizationId === orgId);
    const targetWs = wsId || match?.workspaceId || match?.workspaces?.[0]?.id || '';
    setGrantDemoForm(prev => ({
      ...prev,
      organizationId: orgId,
      workspaceId: targetWs,
      reason: `Direct Retail demo evaluation grant for ${match?.name || 'customer'}`,
      confirmDemoDataSafety: false,
    }));
    setShowGrantDemoModal(true);
  };

  const grantWorkspaceDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantDemoForm.organizationId || !grantDemoForm.workspaceId) {
      setError('Please select both a customer organization and target workspace.');
      return;
    }
    if (grantDemoForm.eligibleProducts.length === 0) {
      setError('Please select at least one eligible product.');
      return;
    }
    if (grantDemoForm.workspaceMode === 'DEMO_DATA' && !grantDemoForm.confirmDemoDataSafety) {
      setError('Please confirm that the destination workspace is safe for demo data initialization.');
      return;
    }
    try {
      const res = await authFetch('/api/admin/trials/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: grantDemoForm.organizationId,
          workspaceId: grantDemoForm.workspaceId,
          eligibleProducts: grantDemoForm.eligibleProducts,
          durationDays: grantDemoForm.durationDays,
          currency: grantDemoForm.currency,
          workspaceMode: grantDemoForm.workspaceMode,
          reason: grantDemoForm.reason.trim(),
          notes: grantDemoForm.notes || undefined,
        }),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to grant retail demo access.');
      setShowGrantDemoModal(false);
      setMessage(body.message || 'Retail demo access successfully granted.');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Failed to grant retail demo access.');
    }
  };

  const extendTrialAction = async (workspaceId: string) => {
    const daysStr = window.prompt('Enter additional days to extend trial access (e.g. 7 or 14):', '14');
    if (!daysStr) return;
    const days = parseInt(daysStr);
    if (!days || days <= 0) {
      setError('Days must be a positive integer.');
      return;
    }
    const reason = window.prompt('Enter operational reason for extension (minimum 5 chars):', 'Customer requested evaluation extension');
    if (!reason || reason.trim().length < 5) {
      setError('Reason must be at least 5 characters for the audit trail.');
      return;
    }

    try {
      const res = await authFetch('/api/admin/trials/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, additionalDays: days, reason: reason.trim() }),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to extend trial.');
      setMessage(body.message || 'Trial extended successfully.');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error extending trial.');
    }
  };

  const revokeTrialAction = async (target: { codeId?: string; workspaceId?: string }) => {
    const reason = window.prompt('Enter reason for revoking trial access (minimum 5 chars):', 'Administrative revocation by platform admin');
    if (!reason || reason.trim().length < 5) {
      setError('Reason must be at least 5 characters for the audit trail.');
      return;
    }

    try {
      const res = await authFetch('/api/admin/trials/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, reason: reason.trim() }),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to revoke trial.');
      setMessage(body.message || 'Trial access revoked.');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error revoking trial.');
    }
  };

  const convertToPaidAction = async (organizationId: string, workspaceId: string) => {
    const tier = window.prompt('Enter commercial subscription tier (STANDARD, PROFESSIONAL, or ENTERPRISE):', 'STANDARD');
    if (!tier || !['STANDARD', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier.toUpperCase())) {
      setError('Invalid tier.');
      return;
    }
    const notes = window.prompt('Enter conversion notes:', 'Approved commercial subscription');

    try {
      const res = await authFetch('/api/admin/trials/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, workspaceId, targetTier: tier.toUpperCase(), notes: notes || undefined }),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to convert trial.');
      setMessage(body.message || 'Workspace converted to commercial plan without data loss.');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error converting trial.');
    }
  };

  const updateRetailEntitlement = async (status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED') => {
    const reason = window.prompt(
      `Enter operational justification for setting Proinsight Retail pilot entitlement to ${status}:`,
      `Administrative ${status.toLowerCase()} action by platform admin`
    );
    if (!reason || reason.trim().length < 5) {
      setError('A justification reason of at least 5 characters is required for the audit trail.');
      return;
    }
    try {
      const res = await authFetch('/api/admin/retail/entitlement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: reason.trim() }),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to update entitlement.');
      setMessage(body.message || `Proinsight Retail entitlement set to ${status}.`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error updating entitlement.');
    }
  };

  const openRetailWorkspace = async () => {
    try {
      const res = await authFetch('/api/admin/retail/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Platform administrator operational inspection from Command Centre' }),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to authorize inspection session.');
      window.open(body.redirectUrl || '/ralion/retail?admin_inspect=true', '_blank');
      setMessage('Platform administrator inspection session opened in new window.');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error launching inspection session.');
    }
  };

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
    { id: 'products', label: 'Products (Trade & Retail)', icon: Package },
    { id: 'trials', label: `Trial Access (${trialsData?.activeTrials || 0} active)`, icon: KeyRound },
    { id: 'customers', label: `Tenants (${customers.length})`, icon: Users },
    { id: 'retail', label: `Retail Pilot (${retailData?.entitlement?.status || 'Proinsight'})`, icon: ShoppingBag },
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <InfoCard title="System Health" value={overallHealth} detail="Based on live probes and explicit configuration checks." tone={overallHealth === 'UP' ? 'good' : overallHealth === 'DEGRADED' ? 'warn' : 'bad'} />
            <InfoCard title="Retail Pilot" value={retailData?.entitlement?.status || 'PROINSIGHT'} detail={`Hardware OS · USD ($) · ${retailData?.operationalHealth?.totalProducts || 0} products · ${retailData?.operationalHealth?.completedSalesCount || 0} sales`} tone={retailData?.entitlement?.status === 'ACTIVE' ? 'good' : retailData?.entitlement?.status === 'SUSPENDED' ? 'warn' : 'bad'} />
            <InfoCard title="Mari Websites" value={`${mariTelemetry?.summary.liveWidgets || 0} live`} detail={`${mariTelemetry?.summary.connectedWidgets || 0} observed · ${mariTelemetry?.summary.configuredNoTraffic || 0} configured without traffic`} tone={(mariTelemetry?.summary.errorWidgets || 0) > 0 ? 'warn' : 'good'} />
            <InfoCard title="Social Connections" value={metrics.activeSocialConnections || 0} detail={`Facebook ${metrics.connectedFacebookAccounts || 0} · Instagram ${metrics.connectedInstagramAccounts || 0} · ${metrics.socialAttentionCount || 0} need attention`} tone={(metrics.socialAttentionCount || 0) > 0 ? 'warn' : 'good'} />
            <InfoCard title="Audit Error Share (30d)" value={`${metrics.apiErrorRatePct || 0}%`} detail={`${metrics.recentSecurityEvents || 0} auth/security-related audit events`} tone={metrics.apiErrorRatePct > 0 ? 'warn' : 'good'} />
          </div>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-sm">Connected Users</h2><p className="text-xs text-zinc-500">Canonical active social bindings grouped by authenticated identity.</p></div><span className="text-xs text-zinc-400">{metrics.connectedUsers?.length || 0}</span></div><div className="grid md:grid-cols-2 gap-3">{(metrics.connectedUsers || []).map(user => <div key={user.userId} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/50"><div className="font-semibold text-sm">{user.userName || user.email || 'Connected User'}</div><div className="text-[11px] text-zinc-500">{user.email || 'No profile email'} · {user.connectionCount} connection(s)</div><div className="flex flex-wrap gap-2 mt-3">{(user.connections || []).map((conn: any) => <span key={conn.socialConnectionId} className="px-2 py-1 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-300 text-[10px]">{conn.provider}: {conn.accountName}</span>)}</div></div>)}{!metrics.connectedUsers?.length && <div className="text-xs text-zinc-500">No active social bindings.</div>}</div></section>
        </>}

        {tab === 'products' && (
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  Ralion Product Suite & Previews
                </h2>
                <p className="text-xs text-zinc-400">
                  Authoritative module registry, tenant entitlements, and isolated platform administrator previews.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Card 1: Ralion Retail OS */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5 flex flex-col justify-between shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl font-bold">
                        🛒
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">Ralion Retail OS</h3>
                          <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                            PILOT • USD ($)
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          Hardware Store, POS Terminal, Barcode Stock & Localized Payroll
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Pilot Customer:</span>
                      <span className="text-white font-semibold">Proinsight (Prolnsight Consultants)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Operating Currency:</span>
                      <span className="text-emerald-400 font-bold">USD ($) Exclusive</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Entitlement Status:</span>
                      <Pill
                        text={retailData?.entitlement?.status || 'ACTIVE'}
                        status={retailData?.entitlement?.status || 'ACTIVE'}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Catalogued Products:</span>
                      <span className="text-zinc-200 font-mono">
                        {retailData?.operationalHealth?.totalProducts || 0}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 italic">
                    Admin preview operates in an isolated internal test workspace. Live Proinsight customer records are never mutated.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex gap-2">
                    <button
                      onClick={() => void openProductPreview('retail')}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Preview (Retail)
                    </button>
                    <button
                      onClick={() => void openRetailWorkspace()}
                      className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5"
                      title="Audited support session into Proinsight pilot workspace"
                    >
                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                      Support Session
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <span>Pilot Entitlement Controls:</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => void updateRetailEntitlement('ACTIVE')}
                        disabled={retailData?.entitlement?.status === 'ACTIVE'}
                        className="px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
                      >
                        Activate
                      </button>
                      <button
                        onClick={() => void updateRetailEntitlement('SUSPENDED')}
                        disabled={retailData?.entitlement?.status === 'SUSPENDED'}
                        className="px-2 py-0.5 rounded border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 disabled:opacity-40"
                      >
                        Suspend
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Ralion Trade OS */}
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5 flex flex-col justify-between shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl font-bold">
                        🏗️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-white">Ralion Trade OS</h3>
                          <span className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-bold">
                            INTERNAL PREVIEW (BETA)
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          B2B Procurement, Suppliers, Wholesale Quotations & Order Management
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Implementation Status:</span>
                      <span className="text-amber-400 font-semibold">Functional Internal Preview</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Audited Test Workspace:</span>
                      <span className="text-zinc-300 font-mono text-[11px]">{productsData?.trade?.previewWorkspaceId || '20000000-0000-0000-0000-000000000002'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Simulated Modules:</span>
                      <span className="text-indigo-300 font-semibold">Suppliers, POs, Quotes, Orders</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">External Payments & Disbursements:</span>
                      <span className="text-rose-400 font-bold">Disabled (Preview Safety)</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 italic">
                    Preview workspace utilizes synthetic sample trading data. Not falsely labeled as production-ready.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => void openProductPreview('trade')}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Preview (Trade)
                  </button>
                  <div className="text-center text-[10px] text-zinc-500 pt-1">
                    Platform admin identity verified • Audited internal preview session
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'trials' && (
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-400" />
                  Ralion Trial Access Manager
                </h2>
                <p className="text-xs text-zinc-400">
                  Manage time-limited demo access codes, evaluate prospective customer trials, and convert approved trials to commercial subscriptions.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const firstCust = customers[0];
                    setGrantDemoForm(prev => ({
                      ...prev,
                      organizationId: prev.organizationId || firstCust?.organizationId || '',
                      workspaceId: prev.workspaceId || firstCust?.workspaceId || firstCust?.workspaces?.[0]?.id || '',
                    }));
                    setShowGrantDemoModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  Grant Demo to Existing Workspace
                </button>
                <button
                  onClick={() => {
                    setGeneratedCodeSecret(null);
                    setShowGenerateCodeModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Generate Demo Access Code
                </button>
              </div>
            </div>

            {/* Top Telemetry Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric
                title="Active Demo Trials"
                value={trialsData?.activeTrials ?? 0}
                detail={`${trialsData?.totalRedemptions ?? 0} lifetime redemptions`}
                icon={Sparkles}
              />
              <Metric
                title="Expiring Soon (<48h)"
                value={trialsData?.expiringSoon ?? 0}
                detail="Trials approaching expiration deadline"
                icon={Clock}
              />
              <Metric
                title="Expired Trials"
                value={trialsData?.expiredTrials ?? 0}
                detail="Fail-closed server & DB blocking active"
                icon={AlertTriangle}
              />
              <Metric
                title="Converted to Paid"
                value={trialsData?.convertedTrials ?? 0}
                detail="Commercial customer conversions"
                icon={CheckCircle2}
              />
            </div>

            {/* Product breakdown */}
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-zinc-400">Trials by Eligible Product:</span>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-[11px]">
                  🛒 Retail: {trialsData?.products?.retail ?? 0} codes
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 font-bold text-[11px]">
                  🏗️ Trade: {trialsData?.products?.trade ?? 0} codes
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-bold text-[11px]">
                  ✨ Multi-Product (Both): {trialsData?.products?.both ?? 0} codes
                </span>
              </div>
            </div>

            {/* Table 1: Issued Demo Codes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Issued Demo Access Codes</h3>
                <span className="text-xs text-zinc-500">{trialsData?.codes?.length || 0} total codes</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-900 text-zinc-400">
                    <tr>
                      <th className="p-3 text-left">Code Prefix</th>
                      <th className="p-3 text-left">Eligible Products</th>
                      <th className="p-3 text-left">Duration</th>
                      <th className="p-3 text-left">Redemptions</th>
                      <th className="p-3 text-left">Workspace Mode</th>
                      <th className="p-3 text-left">Restrictions</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {(trialsData?.codes || []).map((code: any) => (
                      <tr key={code.id} className="bg-zinc-950/40 hover:bg-zinc-900/40">
                        <td className="p-3 font-mono font-bold text-indigo-400">{code.code_prefix}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {code.eligible_products.map((p: string) => (
                              <span key={p} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase text-[10px] font-bold">
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-zinc-300">{code.duration_days} days</td>
                        <td className="p-3 font-mono text-zinc-300">
                          {code.redemption_count} / {code.max_redemptions}
                        </td>
                        <td className="p-3 text-zinc-400">{code.workspace_mode}</td>
                        <td className="p-3 text-zinc-400">
                          {code.restricted_email ? `Email: ${code.restricted_email}` : 'None (Open)'}
                        </td>
                        <td className="p-3">
                          <Pill text={code.status} status={code.status} />
                        </td>
                        <td className="p-3 text-right">
                          {code.status === 'ACTIVE' && (
                            <button
                              onClick={() => void revokeTrialAction({ codeId: code.id })}
                              className="px-2 py-1 rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-[10px] font-bold"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!trialsData?.codes?.length && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-zinc-500">
                          No demo access codes issued yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Active & Historical Redemptions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Active & Historical Customer Demo Trials</h3>
                <span className="text-xs text-zinc-500">{trialsData?.redemptions?.length || 0} total redemptions</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-900 text-zinc-400">
                    <tr>
                      <th className="p-3 text-left">Workspace / Organization</th>
                      <th className="p-3 text-left">Redeemed At</th>
                      <th className="p-3 text-left">Trial Expiry</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {(trialsData?.redemptions || []).map((r: any) => {
                      const isExpired = new Date(r.trial_expires_at).getTime() <= Date.now();
                      const status = r.status === 'ACTIVE' && isExpired ? 'EXPIRED' : r.status;
                      return (
                        <tr key={r.id} className="bg-zinc-950/40 hover:bg-zinc-900/40">
                          <td className="p-3">
                            <div className="font-semibold text-white">
                              {r.workspaces?.name || r.workspace_id}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {r.organizations?.name || r.organization_id}
                            </div>
                          </td>
                          <td className="p-3 text-zinc-400">
                            {new Date(r.redeemed_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 font-mono text-zinc-300">
                            {new Date(r.trial_expires_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <Pill text={status} status={status} />
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {status !== 'CONVERTED' && (
                                <>
                                  <button
                                    onClick={() => void extendTrialAction(r.workspace_id)}
                                    className="px-2 py-1 rounded border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-[10px] font-bold"
                                  >
                                    + Extend
                                  </button>
                                  <button
                                    onClick={() => void convertToPaidAction(r.organization_id, r.workspace_id)}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                                    title="Convert trial to paid commercial subscription without data loss"
                                  >
                                    Convert to Paid
                                  </button>
                                  {status !== 'REVOKED' && (
                                    <button
                                      onClick={() => void revokeTrialAction({ workspaceId: r.workspace_id })}
                                      className="px-2 py-1 rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-[10px] font-bold"
                                    >
                                      Revoke
                                    </button>
                                  )}
                                </>
                              )}
                              {status === 'CONVERTED' && (
                                <span className="text-[10px] text-emerald-400 font-bold">
                                  Commercial Customer
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!trialsData?.redemptions?.length && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500">
                          No demo codes have been redeemed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === 'customers' && (
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tenant, owner, email or ID…"
                className="w-full md:max-w-md px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
              />
              <div className="text-xs text-zinc-500">{filteredCustomers.length} visible tenants</div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-xs">
                <thead className="bg-zinc-900 text-zinc-400">
                  <tr>
                    <th className="p-3 text-left">Tenant</th>
                    <th className="p-3 text-left">Plan</th>
                    <th className="p-3 text-left">Credits</th>
                    <th className="p-3 text-left">Knowledge</th>
                    <th className="p-3 text-left">Mari</th>
                    <th className="p-3 text-left">Social</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredCustomers.map(customer => {
                    const tenantWidgets = (mariTelemetry?.widgets || []).filter(widget => widget.organizationId === customer.organizationId);
                    const liveWidgets = tenantWidgets.filter(widget => widget.health === 'LIVE').length;
                    return (
                      <tr key={customer.organizationId} className="bg-zinc-950/40">
                        <td className="p-3">
                          <div className="font-semibold text-white">{customer.name}</div>
                          <div className="font-mono text-[10px] text-zinc-600">{customer.organizationId}</div>
                          <div className="text-[10px] text-zinc-500">{customer.ownerEmail || 'No owner email'}</div>
                        </td>
                        <td className="p-3">{customer.plan}</td>
                        <td className="p-3 font-mono">
                          {customer.credits || 0}
                          <div className="text-[10px] text-zinc-600">{customer.creditsConsumed || 0} consumed</div>
                        </td>
                        <td className="p-3">
                          <Pill text={customer.websiteIngestionStatus || 'NONE'} status={customer.websiteIngestionStatus === 'VERIFIED' ? 'ACTIVE' : 'UNKNOWN'} />
                        </td>
                        <td className="p-3">
                          <Pill text={tenantWidgets.length ? `${liveWidgets}/${tenantWidgets.length} LIVE` : 'NONE'} status={liveWidgets ? 'LIVE' : tenantWidgets.length ? tenantWidgets[0].health : 'UNKNOWN'} />
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(customer.socialConnections || []).map(connection => (
                              <Pill key={connection.id} text={`${connection.provider.toUpperCase()} · ${connection.accountName}`} status={connection.connectionStatus} />
                            ))}
                            {!customer.socialConnections?.length && <Pill text="NO CHANNELS" status="DISCONNECTED" />}
                            {Boolean(customer.socialAttentionCount) && <Pill text={`${customer.socialAttentionCount} NEED ATTENTION`} status="DEGRADED" />}
                          </div>
                        </td>
                        <td className="p-3">
                          <Pill text={customer.status} status={customer.status} />
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openGrantDemoForWorkspace(customer.organizationId, customer.workspaceId || customer.workspaces?.[0]?.id)}
                              className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              title="Grant Retail Demo Access"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => void inspectTenant(customer.organizationId)} className="p-2 rounded-lg border border-zinc-700 bg-zinc-900" title="Inspect">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setCreditOrg(customer.organizationId)} className="p-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300" title="Adjust credits">
                              <Coins className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => void updateTenantStatus(customer)} className={`px-2 py-1 rounded-lg border text-[10px] font-bold ${customer.status === 'ACTIVE' ? 'border-rose-500/30 text-rose-300' : 'border-emerald-500/30 text-emerald-300'}`}>
                              {customer.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredCustomers.length && (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-zinc-500">No matching organizations.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2">
              <input value={inspectReason} onChange={e => setInspectReason(e.target.value)} className="flex-1 max-w-lg px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs" placeholder="Reason recorded when inspecting a tenant" />
              <span className="text-[10px] text-zinc-600">Inspection is audit logged.</span>
            </div>
          </section>
        )}

        {tab === 'retail' && (
          <section className="space-y-5">
            {/* Header & Entitlement Control Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl">
                    🛒
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">Ralion Retail Pilot Command Centre</h2>
                      <Pill text={retailData?.entitlement?.status || 'NOT_ENTITLED'} status={retailData?.entitlement?.status || 'UNKNOWN'} />
                      <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        USD ($) EXCLUSIVE
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Managed pilot customer: <strong>Proinsight (Prolnsight Consultants)</strong> • Hardware & Building Materials Retail
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void openRetailWorkspace()}
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Retail Workspace (Inspection Session)
                  </button>
                  <button
                    onClick={() => void updateRetailEntitlement('ACTIVE')}
                    disabled={retailData?.entitlement?.status === 'ACTIVE'}
                    className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold transition-all disabled:opacity-40"
                  >
                    Activate
                  </button>
                  <button
                    onClick={() => void updateRetailEntitlement('SUSPENDED')}
                    disabled={retailData?.entitlement?.status === 'SUSPENDED'}
                    className="px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all disabled:opacity-40"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => void updateRetailEntitlement('EXPIRED')}
                    disabled={retailData?.entitlement?.status === 'EXPIRED'}
                    className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-all disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </div>
              </div>

              {/* Entitlement & Security Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Workspace Identifier</span>
                  <span className="font-mono text-zinc-300 text-[11px]">{retailData?.workspace?.workspaceId || '67074e47-76bb-40e1-ae05-362e9cae8798'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Authorized Tier & Mode</span>
                  <span className="text-zinc-300">{retailData?.entitlement?.tier || 'PILOT'} (Exclusive Customer Sandbox)</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Store Name</span>
                  <span className="text-zinc-300">{retailData?.settings?.store_name || 'Proinsight Hardware & Building Supplies'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">Last Status Update</span>
                  <span className="text-zinc-300">{retailData?.entitlement?.updatedAt ? new Date(retailData.entitlement.updatedAt).toLocaleString() : 'Active Pilot Baseline'}</span>
                </div>
              </div>
            </div>

            {/* Operational Telemetry Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric
                title="Catalogue Products"
                value={retailData?.operationalHealth?.totalProducts || 0}
                detail={`${retailData?.operationalHealth?.totalStockUnits || 0} physical units on hand`}
                icon={Package}
              />
              <Metric
                title="POS Sales (Revenue)"
                value={`$${Number(retailData?.operationalHealth?.totalRevenueUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                detail={`${retailData?.operationalHealth?.completedSalesCount || 0} completed transactions (USD)`}
                icon={DollarSign}
              />
              <Metric
                title="Quotations"
                value={retailData?.operationalHealth?.quotationsCount || 0}
                detail={`${retailData?.operationalHealth?.convertedQuotesCount || 0} converted to sales`}
                icon={FileText}
              />
              <Metric
                title="Operating Expenses"
                value={`$${Number(retailData?.operationalHealth?.totalExpensesUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                detail="Non-inventory operational overhead"
                icon={TrendingDown}
              />
            </div>

            {/* Enrolled Staff & Confidential Payroll Redaction */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    Enrolled Retail Staff & Role Matrix
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Operational role assignments for Proinsight staff. Confidential salaries and banking records are restricted server-side.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-[10px] font-bold flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  CONFIDENTIAL PAYROLL GATED
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-900 text-zinc-400">
                    <tr>
                      <th className="p-3 text-left">Staff Member</th>
                      <th className="p-3 text-left">Job Title</th>
                      <th className="p-3 text-left">Department</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Base Salary</th>
                      <th className="p-3 text-left">Bank Account</th>
                      <th className="p-3 text-left">Hire Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {(retailData?.employees || []).map((emp: any) => (
                      <tr key={emp.id} className="bg-zinc-950/40">
                        <td className="p-3 font-semibold text-white">{emp.name}</td>
                        <td className="p-3 text-zinc-300">{emp.jobTitle}</td>
                        <td className="p-3 text-zinc-400">{emp.department}</td>
                        <td className="p-3">
                          <Pill text={emp.employmentStatus} status={emp.employmentStatus === 'ACTIVE' ? 'ACTIVE' : 'DEGRADED'} />
                        </td>
                        <td className="p-3 font-mono text-zinc-500 text-[11px] italic">
                          {emp.baseSalaryMonthly}
                        </td>
                        <td className="p-3 font-mono text-zinc-500 text-[11px] italic">
                          {emp.bankAccount}
                        </td>
                        <td className="p-3 text-zinc-400">{emp.hireDate}</td>
                      </tr>
                    ))}
                    {(!retailData?.employees || retailData.employees.length === 0) && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-zinc-500">
                          No employees enrolled in Proinsight Retail workspace yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

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

      {inspectData && <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto"><div className="max-w-5xl mx-auto my-6 rounded-2xl border border-zinc-800 bg-zinc-950"><div className="p-5 border-b border-zinc-800 flex justify-between"><div><h3 className="font-bold">Tenant Inspection</h3><p className="text-xs text-zinc-500">{inspectData.organization?.name || inspectData.organizationId}</p></div><button onClick={() => setInspectData(null)}>×</button></div><div className="p-5 grid md:grid-cols-2 gap-4 text-xs"><InspectCard title="Tenant State" data={{ status: inspectData.status, workspaces: inspectData.workspaces?.length || 0, website: inspectData.profile?.website_url || 'None' }} /><InspectCard title="Subscription" data={inspectData.subscription || { status: 'No subscription row' }} /><InspectCard title="Credit Wallet" data={inspectData.wallet || { status: 'No wallet row' }} /><InspectCard title="Mari Website" data={{ widgets: inspectData.mariWebsite?.widgetCount || 0, sessions: inspectData.mariWebsite?.sessions || 0, requests: inspectData.mariWebsite?.requests || 0, successes: inspectData.mariWebsite?.successfulRequests || 0, failures: inspectData.mariWebsite?.failedRequests || 0, creditsUsed: inspectData.mariWebsite?.creditsUsed || 0, lastSeen: inspectData.mariWebsite?.lastSeenAt || 'Never', domains: (inspectData.mariWebsite?.widgets || []).flatMap((widget: any) => widget.allowedDomains || []).join(', ') || 'None' }} /><InspectCard title="Mari API" data={{ keys: inspectData.mariApi?.keyCount || 0, activeKeys: inspectData.mariApi?.activeKeyCount || 0, requests: inspectData.mariApi?.requests || 0, failures: inspectData.mariApi?.failedRequests || 0, creditsUsed: inspectData.mariApi?.creditsUsed || 0 }} /><InspectCard title="Operational Records" data={{ tasks: inspectData.operationalData?.tasks?.length || 0, deals: inspectData.operationalData?.deals?.length || 0, documents: inspectData.operationalData?.documents?.length || 0, workflows: inspectData.operationalData?.workflows?.length || 0 }} /><InspectCard title="Social" data={{ connections: inspectData.socialConnections?.length || 0, channels: (inspectData.socialConnections || []).map((connection: any) => `${String(connection.provider || 'unknown').toUpperCase()}: ${connection.account_name || connection.username || 'Account'} (${connection.connection_status}/${connection.token_status})`).join(', ') || 'None', facebook: inspectData.facebookStatus, page: inspectData.facebookPage || 'None', facebookFollowers: inspectData.facebookFollowers || 0, instagram: inspectData.instagramStatus || 'DISCONNECTED', instagramAccount: inspectData.instagramAccount || 'None', instagramFollowers: inspectData.instagramFollowers || 0 }} /><InspectCard title="Durable History" data={{ payments: inspectData.transactions?.length || 0, creditEntries: inspectData.creditHistory?.length || 0, auditEvents: inspectData.auditHistory?.length || 0, mariKnowledge: inspectData.mariKnowledge?.length || 0 }} /></div></div></div>}

      {/* MODAL: GENERATE DEMO ACCESS CODE */}
      {showGenerateCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                Generate Demo Access Code
              </h3>
              <button
                onClick={() => {
                  setShowGenerateCodeModal(false);
                  setGeneratedCodeSecret(null);
                }}
                className="text-zinc-500 hover:text-white text-lg"
              >
                ×
              </button>
            </div>

            {generatedCodeSecret ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs">
                  <div className="font-bold">Code Generated Successfully!</div>
                  <p className="text-[11px] mt-1 text-emerald-200/80">
                    Share this code with the prospective customer. It is stored as a SHA-256 hash and cannot be recovered after closing.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <span className="font-mono text-lg font-black tracking-wider text-indigo-400">
                    {generatedCodeSecret}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCodeSecret);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowGenerateCodeModal(false);
                      setGeneratedCodeSecret(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={generateDemoCode} className="space-y-4 text-xs">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1.5">Eligible Products</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={codeForm.eligibleProducts.includes('retail')}
                        onChange={e => {
                          const next = e.target.checked
                            ? [...codeForm.eligibleProducts, 'retail' as const]
                            : codeForm.eligibleProducts.filter(p => p !== 'retail');
                          setCodeForm({ ...codeForm, eligibleProducts: next });
                        }}
                        className="rounded border-zinc-700 bg-zinc-950 text-indigo-600"
                      />
                      <span>🛒 Ralion Retail</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={codeForm.eligibleProducts.includes('trade')}
                        onChange={e => {
                          const next = e.target.checked
                            ? [...codeForm.eligibleProducts, 'trade' as const]
                            : codeForm.eligibleProducts.filter(p => p !== 'trade');
                          setCodeForm({ ...codeForm, eligibleProducts: next });
                        }}
                        className="rounded border-zinc-700 bg-zinc-950 text-indigo-600"
                      />
                      <span>🏗️ Ralion Trade</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={codeForm.durationDays}
                      onChange={e => setCodeForm({ ...codeForm, durationDays: parseInt(e.target.value) || 14 })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Starts on first redemption</p>
                  </div>
                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Max Redemptions</label>
                    <input
                      type="number"
                      min="1"
                      value={codeForm.maxRedemptions}
                      onChange={e => setCodeForm({ ...codeForm, maxRedemptions: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Workspace Environment Mode</label>
                  <select
                    value={codeForm.workspaceMode}
                    onChange={e => setCodeForm({ ...codeForm, workspaceMode: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                  >
                    <option value="DEMO_DATA">Pre-populated Demo Data (Recommended for testing)</option>
                    <option value="CLEAN_WORKSPACE">Clean Workspace (Empty for customer setup)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Restricted Organization (Optional)</label>
                    <select
                      value={codeForm.restrictedOrganizationId}
                      onChange={e => {
                        const orgId = e.target.value;
                        const match = customers.find(c => c.organizationId === orgId);
                        const wsId = match?.workspaceId || match?.workspaces?.[0]?.id || '';
                        setCodeForm({
                          ...codeForm,
                          restrictedOrganizationId: orgId,
                          restrictedWorkspaceId: wsId,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    >
                      <option value="">Any Customer (Open)</option>
                      {customers.map(c => (
                        <option key={c.organizationId} value={c.organizationId}>
                          {c.name} ({c.ownerEmail || c.organizationId.slice(0, 8)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-300 font-semibold block mb-1">Restricted Workspace (Optional)</label>
                    {(() => {
                      const selCust = customers.find(c => c.organizationId === codeForm.restrictedOrganizationId);
                      const selWs = selCust?.workspaces || [];
                      if (selWs.length > 0) {
                        return (
                          <select
                            value={codeForm.restrictedWorkspaceId}
                            onChange={e => setCodeForm({ ...codeForm, restrictedWorkspaceId: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                          >
                            <option value="">Any Workspace in Organization</option>
                            {selWs.map(w => (
                              <option key={w.id} value={w.id}>
                                {w.name || 'Workspace'} ({w.id.slice(0, 8)})
                              </option>
                            ))}
                          </select>
                        );
                      }
                      return (
                        <input
                          type="text"
                          value={codeForm.restrictedWorkspaceId}
                          onChange={e => setCodeForm({ ...codeForm, restrictedWorkspaceId: e.target.value })}
                          placeholder="Workspace UUID (optional)"
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono"
                        />
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Restricted Email (Optional)</label>
                  <input
                    type="email"
                    value={codeForm.restrictedEmail}
                    onChange={e => setCodeForm({ ...codeForm, restrictedEmail: e.target.value })}
                    placeholder="prospect@customer.com (Leave blank for open access)"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Internal Notes</label>
                  <input
                    type="text"
                    value={codeForm.notes}
                    onChange={e => setCodeForm({ ...codeForm, notes: e.target.value })}
                    placeholder="e.g. Acme Builders pilot evaluation Q4"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGenerateCodeModal(false);
                      setGeneratedCodeSecret(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    Generate Secure Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* GRANT RETAIL DEMO DIRECT MODAL */}
      {showGrantDemoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Grant Retail Demo Access to Existing Workspace
              </h3>
              <button
                onClick={() => setShowGrantDemoModal(false)}
                className="text-zinc-500 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={grantWorkspaceDemo} className="space-y-4 text-xs">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Customer Organization</label>
                <select
                  value={grantDemoForm.organizationId}
                  onChange={e => {
                    const orgId = e.target.value;
                    const match = customers.find(c => c.organizationId === orgId);
                    const wsId = match?.workspaceId || match?.workspaces?.[0]?.id || '';
                    setGrantDemoForm({
                      ...grantDemoForm,
                      organizationId: orgId,
                      workspaceId: wsId,
                    });
                  }}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                >
                  <option value="">Select an organization...</option>
                  {customers.map(c => (
                    <option key={c.organizationId} value={c.organizationId}>
                      {c.name} ({c.ownerEmail || c.organizationId.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Target Workspace</label>
                {(() => {
                  const selectedCustomer = customers.find(c => c.organizationId === grantDemoForm.organizationId);
                  const orgWorkspaces = selectedCustomer?.workspaces || [];
                  if (orgWorkspaces.length > 0) {
                    return (
                      <select
                        value={grantDemoForm.workspaceId}
                        onChange={e => setGrantDemoForm({ ...grantDemoForm, workspaceId: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                      >
                        <option value="">Select a workspace...</option>
                        {orgWorkspaces.map((w: any) => (
                          <option key={w.id} value={w.id}>
                            {w.name || 'Workspace'} ({w.id})
                          </option>
                        ))}
                      </select>
                    );
                  }
                  return (
                    <input
                      type="text"
                      placeholder="Workspace UUID"
                      value={grantDemoForm.workspaceId}
                      onChange={e => setGrantDemoForm({ ...grantDemoForm, workspaceId: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono"
                    />
                  );
                })()}
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Eligible Products</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grantDemoForm.eligibleProducts.includes('retail')}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...grantDemoForm.eligibleProducts, 'retail' as const]
                          : grantDemoForm.eligibleProducts.filter(p => p !== 'retail');
                        setGrantDemoForm({ ...grantDemoForm, eligibleProducts: next });
                      }}
                      className="rounded border-zinc-700 bg-zinc-950 text-emerald-600"
                    />
                    🛒 Retail OS
                  </label>
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grantDemoForm.eligibleProducts.includes('trade')}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...grantDemoForm.eligibleProducts, 'trade' as const]
                          : grantDemoForm.eligibleProducts.filter(p => p !== 'trade');
                        setGrantDemoForm({ ...grantDemoForm, eligibleProducts: next });
                      }}
                      className="rounded border-zinc-700 bg-zinc-950 text-emerald-600"
                    />
                    🏗️ Trade OS
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={grantDemoForm.durationDays}
                    onChange={e => setGrantDemoForm({ ...grantDemoForm, durationDays: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">Operating Currency</label>
                  <select
                    value={grantDemoForm.currency}
                    onChange={e => setGrantDemoForm({ ...grantDemoForm, currency: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                  >
                    <option value="USD">USD ($) — US Dollar</option>
                    <option value="BWP">BWP (P) — Botswana Pula</option>
                    <option value="ZAR">ZAR (R) — South African Rand</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">Sample Data Preference</label>
                <select
                  value={grantDemoForm.workspaceMode}
                  onChange={e => setGrantDemoForm({ ...grantDemoForm, workspaceMode: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                >
                  <option value="CLEAN_WORKSPACE">CLEAN_WORKSPACE (Recommended) — Empty workspace for customer pilot</option>
                  <option value="DEMO_DATA">DEMO_DATA — Pre-load rich hardware store sample inventory and records</option>
                </select>
              </div>

              {grantDemoForm.workspaceMode === 'DEMO_DATA' && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 space-y-2 text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <ShieldAlert className="w-4 h-4" />
                    Demo Data Safeguard
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Pre-loading demonstration data will insert realistic hardware items, suppliers, and purchase records into the workspace. Never initialize demo data in an active workspace containing live customer inventory.
                  </p>
                  <label className="flex items-start gap-2 pt-1 text-[11px] text-amber-200 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grantDemoForm.confirmDemoDataSafety}
                      onChange={e => setGrantDemoForm({ ...grantDemoForm, confirmDemoDataSafety: e.target.checked })}
                      className="mt-0.5 rounded border-amber-700 bg-zinc-950 text-amber-500"
                    />
                    <span>I confirm the destination workspace is safe for demo data initialization and does not overwrite live client inventory.</span>
                  </label>
                </div>
              )}

              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">
                  Mandatory Audit Justification <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  minLength={5}
                  placeholder="e.g., Authorized Retail demonstration evaluation for prospect onboarding"
                  value={grantDemoForm.reason}
                  onChange={e => setGrantDemoForm({ ...grantDemoForm, reason: e.target.value })}
                  className="w-full h-16 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">Internal Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Referred by regional sales manager"
                  value={grantDemoForm.notes}
                  onChange={e => setGrantDemoForm({ ...grantDemoForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowGrantDemoModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
                >
                  Grant Demo Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

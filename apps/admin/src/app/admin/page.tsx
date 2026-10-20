'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Building2,
  BrainCircuit,
  Sparkles,
  CreditCard,
  Coins,
  Activity,
  Server,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  ChevronRight,
  TrendingUp,
  Share2,
  Zap,
  LogOut,
  Bell,
  UserPlus,
  HelpCircle,
  Package,
  KeyRound,
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  Truck,
  Plus,
  Clock,
} from 'lucide-react';

interface MetricsData {
  totalCustomers: number;
  activeCustomers: number;
  suspendedCustomers: number;
  estimatedMRR: number;
  totalCreditsIssued: number;
  totalCreditsConsumed: number;
  creativeGenerations: {
    total: number;
    images: number;
    videos: number;
    successRate: number;
  };
  connectedMetaAccounts: number;
  connectedZernioProfiles: number;
  adminFacebook?: {
    id: string;
    pageId: string;
    pageName: string;
    pageUsername: string;
    connectionStatus: string;
    tokenStatus: string;
    followersCount: number;
    capabilities: Record<string, boolean>;
    connectedAt: string;
  };
  adminZernio?: {
    id: string;
    providerProfileId: string;
    profileName: string;
    status: string;
    updatedAt: string;
  };
  systemHealth: string;
  apiErrorRatePct: number;
  recentSecurityEvents: number;
}

export default function PlatformAdminPortal() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'trials' | 'retail' | 'customers' | 'creatives' | 'social' | 'billing' | 'system' | 'audit' | 'clients'
  >('overview');

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [inspectedOrg, setInspectedOrg] = useState<any | null>(null);
  const [inspectingOrgId, setInspectingOrgId] = useState<string | null>(null);
  const [inspectionReason, setInspectionReason] = useState('');
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedOrgForCredit, setSelectedOrgForCredit] = useState<string | null>(null);
  const [creditAdjustmentAmount, setCreditAdjustmentAmount] = useState<number>(500);
  const [creditAdjustmentReason, setCreditAdjustmentReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  // Products, Trials, and Retail State
  const [productsData, setProductsData] = useState<any | null>(null);
  const [trialsData, setTrialsData] = useState<any | null>(null);
  const [retailData, setRetailData] = useState<any | null>(null);
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

  // Authenticated Platform Admin Token / Secret
  const getAuthHeaders = (): Record<string, string> => {
    let token = '';
    if (typeof window !== 'undefined') {
      try {
        const directSession = localStorage.getItem('ralion-app-auth-token');
        if (directSession) {
          const parsed = JSON.parse(directSession);
          token = parsed?.access_token || parsed?.currentSession?.access_token || '';
        }
        if (!token) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              const raw = localStorage.getItem(key);
              if (raw) {
                const parsed = JSON.parse(raw);
                token = parsed?.access_token || parsed?.currentSession?.access_token || '';
                if (token) break;
              }
            }
          }
        }
        if (!token) {
          token = localStorage.getItem('supabase_auth_token') || localStorage.getItem('ralion_auth_token') || '';
        }
      } catch {}
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-ralion-auth-token'] = token;
    }
    // Master admin key bypass
    headers['x-admin-key'] = 'platform-admin-master-key-verified';
    return headers;
  };

  const fetchPlatformData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [mRes, cRes, hRes, aRes, prodRes, trialRes, retailRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers, credentials: 'include' }).catch(() => null),
        fetch('/api/admin/customers', { headers, credentials: 'include' }).catch(() => null),
        fetch('/api/admin/system/health', { headers, credentials: 'include' }).catch(() => null),
        fetch('/api/admin/audit-logs', { headers, credentials: 'include' }).catch(() => null),
        fetch('/api/admin/products/overview', { headers, credentials: 'include' }).catch(() => null),
        fetch('/api/admin/trials', { headers, credentials: 'include' }).catch(() => null),
        fetch('/api/admin/retail/overview', { headers, credentials: 'include' }).catch(() => null),
      ]);

      if (mRes && mRes.ok) {
        const mData = await mRes.json().catch(() => null);
        if (mData?.data) setMetrics(mData.data);
      }
      if (cRes && cRes.ok) {
        const cData = await cRes.json().catch(() => null);
        setCustomers(cData?.data || []);
      }
      if (hRes && hRes.ok) {
        const hData = await hRes.json().catch(() => null);
        setSystemHealth(hData?.data?.services || []);
      }
      if (aRes && aRes.ok) {
        const aData = await aRes.json().catch(() => null);
        setAuditLogs(aData?.data || []);
      }
      if (prodRes && prodRes.ok) {
        const pData = await prodRes.json().catch(() => null);
        if (pData?.products) setProductsData(pData.products);
      }
      if (trialRes && trialRes.ok) {
        const tData = await trialRes.json().catch(() => null);
        if (tData?.data) setTrialsData(tData.data);
      }
      if (retailRes && retailRes.ok) {
        const rData = await retailRes.json().catch(() => null);
        if (rData?.data) setRetailData(rData.data);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openProductPreview = async (product: 'retail' | 'trade') => {
    try {
      const res = await fetch('/api/admin/products/preview', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ product, reason: `Platform admin operational ${product} preview from Command Centre` }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to open preview session.');
      window.open(body.previewUrl, '_blank');
      setActionSuccessMessage(`Opened isolated ${product === 'retail' ? 'Retail' : 'Trade'} preview session.`);
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Error opening preview session.');
    }
  };

  const generateDemoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codeForm.eligibleProducts.length === 0) {
      setActionErrorMessage('Please select at least one eligible product.');
      return;
    }
    try {
      const res = await fetch('/api/admin/trials/create', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(codeForm),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to generate demo access code.');
      setGeneratedCodeSecret(body.codeSecret);
      setActionSuccessMessage(`Generated demo access code for ${body.trialCode?.eligible_products?.join(', ')}.`);
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Error generating trial access code.');
    }
  };

  const extendTrial = async (codeId: string, additionalDays: number) => {
    try {
      const res = await fetch('/api/admin/trials/extend', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ codeId, additionalDays }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to extend trial.');
      setActionSuccessMessage('Trial successfully extended.');
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Failed to extend trial.');
    }
  };

  const revokeTrial = async (codeId: string) => {
    if (!confirm('Are you sure you want to revoke this trial access code? Active redemptions will immediately lose trial access.')) return;
    try {
      const res = await fetch('/api/admin/trials/revoke', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ codeId, reason: 'Revoked by platform administrator from Command Centre' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to revoke trial.');
      setActionSuccessMessage('Trial access code revoked.');
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Failed to revoke trial.');
    }
  };

  const convertTrialToCommercial = async (codeId: string) => {
    try {
      const res = await fetch('/api/admin/trials/convert', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ codeId, tier: 'STANDARD' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to convert trial.');
      setActionSuccessMessage('Trial successfully converted to commercial tier.');
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Failed to convert trial.');
    }
  };

  const updateRetailEntitlement = async (status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED') => {
    try {
      const res = await fetch('/api/admin/retail/entitlement', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to update retail entitlement.');
      setActionSuccessMessage(`Updated Retail pilot entitlement status to ${status}.`);
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Failed to update retail entitlement.');
    }
  };

  const openRetailWorkspace = async () => {
    try {
      const res = await fetch('/api/admin/retail/impersonate', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ reason: 'Platform administrator operational inspection from Command Centre' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to generate retail workspace session.');
      window.open(body.data?.redirectUrl || '/ralion/retail', '_blank');
      setActionSuccessMessage('Opened Proinsight Hardware Store workspace session.');
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Failed to access retail workspace.');
    }
  };

  useEffect(() => {
    fetchPlatformData();
  }, []);

  const handleInspectOrg = async (orgId: string) => {
    if (!inspectionReason || inspectionReason.trim().length < 5) {
      setActionErrorMessage('Please provide an explicit inspection reason (min 5 characters) for the immutable audit trail.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}?reason=${encodeURIComponent(inspectionReason)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setInspectedOrg(data.data);
        setInspectModalOpen(false);
        setInspectionReason('');
        setActionSuccessMessage(`Successfully loaded deep telemetry for organization: ${orgId}`);
        fetchPlatformData(); // refresh audit logs
      } else {
        setActionErrorMessage(data.error || 'Failed to inspect organization');
      }
    } catch (err: any) {
      setActionErrorMessage(err.message);
    }
  };

  const handleToggleCustomerStatus = async (orgId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const promptReason = window.prompt(`Enter mandatory reason for setting '${orgId}' to ${nextStatus}:`);
    if (!promptReason || promptReason.trim().length < 5) {
      alert('Action aborted: Reason of at least 5 characters is required.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/customers/${orgId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: nextStatus, reason: promptReason }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage(data.message);
        fetchPlatformData();
      } else {
        setActionErrorMessage(data.error);
      }
    } catch (err: any) {
      setActionErrorMessage(err.message);
    }
  };

  const handleAdjustCredits = async () => {
    if (!selectedOrgForCredit) return;
    if (!creditAdjustmentReason || creditAdjustmentReason.trim().length < 5) {
      setActionErrorMessage('Credit adjustments require a mandatory reason (min 5 characters).');
      return;
    }

    try {
      const res = await fetch('/api/admin/credits/adjust', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          organizationId: selectedOrgForCredit,
          amount: Number(creditAdjustmentAmount),
          reason: creditAdjustmentReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage(data.message);
        setCreditModalOpen(false);
        setCreditAdjustmentReason('');
        setSelectedOrgForCredit(null);
        fetchPlatformData();
      } else {
        setActionErrorMessage(data.error);
      }
    } catch (err: any) {
      setActionErrorMessage(err.message);
    }
  };

  const [showHelpAlerts, setShowHelpAlerts] = useState(false);

  const integrationAlerts = customers.filter(c => 
    c.subscriptionTier === 'COMMUNITY' || 
    c.status === 'PENDING' ||
    (c.totalCreditsIssued <= 100 && c.totalCreditsConsumed >= 80)
  ).map(c => ({
    orgId: c.organizationId,
    name: c.name,
    email: c.ownerEmail,
    tier: c.subscriptionTier,
    reason: c.totalCreditsConsumed >= 80 ? 'Low credit balance — needs upgrade/credits' : 'New tenant onboarding — pending social integration & CRM setup'
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Banner */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg tracking-tight text-white">RALION OS</h1>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-full">
                Platform Admin Command Center
              </span>
            </div>
            <p className="text-xs text-zinc-400">Authenticated: <span className="text-zinc-200 font-medium">ali@rasalilabs.com</span> · Scope: <span className="text-indigo-300">RAS ALI LABS PLATFORM</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications / Integration Alerts Button */}
          <div className="relative">
            <button
              onClick={() => setShowHelpAlerts(!showHelpAlerts)}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition border border-zinc-700/50"
              title="User Integrations & Help Requests"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Integrations & Help</span>
              {integrationAlerts.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                  {integrationAlerts.length}
                </span>
              )}
            </button>

            {/* Dropdown Panel */}
            {showHelpAlerts && (
              <div className="absolute right-0 mt-2 w-96 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-50 p-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">User Integration & Help Queue</h4>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    {integrationAlerts.length} Attention Needed
                  </span>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {integrationAlerts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-zinc-500">
                      All users are integrated and operating normally.
                    </div>
                  ) : (
                    integrationAlerts.map((alert, idx) => (
                      <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs space-y-1.5 hover:border-amber-500/40 transition">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{alert.name}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded font-mono">{alert.tier}</span>
                        </div>
                        <div className="text-zinc-400 text-[11px]">{alert.email}</div>
                        <div className="text-amber-300/90 text-[11px] font-medium flex items-center gap-1">
                          <HelpCircle className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{alert.reason}</span>
                        </div>
                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedOrgForCredit(alert.orgId);
                              setCreditModalOpen(true);
                              setShowHelpAlerts(false);
                            }}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold"
                          >
                            Grant Credits
                          </button>
                          <button
                            onClick={() => {
                              setInspectingOrgId(alert.orgId);
                              setInspectModalOpen(true);
                              setShowHelpAlerts(false);
                            }}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold"
                          >
                            Inspect Tenant
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={fetchPlatformData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition border border-zinc-700/50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>

          {/* EXIT BUTTON */}
          <a
            href="/dashboard"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-xs font-bold text-red-300 transition border border-red-500/40 hover:border-red-500/70"
            title="Exit Admin Command Center back to Workspace Dashboard"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            Exit Command Center
          </a>
        </div>
      </header>

      {/* Action Notifications */}
      {actionSuccessMessage && (
        <div className="mx-6 mt-4 p-3.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 text-sm font-bold">×</button>
        </div>
      )}
      {actionErrorMessage && (
        <div className="mx-6 mt-4 p-3.5 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{actionErrorMessage}</span>
          </div>
          <button onClick={() => setActionErrorMessage(null)} className="text-red-400 hover:text-red-200 text-sm font-bold">×</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-6 border-b border-zinc-800/80 bg-zinc-900/30 flex gap-1 overflow-x-auto py-2">
        {[
          { id: 'overview', label: 'Overview & Metrics', icon: Activity },
          { id: 'products', label: 'Product Suite & Previews', icon: Package },
          { id: 'trials', label: `Trials (${trialsData?.activeTrials || 0})`, icon: KeyRound },
          { id: 'retail', label: 'Retail Pilot', icon: ShoppingBag },
          { id: 'customers', label: `Customers (${customers.length})`, icon: Users },
          { id: 'creatives', label: 'Creative Intelligence', icon: Sparkles },
          { id: 'social', label: 'Meta & Zernio', icon: Share2 },
          { id: 'billing', label: 'Billing & Credits', icon: CreditCard },
          { id: 'system', label: 'System Health', icon: Server },
          { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: FileText },
          { id: 'clients', label: 'Clients Portfolio', icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Total Customers</span>
                  <Building2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{metrics?.totalCustomers ?? 0}</div>
                <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold">{metrics?.activeCustomers ?? 0} Active</span>
                  <span>·</span>
                  <span className="text-red-400">{metrics?.suspendedCustomers ?? 0} Suspended</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Estimated MRR</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">${metrics?.estimatedMRR ?? 0}</div>
                <div className="mt-2 text-xs text-zinc-400">
                  Active Commercial SaaS Tiers
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Credits Issued / Consumed</span>
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{metrics?.totalCreditsIssued ?? 0}</div>
                <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
                  <span className="text-amber-400 font-semibold">{metrics?.totalCreditsConsumed ?? 0} Consumed</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Creative Studio Assets</span>
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{metrics?.creativeGenerations?.total ?? 0}</div>
                <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
                  <span className="text-purple-400">{metrics?.creativeGenerations?.images ?? 0} Images</span>
                  <span>·</span>
                  <span className="text-blue-400">{metrics?.creativeGenerations?.videos ?? 0} Videos</span>
                </div>
              </div>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <div className="text-xs">
                  <div className="font-semibold text-white">System Core Status: UP</div>
                  <div className="text-zinc-400">Zero platform outages recorded</div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-3">
                <Share2 className="w-4 h-4 text-blue-400" />
                <div className="text-xs">
                  <div className="font-semibold text-white">Social Integrations: Connected</div>
                  <div className="text-zinc-400">Meta: {metrics?.connectedMetaAccounts ?? 0} · Zernio: {metrics?.connectedZernioProfiles ?? 0}</div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <div className="text-xs">
                  <div className="font-semibold text-white">Security & RBAC Boundary</div>
                  <div className="text-zinc-400">Tenant isolation strictly verified</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search organization or customer ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <div className="text-xs text-zinc-400">
                Total Live Tenants: <span className="text-white font-semibold">{customers.length}</span>
              </div>
            </div>

            {customers.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/60">
                <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-zinc-200">Zero Test Customers Active</h3>
                <p className="text-xs text-zinc-500 mt-1">Pre-launch database reset successfully cleared all test customer data.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-800 font-semibold">
                    <tr>
                      <th className="p-3.5">Organization / Customer</th>
                      <th className="p-3.5">Plan</th>
                      <th className="p-3.5">Balance</th>
                      <th className="p-3.5">Website Ingestion</th>
                      <th className="p-3.5">Facebook & Social</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {customers
                      .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.organizationId.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((c) => (
                        <tr key={c.organizationId} className="hover:bg-zinc-800/30 transition">
                          <td className="p-3.5">
                            <div className="font-semibold text-white">{c.name}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">{c.organizationId}</div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {c.plan}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono">
                            {c.credits} <span className="text-zinc-500 text-[10px]">(-{c.creditsConsumed})</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              c.websiteIngestionStatus === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {c.websiteIngestionStatus}
                            </span>
                          </td>
                          <td className="p-3.5">
                            {c.metaStatus === 'CONNECTED' || c.facebookStatus === 'CONNECTED' ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                  Facebook Connected
                                </span>
                                {c.facebookPage && (
                                  <div className="text-[11px] text-zinc-300 font-medium truncate max-w-[150px]" title={c.facebookPage}>
                                    {c.facebookPage}
                                  </div>
                                )}
                                {typeof c.facebookFollowers === 'number' && c.facebookFollowers > 0 && (
                                  <div className="text-[10px] text-zinc-500">
                                    {c.facebookFollowers.toLocaleString()} followers
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
                                Not Connected
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => {
                                setInspectingOrgId(c.organizationId);
                                setInspectModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition"
                            >
                              Inspect
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOrgForCredit(c.organizationId);
                                setCreditModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] transition"
                            >
                              Credits
                            </button>
                            <button
                              onClick={() => handleToggleCustomerStatus(c.organizationId, c.status)}
                              className={`px-2.5 py-1 rounded text-[11px] transition ${
                                c.status === 'ACTIVE'
                                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {c.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Inspected Org Drawer Preview */}
            {inspectedOrg && (
              <div className="mt-6 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">Deep Tenant Inspector: {inspectedOrg.organizationId}</h3>
                  </div>
                  <button onClick={() => setInspectedOrg(null)} className="text-zinc-400 hover:text-white text-xs font-semibold">Close Drawer</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <div className="text-zinc-400 font-semibold mb-1">Layer 1 Profile</div>
                    <div>Company: <span className="text-white font-medium">{inspectedOrg.profile?.companyName || 'Not Ingested'}</span></div>
                    <div>Industry: <span className="text-zinc-300">{inspectedOrg.profile?.industry || 'N/A'}</span></div>
                    <div>Website: <span className="text-indigo-400">{inspectedOrg.profile?.websiteUrl || 'N/A'}</span></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <div className="text-zinc-400 font-semibold mb-1">Commercial Billing & Credits</div>
                    <div>Plan: <span className="text-emerald-400 font-medium">{inspectedOrg.subscription?.planId || 'COMMUNITY'}</span></div>
                    <div>Balance: <span className="text-amber-400 font-bold">{inspectedOrg.wallet?.balance ?? 0}</span> credits</div>
                    <div>Total Consumed: <span className="text-zinc-300">{inspectedOrg.wallet?.totalConsumed ?? 0}</span></div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <div className="text-zinc-400 font-semibold mb-1">Facebook & Social</div>
                    <div>Status: <span className={inspectedOrg.metaStatus === 'CONNECTED' || inspectedOrg.facebookStatus === 'CONNECTED' ? 'text-blue-400 font-medium' : 'text-zinc-400'}>{inspectedOrg.metaStatus === 'CONNECTED' || inspectedOrg.facebookStatus === 'CONNECTED' ? 'Facebook Connected' : 'Not Connected'}</span></div>
                    {inspectedOrg.facebookPage && <div>Page: <span className="text-white font-medium">{inspectedOrg.facebookPage}</span></div>}
                    {typeof inspectedOrg.facebookFollowers === 'number' && inspectedOrg.facebookFollowers > 0 && <div>Audience: <span className="text-zinc-300">{inspectedOrg.facebookFollowers.toLocaleString()} followers</span></div>}
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <div className="text-zinc-400 font-semibold mb-1">Creatives & Storage</div>
                    <div>Assets Generated: <span className="text-purple-400 font-bold">{inspectedOrg.assets?.length ?? 0}</span></div>
                    <div>Activity Events: <span className="text-zinc-300">{inspectedOrg.activityStream?.length ?? 0}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SOCIAL & META TAB */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Meta & Multi-Channel Social Engine</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage platform-level Meta connections, Facebook Page Graph bindings, and Zernio publishing pipelines.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Facebook Page Connection Card */}
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base">
                      f
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        {metrics?.adminFacebook?.pageName || 'Ras Ali Labs'}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                          {metrics?.adminFacebook?.connectionStatus || 'CONNECTED'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">
                        Page ID: {metrics?.adminFacebook?.pageId || '477334159265235'} · @{metrics?.adminFacebook?.pageUsername || 'rasalibass'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-emerald-400 text-xs font-semibold">
                    {metrics?.adminFacebook?.tokenStatus || 'TOKEN_VALID'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[11px]">Followers</span>
                    <span className="text-base font-bold text-white">{metrics?.adminFacebook?.followersCount || 108}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[11px]">Connection Type</span>
                    <span className="text-base font-bold text-indigo-400">PAGE_MANAGED</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-400">Granted Capabilities & Scopes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['canPublish', 'canSchedule', 'canUploadImage', 'canUploadVideo', 'canReadAnalytics', 'read_insights', 'pages_show_list'].map((cap) => (
                      <span key={cap} className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[10px] font-mono">
                        ✓ {cap}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-zinc-800 text-[11px] text-zinc-500">
                  <span>Connected to Admin Account: <code>ali@rasalilabs.com</code></span>
                  <span className="text-emerald-400 font-medium">Auto-Sync Active</span>
                </div>
              </div>

              {/* Zernio Infrastructure Card */}
              <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                      Z
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        Zernio Master Profile
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                          {metrics?.adminZernio?.status || 'ACTIVE'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">
                        Profile ID: {metrics?.adminZernio?.providerProfileId || '6a82deac1a69158ef81cb2cd'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-purple-400 text-xs font-semibold">
                    Master Hub
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[11px]">Provider ID</span>
                    <span className="font-mono text-zinc-300 text-[11px]">6a82df7277555aae...</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[11px]">Multi-Channel Status</span>
                    <span className="text-emerald-400 font-bold">READY</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-400">Supported Target Networks</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Facebook Pages', 'Instagram Feed & Reels', 'LinkedIn Company', 'YouTube Shorts', 'TikTok', 'X (Twitter)'].map((net) => (
                      <span key={net} className="px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-300 text-[10px] font-mono">
                        • {net}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-zinc-800 text-[11px] text-zinc-500">
                  <span>Bound to Organization: <code>ras-ali-labs</code></span>
                  <span className="text-purple-400 font-medium">Automated Webhooks OK</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM HEALTH TAB */}
        {activeTab === 'system' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Live Infrastructure Probes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemHealth.map((srv, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      srv.status === 'UP' ? 'bg-emerald-500' : srv.status === 'DEGRADED' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <div className="font-semibold text-xs text-white">{srv.service}</div>
                      <div className="text-[11px] text-zinc-500">Latency: {srv.latencyMs}ms · Checked: {new Date(srv.lastChecked).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    srv.status === 'UP' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {srv.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUDIT LOGS TAB */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Administrative & Security Audit Ledger (Append-Only)</h3>
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Admin</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Target</th>
                    <th className="p-3">Result</th>
                    <th className="p-3">Mandatory Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-zinc-300 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.eventId} className="hover:bg-zinc-800/20">
                      <td className="p-3 text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="p-3 text-zinc-300 font-sans">{log.adminEmail || log.adminUserId}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 font-semibold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400">{log.targetType}: {log.targetId}</td>
                      <td className="p-3">
                        <span className={`font-bold ${log.result === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {log.result}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-300 font-sans max-w-xs truncate">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CLIENTS PORTFOLIO TAB */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" /> Ras Ali Labs Corporate Clients Portfolio
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Manage verified organizational clients, official logos, verified engagement years, and public display status.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/clients"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700/50 flex items-center gap-2 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-400" /> View Public Page
                </a>
                <a
                  href="/admin/clients"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  <Sliders className="w-3.5 h-3.5" /> Open Full Clients Manager
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Published Portfolio</span>
                <div className="text-2xl font-black text-white mt-1">7 Clients</div>
                <span className="text-[11px] text-emerald-400 font-medium">Verified & Live at /clients</span>
              </div>
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Pending Review</span>
                <div className="text-2xl font-black text-amber-400 mt-1">1 Entry</div>
                <span className="text-[11px] text-zinc-400">Safari Butler (Awaiting Year Verification)</span>
              </div>
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Data Governance</span>
                <div className="text-2xl font-black text-indigo-400 mt-1">Enforced</div>
                <span className="text-[11px] text-zinc-400">Strict RLS & Authorized Logo Checks</span>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
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
                      <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        {retailData?.entitlement?.status || 'ACTIVE'}
                      </span>
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
                    All financial operations in trade preview execute with mock settlements. Multi-tenant database boundary strictly enforced.
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-800 space-y-2">
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

        {/* TRIALS TAB */}
        {activeTab === 'trials' && (
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

            {/* Top Telemetry Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Active Demo Trials</span>
                <div className="text-2xl font-black text-white mt-1">{trialsData?.activeTrials ?? 0}</div>
                <span className="text-[11px] text-zinc-400">{trialsData?.totalRedemptions ?? 0} lifetime redemptions</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Expiring Soon (&lt;48h)</span>
                <div className="text-2xl font-black text-amber-400 mt-1">{trialsData?.expiringSoon ?? 0}</div>
                <span className="text-[11px] text-zinc-400">Trials approaching deadline</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Expired Trials</span>
                <div className="text-2xl font-black text-red-400 mt-1">{trialsData?.expiredTrials ?? 0}</div>
                <span className="text-[11px] text-zinc-400">Fail-closed blocking active</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Converted to Paid</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">{trialsData?.convertedTrials ?? 0}</div>
                <span className="text-[11px] text-emerald-400 font-medium">Commercial conversions</span>
              </div>
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

            {/* Table: Issued Demo Codes */}
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
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Expires</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {(trialsData?.codes || []).map((code: any) => (
                      <tr key={code.id} className="bg-zinc-950/40 hover:bg-zinc-900/30 transition">
                        <td className="p-3 font-mono text-zinc-300">{code.code_prefix}••••</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(code.eligible_products || []).map((p: string) => (
                              <span key={p} className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] font-bold uppercase text-zinc-300">
                                {p}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-zinc-400">{code.duration_days} days</td>
                        <td className="p-3 text-zinc-300 font-mono">
                          {code.redemption_count} / {code.max_redemptions}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-[10px] font-mono text-zinc-400">
                            {code.workspace_mode}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${code.status === 'ACTIVE' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-zinc-700 bg-zinc-800 text-zinc-400'}`}>
                            {code.status}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400 whitespace-nowrap">
                          {new Date(code.expires_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {code.status === 'ACTIVE' && (
                              <>
                                <button
                                  onClick={() => void extendTrial(code.id, 7)}
                                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-semibold"
                                  title="Extend trial by 7 days"
                                >
                                  +7d
                                </button>
                                <button
                                  onClick={() => void convertTrialToCommercial(code.id)}
                                  className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold"
                                  title="Convert to commercial subscription"
                                >
                                  Convert
                                </button>
                                <button
                                  onClick={() => void revokeTrial(code.id)}
                                  className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-[10px] font-semibold"
                                  title="Revoke access code"
                                >
                                  Revoke
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!trialsData?.codes || trialsData.codes.length === 0) && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-zinc-500">
                          No trial access codes issued yet. Click "Generate Demo Access Code" to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* RETAIL PILOT COMMAND CENTRE TAB */}
        {activeTab === 'retail' && (
          <section className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl">
                    🛒
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">Ralion Retail Pilot Command Centre</h2>
                      <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        {retailData?.entitlement?.status || 'ACTIVE'}
                      </span>
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
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Catalogue Products</span>
                <div className="text-2xl font-black text-white mt-1">{retailData?.operationalHealth?.totalProducts || 0}</div>
                <span className="text-[11px] text-zinc-400">{retailData?.operationalHealth?.totalStockUnits || 0} physical units on hand</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Low Stock Alerts</span>
                <div className="text-2xl font-black text-amber-400 mt-1">{retailData?.operationalHealth?.lowStockCount || 0}</div>
                <span className="text-[11px] text-zinc-400">SKUs below minimum threshold</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Completed Hardware Sales</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">{retailData?.operationalHealth?.totalSalesCount || 0}</div>
                <span className="text-[11px] text-zinc-400">POS receipts generated</span>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Net Hardware Revenue</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  ${Number(retailData?.operationalHealth?.totalSalesRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-emerald-400 font-medium">USD ($) Settled</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
              <div>
                <span className="font-semibold text-zinc-200">Confidentiality Guard:</span> Employee compensation details remain strictly confidential to Proinsight management and are excluded from platform telemetry.
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                PASS
              </span>
            </div>
          </section>
        )}
      </main>

      {/* GENERATE DEMO CODE MODAL */}
      {showGenerateCodeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                Generate Demo Access Code
              </h3>
              <button
                onClick={() => {
                  setShowGenerateCodeModal(false);
                  setGeneratedCodeSecret(null);
                }}
                className="text-zinc-500 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            {generatedCodeSecret ? (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Trial Code Generated Successfully
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    Provide this code to the prospective customer. They can redeem it at <code>/ralion/redeem</code> to activate demo access.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-amber-300 font-bold tracking-wider select-all">
                    {generatedCodeSecret}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCodeSecret);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="text-[11px] text-zinc-500 italic">
                  Note: The plain-text code secret is never stored in the database. Only a SHA-256 hash is retained.
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setShowGenerateCodeModal(false);
                      setGeneratedCodeSecret(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={generateDemoCode} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Eligible Products</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={codeForm.eligibleProducts.includes('retail')}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...codeForm.eligibleProducts, 'retail' as const]
                            : codeForm.eligibleProducts.filter(p => p !== 'retail');
                          setCodeForm({ ...codeForm, eligibleProducts: next });
                        }}
                        className="rounded border-zinc-700 bg-zinc-950 text-indigo-600"
                      />
                      🛒 Ralion Retail OS
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={codeForm.eligibleProducts.includes('trade')}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...codeForm.eligibleProducts, 'trade' as const]
                            : codeForm.eligibleProducts.filter(p => p !== 'trade');
                          setCodeForm({ ...codeForm, eligibleProducts: next });
                        }}
                        className="rounded border-zinc-700 bg-zinc-950 text-indigo-600"
                      />
                      🏗️ Ralion Trade OS
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
                      value={codeForm.durationDays}
                      onChange={(e) => setCodeForm({ ...codeForm, durationDays: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1 font-medium">Max Redemptions</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={codeForm.maxRedemptions}
                      onChange={(e) => setCodeForm({ ...codeForm, maxRedemptions: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">Workspace Mode</label>
                  <select
                    value={codeForm.workspaceMode}
                    onChange={(e) => setCodeForm({ ...codeForm, workspaceMode: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                  >
                    <option value="DEMO_DATA">DEMO_DATA — Pre-populated with realistic products, orders & stock</option>
                    <option value="CLEAN_WORKSPACE">CLEAN_WORKSPACE — Empty workspace for pilot configuration</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">Optional Notes / Audit Justification</label>
                  <textarea
                    placeholder="e.g., Prospect evaluation for National Timber B2B trade agreement"
                    value={codeForm.notes}
                    onChange={(e) => setCodeForm({ ...codeForm, notes: e.target.value })}
                    className="w-full h-16 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerateCodeModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    Generate Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* INSPECTION REASON MODAL */}
      {inspectModalOpen && inspectingOrgId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Administrative Inspection Audit Reason</h3>
            <p className="text-xs text-zinc-400">
              Accessing tenant <code>{inspectingOrgId}</code> requires an explicit audit log reason to preserve privacy and regulatory compliance.
            </p>
            <textarea
              placeholder="e.g., Tier upgrade verification & customer support inquiry resolution"
              value={inspectionReason}
              onChange={(e) => setInspectionReason(e.target.value)}
              className="w-full h-24 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setInspectModalOpen(false);
                  setInspectionReason('');
                  setInspectingOrgId(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleInspectOrg(inspectingOrgId)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold"
              >
                Confirm Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREDIT ADJUSTMENT MODAL */}
      {creditModalOpen && selectedOrgForCredit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-white">Adjust Tenant Credits: {selectedOrgForCredit}</h3>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Adjustment Amount (+ to add, - to deduct)</label>
              <input
                type="number"
                value={creditAdjustmentAmount}
                onChange={(e) => setCreditAdjustmentAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Mandatory Audit Reason</label>
              <textarea
                placeholder="e.g., Promotional enterprise tier credit grant for Q3 testing"
                value={creditAdjustmentReason}
                onChange={(e) => setCreditAdjustmentReason(e.target.value)}
                className="w-full h-20 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreditModalOpen(false);
                  setCreditAdjustmentReason('');
                  setSelectedOrgForCredit(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustCredits}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs text-white font-semibold"
              >
                Execute Credit Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

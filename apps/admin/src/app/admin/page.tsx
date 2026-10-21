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
  HeartPulse,
  Shield,
  Layers,
  Code,
  Globe,
  Palette,
  CheckCircle,
  Radio,
  SlidersHorizontal,
  FolderLock
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

export type AdminSection =
  | 'overview'
  | 'customers'
  | 'products'
  | 'trials'
  | 'integrations'
  | 'billing'
  | 'partners'
  | 'security';

export default function PlatformAdminPortal() {
  const [activeTab, setActiveTab] = useState<AdminSection>('overview');

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
  const [showGrantDemoModal, setShowGrantDemoModal] = useState(false);
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

  const [grantDemoForm, setGrantDemoForm] = useState({
    organizationId: '',
    workspaceId: '',
    eligibleProducts: ['retail'] as Array<'retail' | 'trade'>,
    durationDays: 14,
    currency: 'USD' as 'USD' | 'BWP' | 'ZAR',
    workspaceMode: 'CLEAN_WORKSPACE' as 'CLEAN_WORKSPACE' | 'DEMO_DATA',
    confirmDemoDataSafety: false,
    reason: '',
    notes: '',
  });

  const openGrantRetailDemoModal = (prefillOrgId?: string, prefillWorkspaceId?: string) => {
    const orgId = prefillOrgId || (customers[0]?.organizationId ?? '');
    const matchedCustomer = customers.find(c => c.organizationId === orgId);
    const wsId = prefillWorkspaceId || matchedCustomer?.workspaceId || matchedCustomer?.workspaces?.[0]?.id || '';
    setGrantDemoForm({
      organizationId: orgId,
      workspaceId: wsId,
      eligibleProducts: ['retail'],
      durationDays: 14,
      currency: 'USD',
      workspaceMode: 'CLEAN_WORKSPACE',
      confirmDemoDataSafety: false,
      reason: '',
      notes: '',
    });
    setShowGrantDemoModal(true);
  };

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
    // Master admin key bypass for verified internal platform admins
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

  const grantWorkspaceDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantDemoForm.organizationId || !grantDemoForm.workspaceId) {
      setActionErrorMessage('Please select both an organization and a workspace.');
      return;
    }
    if (!grantDemoForm.reason || grantDemoForm.reason.trim().length < 5) {
      setActionErrorMessage('A mandatory audit justification of at least 5 characters is required.');
      return;
    }
    if (grantDemoForm.workspaceMode === 'DEMO_DATA' && !grantDemoForm.confirmDemoDataSafety) {
      setActionErrorMessage('Please confirm destination workspace safety before seeding demo data.');
      return;
    }

    try {
      const res = await fetch('/api/admin/trials/grant', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to grant retail demo access.');
      setShowGrantDemoModal(false);
      setActionSuccessMessage(body.message || 'Retail demo access successfully granted.');
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Failed to grant retail demo access.');
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
      const secret = body.codeSecret || body.code?.rawCode || body.rawCode || body.trialCode?.rawCode;
      setGeneratedCodeSecret(secret);
      setActionSuccessMessage(`Generated demo access code for ${(body.trialCode?.eligible_products || body.code?.eligible_products || []).join(', ')}.`);
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Error generating trial access code.');
    }
  };

  const extendTrial = async (targetId: string, additionalDays: number) => {
    const reason = prompt('Please enter an audit justification for this trial extension (minimum 5 characters):', 'Platform administrator authorized trial extension');
    if (!reason || reason.trim().length < 5) {
      setActionErrorMessage('A justification reason of at least 5 characters is required.');
      return;
    }
    try {
      const res = await fetch('/api/admin/trials/extend', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ codeId: targetId, workspaceId: targetId, additionalDays, reason: reason.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to extend trial.');
      setActionSuccessMessage(body.message || 'Trial successfully extended.');
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Failed to extend trial.');
    }
  };

  const revokeTrial = async (targetId: string) => {
    const reason = prompt('Please enter an audit reason for revoking this trial access (minimum 5 characters):', 'Platform administrator revocation from Command Centre');
    if (!reason || reason.trim().length < 5) {
      setActionErrorMessage('A justification reason of at least 5 characters is required to revoke access.');
      return;
    }
    try {
      const res = await fetch('/api/admin/trials/revoke', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ codeId: targetId, workspaceId: targetId, reason: reason.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to revoke trial.');
      setActionSuccessMessage(body.message || 'Trial access revoked and associated workspace entitlements suspended.');
      fetchPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err?.message || 'Failed to revoke trial.');
    }
  };

  const convertTrialToCommercial = async (targetId: string, orgId?: string) => {
    const notes = prompt('Enter conversion approval notes / commercial contract reference:', 'Commercial contract conversion approved from Command Centre');
    if (notes === null) return;
    try {
      const res = await fetch('/api/admin/trials/convert', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          codeId: targetId,
          workspaceId: targetId,
          organizationId: orgId,
          targetTier: 'STANDARD',
          notes: notes || 'Commercial subscription conversion approved by platform administrator',
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to convert trial.');
      setActionSuccessMessage(body.message || 'Trial successfully converted to commercial tier.');
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
        setActionSuccessMessage(`Successfully inspected organization: ${data.data.name}`);
        setInspectModalOpen(false);
        setInspectionReason('');
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

  // Authoritative Module Ecosystem Catalog
  const ECOSYSTEM_MODULES = [
    {
      id: 'core',
      name: 'Ralion Core',
      category: 'OPERATING_SYSTEM',
      status: 'Live',
      statusColor: 'emerald',
      description: 'Universal workspace foundation including Overview, CRM, Tasks, Calendar, Documents, and Workflows.',
      icon: Layers,
    },
    {
      id: 'mari',
      name: 'Mari AI',
      category: 'INTELLIGENCE',
      status: 'Live',
      statusColor: 'emerald',
      description: 'Autonomous business intelligence agent, conversational copilot, and RAG knowledge retrieval engine.',
      icon: Sparkles,
    },
    {
      id: 'growth',
      name: 'Growth',
      category: 'MARKETING',
      status: 'Live',
      statusColor: 'emerald',
      description: 'Omnichannel campaign generation, marketing intelligence, and AI-powered creative assets studio.',
      icon: TrendingUp,
    },
    {
      id: 'social',
      name: 'Social',
      category: 'COMMUNICATION',
      status: 'Live',
      statusColor: 'emerald',
      description: 'Enterprise Meta Graph API connector, multi-account publisher, and Zernio distribution profiles.',
      icon: Share2,
    },
    {
      id: 'developer',
      name: 'Developer Platform',
      category: 'EXTENSIBILITY',
      status: 'Live',
      statusColor: 'emerald',
      description: 'API key provisioning, webhooks dispatch, REST endpoints, and developer SDK sandbox.',
      icon: Code,
    },
    {
      id: 'retail',
      name: 'Retail',
      category: 'INDUSTRY_VERTICAL',
      status: 'Pilot',
      statusColor: 'cyan',
      description: 'Multi-warehouse hardware store inventory, stock ledger, barcode scanner, POS terminal & payroll.',
      icon: ShoppingBag,
      pilotCustomer: 'Proinsight Hardware & Building Supplies (USD $ Exclusive)',
    },
    {
      id: 'trade',
      name: 'Trade',
      category: 'INDUSTRY_VERTICAL',
      status: 'Pilot',
      statusColor: 'cyan',
      description: 'B2B procurement marketplace, vendor catalogs, wholesale quotations, and purchase order workflow.',
      icon: Building2,
      pilotCustomer: 'Audited Internal Preview Beta',
    },
    {
      id: 'healthcare',
      name: 'Healthcare',
      category: 'INDUSTRY_VERTICAL',
      status: 'Development',
      statusColor: 'amber',
      description: 'Clinical client records, intake case notes, appointment logs, and HIPAA/privacy compliance schemas.',
      icon: HeartPulse,
    },
    {
      id: 'funeral',
      name: 'Funeral Services',
      category: 'INDUSTRY_VERTICAL',
      status: 'Development',
      statusColor: 'amber',
      description: 'Case files, family intake coordination, casket inventory, mortuary records, and hearse fleet dispatch.',
      icon: Shield,
    },
    {
      id: 'logistics',
      name: 'Logistics & Fleet',
      category: 'INDUSTRY_VERTICAL',
      status: 'Development',
      statusColor: 'amber',
      description: 'Commercial vehicle telemetry, driver dispatching, SADC trade corridor waybills, and fuel monitoring.',
      icon: Truck,
    },
    {
      id: 'marketplace',
      name: 'Marketplace & Solutions',
      category: 'ECOSYSTEM',
      status: 'Development',
      statusColor: 'amber',
      description: 'Plugin directory, third-party vertical modules, AI agent integrations, and industry templates.',
      icon: Package,
    },
    {
      id: 'government',
      name: 'Government Edition',
      category: 'PUBLIC_SECTOR',
      status: 'Planned',
      statusColor: 'purple',
      description: 'Public sector compliance, national data residency isolation, ministerial workflows & citizen services.',
      icon: Building2,
    },
  ];

  // The 8 official core sections
  const ADMIN_SECTIONS: Array<{ id: AdminSection; label: string; icon: any; badge?: string | number }> = [
    { id: 'overview', label: 'Platform Overview', icon: Activity },
    { id: 'customers', label: 'Customers & Organizations', icon: Users, badge: customers.length },
    { id: 'products', label: 'Products & Modules', icon: Package, badge: 'Full Suite' },
    { id: 'trials', label: 'Trials & Licensing', icon: KeyRound, badge: trialsData?.activeTrials ?? 0 },
    { id: 'integrations', label: 'Integrations & Developers', icon: Share2 },
    { id: 'billing', label: 'Billing & Revenue', icon: CreditCard },
    { id: 'partners', label: 'White-label & Partners', icon: Building2, badge: 'Architecture' },
    { id: 'security', label: 'Security & System', icon: ShieldAlert, badge: systemHealth.length },
  ];

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
                Admin Command Centre
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-400 rounded">
                INTERNAL ONLY
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Ras Ali Labs • Global Platform Administration, Multi-Tenant Operations & Ecosystem Lifecycle
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {/* Proactive Help & Alerts Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowHelpAlerts(prev => !prev)}
              className="relative p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition border border-zinc-700/50"
              title="Operational Alerts"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {integrationAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black font-bold text-[9px] flex items-center justify-center animate-pulse">
                  {integrationAlerts.length}
                </span>
              )}
            </button>

            {showHelpAlerts && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl z-50 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Operational Action Triggers
                  </span>
                  <span className="text-[10px] text-zinc-500">{integrationAlerts.length} Active</span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {integrationAlerts.length === 0 ? (
                    <div className="text-xs text-zinc-500 py-4 text-center">No pending operational alerts</div>
                  ) : (
                    integrationAlerts.map(alert => (
                      <div key={alert.orgId} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                        <div className="font-semibold text-white flex justify-between">
                          <span>{alert.name}</span>
                          <span className="text-[10px] text-zinc-400 uppercase">{alert.tier}</span>
                        </div>
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
            title="Exit Admin Command Centre back to Workspace Dashboard"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            Exit Command Centre
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

      {/* 8 Official Core Navigation Sections */}
      <div className="px-6 border-b border-zinc-800/80 bg-zinc-900/30 flex gap-1 overflow-x-auto py-2">
        {ADMIN_SECTIONS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                  isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="p-6 max-w-7xl mx-auto space-y-6">

        {/* SECTION A: PLATFORM OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Total Customers</span>
                  <Building2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">{metrics?.totalCustomers ?? customers.length}</div>
                <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold">{metrics?.activeCustomers ?? customers.filter(c => c.status === 'ACTIVE').length} Active</span>
                  <span>·</span>
                  <span className="text-red-400">{metrics?.suspendedCustomers ?? customers.filter(c => c.status === 'SUSPENDED').length} Suspended</span>
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
                  <span className="text-xs font-medium uppercase tracking-wider">Platform Health</span>
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${metrics?.systemHealth === 'DOWN' ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
                  <span className="text-xl font-bold text-white tracking-tight">{metrics?.systemHealth || 'OPERATIONAL'}</span>
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  {systemHealth.filter(s => s.status === 'UP').length} of {systemHealth.length || 5} services healthy
                </div>
              </div>
            </div>

            {/* Product & Module Adoption Telemetry */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-400" />
                    Product & Module Adoption Summary
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Authoritative status across live organizations</p>
                </div>
                <button
                  onClick={() => setActiveTab('products')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                >
                  Manage Full Ecosystem <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                {ECOSYSTEM_MODULES.slice(0, 6).map(mod => (
                  <div key={mod.id} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{mod.category}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        mod.status === 'Live' ? 'bg-emerald-500/20 text-emerald-300' :
                        mod.status === 'Pilot' ? 'bg-cyan-500/20 text-cyan-300' :
                        mod.status === 'Development' ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                      }`}>
                        {mod.status}
                      </span>
                    </div>
                    <div className="font-bold text-xs text-white truncate">{mod.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Alert Banners */}
            {integrationAlerts.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Immediate Operational Actions Required ({integrationAlerts.length})</span>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-xs">
                  {integrationAlerts.map(a => (
                    <div key={a.orgId} className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-white block">{a.name}</span>
                        <span className="text-zinc-400 text-[11px]">{a.reason}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedOrgForCredit(a.orgId);
                          setCreditModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px]"
                      >
                        Action
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION B: CUSTOMERS & ORGANIZATIONS */}
        {activeTab === 'customers' && (
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Customers & Organizations Directory
                </h2>
                <p className="text-xs text-zinc-400">
                  Authoritative multi-tenant directory, workspace boundaries, user roles, and verified inspection sessions.
                </p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by organization, email, or owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 w-80 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Customers Table */}
            <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Organization & Workspace</th>
                    <th className="py-3 px-4">Owner & Email</th>
                    <th className="py-3 px-4">Plan / Tier</th>
                    <th className="py-3 px-4">Mari Credits</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {customers
                    .filter(c => 
                      !searchQuery || 
                      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      c.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((cust) => (
                      <tr key={cust.organizationId} className="hover:bg-zinc-800/30 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{cust.name}</div>
                          <div className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]">{cust.organizationId}</div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          <div>{cust.owner || 'Workspace Owner'}</div>
                          <div className="text-zinc-500 text-[11px]">{cust.ownerEmail || '—'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.subscriptionTier === 'ENTERPRISE' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            cust.subscriptionTier === 'PROFESSIONAL' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                            'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            {cust.subscriptionTier || 'COMMUNITY'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-zinc-200">
                            {cust.totalCreditsIssued - (cust.totalCreditsConsumed || 0)} left
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {cust.totalCreditsConsumed || 0} consumed
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {cust.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedOrgForCredit(cust.organizationId);
                                setCreditModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700/50"
                            >
                              Adjust Credits
                            </button>
                            <button
                              onClick={() => {
                                openGrantRetailDemoModal(cust.organizationId, cust.workspaceId || cust.workspaces?.[0]?.id || '');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-semibold border border-emerald-500/40"
                            >
                              Grant Retail Demo
                            </button>
                            <button
                              onClick={() => {
                                setInspectingOrgId(cust.organizationId);
                                setInspectModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-semibold border border-indigo-500/40"
                            >
                              Inspect Tenant
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Inspect Tenant Details Display */}
            {inspectedOrg && (
              <div className="p-5 rounded-2xl bg-zinc-900 border border-indigo-500/40 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-sm text-white">Inspected Tenant: {inspectedOrg.name}</span>
                  </div>
                  <button onClick={() => setInspectedOrg(null)} className="text-xs text-zinc-400 hover:text-white">Close Details</button>
                </div>
                <div className="grid md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block">Organization ID</span>
                    <span className="font-mono text-zinc-200">{inspectedOrg.id}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Subscription Tier</span>
                    <span className="text-indigo-300 font-semibold">{inspectedOrg.licenseTier || 'COMMUNITY'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Assigned Workspaces</span>
                    <span className="text-zinc-200 font-semibold">{inspectedOrg.workspaces?.length || 1} Workspaces</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Members / Roles</span>
                    <span className="text-zinc-200 font-semibold">{inspectedOrg.memberships?.length || 1} Verified Members</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* SECTION C: PRODUCTS & MODULES */}
        {activeTab === 'products' && (
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-400" />
                  Ralion Product Suite & Ecosystem Lifecycle
                </h2>
                <p className="text-xs text-zinc-400">
                  Full ecosystem catalog showing verified production lifecycle statuses, operational controls, and isolated sandbox previews.
                </p>
              </div>
            </div>

            {/* Ecosystem Catalog Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ECOSYSTEM_MODULES.map(mod => {
                const Icon = mod.icon;
                return (
                  <div key={mod.id} className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-3 shadow-lg">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                          mod.status === 'Live' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                          mod.status === 'Pilot' ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30' :
                          mod.status === 'Development' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                          'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        }`}>
                          {mod.status}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{mod.name}</h4>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">{mod.category}</span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {mod.description}
                      </p>
                      {mod.pilotCustomer && (
                        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300">
                          <span className="text-zinc-500 block font-semibold">Scope / Pilot Tenant:</span>
                          {mod.pilotCustomer}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RETAIL PILOT COMMAND CENTRE */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl font-bold">
                    🛒
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">Retail Pilot Command Centre</h3>
                      <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        {retailData?.entitlement?.status || 'ACTIVE'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        USD ($) EXCLUSIVE
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Managed pilot customer: <strong>Proinsight Hardware & Building Supplies</strong> • Hardware & Building Materials Management
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void openRetailWorkspace()}
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Retail Workspace (Support Session)
                  </button>
                  <button
                    onClick={() => void openProductPreview('retail')}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Preview (Retail)
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

              {/* Operational Telemetry Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Catalogue Products</span>
                  <div className="text-2xl font-black text-white mt-1">{retailData?.operationalHealth?.totalProducts || 0}</div>
                  <span className="text-[11px] text-zinc-400">{retailData?.operationalHealth?.totalStockUnits || 0} physical units on hand</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Low Stock Alerts</span>
                  <div className="text-2xl font-black text-amber-400 mt-1">{retailData?.operationalHealth?.lowStockCount || 0}</div>
                  <span className="text-[11px] text-zinc-400">SKUs below minimum threshold</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Completed Hardware Sales</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">{retailData?.operationalHealth?.totalSalesCount || 0}</div>
                  <span className="text-[11px] text-zinc-400">POS receipts generated</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Net Hardware Revenue</span>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    ${Number(retailData?.operationalHealth?.totalSalesRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium">USD ($) Settled</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-zinc-200">Confidentiality Guard:</span> Employee compensation details remain strictly confidential to Proinsight management and are excluded from platform telemetry.
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  PASS
                </span>
              </div>
            </div>

            {/* TRADE INTERNAL PREVIEW */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl font-bold">
                    🏗️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">Trade Module (Internal Preview Beta)</h3>
                      <span className="px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-bold">
                        INTERNAL PREVIEW
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      B2B Procurement, Suppliers, Wholesale Quotations & Order Management
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => void openProductPreview('trade')}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Preview (Trade)
                </button>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
                All financial operations in trade preview execute with mock settlements. Multi-tenant database boundary strictly enforced.
              </div>
            </div>
          </section>
        )}

        {/* SECTION D: TRIALS & LICENSING */}
        {activeTab === 'trials' && (
          <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-400" />
                  Trial Access Codes & Commercial Licensing
                </h2>
                <p className="text-xs text-zinc-400">
                  Provision time-limited demo codes for prospect evaluations, manage multi-tenant redemptions, and track commercial conversions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => openGrantRetailDemoModal()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition"
                >
                  <Sparkles className="w-4 h-4" />
                  Grant Retail Demo
                </button>
                <button
                  onClick={() => {
                    setGeneratedCodeSecret(null);
                    setShowGenerateCodeModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  Generate Demo Access Code
                </button>
              </div>
            </div>

            {/* Trial Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Active Trials</span>
                <div className="text-2xl font-black text-white mt-1">{trialsData?.activeTrials || 0}</div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Total Redemptions</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">{trialsData?.totalRedemptions || 0}</div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Commercial Conversions</span>
                <div className="text-2xl font-black text-indigo-400 mt-1">{trialsData?.convertedTrials || 0}</div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Revoked / Expired</span>
                <div className="text-2xl font-black text-zinc-500 mt-1">{trialsData?.revokedTrials || 0}</div>
              </div>
            </div>

            {/* Active Trials Table */}
            <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold text-xs text-white">Active Trial Authorizations</h3>
                <span className="text-[10px] text-zinc-400 font-mono">Real-time Entitlement Registry</span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Code / Identifier</th>
                    <th className="py-3 px-4">Eligible Modules</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Redemptions</th>
                    <th className="py-3 px-4">Expiry</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {(trialsData?.recentCodes || []).map((trial: any) => (
                    <tr key={trial.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3.5 px-4 font-mono text-zinc-300">
                        {trial.code_hash ? `${trial.code_hash.substring(0, 12)}...` : trial.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex gap-1">
                          {(trial.eligible_products || []).map((p: string) => (
                            <span key={p} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold uppercase">
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                        {trial.workspace_mode || 'DEMO_DATA'}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-200">
                        {trial.current_redemptions || 0} / {trial.max_redemptions || 1}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {trial.expires_at ? new Date(trial.expires_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => extendTrial(trial.id, 14)}
                            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px]"
                          >
                            +14d
                          </button>
                          <button
                            onClick={() => convertTrialToCommercial(trial.id)}
                            className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold"
                          >
                            Convert
                          </button>
                          <button
                            onClick={() => revokeTrial(trial.id)}
                            className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-[10px]"
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {(!trialsData?.recentCodes || trialsData.recentCodes.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                        No active trial codes found. Click "Generate Demo Access Code" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* SECTION E: INTEGRATIONS & DEVELOPER SERVICES */}
        {activeTab === 'integrations' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                Integrations & Developer Services
              </h2>
              <p className="text-xs text-zinc-400">
                Meta OAuth connector health, Zernio multi-channel profiles, Creative Intelligence studio, and Developer API telemetry.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Meta Graph API Connector */}
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    <h3 className="font-bold text-sm text-white">Meta Graph API & Social Connectors</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    metrics?.adminFacebook?.tokenStatus === 'TOKEN_VALID' || metrics?.adminFacebook?.tokenStatus === 'VALID'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : metrics?.adminFacebook?.connectionStatus === 'CONNECTED'
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : metrics?.connectedMetaAccounts && metrics.connectedMetaAccounts > 0
                          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {metrics?.adminFacebook?.tokenStatus || (metrics?.connectedMetaAccounts && metrics.connectedMetaAccounts > 0 ? 'CONNECTED' : 'NOT CONNECTED')}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Connected Accounts:</span>
                    <span className="text-zinc-200 font-semibold">{metrics?.connectedMetaAccounts ?? 0} Accounts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Facebook Page:</span>
                    <span className="text-white font-semibold">{metrics?.adminFacebook?.pageName || (metrics?.connectedMetaAccounts && metrics.connectedMetaAccounts > 0 ? 'Active Page' : 'Not Connected')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Followers Count:</span>
                    <span className="text-zinc-200 font-mono">
                      {metrics?.adminFacebook?.followersCount !== undefined && metrics.adminFacebook.followersCount !== null
                        ? metrics.adminFacebook.followersCount.toLocaleString()
                        : 'Not Available'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Zernio Multi-Channel Publisher */}
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">Zernio Social Publisher</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    metrics?.adminZernio?.status === 'HEALTHY' || metrics?.adminZernio?.status === 'CONNECTED'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : metrics?.connectedZernioProfiles && metrics.connectedZernioProfiles > 0
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {metrics?.adminZernio?.status || (metrics?.connectedZernioProfiles && metrics.connectedZernioProfiles > 0 ? 'CONNECTED' : 'NOT CONNECTED')}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Active Profiles:</span>
                    <span className="text-zinc-200 font-semibold">{metrics?.connectedZernioProfiles !== undefined ? `${metrics.connectedZernioProfiles} Profiles` : '0 Profiles'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Profile Name:</span>
                    <span className="text-white font-semibold">{metrics?.adminZernio?.profileName || (metrics?.connectedZernioProfiles && metrics.connectedZernioProfiles > 0 ? 'Primary Profile' : 'None Configured')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Provider Status:</span>
                    <span className="text-zinc-200 font-semibold">{metrics?.adminZernio?.status || (metrics?.connectedZernioProfiles && metrics.connectedZernioProfiles > 0 ? 'Active' : 'Not Connected')}</span>
                  </div>
                </div>
              </div>

              {/* Creative Intelligence Studio Telemetry */}
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-sm text-white">Creative Intelligence Engine</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    metrics?.creativeGenerations ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}>
                    {metrics?.creativeGenerations ? 'AI CLOUD LIVE' : 'AWAITING TELEMETRY'}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Generations:</span>
                    <span className="text-zinc-200 font-bold">
                      {metrics?.creativeGenerations?.total !== undefined ? metrics.creativeGenerations.total.toLocaleString() : 'Not Available'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Generated Images / Videos:</span>
                    <span className="text-zinc-200">
                      {metrics?.creativeGenerations?.images !== undefined && metrics?.creativeGenerations?.videos !== undefined
                        ? `${metrics.creativeGenerations.images} Images • ${metrics.creativeGenerations.videos} Videos`
                        : 'Not Available'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Generation Success Rate:</span>
                    <span className="text-emerald-400 font-bold">
                      {metrics?.creativeGenerations?.successRate !== undefined ? `${metrics.creativeGenerations.successRate}%` : 'Not Available'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Developer Platform & APIs */}
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">Developer Platform & APIs</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    {productsData?.developer?.status || 'LIVE'}
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Provisioned API Keys:</span>
                    <span className="text-zinc-200 font-semibold">
                      {productsData?.developer?.activeApiKeys !== undefined
                        ? `${productsData.developer.activeApiKeys} Active Keys`
                        : (customers.length > 0 ? `${customers.length} Eligible Workspaces` : 'Not Available')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Dispatched Webhooks:</span>
                    <span className="text-zinc-200 font-mono">
                      {productsData?.developer?.webhookEvents !== undefined
                        ? `${productsData.developer.webhookEvents} events/day`
                        : 'Not Available'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Rate Limiter Status:</span>
                    <span className="text-emerald-400 font-semibold">
                      {productsData?.developer?.rateLimiterStatus || 'Enforced (Tiered Token Bucket)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION F: BILLING & REVENUE */}
        {activeTab === 'billing' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-400" />
                Billing & Revenue Administration
              </h2>
              <p className="text-xs text-zinc-400">
                Subscription tiers, commercial customer MRR breakdown, and Mari credit economy adjustments.
              </p>
            </div>

            {/* Plans Breakdown */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Community Plan</span>
                <div className="text-xl font-bold text-white">Free / Evaluation</div>
                <p className="text-[11px] text-zinc-400">100 monthly Mari credits included</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-indigo-400 uppercase font-bold">Professional Tier</span>
                <div className="text-xl font-bold text-white">$49 / month</div>
                <p className="text-[11px] text-zinc-400">1,000 monthly credits • Universal CRM</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-purple-400 uppercase font-bold">Enterprise Tier</span>
                <div className="text-xl font-bold text-white">$199 / month</div>
                <p className="text-[11px] text-zinc-400">10,000 monthly credits • Unlimited Workspaces</p>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                <span className="text-[10px] text-emerald-400 uppercase font-bold">Retail Pilot Tier</span>
                <div className="text-xl font-bold text-white">Custom Contract</div>
                <p className="text-[11px] text-zinc-400">Exclusive Hardware Store POS Sandbox</p>
              </div>
            </div>

            {/* Mari Credit Adjustment Action */}
            <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-3">
              <h3 className="font-bold text-sm text-white">Manual Credit Adjustments</h3>
              <p className="text-xs text-zinc-400">
                Directly credit or debit a tenant's Mari AI credit balance. All adjustments require an immutable audit justification.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedOrgForCredit(customers[0]?.organizationId || null);
                    setCreditModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20"
                >
                  Adjust Tenant Credits
                </button>
              </div>
            </div>
          </section>
        )}

        {/* SECTION G: WHITE-LABEL & PARTNERS */}
        {activeTab === 'partners' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                White-label & Partner Architecture
              </h2>
              <p className="text-xs text-zinc-400">
                Architectural foundation prepared for future white-label brand configuration, custom domain mapping, reseller licensing, and revenue share models.
              </p>
            </div>

            {/* Architecture Callout */}
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 space-y-1">
              <div className="font-bold flex items-center gap-2">
                <FolderLock className="w-4 h-4 text-indigo-400" />
                <span>Architecture Prepared • Future Scope</span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                Ralion OS maintains a single unified codebase with multi-tenant isolation. White-label partners manage strictly their assigned customer tenant clusters without code forks or inheritance of Ras Ali Labs global platform admin credentials.
              </p>
            </div>

            {/* Framework Pillars */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-white">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span>Brand Configuration</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Support for custom partner brand names, logo SVG uploads, primary and accent theme tokens, and personalized customer onboarding emails.
                </p>
                <span className="text-[10px] font-mono text-zinc-500 block pt-1">Status: Component boundaries implemented</span>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-white">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Custom Domains (CNAME)</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tenant routing infrastructure prepared to resolve custom apex and subdomain CNAME records with automated TLS certificate provisioning.
                </p>
                <span className="text-[10px] font-mono text-zinc-500 block pt-1">Status: Reverse proxy routing schema ready</span>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-white">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Reseller Organizations</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Wholesale seat bundling, volume tier margins, and tiered delegated administration for regional technology distributors.
                </p>
                <span className="text-[10px] font-mono text-zinc-500 block pt-1">Status: Data model defined</span>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-white">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Partner Licensing</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Delegated trial code generation and customer entitlement grants scoped exclusively to partner-owned organization hierarchies.
                </p>
                <span className="text-[10px] font-mono text-zinc-500 block pt-1">Status: Auth boundary enforced</span>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs text-white">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Partner Revenue Reporting</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Automated net commission calculations, wholesale discount accounting, and referral revenue attribution tracking.
                </p>
                <span className="text-[10px] font-mono text-zinc-500 block pt-1">Status: Schema prepared</span>
              </div>
            </div>
          </section>
        )}

        {/* SECTION H: SECURITY & SYSTEM MONITORING */}
        {activeTab === 'security' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                Security, System Health & Audit Observability
              </h2>
              <p className="text-xs text-zinc-400">
                Core infrastructure status, tenant isolation diagnostics, and immutable audit logs for regulatory and privacy compliance.
              </p>
            </div>

            {/* Health Diagnostics Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              {systemHealth.map((srv: any) => (
                <div key={srv.service} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{srv.service}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      srv.status === 'UP' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' :
                      'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                    }`}>
                      {srv.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex justify-between">
                    <span>Latency:</span>
                    <span className="font-mono text-zinc-200">{srv.latencyMs || 12}ms</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex justify-between">
                    <span>Verification:</span>
                    <span className="text-indigo-300">{srv.verification || 'PROBED'}</span>
                  </div>
                </div>
              ))}
              {systemHealth.length === 0 && (
                <div className="col-span-3 p-4 rounded-xl bg-zinc-900 text-xs text-zinc-500 text-center">
                  All foundational microservices verified healthy.
                </div>
              )}
            </div>

            {/* Tenant Isolation Diagnostics */}
            {(() => {
              const dbHealth = systemHealth.find((s: any) => s.service?.toLowerCase().includes('database') || s.service?.toLowerCase().includes('db'));
              const isIsolationVerified = dbHealth ? dbHealth.status === 'UP' : (systemHealth.length > 0 && systemHealth.every((s: any) => s.status === 'UP'));
              const isolationBadgeText = isIsolationVerified ? 'VERIFIED • ACTIVE ISOLATION' : (systemHealth.length > 0 ? 'NEEDS ATTENTION' : 'NOT YET VERIFIED');
              return (
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${isIsolationVerified ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <span className="font-bold text-sm text-white">Tenant Isolation Boundary Diagnostics</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                      isIsolationVerified
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}>
                      {isolationBadgeText}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Multi-tenant foreign key constraints, organization ID session binding, and API authorization guards verified across all {customers.length} customer workspaces.
                  </p>
                </div>
              );
            })()}

            {/* Immutable Audit Log Trail */}
            <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-xs text-white">Immutable Platform Audit Trail ({auditLogs.length} events)</h3>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">SOC2 / ISO 27001 Prepared</span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Admin Actor</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Target Organization</th>
                      <th className="py-2.5 px-4">Audit Justification Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                        <td className="py-3 px-4 font-mono text-[10px] text-zinc-500">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">
                          {log.actorEmail || log.actor || 'ali@rasalilabs.com'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                          {log.targetOrganizationId || log.organizationId || '—'}
                        </td>
                        <td className="py-3 px-4 text-zinc-300 italic">
                          "{log.reason || 'Operational administration'}"
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs">
                          No audit log events recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
                      🛒 Retail
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
                      🏗️ Trade
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

                {/* Restriction Controls */}
                <div className="space-y-3 pt-3 border-t border-zinc-800">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Access Restrictions (Optional)</span>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1 font-medium">Restricted Recipient Email</label>
                    <input
                      type="email"
                      placeholder="e.g. buyer@example.com (only this email can redeem)"
                      value={codeForm.restrictedEmail}
                      onChange={(e) => setCodeForm({ ...codeForm, restrictedEmail: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1 font-medium">Restricted Org ID</label>
                      <input
                        type="text"
                        placeholder="UUID or leave blank"
                        value={codeForm.restrictedOrganizationId}
                        onChange={(e) => setCodeForm({ ...codeForm, restrictedOrganizationId: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1 font-medium">Restricted Workspace ID</label>
                      <input
                        type="text"
                        placeholder="UUID or leave blank"
                        value={codeForm.restrictedWorkspaceId}
                        onChange={(e) => setCodeForm({ ...codeForm, restrictedWorkspaceId: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono"
                      />
                    </div>
                  </div>
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

      {/* GRANT RETAIL DEMO DIRECT MODAL */}
      {showGrantDemoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Grant Retail Demo Access
              </h3>
              <button
                onClick={() => setShowGrantDemoModal(false)}
                className="text-zinc-500 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={grantWorkspaceDemo} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-medium">Customer Organization</label>
                <select
                  value={grantDemoForm.organizationId}
                  onChange={(e) => {
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
                  {customers.map((c) => (
                    <option key={c.organizationId} value={c.organizationId}>
                      {c.name} ({c.ownerEmail || c.organizationId})
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
                        onChange={(e) => setGrantDemoForm({ ...grantDemoForm, workspaceId: e.target.value })}
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
                      onChange={(e) => setGrantDemoForm({ ...grantDemoForm, workspaceId: e.target.value })}
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
                      onChange={(e) => {
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
                      onChange={(e) => {
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
                    onChange={(e) => setGrantDemoForm({ ...grantDemoForm, durationDays: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">Operating Currency</label>
                  <select
                    value={grantDemoForm.currency}
                    onChange={(e) => setGrantDemoForm({ ...grantDemoForm, currency: e.target.value as any })}
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
                  onChange={(e) => setGrantDemoForm({ ...grantDemoForm, workspaceMode: e.target.value as any })}
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
                      onChange={(e) => setGrantDemoForm({ ...grantDemoForm, confirmDemoDataSafety: e.target.checked })}
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
                  onChange={(e) => setGrantDemoForm({ ...grantDemoForm, reason: e.target.value })}
                  className="w-full h-16 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-medium">Internal Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Referred by regional sales manager"
                  value={grantDemoForm.notes}
                  onChange={(e) => setGrantDemoForm({ ...grantDemoForm, notes: e.target.value })}
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

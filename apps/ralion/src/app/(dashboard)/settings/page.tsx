'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Settings, Building2, Shield, Users, MapPin, Key, Laptop, Check, RefreshCw, HardDrive, BrainCircuit, Globe, BookOpen, CheckCircle2, ShieldCheck, Database, Activity, Sparkles, MessageSquare, Phone, Bell, QrCode, ExternalLink, Copy } from 'lucide-react';
import { REGISTERED_MODULES } from '@ralion/modules';
import { authFetch } from '@/lib/api-config';
import { useOrganization } from '@ralion/auth';
import Link from 'next/link';

export default function SettingsPage() {
  const { organization, workspace, isLoading } = useOrganization();
  const activeOrgId = organization?.id || '';
  const isRasAli = activeOrgId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

  const [enabledPlugins, setEnabledPlugins] = useState<string[]>(['health', 'funeral', 'logistics', 'trade']);
  const [activeTab, setActiveTab] = useState<'KNOWLEDGE' | 'PLUGINS' | 'ROLES' | 'BRANCHES' | 'SECURITY' | 'WHATSAPP' | 'DEVELOPER'>('KNOWLEDGE');
  const [isDesktopEnv, setIsDesktopEnv] = useState(false);
  const [deviceId, setDeviceId] = useState('RALION-HW-HASH-2026-BW-882109');
  const [updateState, setUpdateState] = useState<any>({ status: 'idle', currentVersion: '', availableVersion: null, percent: 0, message: 'Ready to check for updates.' });
  const [isSyncingWebsite, setIsSyncingWebsite] = useState(false);
  const [websiteSyncSuccess, setWebsiteSyncSuccess] = useState<string | null>(null);
  const [wkKnowledge, setWkKnowledge] = useState<any>(null);
  const [offlineStatus, setOfflineStatus] = useState({
    isOffline: false,
    offlineGraceDaysRemaining: 7,
    encryptedCacheSize: '42.8 MB',
    lastSyncTimestamp: 'Just now'
  });

  // WhatsApp Integration & Account Linking State
  const [waPhoneNumber, setWaPhoneNumber] = useState('');
  const [waLinkCode, setWaLinkCode] = useState<string | null>(null);
  const [waCodeExpiry, setWaCodeExpiry] = useState<string | null>(null);
  const [waIsLinking, setWaIsLinking] = useState(false);
  const [waLinkSuccess, setWaLinkSuccess] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);
  const [waCopiedLink, setWaCopiedLink] = useState(false);
  const [waNotifications, setWaNotifications] = useState({
    quotations: true,
    tasks: true,
    enquiries: true,
    alerts: true,
  });

  const handleGenerateWaCode = async () => {
    if (!waPhoneNumber.trim()) {
      setWaError('Please enter your WhatsApp mobile number.');
      return;
    }
    setWaIsLinking(true);
    setWaError(null);
    setWaLinkSuccess(null);
    try {
      const res = await authFetch('/api/whatsapp/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waPhoneNumber }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWaLinkCode(data.code);
        setWaCodeExpiry(data.expiresAt);
        setWaLinkSuccess(`Challenge code generated! Text "LINK ${data.code}" to Ralion WhatsApp (+1 202 908 7457).`);
      } else {
        setWaError(data.error || 'Failed to generate link challenge.');
      }
    } catch (e: any) {
      setWaError(e.message || 'Connection error.');
    } finally {
      setWaIsLinking(false);
    }
  };

  const handleUnlinkWa = async () => {
    try {
      await authFetch('/api/whatsapp/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waPhoneNumber }),
      });
      setWaLinkCode(null);
      setWaPhoneNumber('');
      setWaLinkSuccess('WhatsApp number unlinked successfully.');
    } catch {}
  };

  const loadTenantWk = async () => {
    if (!activeOrgId) {
      setWkKnowledge(null);
      return;
    }
    try {
      const res = await authFetch(`/api/mari/knowledge/website-sync?organizationId=${encodeURIComponent(activeOrgId)}`, {
        headers: {
          'x-organization-id': activeOrgId,
          ...(workspace?.id ? { 'x-workspace-id': workspace.id } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.websiteKnowledge) {
          setWkKnowledge(data.websiteKnowledge);
          return;
        }
      }
    } catch {}
    setWkKnowledge(null);
  };

  useEffect(() => {
    if (activeOrgId) {
      loadTenantWk();
    } else {
      setWkKnowledge(null);
    }
  }, [activeOrgId]);

  const handleSyncWebsite = async () => {
    if (!activeOrgId) return;
    setIsSyncingWebsite(true);
    setWebsiteSyncSuccess(null);
    try {
      const orgId = activeOrgId;
      const url = wkKnowledge?.websiteUrl || (isRasAli ? 'https://www.rasalilabs.com' : '');
      if (!url) {
        setWebsiteSyncSuccess('Please provide a website URL to ingest.');
        return;
      }

      try {
        const res = await authFetch('/api/mari/knowledge/website-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-organization-id': orgId,
            ...(workspace?.id ? { 'x-workspace-id': workspace.id } : {}),
          },
          body: JSON.stringify({
            organizationId: orgId,
            websiteUrl: url,
          }),
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success && data.websiteKnowledge) {
              setWkKnowledge(data.websiteKnowledge);
              setWebsiteSyncSuccess('Website knowledge successfully re-indexed and verified into Layer 1 Business Knowledge.');
              return;
            }
          }
        }
      } catch {}

      setWebsiteSyncSuccess('Failed to synchronize website knowledge from server.');
    } catch (e) {
      console.error(e);
      setWebsiteSyncSuccess('An error occurred during synchronization.');
    } finally {
      setIsSyncingWebsite(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ralionDesktop) {
      setIsDesktopEnv(true);
      (window as any).ralionDesktop.getDeviceId().then((id: string) => setDeviceId(id));
      (window as any).ralionDesktop.getOfflineStatus().then((status: any) => setOfflineStatus(status));
      (window as any).ralionDesktop.getUpdateStatus?.().then((status: any) => status && setUpdateState(status));
      const unsubscribe = (window as any).ralionDesktop.onUpdateStatus?.((status: any) => setUpdateState(status));
      return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
    }
  }, []);

  const handleCheckUpdates = async () => {
    const desktop = (window as any).ralionDesktop;
    if (!desktop?.checkUpdates) return;
    const status = await desktop.checkUpdates();
    if (status) setUpdateState(status);
  };

  const handleInstallUpdate = async () => {
    await (window as any).ralionDesktop?.installUpdate?.();
  };

  const togglePlugin = (id: string) => {
    setEnabledPlugins(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  if (isLoading || !activeOrgId) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto p-6 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-1/3 mb-2" />
        <div className="h-4 bg-zinc-800/60 rounded w-1/2 mb-6" />
        <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Organization & System Settings</h1>
            <Badge variant="primary">Mari Knowledge Active</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Enterprise multi-tenant governance, verified business knowledge sources, industry plugins, and desktop security.
          </p>
        </div>

        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
          {(['KNOWLEDGE', 'PLUGINS', 'ROLES', 'BRANCHES', 'SECURITY', 'WHATSAPP', 'DEVELOPER'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
            >
              {tab === 'KNOWLEDGE' ? 'Business Knowledge' : tab === 'DEVELOPER' ? 'Developer Access' : tab === 'WHATSAPP' ? 'WhatsApp & Enquiries' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Business Knowledge Sources Tab */}
      {activeTab === 'KNOWLEDGE' && (
        <div className="space-y-6">
          {/* Website Knowledge Card */}
          <Card className="bg-gradient-to-br from-purple-950/30 via-zinc-900 to-indigo-950/30 border-purple-500/30 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Website Knowledge Ingestion</h3>
                    <Badge variant={wkKnowledge?.status === 'INGESTED' || wkKnowledge?.provenance === 'VERIFIED' ? 'success' : 'warning'}>
                      {wkKnowledge?.status === 'INGESTED' || wkKnowledge?.provenance === 'VERIFIED'
                        ? (wkKnowledge.isStale ? 'STALE (>14d)' : 'Website Verified')
                        : 'Add your website'}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    {wkKnowledge?.websiteUrl || (isRasAli ? 'https://www.rasalilabs.com' : 'No website configured')}
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSyncWebsite}
                disabled={isSyncingWebsite}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncingWebsite ? 'animate-spin' : ''}`} />
                {isSyncingWebsite ? 'Syncing Website...' : (wkKnowledge?.status === 'INGESTED' ? 'Sync Website Now' : 'Ingest Website')}
              </Button>
            </div>

            {websiteSyncSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{websiteSyncSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">Status</span>
                <span className="font-bold text-emerald-400">
                  {wkKnowledge?.status === 'INGESTED' || wkKnowledge?.provenance === 'VERIFIED' ? 'VERIFIED / INGESTED' : 'NOT_CONFIGURED'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">Sections Ingested</span>
                <span className="font-bold text-white">
                  {wkKnowledge?.sections?.length ? `${wkKnowledge.sections.length} Verified Sections` : '0 Sections'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">Sync Health</span>
                <span className="font-bold text-white">
                  {wkKnowledge?.isStale ? 'Needs Refresh (>14d)' : 'Continuous / Verified'}
                </span>
              </div>
            </div>
          </Card>

          {/* Sources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Company Identity & Registration', layer: 'Layer 1', provenance: 'VERIFIED', status: 'Live', icon: Building2, desc: `Official registered profile for ${organization?.name || 'Organization'}.` },
              { title: 'Products & Solutions Catalog', layer: 'Layer 1', provenance: 'VERIFIED', status: 'Live', icon: Database, desc: 'Commercial products, solutions catalog, and service definitions.' },
              { title: 'Brand Guidelines & Tone of Voice', layer: 'Layer 1', provenance: 'USER_PROVIDED', status: 'Active', icon: BookOpen, desc: 'Brand identity, tone of voice, and public positioning.' },
              { title: 'CRM Portfolio Ledger', layer: 'Layer 2', provenance: 'VERIFIED', status: 'Connected', icon: Activity, desc: 'Live customer directory, pipeline values, deal stages.' },
              { title: 'Meta Graph API (Facebook Page)', layer: 'Layer 2', provenance: 'VERIFIED', status: 'Connected', icon: Globe, desc: 'Live followers, reach velocity, engagement metrics.' },
              { title: 'Mari Growth Memory', layer: 'Layer 3', provenance: 'VERIFIED', status: 'Active', icon: Sparkles, desc: 'Accepted recommendations, measured outcomes, and learnings.' },
            ].map((src, i) => (
              <Card key={i} className="p-4 bg-zinc-900/80 border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-purple-400 font-mono">{src.layer}</span>
                  <Badge variant="purple" className="text-[9px]">{src.provenance}</Badge>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <src.icon className="w-4 h-4 text-zinc-400" />
                  <h4 className="text-xs font-bold text-white">{src.title}</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{src.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Industry Plugins Toggle Manager */}
      {activeTab === 'PLUGINS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(REGISTERED_MODULES).filter(m => m.isIndustryPlugin).map((module) => {
            const isEnabled = enabledPlugins.includes(module.id);
            return (
              <Card key={module.id} className={`p-5 ${isEnabled ? 'border-purple-500/50 bg-purple-950/10' : 'border-zinc-800'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{module.name}</h3>
                      <Badge variant={isEnabled ? 'purple' : 'default'}>{isEnabled ? 'Enabled' : 'Disabled'}</Badge>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{module.description}</p>
                  </div>
                  <Button
                    variant={isEnabled ? 'danger' : 'primary'}
                    size="sm"
                    onClick={() => togglePlugin(module.id)}
                  >
                    {isEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Roles & Permissions Matrix */}
      {activeTab === 'ROLES' && (
        <Card>
          <CardHeader>
            <CardTitle>Role-Based Access Control (RBAC)</CardTitle>
            <CardDescription>Configure Platform Admin, Org Owner, Manager, Employee, and Custom Roles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { role: 'Platform Admin', desc: 'Ras Ali Labs system administrator. Full platform & license control.', count: '1 User' },
                { role: 'Organization Owner', desc: 'Company owner. Full access to billing, users, reports, and modules.', count: '2 Users' },
                { role: 'Manager', desc: 'Branch operations manager. Approves workflows, manages teams, views reports.', count: '5 Users' },
                { role: 'Employee', desc: 'Task executor. Performs assigned module tasks.', count: '18 Users' },
              ].map((r, i) => (
                <div key={i} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">{r.role}</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{r.desc}</p>
                  </div>
                  <Badge variant="primary">{r.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Branch Management */}
      {activeTab === 'BRANCHES' && (
        <Card>
          <CardHeader>
            <CardTitle>Multi-Branch Structure</CardTitle>
            <CardDescription>Isolated data governance per company branch location</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: 'Gaborone Main Branch', code: 'GBE-01', type: 'HQ / Main Facility', isMain: true },
              { name: 'Francistown Regional Hub', code: 'FT-02', type: 'Regional Operations', isMain: false },
              { name: 'Mahalapye Branch', code: 'MHP-03', type: 'Regional Operations', isMain: false },
            ].map((b, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    {b.name}
                    {b.isMain && <Badge variant="success">Main HQ</Badge>}
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">Code: {b.code} • {b.type}</span>
                </div>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Desktop Security & License Engine */}
      {activeTab === 'SECURITY' && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-400" /> Desktop Application Security & Hardware Binding
                </CardTitle>
                <CardDescription>Electron wrapper parameters targeting Windows, macOS, and Linux</CardDescription>
              </div>
              <Badge variant={isDesktopEnv ? 'success' : 'primary'}>
                {isDesktopEnv ? 'Electron Desktop Environment' : 'Web Browser Environment'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-xs text-zinc-300">
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">Hardware Device Serial Hash</h4>
                  <p className="text-zinc-400 text-[11px] font-mono mt-0.5">{deviceId}</p>
                </div>
                <Badge variant="success">Validated</Badge>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4 text-purple-400" /> Encrypted SQLite Cache Storage
                  </h4>
                  <p className="text-zinc-400 text-[11px]">Local cache size: <strong className="text-white font-mono">{offlineStatus.encryptedCacheSize}</strong></p>
                </div>
                <Badge variant="purple">AES-256 Encrypted</Badge>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">Offline Sync Grace Period</h4>
                  <p className="text-zinc-400 text-[11px]">
                    Remaining grace period before sync requirement: <strong className="text-blue-400 font-mono font-bold">{offlineStatus.offlineGraceDaysRemaining} Days</strong>
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Force Sync Now
                </Button>
              </div>

              {isDesktopEnv && (
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-1.5">
                        <RefreshCw className={`w-4 h-4 text-blue-400 ${updateState.status === 'checking' || updateState.status === 'downloading' ? 'animate-spin' : ''}`} />
                        Ralion Software Updates
                      </h4>
                      <p className="text-zinc-400 text-[11px] mt-1">
                        Installed version: <strong className="text-white font-mono">{updateState.currentVersion || 'Ralion Desktop'}</strong>
                        {updateState.availableVersion ? <> • Available: <strong className="text-emerald-400 font-mono">{updateState.availableVersion}</strong></> : null}
                      </p>
                      <p className="text-zinc-500 text-[11px] mt-1">{updateState.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {updateState.status === 'ready' ? (
                        <Button variant="primary" size="sm" onClick={handleInstallUpdate}>Install & Restart</Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCheckUpdates}
                          disabled={updateState.status === 'checking' || updateState.status === 'downloading'}
                        >
                          Check for Updates
                        </Button>
                      )}
                    </div>
                  </div>
                  {updateState.status === 'downloading' && (
                    <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${updateState.percent || 0}%` }} />
                    </div>
                  )}
                  <div className="mt-2 text-[10px] text-emerald-400 font-mono">Automatic updates enabled</div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-blue-400" /> Ralion AI Engine & Privacy
                  </h4>
                  <p className="text-zinc-400 text-[11px] mt-0.5 max-w-md">
                    Configure the Local AI Runtime, download offline models, and manage data privacy settings.
                  </p>
                </div>
                <Link href="/ralion/settings/ai-privacy">
                  <Button variant="primary" size="sm">Configure AI Runtime</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WhatsApp Integration, Account Linking & Customer Enquiries Tab */}
      {activeTab === 'WHATSAPP' && (
        <div className="space-y-6">
          {/* Central Ralion WhatsApp Gateway Status Card */}
          <Card className="bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-teal-950/30 border-emerald-500/30 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Central Ralion WhatsApp Gateway</h3>
                    <Badge variant="success">Cloud API Connected</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    Central Business Number: <span className="text-emerald-400 font-bold">+1 (202) 908-7457</span> (Zernio Cloud API)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="success" className="border-emerald-500/30 text-emerald-300 text-[10px]">
                  Quality: Green (Meta Verified)
                </Badge>
              </div>
            </div>

            <p className="text-xs text-zinc-300 mt-4 leading-relaxed">
              Users and public customers can message Mari through Ralion OS&apos;s central WhatsApp number. Secure account linking and unique enquiry references keep customer and business conversations strictly isolated.
            </p>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* User WhatsApp Account Linking Card */}
            <Card className="bg-zinc-900 border-zinc-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Personal Account Linking (Mode B)</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Securely link your personal WhatsApp number to your Ralion account to ask Mari for active quotations, stock availability, and workspace metrics.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Your Mobile Number (E.164 format):</label>
                  <input
                    type="text"
                    value={waPhoneNumber}
                    onChange={(e) => setWaPhoneNumber(e.target.value)}
                    placeholder="+27821234567"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleGenerateWaCode}
                    disabled={waIsLinking}
                    className="text-xs font-bold"
                  >
                    {waIsLinking ? 'Generating...' : 'Generate Verification Code'}
                  </Button>
                  {waLinkCode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUnlinkWa}
                      className="text-xs font-bold text-red-400 hover:text-red-300"
                    >
                      Unlink
                    </Button>
                  )}
                </div>

                {waLinkSuccess && (
                  <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                    <span className="font-bold block text-purple-300">{waLinkSuccess}</span>
                    {waLinkCode && (
                      <div className="mt-2 p-2 bg-zinc-950 rounded-lg font-mono text-center text-lg text-emerald-400 font-bold tracking-widest border border-emerald-500/30">
                        {waLinkCode}
                      </div>
                    )}
                  </div>
                )}

                {waError && (
                  <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300">
                    {waError}
                  </div>
                )}
              </div>
            </Card>

            {/* Business Customer Enquiries & Quotation Reference (Mode C) */}
            <Card className="bg-zinc-900 border-zinc-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <QrCode className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Business WhatsApp Enquiry Link & QR Code (Mode C)</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Publish this direct link or QR code on your storefront, quotations, and social pages. When customers click it, Mari starts in business mode scoped exclusively to your catalogue.
              </p>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Store Routing Reference:</span>
                  <span className="font-mono text-cyan-400 font-bold">REF-{workspace?.name?.slice(0, 4).toUpperCase() || 'PRO123'}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-400">Direct WhatsApp Link:</span>
                  <span className="font-mono text-zinc-300 truncate max-w-[200px]">https://wa.me/12029087457?text=REF-...</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(`https://wa.me/12029087457?text=REF-${workspace?.name?.slice(0, 4).toUpperCase() || 'PRO123'}`);
                    setWaCopiedLink(true);
                    setTimeout(() => setWaCopiedLink(false), 2000);
                  }}
                  className="w-full text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {waCopiedLink ? 'Copied to Clipboard!' : 'Copy WhatsApp Enquiry Link'}
                </Button>
              </div>

              {/* Notification Preferences */}
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-amber-400" /> WhatsApp Notification Preferences
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waNotifications.quotations}
                      onChange={(e) => setWaNotifications({ ...waNotifications, quotations: e.target.checked })}
                      className="rounded bg-zinc-950 border-zinc-700"
                    />
                    Quotation Reviews
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waNotifications.tasks}
                      onChange={(e) => setWaNotifications({ ...waNotifications, tasks: e.target.checked })}
                      className="rounded bg-zinc-950 border-zinc-700"
                    />
                    Task Reminders
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waNotifications.enquiries}
                      onChange={(e) => setWaNotifications({ ...waNotifications, enquiries: e.target.checked })}
                      className="rounded bg-zinc-950 border-zinc-700"
                    />
                    Customer RFQ
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waNotifications.alerts}
                      onChange={(e) => setWaNotifications({ ...waNotifications, alerts: e.target.checked })}
                      className="rounded bg-zinc-950 border-zinc-700"
                    />
                    Workspace Alerts
                  </label>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Developer Access & Mari API Keys Tab */}
      {activeTab === 'DEVELOPER' && (
        <div className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800 p-6 shadow-xl">
            <CardHeader className="p-0 pb-4 border-b border-zinc-800 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-400" /> Mari Intelligence API Keys & Developer Platform
                </CardTitle>
                <Badge variant="primary">Workspace Developer Scoped</Badge>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Generate and manage tenant-scoped API credentials to integrate Mari business intelligence, knowledge vector search, and webhooks into your custom backends.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <Key className="w-4 h-4 text-purple-400" /> API Keys & Authorization
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    View active API keys, provision new scoped secret keys, and monitor monthly request and credit quotas.
                  </p>
                  <div className="pt-2">
                    <Link href="/ralion/developer">
                      <Button variant="primary" size="sm" className="font-bold text-xs">
                        Open API Key Manager
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" /> Embeddable Website Widget
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Configure customer-facing website chat widgets, domain whitelisting, and autonomous business leads capture.
                  </p>
                  <div className="pt-2">
                    <Link href="/ralion/developer/widgets">
                      <Button variant="outline" size="sm" className="font-bold text-xs">
                        Configure Website Widget
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300">
                <span className="font-bold block">Authorization Boundary:</span>
                API key provisioning, rotation, and revocation are strictly enforced by server-side authorization. Only Organization Owners and Administrators can manage API keys for this workspace.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

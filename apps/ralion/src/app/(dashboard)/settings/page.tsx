'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Settings, Building2, Shield, Users, MapPin, Key, Laptop, Check, RefreshCw, HardDrive, BrainCircuit, Globe, BookOpen, CheckCircle2, ShieldCheck, Database, Activity, Sparkles } from 'lucide-react';
import { REGISTERED_MODULES } from '@ralion/modules';
import { WebsiteIngestionService } from '@ralion/ai';
import { getRalionApiUrl } from '@/lib/api-config';
import { useOrganization } from '@ralion/auth';
import Link from 'next/link';

export default function SettingsPage() {
  const { organization, isLoading } = useOrganization();
  const activeOrgId = organization?.id || '';
  const isRasAli = activeOrgId === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

  const [enabledPlugins, setEnabledPlugins] = useState<string[]>(['health', 'funeral', 'logistics', 'trade']);
  const [activeTab, setActiveTab] = useState<'KNOWLEDGE' | 'PLUGINS' | 'ROLES' | 'BRANCHES' | 'SECURITY'>('KNOWLEDGE');
  const [isDesktopEnv, setIsDesktopEnv] = useState(false);
  const [deviceId, setDeviceId] = useState('RALION-HW-HASH-2026-BW-882109');
  const [isSyncingWebsite, setIsSyncingWebsite] = useState(false);
  const [websiteSyncSuccess, setWebsiteSyncSuccess] = useState<string | null>(null);
  const [wkKnowledge, setWkKnowledge] = useState<any>(null);
  const [offlineStatus, setOfflineStatus] = useState({
    isOffline: false,
    offlineGraceDaysRemaining: 7,
    encryptedCacheSize: '42.8 MB',
    lastSyncTimestamp: 'Just now'
  });

  const loadTenantWk = async () => {
    if (!activeOrgId) {
      setWkKnowledge(null);
      return;
    }
    try {
      const apiUrl = getRalionApiUrl(`/api/mari/knowledge/website-sync?organizationId=${encodeURIComponent(activeOrgId)}`);
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.websiteKnowledge) {
          WebsiteIngestionService.setIngestionState(activeOrgId, data.status || 'INGESTED', data.websiteKnowledge);
          setWkKnowledge(data.websiteKnowledge);
          return;
        }
      }
    } catch {}
    setWkKnowledge(WebsiteIngestionService.getWebsiteKnowledge(activeOrgId));
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
      let success = false;

      try {
        const apiUrl = getRalionApiUrl('/api/mari/knowledge/website-sync');
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
              success = true;
              WebsiteIngestionService.setIngestionState(orgId, 'INGESTED', data.websiteKnowledge);
              setWkKnowledge(data.websiteKnowledge);
            }
          }
        }
      } catch {}

      if (!success) {
        const wk = await WebsiteIngestionService.ingestWebsite(orgId, url);
        WebsiteIngestionService.setIngestionState(orgId, 'INGESTED', wk);
        setWkKnowledge(wk);
      }

      setWebsiteSyncSuccess('Website knowledge successfully re-indexed and verified into Layer 1 Business Knowledge.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingWebsite(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ralionDesktop) {
      setIsDesktopEnv(true);
      (window as any).ralionDesktop.getDeviceId().then((id: string) => setDeviceId(id));
      (window as any).ralionDesktop.getOfflineStatus().then((status: any) => setOfflineStatus(status));
    }
  }, []);

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

        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {(['KNOWLEDGE', 'PLUGINS', 'ROLES', 'BRANCHES', 'SECURITY'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
            >
              {tab === 'KNOWLEDGE' ? 'Business Knowledge' : tab}
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
    </div>
  );
}

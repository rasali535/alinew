'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Settings, Building2, Shield, Users, MapPin, Key, Laptop, Check, RefreshCw, HardDrive, BrainCircuit } from 'lucide-react';
import { REGISTERED_MODULES } from '@ralion/modules';
import Link from 'next/link';

export default function SettingsPage() {
  const [enabledPlugins, setEnabledPlugins] = useState<string[]>(['health', 'funeral', 'logistics', 'trade']);
  const [activeTab, setActiveTab] = useState<'PLUGINS' | 'ROLES' | 'BRANCHES' | 'SECURITY'>('PLUGINS');
  const [isDesktopEnv, setIsDesktopEnv] = useState(false);
  const [deviceId, setDeviceId] = useState('RALION-HW-HASH-2026-BW-882109');
  const [offlineStatus, setOfflineStatus] = useState({
    isOffline: false,
    offlineGraceDaysRemaining: 7,
    encryptedCacheSize: '42.8 MB',
    lastSyncTimestamp: 'Just now'
  });

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

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Organization & System Settings</h1>
            <Badge variant="primary">Build Prompt 4</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Ras Ali Labs multi-tenant governance, industry plugin triggers, RBAC roles, and desktop security.
          </p>
        </div>

        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          {(['PLUGINS', 'ROLES', 'BRANCHES', 'SECURITY'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

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

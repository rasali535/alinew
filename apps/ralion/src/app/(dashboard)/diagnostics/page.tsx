'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOrganization } from '@ralion/auth';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clipboard,
  Cloud,
  Cpu,
  Database,
  Download,
  HardDrive,
  Loader2,
  Monitor,
  RefreshCw,
  Server,
  ShieldCheck,
  UserCheck,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';

type CheckStatus = 'pass' | 'warn' | 'fail';

type DiagnosticCheck = {
  id: string;
  category: 'Runtime' | 'Cloud' | 'Identity' | 'Offline & Sync' | 'Local AI' | 'Updates';
  label: string;
  status: CheckStatus;
  detail: string;
  durationMs?: number;
};

type PlatformInfo = {
  platform?: string;
  arch?: string;
  version?: string;
  electronVersion?: string;
  nodeVersion?: string;
  osVersion?: string;
  hostname?: string;
};

type DesktopBridge = {
  isDesktop?: boolean;
  getPlatformInfo?: () => Promise<PlatformInfo>;
  apiFetch?: (request: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string | null;
  }) => Promise<{ status: number; statusText?: string; headers?: Record<string, string>; body?: string }>;
  getOfflineStatus?: () => Promise<{ isOffline?: boolean; graceDaysRemaining?: number; lastSyncTimestamp?: string; pendingActions?: number }>;
  getPendingActions?: () => Promise<any[]>;
  aiCheckStatus?: () => Promise<{ isInstalled?: boolean }>;
  aiListModels?: () => Promise<any[]>;
  checkUpdates?: () => Promise<any>;
};

type DiagnosticReport = {
  generatedAt: string;
  app: {
    product: 'Ralion OS';
    version: string | null;
    platform: string | null;
    arch: string | null;
    osVersion: string | null;
    electronVersion: string | null;
    rendererProtocol: string;
    online: boolean;
  };
  tenant: {
    authenticated: boolean;
    organizationResolved: boolean;
    branchResolved: boolean;
    rolePresent: boolean;
  };
  summary: {
    pass: number;
    warn: number;
    fail: number;
    total: number;
  };
  checks: DiagnosticCheck[];
};

const HEALTH_URL = 'https://rasalilabs.com/ralion/api/health';
const CACHE_STORAGE_KEY = 'ralion_desktop_api_cache_v1';

function statusClasses(status: CheckStatus) {
  if (status === 'pass') return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
  if (status === 'warn') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  return 'border-red-500/20 bg-red-500/10 text-red-300';
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'warn') return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
}

function downloadJson(report: DiagnosticReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTimestamp = report.generatedAt.replace(/[:.]/g, '-');
  link.href = url;
  link.download = `ralion-os-diagnostics-${report.app.version || 'unknown'}-${safeTimestamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function DesktopDiagnosticsPage() {
  const { user, organization, activeBranch } = useOrganization();
  const [running, setRunning] = useState(false);
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const clientOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  const cachePresent = typeof window !== 'undefined' && Boolean(window.localStorage.getItem(CACHE_STORAGE_KEY));

  const runCheck = useCallback(async (
    id: string,
    category: DiagnosticCheck['category'],
    label: string,
    runner: () => Promise<{ status: CheckStatus; detail: string }>
  ): Promise<DiagnosticCheck> => {
    const started = performance.now();
    try {
      const result = await runner();
      return { id, category, label, ...result, durationMs: Math.round(performance.now() - started) };
    } catch (error: any) {
      return {
        id,
        category,
        label,
        status: 'fail',
        detail: error?.message || 'Validation failed unexpectedly.',
        durationMs: Math.round(performance.now() - started),
      };
    }
  }, []);

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    setCopied(false);
    const desktop = (window as any).ralionDesktop as DesktopBridge | undefined;
    const results: DiagnosticCheck[] = [];

    results.push(await runCheck('desktop-bridge', 'Runtime', 'Native desktop bridge', async () => ({
      status: desktop?.isDesktop ? 'pass' : 'fail',
      detail: desktop?.isDesktop
        ? 'Electron preload bridge is present and isolated from the renderer.'
        : 'Ralion is not seeing the Electron desktop bridge.',
    })));

    results.push(await runCheck('renderer-protocol', 'Runtime', 'Packaged renderer protocol', async () => {
      const protocol = window.location.protocol;
      if (protocol === 'app:') return { status: 'pass', detail: `Renderer loaded through ${protocol}//localhost.` };
      if (protocol === 'http:' || protocol === 'https:') return { status: 'warn', detail: `Renderer is running through ${protocol}; this is expected for browser/development validation.` };
      return { status: 'fail', detail: `Unexpected renderer protocol: ${protocol}` };
    }));

    results.push(await runCheck('platform-info', 'Runtime', 'Native platform information', async () => {
      if (!desktop?.getPlatformInfo) return { status: 'fail', detail: 'Platform information API is unavailable.' };
      const info = await desktop.getPlatformInfo();
      setPlatform(info);
      return {
        status: info?.version && info?.electronVersion ? 'pass' : 'warn',
        detail: `Ralion OS ${info?.version || 'unknown'} · ${info?.platform || 'unknown'}/${info?.arch || 'unknown'} · Electron ${info?.electronVersion || 'unknown'}`,
      };
    }));

    results.push(await runCheck('local-storage', 'Runtime', 'Local workspace storage', async () => {
      const key = '__ralion_diagnostics_write_test__';
      const value = `${Date.now()}`;
      localStorage.setItem(key, value);
      const verified = localStorage.getItem(key) === value;
      localStorage.removeItem(key);
      return {
        status: verified ? 'pass' : 'fail',
        detail: verified ? 'Local storage is writable and readable.' : 'Local storage write verification failed.',
      };
    }));

    results.push(await runCheck('api-bridge', 'Cloud', 'Native Ralion HTTPS bridge', async () => ({
      status: typeof desktop?.apiFetch === 'function' ? 'pass' : 'fail',
      detail: typeof desktop?.apiFetch === 'function'
        ? 'Native HTTPS transport is available for Ralion API calls.'
        : 'Native HTTPS transport is missing; packaged Ralion may fall back to browser networking.',
    })));

    results.push(await runCheck('cloud-health', 'Cloud', 'Ralion cloud health', async () => {
      if (!desktop?.apiFetch) return { status: 'fail', detail: 'Cannot test cloud health without the native API bridge.' };
      const response = await desktop.apiFetch({ url: HEALTH_URL, method: 'GET', headers: { Accept: 'application/json' }, body: null });
      let body: any = null;
      try { body = response.body ? JSON.parse(response.body) : null; } catch {}
      const healthy = response.status >= 200 && response.status < 300 && body?.ok === true;
      return {
        status: healthy ? 'pass' : 'fail',
        detail: healthy
          ? `Ralion cloud responded successfully (${response.status}).`
          : `Ralion cloud health returned HTTP ${response.status}.`,
      };
    }));

    results.push(await runCheck('browser-online', 'Cloud', 'Windows/browser connectivity signal', async () => ({
      status: navigator.onLine ? 'pass' : 'warn',
      detail: navigator.onLine ? 'Windows reports an active network connection.' : 'Windows reports that this device is offline.',
    })));

    results.push(await runCheck('auth-context', 'Identity', 'Authenticated Ralion session', async () => {
      const response = await fetch('/api/auth/context', { method: 'GET', cache: 'no-store' });
      const payload = await response.json().catch(() => null);
      if (response.ok && payload?.success) {
        return { status: 'pass', detail: 'Bearer session was accepted by the canonical Ralion auth context endpoint.' };
      }
      if (response.status === 401) return { status: 'fail', detail: 'Session is missing, expired, or invalid. Sign in again.' };
      if (response.status === 409) return { status: 'fail', detail: 'Session is valid but organization/workspace context is unresolved.' };
      return { status: 'fail', detail: `Auth context returned HTTP ${response.status}${payload?.code ? ` (${payload.code})` : ''}.` };
    }));

    results.push(await runCheck('organization-context', 'Identity', 'Organization context', async () => ({
      status: organization?.id && organization?.name ? 'pass' : 'fail',
      detail: organization?.id && organization?.name
        ? 'Signed-in user has a resolved organization context.'
        : 'Organization context is not resolved in the desktop workspace.',
    })));

    results.push(await runCheck('branch-context', 'Identity', 'Active branch/workspace context', async () => ({
      status: activeBranch?.id ? 'pass' : 'warn',
      detail: activeBranch?.id
        ? 'An active branch is resolved for this session.'
        : 'No active branch is resolved. Single-workspace features may still work, but branch-scoped modules should be checked.',
    })));

    results.push(await runCheck('user-role', 'Identity', 'User role and permissions', async () => ({
      status: user?.uid && user?.role ? 'pass' : 'fail',
      detail: user?.uid && user?.role
        ? `Authenticated role is available (${user.role}).`
        : 'User identity or role is unavailable in the organization provider.',
    })));

    results.push(await runCheck('offline-queue', 'Offline & Sync', 'Offline mutation queue', async () => {
      if (!desktop?.getPendingActions) return { status: 'fail', detail: 'Offline queue API is unavailable.' };
      const pending = await desktop.getPendingActions();
      const count = Array.isArray(pending) ? pending.length : 0;
      return {
        status: count === 0 ? 'pass' : 'warn',
        detail: count === 0 ? 'No business changes are waiting to sync.' : `${count} business change${count === 1 ? '' : 's'} waiting for automatic sync.`,
      };
    }));

    results.push(await runCheck('offline-status', 'Offline & Sync', 'Offline status service', async () => {
      if (!desktop?.getOfflineStatus) return { status: 'fail', detail: 'Offline status API is unavailable.' };
      const status = await desktop.getOfflineStatus();
      return {
        status: 'pass',
        detail: `Offline status service responded · ${status?.pendingActions || 0} pending action${status?.pendingActions === 1 ? '' : 's'}.`,
      };
    }));

    results.push(await runCheck('offline-cache', 'Offline & Sync', 'Tenant-scoped response cache', async () => {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return { status: 'warn', detail: 'No API cache has been created yet. Open a few business modules while online, then test again.' };
      try {
        const cache = JSON.parse(raw) || {};
        const count = Object.keys(cache).length;
        return {
          status: count > 0 ? 'pass' : 'warn',
          detail: count > 0 ? `${count} cached API response${count === 1 ? '' : 's'} available for offline continuity.` : 'Offline cache exists but currently contains no entries.',
        };
      } catch {
        return { status: 'fail', detail: 'Offline cache exists but is not valid JSON.' };
      }
    }));

    results.push(await runCheck('local-ai-engine', 'Local AI', 'Local Mari engine', async () => {
      if (!desktop?.aiCheckStatus) return { status: 'warn', detail: 'Local AI bridge is not available in this build.' };
      const status = await desktop.aiCheckStatus();
      return {
        status: status?.isInstalled ? 'pass' : 'warn',
        detail: status?.isInstalled
          ? 'Local AI engine is installed and can be used by the desktop AI layer.'
          : 'Local AI engine is not installed. Cloud Mari remains available while online.',
      };
    }));

    results.push(await runCheck('local-ai-models', 'Local AI', 'Local Mari models', async () => {
      if (!desktop?.aiListModels) return { status: 'warn', detail: 'Local model inventory is unavailable.' };
      const models = await desktop.aiListModels();
      const count = Array.isArray(models) ? models.length : 0;
      return {
        status: count > 0 ? 'pass' : 'warn',
        detail: count > 0 ? `${count} local AI model${count === 1 ? '' : 's'} detected.` : 'No local AI models are installed yet.',
      };
    }));

    results.push(await runCheck('updater-bridge', 'Updates', 'Desktop updater bridge', async () => ({
      status: typeof desktop?.checkUpdates === 'function' ? 'pass' : 'warn',
      detail: typeof desktop?.checkUpdates === 'function'
        ? 'Update-check command is exposed to the installed app. Release-channel validation is handled separately.'
        : 'Updater bridge is unavailable in this build.',
    })));

    setChecks(results);
    setGeneratedAt(new Date().toISOString());
    setRunning(false);
  }, [activeBranch?.id, organization?.id, organization?.name, runCheck, user?.role, user?.uid]);

  useEffect(() => {
    void runDiagnostics();
  }, [runDiagnostics]);

  const summary = useMemo(() => {
    const pass = checks.filter(check => check.status === 'pass').length;
    const warn = checks.filter(check => check.status === 'warn').length;
    const fail = checks.filter(check => check.status === 'fail').length;
    return { pass, warn, fail, total: checks.length };
  }, [checks]);

  const report = useMemo<DiagnosticReport | null>(() => {
    if (!generatedAt || !checks.length) return null;
    return {
      generatedAt,
      app: {
        product: 'Ralion OS',
        version: platform?.version || (window as any).__RALION_VERSION__ || null,
        platform: platform?.platform || null,
        arch: platform?.arch || null,
        osVersion: platform?.osVersion || null,
        electronVersion: platform?.electronVersion || null,
        rendererProtocol: window.location.protocol,
        online: clientOnline,
      },
      tenant: {
        authenticated: Boolean(user?.uid),
        organizationResolved: Boolean(organization?.id),
        branchResolved: Boolean(activeBranch?.id),
        rolePresent: Boolean(user?.role),
      },
      summary,
      checks,
    };
  }, [activeBranch?.id, checks, clientOnline, generatedAt, organization?.id, platform, summary, user?.role, user?.uid]);

  const copyReport = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const categories = useMemo(() => {
    const order: DiagnosticCheck['category'][] = ['Runtime', 'Cloud', 'Identity', 'Offline & Sync', 'Local AI', 'Updates'];
    return order.map(category => ({ category, checks: checks.filter(check => check.category === category) }));
  }, [checks]);

  const overallStatus: CheckStatus = summary.fail > 0 ? 'fail' : summary.warn > 0 ? 'warn' : 'pass';
  const isDesktop = typeof window !== 'undefined' && Boolean((window as any).ralionDesktop?.isDesktop || window.location.protocol === 'app:');

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-blue-950/25 p-5 shadow-2xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
                <Activity className="h-3.5 w-3.5" /> Installed-App Validation
              </span>
              {generatedAt && (
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClasses(overallStatus)}`}>
                  {overallStatus === 'pass' ? 'Ready' : overallStatus === 'warn' ? 'Review warnings' : 'Action required'}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Ralion OS Diagnostics</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Validate the installed Windows runtime, cloud connection, authenticated company context, offline queue/cache, local Mari foundation and updater bridge from one screen.
            </p>
            <p className="mt-2 text-[11px] leading-5 text-zinc-500">
              Exported reports are intentionally sanitized: authentication tokens, customer data, company names, email addresses and tenant IDs are not included.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runDiagnostics()}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {running ? 'Running validation…' : 'Run full validation'}
            </button>
            <button
              type="button"
              onClick={() => void copyReport()}
              disabled={!report}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-40"
            >
              <Clipboard className="h-4 w-4" /> {copied ? 'Copied' : 'Copy report'}
            </button>
            <button
              type="button"
              onClick={() => report && downloadJson(report)}
              disabled={!report}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> Download JSON
            </button>
          </div>
        </div>
      </section>

      {!isDesktop && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          This page is running in a browser. Cloud and identity checks can still run, but native Windows validation requires the installed Ralion OS desktop app.
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Passed</div>
          <div className="mt-1 text-3xl font-black text-white">{summary.pass}</div>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.06] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Warnings</div>
          <div className="mt-1 text-3xl font-black text-white">{summary.warn}</div>
        </div>
        <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.06] p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">Failed</div>
          <div className="mt-1 text-3xl font-black text-white">{summary.fail}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Runtime</div>
          <div className="mt-1 text-sm font-bold text-white">v{platform?.version || (typeof window !== 'undefined' ? (window as any).__RALION_VERSION__ : null) || '—'}</div>
          <div className="mt-1 text-[10px] text-zinc-500">{platform?.platform || 'unknown'} · {platform?.arch || 'unknown'}</div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: Monitor, label: 'Native Runtime', value: isDesktop ? 'Desktop detected' : 'Browser mode' },
          { icon: Wifi, label: 'Connectivity', value: clientOnline ? 'Network available' : 'Offline' },
          { icon: ShieldCheck, label: 'Organization', value: organization?.id ? 'Context resolved' : 'Context missing' },
          { icon: Database, label: 'Offline Cache', value: cachePresent ? 'Cache present' : 'Not populated' },
          { icon: Bot, label: 'Mari Runtime', value: checks.find(c => c.id === 'local-ai-engine')?.status === 'pass' ? 'Local engine ready' : 'Cloud-first' },
          { icon: Cloud, label: 'Cloud API', value: checks.find(c => c.id === 'cloud-health')?.status === 'pass' ? 'Healthy' : clientOnline ? 'Needs attention' : 'Offline' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300"><Icon className="h-5 w-5" /></span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
              <div className="mt-0.5 text-xs font-semibold text-white">{value}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-5">
        {categories.map(({ category, checks: categoryChecks }) => {
          if (!categoryChecks.length) return null;
          const CategoryIcon = category === 'Runtime' ? Cpu : category === 'Cloud' ? Server : category === 'Identity' ? UserCheck : category === 'Offline & Sync' ? HardDrive : category === 'Local AI' ? Bot : RefreshCw;
          return (
            <div key={category} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
                <CategoryIcon className="h-4 w-4 text-blue-300" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">{category}</h2>
              </div>
              <div className="divide-y divide-zinc-800/80">
                {categoryChecks.map(check => (
                  <div key={check.id} className="flex gap-3 px-4 py-3.5">
                    <span className="mt-0.5"><StatusIcon status={check.status} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-white">{check.label}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${statusClasses(check.status)}`}>
                          {check.status}
                        </span>
                        {typeof check.durationMs === 'number' && <span className="text-[9px] text-zinc-600">{check.durationMs} ms</span>}
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-zinc-500">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="flex items-start gap-3">
          {clientOnline ? <Wifi className="mt-0.5 h-4 w-4 text-emerald-400" /> : <WifiOff className="mt-0.5 h-4 w-4 text-amber-400" />}
          <div>
            <h3 className="text-xs font-bold text-white">How to use this during Windows validation</h3>
            <p className="mt-1 text-[11px] leading-5 text-zinc-500">
              Run this once immediately after install, again after signing in, once while disconnected from the internet, and once after reconnecting. A healthy reconnect should return cloud/auth checks to green and reduce the offline queue after pending changes sync.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

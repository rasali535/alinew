'use client';

import React, { useEffect } from 'react';

type DesktopApiResponse = {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
};

type QueuedDesktopAction = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  queuedAt?: string;
  attempts?: number;
  actorId?: string | null;
  workspaceId?: string | null;
  organizationId?: string | null;
};

type DesktopBridge = {
  isDesktop?: boolean;
  apiFetch?: (request: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string | null;
  }) => Promise<DesktopApiResponse>;
  queueOfflineAction?: (action: QueuedDesktopAction) => Promise<any>;
  getPendingActions?: () => Promise<QueuedDesktopAction[]>;
  clearSyncedActions?: (ids: string[]) => Promise<any>;
  showNotification?: (title: string, body: string) => Promise<any>;
  checkUpdates?: () => Promise<any>;
};

type SyncState = {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncAt: string | null;
};

type CachedResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  cachedAt: number;
};

declare global {
  interface Window {
    __ralionDesktopFetchInstalled__?: boolean;
  }
}

const CANONICAL_RALION_ORIGIN = 'https://rasalilabs.com';
const HEALTH_URL = `${CANONICAL_RALION_ORIGIN}/ralion/api/health`;
const CACHE_STORAGE_KEY = 'ralion_desktop_api_cache_v1';
const CACHE_MAX_ENTRIES = 40;
const CACHE_MAX_BODY_BYTES = 400_000;
const HEALTH_INTERVAL_MS = 15_000;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const OFFLINE_QUEUE_PREFIXES = [
  '/ralion/api/tasks',
  '/ralion/api/crm/customers',
  '/ralion/api/calendar',
  '/ralion/api/leads',
];

let desktopOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
let syncInFlight: Promise<void> | null = null;
let lastSyncAt: string | null = null;
let lastUpdateCheckAt = 0;

function getDesktopBridge(): DesktopBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).ralionDesktop as DesktopBridge | undefined;
}

function emitSyncState(partial: Partial<SyncState> = {}) {
  if (typeof window === 'undefined') return;
  const detail: SyncState = {
    online: partial.online ?? desktopOnline,
    syncing: partial.syncing ?? Boolean(syncInFlight),
    pending: partial.pending ?? 0,
    lastSyncAt: partial.lastSyncAt ?? lastSyncAt,
  };
  window.dispatchEvent(new CustomEvent('ralion:sync-status', { detail }));
}

function resolveDesktopApiTarget(input: RequestInfo | URL): string | null {
  let raw: string;
  if (typeof input === 'string') raw = input;
  else if (input instanceof URL) raw = input.toString();
  else if (typeof Request !== 'undefined' && input instanceof Request) raw = input.url;
  else return null;

  if (raw.startsWith('/ralion/api/')) return `${CANONICAL_RALION_ORIGIN}${raw}`;
  if (raw.startsWith('/api/')) return `${CANONICAL_RALION_ORIGIN}/ralion${raw}`;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const isCanonicalHost = host === 'rasalilabs.com' || host === 'www.rasalilabs.com';
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    if (isCanonicalHost && parsed.pathname.startsWith('/ralion/api/')) {
      return `${CANONICAL_RALION_ORIGIN}${parsed.pathname}${parsed.search}`;
    }

    if (isCanonicalHost && parsed.pathname.startsWith('/api/')) {
      return `${CANONICAL_RALION_ORIGIN}/ralion${parsed.pathname}${parsed.search}`;
    }

    if (isLocalHost && parsed.pathname.startsWith('/api/')) {
      return `${CANONICAL_RALION_ORIGIN}/ralion${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return null;
  }

  return null;
}

function mergeHeaders(input: RequestInfo | URL, init?: RequestInit): Headers {
  const headers = new Headers();
  if (typeof Request !== 'undefined' && input instanceof Request) {
    input.headers.forEach((value, key) => headers.set(key, value));
  }
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers;
}

async function resolveBody(input: RequestInfo | URL, init: RequestInit | undefined, method: string, headers: Headers): Promise<string | null | undefined> {
  if (method === 'GET' || method === 'HEAD') return null;

  const initBody = init?.body;
  if (initBody !== undefined && initBody !== null) {
    if (typeof initBody === 'string') return initBody;
    if (typeof URLSearchParams !== 'undefined' && initBody instanceof URLSearchParams) return initBody.toString();
    return undefined;
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    const contentType = headers.get('content-type') || '';
    const isTextBody =
      contentType.includes('application/json') ||
      contentType.includes('text/') ||
      contentType.includes('application/x-www-form-urlencoded');
    if (!isTextBody) return undefined;
    return await input.clone().text();
  }

  return null;
}

function readStoredAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const directSession = localStorage.getItem('ralion-app-auth-token');
    let parsed: any = directSession ? JSON.parse(directSession) : null;
    let token = parsed?.access_token || parsed?.currentSession?.access_token || null;
    let user = parsed?.user || parsed?.currentSession?.user || null;

    for (let i = 0; !token && i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      parsed = JSON.parse(raw);
      token = parsed?.access_token || parsed?.currentSession?.access_token || null;
      user = parsed?.user || parsed?.currentSession?.user || null;
    }

    if (token) headers.Authorization = `Bearer ${token}`;
    if (user?.id) headers['x-user-id'] = user.id;
  } catch {}

  const workspaceId = localStorage.getItem('ralion_active_workspace_id') || localStorage.getItem('ralion_workspace_id');
  const orgId = localStorage.getItem('ralion_organization_id') || localStorage.getItem('ralion_active_org_id') || localStorage.getItem('ralion_org_id');
  if (workspaceId) headers['x-workspace-id'] = workspaceId;
  if (orgId) headers['x-organization-id'] = orgId;
  return headers;
}

async function getCurrentAuthHeaders(): Promise<Record<string, string>> {
  try {
    const sharedClient = (window as any).__ralion_supabase_instance__ || (globalThis as any).__ralion_supabase_instance__;
    if (sharedClient?.auth?.getSession) {
      const result = await sharedClient.auth.getSession();
      const session = result?.data?.session;
      if (session?.access_token) {
        const headers = readStoredAuthHeaders();
        headers.Authorization = `Bearer ${session.access_token}`;
        if (session.user?.id) headers['x-user-id'] = session.user.id;
        return headers;
      }
    }
  } catch {}
  return readStoredAuthHeaders();
}

function getTenantCacheKey(url: string): string | null {
  if (typeof window === 'undefined') return null;
  const auth = readStoredAuthHeaders();
  const actor = auth['x-user-id'] || 'unknown-user';
  const workspace = auth['x-workspace-id'] || '';
  const organization = auth['x-organization-id'] || '';
  if (!workspace && !organization) return null;
  return `${actor}::${organization || 'no-org'}::${workspace || 'no-workspace'}::${url}`;
}

function readCache(): Record<string, CachedResponse> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeCachedResponse(url: string, result: DesktopApiResponse) {
  if (typeof window === 'undefined') return;
  const cacheKey = getTenantCacheKey(url);
  if (!cacheKey) return;
  const body = result.body || '';
  if (body.length > CACHE_MAX_BODY_BYTES) return;
  const contentType = Object.entries(result.headers || {}).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '';
  if (contentType && !contentType.includes('json') && !contentType.includes('text')) return;

  try {
    const cache = readCache();
    cache[cacheKey] = {
      status: result.status,
      statusText: result.statusText || 'OK',
      headers: result.headers || { 'content-type': 'application/json' },
      body,
      cachedAt: Date.now(),
    };

    const entries = Object.entries(cache).sort((a, b) => b[1].cachedAt - a[1].cachedAt).slice(0, CACHE_MAX_ENTRIES);
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Cache failure must never prevent the live request from succeeding.
  }
}

function readCachedResponse(url: string): Response | null {
  const cacheKey = getTenantCacheKey(url);
  if (!cacheKey) return null;
  const cached = readCache()[cacheKey];
  if (!cached) return null;
  const headers = new Headers(cached.headers || {});
  headers.set('x-ralion-offline-cache', 'true');
  headers.set('x-ralion-cached-at', new Date(cached.cachedAt).toISOString());
  return new Response(cached.body, {
    status: cached.status >= 200 && cached.status < 300 ? cached.status : 200,
    statusText: cached.statusText || 'Offline Cache',
    headers,
  });
}

function isQueueableOfflineMutation(url: string, method: string, headers: Headers, body: string | null | undefined): boolean {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
  if (body === undefined) return false;
  const parsed = new URL(url);
  if (!OFFLINE_QUEUE_PREFIXES.some(prefix => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))) return false;
  const contentType = headers.get('content-type') || 'application/json';
  return contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded');
}

function stripTransientHeaders(headers: Headers): Record<string, string> {
  const saved: Record<string, string> = {};
  headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (normalized === 'authorization' || normalized === 'x-user-id' || normalized === 'content-length') return;
    saved[key] = value;
  });
  return saved;
}

function queuedResponse(actionId: string): Response {
  return new Response(JSON.stringify({
    success: true,
    queued: true,
    offline: true,
    actionId,
    message: 'Saved on this device and queued for automatic sync when Ralion reconnects.',
  }), {
    status: 202,
    statusText: 'Queued for Sync',
    headers: { 'Content-Type': 'application/json', 'x-ralion-offline-queued': 'true' },
  });
}

async function queueMutation(desktop: DesktopBridge, url: string, method: string, headers: Headers, body: string | null): Promise<Response> {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const auth = readStoredAuthHeaders();
  const actorId = headers.get('x-user-id') || auth['x-user-id'] || null;
  const workspaceId = headers.get('x-workspace-id') || auth['x-workspace-id'] || null;
  const organizationId = headers.get('x-organization-id') || auth['x-organization-id'] || null;
  const savedHeaders = stripTransientHeaders(headers);
  if (!savedHeaders['Idempotency-Key'] && !savedHeaders['idempotency-key']) {
    savedHeaders['Idempotency-Key'] = `ralion-desktop-${id}`;
  }
  await desktop.queueOfflineAction?.({
    id,
    url,
    method,
    headers: savedHeaders,
    body,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    actorId,
    workspaceId,
    organizationId,
  });
  const pending = await desktop.getPendingActions?.().catch(() => []) || [];
  emitSyncState({ online: false, syncing: false, pending: pending.length });
  return queuedResponse(id);
}

function queuedActionMatchesCurrentIdentity(action: QueuedDesktopAction, auth: Record<string, string>): boolean {
  const actor = auth['x-user-id'] || null;
  const workspace = auth['x-workspace-id'] || null;
  const organization = auth['x-organization-id'] || null;
  if (action.actorId && actor && action.actorId !== actor) return false;
  if (action.workspaceId && workspace && action.workspaceId !== workspace) return false;
  if (action.organizationId && organization && action.organizationId !== organization) return false;
  return true;
}

async function flushOfflineQueue(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  const desktop = getDesktopBridge();
  if (!desktop?.apiFetch || !desktop.getPendingActions || !desktop.clearSyncedActions || !desktopOnline) return;

  syncInFlight = (async () => {
    const pending = await desktop.getPendingActions!().catch(() => []);
    emitSyncState({ online: true, syncing: pending.length > 0, pending: pending.length });
    if (!pending.length) return;

    const syncedIds: string[] = [];
    const freshAuth = await getCurrentAuthHeaders();
    if (!freshAuth.Authorization) {
      emitSyncState({ online: true, syncing: false, pending: pending.length });
      return;
    }

    for (const action of pending) {
      if (!queuedActionMatchesCurrentIdentity(action, freshAuth)) {
        console.warn('[Desktop Sync] Queued action belongs to a different user/workspace; leaving it untouched.', action.id);
        break;
      }

      try {
        const replayHeaders: Record<string, string> = { ...(action.headers || {}) };
        replayHeaders.Authorization = freshAuth.Authorization;
        if (freshAuth['x-user-id']) replayHeaders['x-user-id'] = freshAuth['x-user-id'];
        if (!replayHeaders['x-workspace-id'] && freshAuth['x-workspace-id']) replayHeaders['x-workspace-id'] = freshAuth['x-workspace-id'];
        if (!replayHeaders['x-organization-id'] && freshAuth['x-organization-id']) replayHeaders['x-organization-id'] = freshAuth['x-organization-id'];

        const result = await desktop.apiFetch!({
          url: action.url,
          method: action.method,
          headers: replayHeaders,
          body: action.body,
        });

        if (result.status >= 200 && result.status < 300) {
          syncedIds.push(action.id);
          continue;
        }

        if (result.status >= 400 && result.status < 500 && result.status !== 408 && result.status !== 429) break;
        if (result.status >= 500) break;
      } catch {
        desktopOnline = false;
        break;
      }
    }

    if (syncedIds.length) {
      await desktop.clearSyncedActions!(syncedIds);
      lastSyncAt = new Date().toISOString();
      if (desktop.showNotification) {
        void desktop.showNotification(
          'Ralion OS synced',
          `${syncedIds.length} offline change${syncedIds.length === 1 ? '' : 's'} synced to your business workspace.`
        );
      }
    }

    const remaining = await desktop.getPendingActions!().catch(() => []);
    emitSyncState({ online: desktopOnline, syncing: false, pending: remaining.length, lastSyncAt });
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

async function maybeCheckForUpdates(desktop: DesktopBridge) {
  if (!desktopOnline || !desktop.checkUpdates) return;
  const now = Date.now();
  if (now - lastUpdateCheckAt < UPDATE_CHECK_INTERVAL_MS) return;
  lastUpdateCheckAt = now;
  try {
    await desktop.checkUpdates();
  } catch {
    // Updating is opportunistic; a failed check must never affect normal sync.
  }
}

async function checkConnectivityAndSync() {
  const desktop = getDesktopBridge();
  if (!desktop?.apiFetch) return;
  try {
    const health = await desktop.apiFetch({ url: HEALTH_URL, method: 'GET', headers: { Accept: 'application/json' }, body: null });
    const wasOffline = !desktopOnline;
    desktopOnline = health.status >= 200 && health.status < 500;
    const pending = await desktop.getPendingActions?.().catch(() => []) || [];
    emitSyncState({ online: desktopOnline, pending: pending.length });
    if (desktopOnline) {
      if (wasOffline || pending.length > 0) await flushOfflineQueue();
      void maybeCheckForUpdates(desktop);
    }
  } catch {
    desktopOnline = false;
    const pending = await desktop.getPendingActions?.().catch(() => []) || [];
    emitSyncState({ online: false, pending: pending.length });
  }
}

function installDesktopFetchBridge() {
  if (typeof window === 'undefined' || window.__ralionDesktopFetchInstalled__) return;

  const desktop = getDesktopBridge();
  if (!desktop?.isDesktop || typeof desktop.apiFetch !== 'function') return;

  const browserFetch = window.fetch.bind(window);
  const apiFetch = desktop.apiFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const target = resolveDesktopApiTarget(input);
    if (!target) return browserFetch(input as any, init);

    const method = String(init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headers = mergeHeaders(input, init);
    const body = await resolveBody(input, init, method, headers);

    if (body === undefined) return browserFetch(input as any, init);

    if (!desktopOnline) {
      if (method === 'GET' || method === 'HEAD') {
        const cached = readCachedResponse(target);
        if (cached) return cached;
      }
      if (isQueueableOfflineMutation(target, method, headers, body)) {
        return queueMutation(desktop, target, method, headers, body ?? null);
      }
      return new Response(JSON.stringify({
        success: false,
        offline: true,
        error: 'This action needs an internet connection. Ralion will reconnect automatically.',
        code: 'OFFLINE_ACTION_REQUIRES_CONNECTION',
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }

    try {
      const result = await apiFetch({
        url: target,
        method,
        headers: Object.fromEntries(headers.entries()),
        body,
      });

      if ((method === 'GET' || method === 'HEAD') && result.status >= 200 && result.status < 300) {
        writeCachedResponse(target, result);
      }

      return new Response(result.body || '', {
        status: result.status,
        statusText: result.statusText || '',
        headers: result.headers || {},
      });
    } catch (error: any) {
      desktopOnline = false;
      void checkConnectivityAndSync();
      if (method === 'GET' || method === 'HEAD') {
        const cached = readCachedResponse(target);
        if (cached) return cached;
      }
      console.error('[Desktop Network] Native Ralion API request failed:', error?.message || error);
      return new Response(
        JSON.stringify({
          success: false,
          offline: true,
          error: error?.message || 'Unable to reach the Ralion service. Ralion will retry automatically.',
          code: 'DESKTOP_API_UNREACHABLE',
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };

  window.__ralionDesktopFetchInstalled__ = true;
  console.info('[Desktop Network] Native Ralion API transport enabled with tenant-scoped offline cache + automatic sync.');
}

export function DesktopNetworkBootstrap({ children }: { children: React.ReactNode }) {
  installDesktopFetchBridge();

  useEffect(() => {
    const desktop = getDesktopBridge();
    if (!desktop?.isDesktop) return;

    const handleOnline = () => {
      desktopOnline = true;
      void checkConnectivityAndSync();
    };
    const handleOffline = () => {
      desktopOnline = false;
      void checkConnectivityAndSync();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    void checkConnectivityAndSync();
    const timer = window.setInterval(() => void checkConnectivityAndSync(), HEALTH_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(timer);
    };
  }, []);

  return <>{children}</>;
}

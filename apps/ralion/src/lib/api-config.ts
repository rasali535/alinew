/**
 * Ralion OS — Central API Configuration & Routing Helper
 * Ras Ali Labs (Pty) Ltd
 *
 * Ensures all dynamic API requests from the frontend are routed to the
 * canonical Ralion API endpoint, share one recoverable Supabase session,
 * and deduplicate in-flight token refresh cycles.
 */

import { deduplicatedRefreshSession } from './supabase/client';

export function getMariBuildVersion(): string {
  if (typeof process !== 'undefined' && process.env) {
    const envVer =
      process.env.NEXT_PUBLIC_MARI_BUILD_VERSION ||
      process.env.MARI_BUILD_VERSION ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT_SHA;
    if (envVer && envVer.trim()) {
      return envVer.trim().substring(0, 16);
    }
  }
  return 'unknown-dev';
}

export const MARI_BUILD_VERSION = getMariBuildVersion();

export function isRalionDesktopRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const protocol = window.location.protocol;
  return Boolean(
    (window as any).ralionDesktop?.isDesktop ||
    (window as any).__RALION_DESKTOP__ ||
    protocol === 'app:' ||
    protocol === 'file:'
  );
}

export function getRalionApiBase(): string {
  // The packaged Electron renderer runs at app://localhost. Treating that host
  // like local web development incorrectly routes production calls to port 6509.
  // Desktop always talks to the canonical HTTPS Ralion gateway.
  if (isRalionDesktopRuntime()) {
    return 'https://rasalilabs.com/ralion';
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_RALION_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (configuredApiUrl && configuredApiUrl.trim() !== '' && !configuredApiUrl.includes('onrender.com')) {
    return configuredApiUrl.replace(/\/+$/, '');
  }

  const isProd = process.env.NODE_ENV === 'production';

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');

    if (hostname.includes('rasalilabs.com')) return `${origin}/ralion`;

    if (isLocalhost || !isProd) {
      const port = window.location.port;
      if (port === '6509' || port === '3000') return origin;
      return 'http://localhost:6509';
    }

    return `${origin}/ralion`;
  }

  return 'https://rasalilabs.com/ralion';
}

export function getRalionApiUrl(path: string): string {
  const base = getRalionApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/ralion') && normalizedPath.startsWith('/ralion/')) {
    return `${base}${normalizedPath.substring(7)}`;
  }
  return `${base}${normalizedPath}`;
}

let _sessionPromise: Promise<any> | null = null;

async function getBrowserSession(forceRefresh = false): Promise<{ access_token: string; user?: any; refresh_token?: string } | null> {
  if (typeof window === 'undefined') return null;

  // OrganizationContext has already server-verified this session in many cases.
  // Reuse that canonical token before asking another webpack chunk/client instance
  // to rehydrate Supabase storage independently.
  // Prefer the canonical runtime token published by OrganizationContext.
  // Do this for both ordinary requests and recovery attempts: the context route
  // has already verified this JWT with Supabase, so dropping it during a
  // separate refresh attempt would turn a healthy session into AUTH_TOKEN_MISSING.
  const sharedToken = (window as any).__ralion_access_token__;
  if (typeof sharedToken === 'string' && sharedToken.length > 20) {
    return {
      access_token: sharedToken,
      user: (window as any).__ralion_access_token_user__ || undefined,
    };
  }

  if (forceRefresh) {
    try {
      // Prefer the globally registered deduplicated refresh function (set by client.ts)
      // to avoid importing a second Supabase client instance.
      if (typeof window !== 'undefined' && typeof (window as any).__ralion_refresh_session__ === 'function') {
        const refreshed = await (window as any).__ralion_refresh_session__();
        if (!refreshed.error && refreshed.data.session) {
          return refreshed.data.session;
        }
        return null;
      }
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const refreshed = await deduplicatedRefreshSession(supabase);
      if (!refreshed.error && refreshed.data.session) {
        return refreshed.data.session;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (_sessionPromise) return _sessionPromise;

  _sessionPromise = (async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      let session = !error ? data.session : null;

      const expiresSoon = Boolean(
        session?.expires_at && session.expires_at * 1000 <= Date.now() + 60_000
      );

      if (expiresSoon && session?.refresh_token) {
        const refreshed = await deduplicatedRefreshSession(supabase);
        if (!refreshed.error && refreshed.data.session) {
          return refreshed.data.session;
        }
      }

      if (session) return session;
    } catch {
      // Supabase client instance error, proceed to storage fallback
    } finally {
      _sessionPromise = null;
    }

    // Fallback to direct storage parsing if supabase client has not finished rehydrating
    try {
      const directSession = localStorage.getItem('ralion-app-auth-token');
      if (directSession) {
        const parsed = JSON.parse(directSession);
        const token = parsed?.access_token || parsed?.currentSession?.access_token;
        const user = parsed?.user || parsed?.currentSession?.user;
        if (token) return { access_token: token, user } as any;
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const token = parsed?.access_token || parsed?.currentSession?.access_token;
        const user = parsed?.user || parsed?.currentSession?.user;
        if (token) return { access_token: token, user } as any;
      }
    } catch {}

    return null;
  })();

  return _sessionPromise;
}

function appendTenantHints(headers: Record<string, string>, session: any) {
  if (typeof window === 'undefined' || !session) return;
  const metadata = session.user?.user_metadata || {};
  const storedWorkspaceId = window.localStorage?.getItem('ralion_active_workspace_id') || window.localStorage?.getItem('ralion_workspace_id');
  const storedOrgId = window.localStorage?.getItem('ralion_organization_id') || window.localStorage?.getItem('ralion_active_org_id') || window.localStorage?.getItem('ralion_org_id');

  const activeWs = storedWorkspaceId || metadata.workspace_id || null;
  const activeOrg = storedOrgId || metadata.organization_id || metadata.org_id || null;

  if (activeWs) headers['x-workspace-id'] = activeWs;
  if (activeOrg) headers['x-organization-id'] = activeOrg;
}

export async function getRalionAuthHeaders(options: { refresh?: boolean } = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const session = await getBrowserSession(Boolean(options.refresh));

  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  if (session?.user?.id) headers['x-user-id'] = session.user.id;
  appendTenantHints(headers, session);

  return headers;
}

function mergeAuthHeaders(initHeaders: HeadersInit | undefined, authHeaders: Record<string, string>, replaceAuthorization = false) {
  const headers = new Headers(initHeaders);
  if (authHeaders.Authorization && (replaceAuthorization || !headers.has('Authorization'))) {
    headers.set('Authorization', authHeaders.Authorization);
  }
  if (!headers.has('x-user-id') && authHeaders['x-user-id']) headers.set('x-user-id', authHeaders['x-user-id']);
  if (!headers.has('x-workspace-id') && authHeaders['x-workspace-id']) headers.set('x-workspace-id', authHeaders['x-workspace-id']);
  if (!headers.has('x-organization-id') && authHeaders['x-organization-id']) headers.set('x-organization-id', authHeaders['x-organization-id']);
  return headers;
}

async function parseApiResponse<T>(res: Response): Promise<{ ok: boolean; status: number; data: T; error?: string; code?: string }> {
  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
      return {
        ok: false,
        status: res.status,
        data: null as any,
        error: `API endpoint returned HTML instead of JSON (${res.status}). Ensure dynamic backend is reachable.`,
      };
    }
    data = { raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
    code: data?.code,
    error: res.ok ? undefined : (data?.error || data?.message || `HTTP ${res.status}`),
  };
}

/**
 * Universal Authenticated Fetch Helper for Ralion Frontend.
 * Automatically injects Bearer token and tenant hint headers, and deduplicates
 * token refreshes on 401 AUTH_TOKEN_INVALID.
 */
export async function authFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : getRalionApiUrl(pathOrUrl);

  try {
    const initialAuth = await getRalionAuthHeaders();
    const hadSession = Boolean(initialAuth.Authorization);
    let headers = mergeAuthHeaders(init?.headers, initialAuth);
    if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    let res = await fetch(url, {
      ...init,
      headers,
      credentials: init?.credentials || 'include',
    });

    // Recover once from either an invalid token or a session-hydration race.
    // A protected request can fire before Supabase has rehydrated local storage,
    // which previously sent no Authorization header and made OAuth/billing fail
    // with AUTH_TOKEN_MISSING even though the browser still had a valid session.
    // Never retry unrelated 401s, 403s, 409s, or server errors.
    if (res.status === 401 && typeof window !== 'undefined') {
      let authCode = '';
      try {
        const cloned = res.clone();
        const body = await cloned.json();
        authCode = String(body?.code || '');
      } catch {}

      const shouldRefresh =
        authCode === 'AUTH_TOKEN_INVALID' ||
        authCode === 'AUTH_TOKEN_MISSING';

      if (shouldRefresh) {
        const refreshedAuth = await getRalionAuthHeaders({ refresh: true });
        // Retry once whenever recovery yields a bearer token. For
        // AUTH_TOKEN_MISSING the recovered token may legitimately be identical
        // to the server-verified runtime token; requiring it to change prevented
        // the retry and left billing/social requests at 401.
        if (refreshedAuth.Authorization) {
          headers = mergeAuthHeaders(init?.headers, refreshedAuth, true);
          if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
            headers.set('Content-Type', 'application/json');
          }
          res = await fetch(url, {
            ...init,
            headers,
            credentials: init?.credentials || 'include',
          });
        }
      }
    }

    return res;
  } catch (rawErr: any) {
    const errObj = rawErr instanceof Error ? rawErr : new Error(String(rawErr));
    return new Response(JSON.stringify({ success: false, error: errObj.message, status: 503 }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function fetchRalionApi<T = any>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; error?: string; code?: string }> {
  try {
    const res = await authFetch(path, init);
    return await parseApiResponse<T>(res);
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null as any,
      error: err.message || 'Network error connecting to Ralion backend',
    };
  }
}

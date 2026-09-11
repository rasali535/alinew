/**
 * Ralion OS — Central API Configuration & Routing Helper
 * Ras Ali Labs (Pty) Ltd
 *
 * Ensures all dynamic API requests from the frontend are routed to the
 * canonical Ralion API endpoint and share one recoverable Supabase session.
 */

export const MARI_BUILD_VERSION = '2026.09.06-v2';

export function getRalionApiBase(): string {
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

async function getBrowserSession(forceRefresh = false) {
  if (typeof window === 'undefined') return null;
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data, error } = await supabase.auth.getSession();

    let session = !error ? data.session : null;

    const expiresSoon = Boolean(
      session?.expires_at && session.expires_at * 1000 <= Date.now() + 60_000
    );

    if ((forceRefresh || expiresSoon) && session?.refresh_token) {
      const refreshed = await supabase.auth.refreshSession();
      if (!refreshed.error && refreshed.data.session) return refreshed.data.session;
      if (forceRefresh) session = null;
    }

    if (session) return session;
  } catch {
    // Supabase client instance error, proceed to storage fallback
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
}

function appendTenantHints(headers: Record<string, string>, session: any) {
  if (typeof window === 'undefined' || !session) return;
  const metadata = session.user?.user_metadata || {};
  const storedWorkspaceId = window.localStorage?.getItem('ralion_active_workspace_id') || window.localStorage?.getItem('ralion_workspace_id');
  const storedOrgId = window.localStorage?.getItem('ralion_organization_id') || window.localStorage?.getItem('ralion_active_org_id') || window.localStorage?.getItem('ralion_org_id');

  const activeWs = metadata.workspace_id || storedWorkspaceId || null;
  const activeOrg = metadata.org_id || metadata.organization_id || storedOrgId || null;

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

async function parseApiResponse<T>(res: Response): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
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
    error: res.ok ? undefined : (data?.error || data?.message || `HTTP ${res.status}`),
  };
}

export async function fetchRalionApi<T = any>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const url = getRalionApiUrl(path);

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

    // Recover once from an expired/revoked access token. The server still
    // validates the refreshed JWT and tenant membership; this is not a bypass.
    if (res.status === 401 && hadSession && typeof window !== 'undefined') {
      const refreshedAuth = await getRalionAuthHeaders({ refresh: true });
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

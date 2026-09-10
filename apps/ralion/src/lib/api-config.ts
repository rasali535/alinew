/**
 * Ralion OS — Central API Configuration & Routing Helper
 * Ras Ali Labs (Pty) Ltd
 *
 * Ensures all dynamic API requests from the frontend are routed to the
 * canonical Ralion API endpoint.
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

/**
 * Authentication headers only. Tenant identity is resolved authoritatively by
 * the server and must never fall back to the authenticated user ID.
 *
 * Legacy workspace/org IDs written by OrganizationProvider are included only
 * as routing hints; server-side membership validation remains authoritative.
 */
export async function getRalionAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (typeof window !== 'undefined') {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
      if (data?.session?.user?.id) headers['x-user-id'] = data.session.user.id;

      const metadata = data?.session?.user?.user_metadata || {};
      const storedWorkspaceId = window.localStorage?.getItem('ralion_active_workspace_id') || window.localStorage?.getItem('ralion_workspace_id');
      const storedOrgId = window.localStorage?.getItem('ralion_organization_id') || window.localStorage?.getItem('ralion_active_org_id') || window.localStorage?.getItem('ralion_org_id');

      const activeWs = metadata.workspace_id || storedWorkspaceId || null;
      const activeOrg = metadata.org_id || metadata.organization_id || storedOrgId || null;

      if (activeWs) headers['x-workspace-id'] = activeWs;
      if (activeOrg) headers['x-organization-id'] = activeOrg;
    } catch {}
  }

  return headers;
}

export async function fetchRalionApi<T = any>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const url = getRalionApiUrl(path);

  try {
    const authHeaders = await getRalionAuthHeaders();
    const headers = new Headers(init?.headers);

    if (!headers.has('Authorization') && authHeaders.Authorization) headers.set('Authorization', authHeaders.Authorization);
    if (!headers.has('x-user-id') && authHeaders['x-user-id']) headers.set('x-user-id', authHeaders['x-user-id']);
    if (!headers.has('x-workspace-id') && authHeaders['x-workspace-id']) headers.set('x-workspace-id', authHeaders['x-workspace-id']);
    if (!headers.has('x-organization-id') && authHeaders['x-organization-id']) headers.set('x-organization-id', authHeaders['x-organization-id']);
    if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json');

    const res = await fetch(url, {
      ...init,
      headers,
      credentials: init?.credentials || 'include',
    });

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
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null as any,
      error: err.message || 'Network error connecting to Ralion backend',
    };
  }
}

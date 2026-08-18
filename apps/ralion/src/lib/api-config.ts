/**
 * Ralion OS — Central API Configuration & Routing Helper
 * Ras Ali Labs (Pty) Ltd
 *
 * Ensures all dynamic API requests from the frontend (whether hosted on Hostinger
 * or locally) are routed to the canonical dynamic backend (e.g. Render / Docker).
 */

/**
 * Returns the resolved dynamic API base URL.
 */
export function getRalionApiBase(): string {
  // 1. Explicitly configured public API URL takes top priority
  const configuredApiUrl = process.env.NEXT_PUBLIC_RALION_API_URL;
  if (configuredApiUrl && configuredApiUrl.trim() !== '') {
    return configuredApiUrl.replace(/\/+$/, '');
  }

  const isProd = process.env.NODE_ENV === 'production';

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');

    // If running in local development or desktop electron preview
    if (isLocalhost || !isProd) {
      const port = window.location.port;
      // If running through Next.js dev server on localhost:6509 or 3000
      if (port === '6509' || port === '3000') {
        return window.location.origin;
      }
      return 'http://localhost:6509';
    }

    // In production on the web (e.g. rasalilabs.com):
    // Fallback to the canonical Render dynamic backend domain
    return 'https://ralion-dynamic-backend.onrender.com';
  }

  // Server-side fallback during build/SSR
  if (isProd) {
    return 'https://ralion-dynamic-backend.onrender.com';
  }

  return 'http://localhost:6509';
}

/**
 * Build a full canonical API URL for a given route path.
 * Example: getRalionApiUrl('/api/social/publish')
 * Returns: 'https://ralion-dynamic-backend.onrender.com/api/social/publish' or 'http://localhost:6509/api/social/publish'
 */
export function getRalionApiUrl(path: string): string {
  const base = getRalionApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // If base already contains basePath (e.g. /ralion) and normalizedPath starts with /ralion, avoid duplication
  if (base.endsWith('/ralion') && normalizedPath.startsWith('/ralion/')) {
    return `${base}${normalizedPath.substring(7)}`;
  }

  return `${base}${normalizedPath}`;
}

/**
 * Extract active Supabase session token in browser environment for authenticated requests.
 */
export async function getRalionAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (typeof window !== 'undefined') {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (data?.session?.user?.id) {
        headers['x-user-id'] = data.session.user.id;
      }
    } catch {}
  }

  return headers;
}

/**
 * Type-safe fetch wrapper that automatically routes to the Ralion dynamic backend,
 * attaches credentials, and parses JSON responses safely.
 */
export async function fetchRalionApi<T = any>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const url = getRalionApiUrl(path);

  try {
    const authHeaders = await getRalionAuthHeaders();
    const headers = new Headers(init?.headers);

    if (!headers.has('Authorization') && authHeaders.Authorization) {
      headers.set('Authorization', authHeaders.Authorization);
    }
    if (!headers.has('x-user-id') && authHeaders['x-user-id']) {
      headers.set('x-user-id', authHeaders['x-user-id']);
    }
    if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

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
      // If we received an HTML document instead of JSON (e.g. 404 rewrite on static server)
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

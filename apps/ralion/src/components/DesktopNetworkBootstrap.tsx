'use client';

import React from 'react';

type DesktopApiResponse = {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
};

type DesktopBridge = {
  isDesktop?: boolean;
  apiFetch?: (request: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string | null;
  }) => Promise<DesktopApiResponse>;
};

declare global {
  interface Window {
    __ralionDesktopFetchInstalled__?: boolean;
  }
}

const CANONICAL_RALION_ORIGIN = 'https://rasalilabs.com';

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

    // Protect packaged builds from stale localhost API assumptions.
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
    // Binary/FormData uploads stay on the browser transport for now rather than
    // being corrupted by a text-only bridge.
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

function installDesktopFetchBridge() {
  if (typeof window === 'undefined' || window.__ralionDesktopFetchInstalled__) return;

  const desktop = (window as any).ralionDesktop as DesktopBridge | undefined;
  if (!desktop?.isDesktop || typeof desktop.apiFetch !== 'function') return;

  const browserFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const target = resolveDesktopApiTarget(input);
    if (!target) return browserFetch(input as any, init);

    const method = String(init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
    const headers = mergeHeaders(input, init);
    const body = await resolveBody(input, init, method, headers);

    // Preserve the native browser path for payload types the text bridge does
    // not intentionally support yet (FormData, Blob, ArrayBuffer, streams).
    if (body === undefined) return browserFetch(input as any, init);

    try {
      const result = await desktop.apiFetch({
        url: target,
        method,
        headers: Object.fromEntries(headers.entries()),
        body,
      });

      return new Response(result.body || '', {
        status: result.status,
        statusText: result.statusText || '',
        headers: result.headers || {},
      });
    } catch (error: any) {
      console.error('[Desktop Network] Native Ralion API request failed:', error?.message || error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || 'Unable to reach the Ralion service.',
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
  console.info('[Desktop Network] Native Ralion API transport enabled.');
}

export function DesktopNetworkBootstrap({ children }: { children: React.ReactNode }) {
  // This intentionally installs during the parent render so child providers
  // (especially OrganizationProvider) see the bridged fetch before their effects run.
  installDesktopFetchBridge();
  return <>{children}</>;
}

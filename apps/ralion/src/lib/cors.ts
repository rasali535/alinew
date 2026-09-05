import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = new Set([
  'https://rasalilabs.com',
  'https://www.rasalilabs.com',
  'http://localhost:3000',
  'http://localhost:6509',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:6509',
  'http://127.0.0.1:5173',
]);

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'X-Requested-With',
  'apikey',
  'x-api-key',
  'x-client-info',
  'Idempotency-Key',
  'Origin',
  'Cache-Control',
  'Pragma',
  'x-user-id',
  'x-workspace-id',
  'x-organization-id',
  'x-tenant-id',
  'x-tenant',
  'x-workspace',
  'x-org-id',
  'x-admin-key',
  'x-session-id',
  'x-request-id',
  'baggage',
  'sentry-trace',
  'cookie',
].join(', ');

/**
 * Checks if a given origin is allowed under the Ralion OS security policy.
 */
export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;

  if (ALLOWED_ORIGINS.has(origin)) {
    return true;
  }

  // Subdomains of rasalilabs.com (e.g. app.rasalilabs.com, dev.rasalilabs.com)
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*rasalilabs\.com$/.test(origin)) {
    return true;
  }

  // Render backend & preview hostnames
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*onrender\.com$/.test(origin)) {
    return true;
  }

  // Local development hostnames on any port
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    return true;
  }

  return false;
}

export function resolveAllowedOrigin(request?: NextRequest | Request): string | null {
  let origin: string | null = null;
  if (request && 'headers' in request && request.headers) {
    origin = request.headers.get('origin');
  }

  if (origin) {
    if (isOriginAllowed(origin)) {
      return origin;
    }
    // Blocked/unknown origin: return null so CORS headers are not granted
    return null;
  }

  // Default fallback for direct non-browser requests without Origin header
  return 'https://rasalilabs.com';
}

export function getCorsHeaders(request?: NextRequest | Request): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(request);

  // If the browser sends Access-Control-Request-Headers in preflight, accommodate requested headers safely
  let allowedHeaders = ALLOWED_HEADERS;
  if (request && 'headers' in request && request.headers) {
    const requestedHeaders = request.headers.get('access-control-request-headers');
    if (requestedHeaders) {
      const existingSet = new Set(ALLOWED_HEADERS.split(', ').map((h) => h.toLowerCase()));
      const extra = requestedHeaders
        .split(',')
        .map((h) => h.trim())
        .filter((h) => h && !existingSet.has(h.toLowerCase()));
      if (extra.length > 0) {
        allowedHeaders = `${ALLOWED_HEADERS}, ${extra.join(', ')}`;
      }
    }
  }

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': allowedHeaders,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin, Access-Control-Request-Headers',
  };

  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  return headers;
}

/**
 * Wraps JSON data into a NextResponse with complete CORS headers attached.
 */
export function corsJsonResponse(data: any, init?: ResponseInit, request?: NextRequest | Request): NextResponse {
  const headers = new Headers(init?.headers);
  const cors = getCorsHeaders(request);
  for (const [k, v] of Object.entries(cors)) {
    headers.set(k, v);
  }

  return NextResponse.json(data, {
    ...init,
    headers,
  });
}

/**
 * Generic alias for corsJsonResponse
 */
export const createCorsResponse = corsJsonResponse;

/**
 * Attaches CORS headers to an existing Response or NextResponse.
 */
export function withCors<T extends Response>(response: T, request?: NextRequest | Request): T {
  const cors = getCorsHeaders(request);
  for (const [k, v] of Object.entries(cors)) {
    response.headers.set(k, v);
  }
  return response;
}

/**
 * Immediate, preflight OPTIONS handler returning 204 No Content with CORS headers.
 */
export function handleCorsPreflight(request: NextRequest | Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}


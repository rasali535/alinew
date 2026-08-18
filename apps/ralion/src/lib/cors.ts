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
  'x-client-info',
  'Idempotency-Key',
  'Origin',
  'Cache-Control',
  'x-user-id',
  'x-organization-id',
  'cookie',
].join(', ');

export function resolveAllowedOrigin(request?: NextRequest | Request): string {
  let origin: string | null = null;
  if (request) {
    origin = request.headers.get('origin');
  }

  if (origin) {
    if (ALLOWED_ORIGINS.has(origin) || /^https:\/\/([a-zA-Z0-9-]+\.)*rasalilabs\.com$/.test(origin)) {
      return origin;
    }
  }

  return 'https://rasalilabs.com';
}

export function getCorsHeaders(request?: NextRequest | Request): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(request);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    // Required so caches store separate responses per Origin value.
    // Without Vary: Origin a cached non-CORS response may be served to
    // browser cross-origin requests, causing CORS failures.
    'Vary': 'Origin',
  };
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

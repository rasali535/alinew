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

export function getCorsHeaders(request?: NextRequest | Request): Record<string, string> {
  let origin: string | null = null;
  if (request) {
    origin = request.headers.get('origin');
  }

  let allowedOrigin = 'https://rasalilabs.com';
  if (origin) {
    if (ALLOWED_ORIGINS.has(origin) || /^https:\/\/([a-zA-Z0-9-]+\.)*rasalilabs\.com$/.test(origin)) {
      allowedOrigin = origin;
    }
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With, apikey, x-client-info, Idempotency-Key, Origin, Cache-Control',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function corsJsonResponse(data: any, init?: ResponseInit, request?: NextRequest | Request) {
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

export function handleCorsPreflight(request: NextRequest | Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

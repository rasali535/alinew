import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Production & Development Allowed Origins for Ralion OS
 */
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

function resolveAllowedOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin');
  if (!origin) {
    return 'https://rasalilabs.com';
  }

  // Exact match from allowed origins
  if (ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }

  // Subdomain match (e.g. *.rasalilabs.com)
  if (/^https:\/\/([a-zA-Z0-9-]+\.)*rasalilabs\.com$/.test(origin)) {
    return origin;
  }

  // Default fallback to canonical production web origin
  return 'https://rasalilabs.com';
}

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(request);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With, apikey, x-client-info, Idempotency-Key, Origin, Cache-Control',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function middleware(request: NextRequest) {
  // Apply CORS to all /api/ endpoints
  if (request.nextUrl.pathname.startsWith('/api')) {
    const corsHeaders = getCorsHeaders(request);

    // Immediate response for Preflight OPTIONS requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Forward request and append CORS headers to the response
    const response = NextResponse.next();
    for (const [header, value] of Object.entries(corsHeaders)) {
      response.headers.set(header, value);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};

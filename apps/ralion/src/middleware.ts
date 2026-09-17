import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

function publicWidgetCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = String(request.headers.get('origin') || '').trim();
  const requestedHeaders = String(request.headers.get('access-control-request-headers') || '').trim();
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': requestedHeaders || 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    'Vary': 'Origin, Access-Control-Request-Headers',
  };
  if (/^https?:\/\//i.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public Mari website-widget endpoints have a separate CORS boundary from the
  // authenticated Ralion dashboard APIs. Session creation still validates the
  // requesting origin against the widget's persisted allowed_domains. Chat then
  // requires the short-lived mws_live_* bearer token issued by that session.
  const isMariWidgetApi =
    pathname.startsWith('/api/mari/widget/') ||
    pathname.startsWith('/ralion/api/mari/widget/');

  if (isMariWidgetApi) {
    const corsHeaders = publicWidgetCorsHeaders(request);
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    const response = NextResponse.next();
    for (const [header, value] of Object.entries(corsHeaders)) {
      response.headers.set(header, value);
    }
    return response;
  }

  // Apply the stricter dashboard CORS policy to all other API endpoints.
  if (pathname.startsWith('/api') || pathname.startsWith('/ralion/api')) {
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight(request);
    }

    const response = NextResponse.next();
    const corsHeaders = getCorsHeaders(request);
    for (const [header, value] of Object.entries(corsHeaders)) {
      response.headers.set(header, value);
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/ralion/api/:path*'],
};

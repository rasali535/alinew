import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export function middleware(request: NextRequest) {
  // Apply CORS to all /api/ endpoints
  if (request.nextUrl.pathname.startsWith('/api')) {
    // Immediate response for Preflight OPTIONS requests (no auth check, no redirect)
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight(request);
    }

    // Forward request and append CORS headers to the response
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
  matcher: ['/api/:path*'],
};

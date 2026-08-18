import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  return corsJsonResponse({
    ok: true,
    service: "ralion-dynamic-backend",
    timestamp: new Date().toISOString()
  }, undefined, request);
}

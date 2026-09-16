import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { PayPalCardVaultService } from '@ralion/integrations/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function authorized(request: NextRequest): boolean {
  const expected = process.env.PAYPAL_RENEWAL_CRON_SECRET;
  if (!expected || expected.length < 24) return false;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const explicit = request.headers.get('x-ralion-cron-secret') || '';
  return bearer === expected || explicit === expected;
}

export async function POST(request: NextRequest) {
  if (!process.env.PAYPAL_RENEWAL_CRON_SECRET) {
    return corsJsonResponse({ success: false, error: 'Renewal scheduler secret is not configured.' }, { status: 503 }, request);
  }
  if (!authorized(request)) {
    return corsJsonResponse({ success: false, error: 'Unauthorized renewal scheduler request.' }, { status: 401 }, request);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(Number(body?.limit || 25), 50));
    const result = await PayPalCardVaultService.runDueRenewals(limit);
    return corsJsonResponse({ success: true, ...result }, undefined, request);
  } catch (error: any) {
    console.error('[PayPal Renewal Scheduler] Error:', error);
    return corsJsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Recurring billing run failed.' },
      { status: 500 },
      request
    );
  }
}

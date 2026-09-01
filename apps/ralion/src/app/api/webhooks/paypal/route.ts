import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { PayPalService } from '@ralion/integrations';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const rawBodyText = await request.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBodyText);
    } catch {
      return corsJsonResponse({ success: false, error: 'Invalid JSON payload' }, { status: 400 }, request);
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    // 1. Cryptographic Webhook Signature Verification
    const isValidSignature = await PayPalService.verifyWebhookSignature(headers, body);
    if (!isValidSignature) {
      console.warn('[PayPal Webhook] Signature verification failed');
      return corsJsonResponse(
        { success: false, error: 'Invalid PayPal webhook cryptographic signature' },
        { status: 401 },
        request
      );
    }

    // 2. Idempotent Webhook Processing
    const result = await PayPalService.processWebhookEvent(body);

    return corsJsonResponse(
      {
        success: true,
        handled: result.handled,
        action: result.action,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[PayPal Webhook] Internal Error:', err);
    return corsJsonResponse(
      { success: false, error: 'Webhook processing error', details: err?.message },
      { status: 500 },
      request
    );
  }
}

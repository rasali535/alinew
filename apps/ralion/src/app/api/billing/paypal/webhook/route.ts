import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { DurablePayPalService } from '@ralion/integrations/server';

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
      return corsJsonResponse({ success: false, error: 'Invalid JSON payload.' }, { status: 400 }, request);
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const isValidSignature = await DurablePayPalService.verifyWebhookSignature(headers, body);
    if (!isValidSignature) {
      console.warn('[PayPal Webhook] Signature verification failed');
      return corsJsonResponse(
        { success: false, error: 'Invalid PayPal webhook cryptographic signature.' },
        { status: 401 },
        request
      );
    }

    const result = await DurablePayPalService.processWebhookEvent(body);
    if (!result.handled && result.error) {
      return corsJsonResponse(
        { success: false, handled: false, error: result.error },
        { status: 500 },
        request
      );
    }

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
      { success: false, error: 'Webhook processing error.' },
      { status: 500 },
      request
    );
  }
}

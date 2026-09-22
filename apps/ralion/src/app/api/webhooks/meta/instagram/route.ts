import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode') || '';
  const verifyToken = searchParams.get('hub.verify_token') || '';
  const challenge = searchParams.get('hub.challenge') || '';
  const expected = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || '';

  if (mode === 'subscribe' && expected && safeEqual(verifyToken, expected)) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  console.warn('[Instagram Webhook] Verification rejected', {
    mode,
    hasVerifyToken: Boolean(verifyToken),
    configured: Boolean(expected),
  });

  return NextResponse.json(
    { success: false, error: 'Instagram webhook verification failed.' },
    { status: 403 }
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256') || '';
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_INSTAGRAM_APP_SECRET || '';

  if (!appSecret) {
    console.error('[Instagram Webhook] Instagram app secret is not configured.');
    return NextResponse.json(
      { success: false, error: 'Instagram webhook signature verification is not configured.' },
      { status: 503 }
    );
  }

  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');

  if (!signature || !safeEqual(signature, expectedSignature)) {
    console.warn('[Instagram Webhook] Invalid x-hub-signature-256.');
    return NextResponse.json(
      { success: false, error: 'Invalid Instagram webhook signature.' },
      { status: 401 }
    );
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid Instagram webhook JSON.' },
      { status: 400 }
    );
  }

  // Acknowledge quickly. Event-specific comments/messages/insights processing
  // will be attached to this authenticated boundary without changing Meta config.
  const entryCount = Array.isArray(payload?.entry) ? payload.entry.length : 0;
  console.info('[Instagram Webhook] Verified event received', {
    object: payload?.object || 'instagram',
    entryCount,
  });

  return NextResponse.json({ success: true, received: true });
}

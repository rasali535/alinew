import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

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

  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  console.info('[Instagram Webhook] Verified event received', {
    object: payload?.object || 'instagram',
    entryCount: entries.length,
  });

  // Persist signed Instagram messaging events into the same tenant-scoped
  // inbox store used by Growth & Social. The selected-account UI can then
  // switch between Facebook and Instagram without cross-channel leakage.
  try {
    const supabase = getServiceSupabase();

    for (const entry of entries) {
      const igAccountId = String(entry?.id || '');
      if (!igAccountId) continue;

      const { data: connections } = await supabase
        .from('social_connections')
        .select('id,user_id,organization_id,workspace_id,provider_account_id,account_name')
        .eq('provider', 'instagram')
        .eq('provider_account_id', igAccountId)
        .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active']);

      if (!Array.isArray(connections) || connections.length === 0) continue;

      const messagingEvents = Array.isArray(entry?.messaging) ? entry.messaging : [];
      for (const event of messagingEvents) {
        const text = event?.message?.text;
        const senderId = String(event?.sender?.id || '');
        const recipientId = String(event?.recipient?.id || '');
        if (!text || !senderId || !recipientId) continue;

        for (const conn of connections) {
          const isOutbound = senderId === igAccountId;
          const participantId = isOutbound ? recipientId : senderId;
          const eventTimestamp = event?.timestamp
            ? new Date(Number(event.timestamp)).toISOString()
            : new Date().toISOString();

          // Best-effort duplicate guard for webhook retries.
          const { data: existing } = await supabase
            .from('social_inbox_messages')
            .select('id')
            .eq('connection_id', conn.id)
            .eq('provider', 'instagram')
            .eq('conversation_id', participantId)
            .eq('message_text', String(text))
            .eq('timestamp', eventTimestamp)
            .limit(1);

          if (Array.isArray(existing) && existing.length > 0) continue;

          await supabase.from('social_inbox_messages').insert({
            connection_id: conn.id,
            organization_id: conn.organization_id,
            workspace_id: conn.workspace_id,
            provider: 'instagram',
            conversation_id: participantId,
            sender_id: senderId,
            sender_name: isOutbound ? (conn.account_name || 'Instagram') : 'Instagram User',
            recipient_id: recipientId,
            message_text: String(text),
            direction: isOutbound ? 'OUTBOUND' : 'INBOUND',
            status: 'DELIVERED',
            timestamp: eventTimestamp,
          });
        }
      }
    }
  } catch (eventError: any) {
    // Meta webhook delivery should still receive a 200 after signature
    // verification; persistence can be retried by a subsequent webhook event.
    console.warn('[Instagram Webhook] Inbox persistence notice:', eventError?.message || eventError);
  }

  return NextResponse.json({ success: true, received: true });
}

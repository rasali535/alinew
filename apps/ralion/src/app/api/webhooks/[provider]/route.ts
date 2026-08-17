import { NextRequest, NextResponse } from 'next/server';
import { SocialPlatformType } from '@ralion/integrations';
import { SocialWebhookService } from '@/lib/services/social/socialWebhook.service';

export const dynamic = 'force-dynamic';

const SUPPORTED_WEBHOOK_PROVIDERS = ['facebook', 'instagram', 'whatsapp', 'tiktok', 'linkedin', 'x'];

export async function generateStaticParams() {
  return SUPPORTED_WEBHOOK_PROVIDERS.map((provider) => ({ provider }));
}

/**
 * Webhook Verification Handler (Meta / WhatsApp Webhook challenge handshake)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || 'ralion_webhook_verify_secret';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log(`[Webhook] ${provider} webhook verification challenge PASSED`);
    return new NextResponse(challenge, { status: 200 });
  }

  // X / Twitter CRC Challenge Handling
  const crcToken = searchParams.get('crc_token');
  if (provider === 'x' && crcToken) {
    const secret = process.env.TWITTER_CONSUMER_SECRET || 'secret';
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret).update(crcToken).digest('base64');
    return NextResponse.json({ response_token: `sha256=${hmac}` });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * Webhook Event Receiver (Signature validation & ingestion)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get('x-hub-signature-256') ||
      request.headers.get('x-signature-sha256') ||
      request.headers.get('x-twitter-webhooks-signature') ||
      '';

    const isValid = SocialWebhookService.verifySignature({
      provider: provider as SocialPlatformType,
      payload: rawBody,
      signatureHeader: signature,
    });

    const parsedPayload = rawBody ? JSON.parse(rawBody) : {};

    await SocialWebhookService.processWebhook(
      provider as SocialPlatformType,
      parsedPayload,
      isValid
    );

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error(`[Webhook] Error processing ${provider} webhook:`, err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

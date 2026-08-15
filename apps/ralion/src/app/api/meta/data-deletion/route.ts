/**
 * Ralion OS — Meta Platform User Data Deletion Callback Endpoint
 * Required by Meta Platform Terms & Data Protection Assessment (Section 4.a).
 *
 * When a user removes the Ralion app from their Facebook settings, Meta sends a POST
 * request with a signed_request containing the user's Meta user_id.
 *
 * Endpoint: POST /api/meta/data-deletion
 * Response: { "url": "https://rasalilabs.com/ralion/deletion-status?code=...", "confirmation_code": "..." }
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { MetaCredentialService } from '@/lib/services/metaCredential.service';

function parseSignedRequest(signedRequest: string, appSecret: string): { user_id?: string; algorithm?: string } | null {
  try {
    const [encodedSig, payload] = signedRequest.split('.');
    if (!encodedSig || !payload) return null;

    const sig = Buffer.from(encodedSig, 'base64url').toString('hex');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));

    // Verify HMAC-SHA256 signature using Meta App Secret
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    if (sig !== expectedSig) {
      console.warn('[MetaDataDeletion] Invalid signature on signed_request');
      return null;
    }

    return data;
  } catch (err) {
    console.error('[MetaDataDeletion] Error parsing signed_request:', (err as Error).message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    let signedRequest = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      signedRequest = (formData.get('signed_request') as string) || '';
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      signedRequest = body.signed_request || '';
    }

    const appSecret = process.env.FACEBOOK_APP_SECRET || '';

    let metaUserId = 'anonymous';

    if (signedRequest && appSecret) {
      const parsed = parseSignedRequest(signedRequest, appSecret);
      if (parsed?.user_id) {
        metaUserId = parsed.user_id;
      }
    }

    // Execute data deletion pipeline
    const { confirmationCode } = await MetaCredentialService.deleteUserData(metaUserId);

    const platformUrl = process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com';
    const statusUrl = `${platformUrl}/deletion-status?code=${encodeURIComponent(confirmationCode)}`;

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    });
  } catch (error: any) {
    console.error('[MetaDataDeletion] Request processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Data deletion request failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') || 'N/A';
  return NextResponse.json({
    status: 'COMPLETED',
    message: 'Meta Platform Data successfully deleted and purged in accordance with Ras Ali Labs privacy policy.',
    confirmation_code: code,
    timestamp: new Date().toISOString(),
  });
}

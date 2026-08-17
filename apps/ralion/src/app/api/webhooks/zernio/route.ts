import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ZernioSocialService } from '@ralion/integrations';
import { AuditLoggerService } from '@/lib/services/auditLogger.service';

export const dynamic = 'force-static';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

/**
 * Zernio Webhook Verification & Ping Handler
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const challenge = searchParams.get('challenge') || searchParams.get('hub.challenge');

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'ok', endpoint: 'zernio-webhook-receiver' });
}

/**
 * Zernio Webhook Event Ingestion & Dispatcher
 */
export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get('x-zernio-signature') ||
      request.headers.get('x-signature-sha256') ||
      '';

    const isValid = ZernioSocialService.verifyWebhookSignature(rawBody, signature);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const eventType = payload.event || payload.type || payload.event_type || 'notification';
    const profileId = payload.profileId || payload.profile_id;
    const accountId = payload.accountId || payload.account_id;

    // 1. Resolve Ralion Tenant (Never trust organization ID directly from webhook payload)
    let organizationId: string | null = null;
    let workspaceId: string | null = null;

    if (profileId) {
      const { data: profileMapping } = await supabase
        .from('social_provider_profiles')
        .select('organization_id, workspace_id')
        .eq('provider_profile_id', profileId)
        .maybeSingle();

      if (profileMapping) {
        organizationId = profileMapping.organization_id;
        workspaceId = profileMapping.workspace_id;
      }
    }

    if (!organizationId && accountId) {
      const { data: conn } = await supabase
        .from('social_connections')
        .select('organization_id, workspace_id')
        .or(`zernio_account_id.eq.${accountId},provider_account_id.eq.${accountId}`)
        .maybeSingle();

      if (conn) {
        organizationId = conn.organization_id;
        workspaceId = conn.workspace_id;
      }
    }

    // 2. Record Event in Immutable Webhook Events Log
    await supabase.from('social_webhook_events').insert({
      provider: 'zernio',
      event_type: eventType,
      event_id: payload.id || `evt_${Date.now()}`,
      provider_profile_id: profileId || null,
      provider_account_id: accountId || null,
      organization_id: organizationId,
      workspace_id: workspaceId,
      signature_valid: isValid,
      payload,
      processed: isValid,
      processed_at: isValid ? new Date().toISOString() : null,
    });

    if (!isValid) {
      console.warn('[ZernioWebhook] Invalid signature received on webhook endpoint.');
      return NextResponse.json({ success: false, error: 'Invalid HMAC signature' }, { status: 401 });
    }

    // 3. Process Specific Event Types
    switch (eventType) {
      case 'account.connected': {
        if (accountId) {
          await supabase
            .from('social_connections')
            .update({
              connection_status: 'CONNECTED',
              token_status: 'TOKEN_VALID',
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .or(`zernio_account_id.eq.${accountId},provider_account_id.eq.${accountId}`);
        }
        break;
      }

      case 'account.disconnected':
      case 'account.reauth_required': {
        const newStatus = eventType === 'account.reauth_required' ? 'RECONNECT_REQUIRED' : 'DISCONNECTED';
        const tokenStatus = eventType === 'account.reauth_required' ? 'REAUTH_REQUIRED' : 'TOKEN_REVOKED';
        if (accountId) {
          await supabase
            .from('social_connections')
            .update({
              connection_status: newStatus,
              token_status: tokenStatus,
              health_error_message: payload.data?.reason || 'Account requires reauthorization at Zernio.',
              updated_at: new Date().toISOString(),
            })
            .or(`zernio_account_id.eq.${accountId},provider_account_id.eq.${accountId}`);
        }
        break;
      }

      case 'message.received': {
        const msg = payload.data || payload;
        if (msg) {
          await supabase.from('social_inbox_messages').insert({
            connection_id: accountId || 'zernio_inbox',
            workspace_id: workspaceId,
            provider: (msg.platform || 'facebook').toLowerCase(),
            conversation_id: msg.conversationId || msg.senderId || `conv_${Date.now()}`,
            sender_id: msg.senderId || 'user',
            sender_name: msg.senderName || msg.senderHandle || 'Social User',
            sender_avatar_url: msg.senderAvatarUrl || null,
            recipient_id: accountId || 'business',
            message_text: msg.text || msg.message || '[Media message]',
            media_url: msg.mediaUrl || null,
            direction: 'INBOUND',
            status: 'DELIVERED',
            timestamp: msg.timestamp || new Date().toISOString(),
          });
        }
        break;
      }

      case 'post.published':
      case 'post.failed': {
        const postData = payload.data || payload;
        const postId = postData.postId || postData.id;
        if (postId) {
          const status = eventType === 'post.published' ? 'PUBLISHED' : 'FAILED';
          await supabase
            .from('social_posts')
            .update({
              status,
              published_at: eventType === 'post.published' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', postId);
        }
        break;
      }

      case 'webhook.test':
      default:
        break;
    }

    // 4. Emit Audit Event
    await AuditLoggerService.log({
      eventType: 'SOCIAL_WEBHOOK_RECEIVED',
      eventCategory: 'META',
      success: true,
      metadata: {
        provider: 'zernio',
        eventType,
        profileId,
        accountId,
        organizationId,
      },
    });

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error('[ZernioWebhook] Processing error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

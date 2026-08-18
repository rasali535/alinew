import { NextRequest } from 'next/server';
import { SocialProviderRegistry, SocialPlatformType, ZernioSocialService } from '@ralion/integrations';
import { SocialTokenManager } from '@/lib/services/social/socialTokenManager.service';
import { SocialConnectionHealthService } from '@/lib/services/social/socialConnectionHealth.service';
import { AuditLoggerService } from '@/lib/services/auditLogger.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, getServiceSupabase } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const context = await getCurrentRalionContext(request, { requireAuth: false });

    // If no authenticated context is resolved, return empty list (never leak arbitrary tenant data)
    if (!context) {
      return corsJsonResponse({
        success: true,
        authenticated: false,
        connections: [],
        allCapabilities: SocialProviderRegistry.getAllCapabilities(),
      }, undefined, request);
    }

    const { data: rawConnections, error } = await supabase
      .from('social_connections')
      .select(
        'id, user_id, organization_id, workspace_id, provider, provider_account_id, account_name, username, profile_image_url, account_type, connection_status, token_status, scopes, capabilities, metadata, followers_count, infrastructure_provider, zernio_account_id, zernio_profile_id, connected_at, created_at, updated_at'
      )
      .or(`workspace_id.eq.${context.workspace.id},user_id.eq.${context.user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[SocialConnectionsAPI] DB query notice:', error.message);
    }

    const connections = (rawConnections || []).map((conn: any) => ({
      ...conn,
      avatar_url: conn.profile_image_url || conn.avatar_url || conn.metadata?.avatarUrl || null,
      account_name: conn.account_name || conn.metadata?.pageName || 'Social Account',
    }));

    return corsJsonResponse({
      success: true,
      authenticated: true,
      workspaceId: context.workspace.id,
      connections,
      allCapabilities: SocialProviderRegistry.getAllCapabilities(),
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const body = await request.json();
    const { action, connectionId, provider, userId } = body;

    if (action === 'disconnect') {
      const { data: conn } = await supabase
        .from('social_connections')
        .select('id, infrastructure_provider, zernio_account_id')
        .eq('id', connectionId)
        .maybeSingle();

      if (conn?.infrastructure_provider === 'zernio' && conn.zernio_account_id) {
        try {
          await ZernioSocialService.disconnectAccount(conn.zernio_account_id);
        } catch (zErr: any) {
          console.warn('[SocialConnectionsAPI] Zernio remote disconnect notice:', zErr.message);
        }

        await supabase.from('social_connections').update({
          connection_status: 'DISCONNECTED',
          token_status: 'TOKEN_REVOKED',
          disconnected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', connectionId);

        if (userId) {
          await AuditLoggerService.log({
            eventType: 'SOCIAL_ACCOUNT_DISCONNECTED',
            eventCategory: 'META',
            userId,
            success: true,
            resourceType: 'social_connection',
            resourceId: connectionId,
            metadata: { provider, infrastructure: 'zernio' },
          });
        }
      } else {
        await SocialTokenManager.revokeAndDestroy(connectionId, provider as SocialPlatformType, userId);
      }

      return corsJsonResponse({ success: true, message: `${provider} disconnected successfully` }, undefined, request);
    }

    if (action === 'health_check') {
      const health = await SocialConnectionHealthService.checkConnectionHealth(connectionId);
      return corsJsonResponse({ success: true, health }, undefined, request);
    }

    return corsJsonResponse({ success: false, error: 'Unknown action' }, { status: 400 }, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message }, { status: 500 }, request);
  }
}

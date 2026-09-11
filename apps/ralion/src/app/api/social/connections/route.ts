import { NextRequest } from 'next/server';
import { SocialProviderRegistry } from '@ralion/integrations';
import { SocialDisconnectService } from '@/lib/services/social/socialDisconnect.service';
import { FacebookConnectionStateService } from '@/lib/services/social/facebookConnectionState.service';
import { SocialConnectionHealthService } from '@/lib/services/social/socialConnectionHealth.service';
import { AuditLoggerService } from '@/lib/services/auditLogger.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { requireRalionContext, getServiceSupabase } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const supabase = getServiceSupabase();

  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const { data: rawConnections, error } = await supabase
      .from('social_connections')
      .select(
        'id, user_id, organization_id, workspace_id, provider, provider_account_id, account_name, username, profile_image_url, account_type, connection_status, token_status, scopes, capabilities, metadata, followers_count, infrastructure_provider, zernio_account_id, zernio_profile_id, connected_at, created_at, updated_at'
      )
      .eq('workspace_id', context.workspace.id)
      .eq('organization_id', context.organization.id)
      .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active'])
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
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      connections,
      allCapabilities: SocialProviderRegistry.getAllCapabilities(),
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json();
    const { action, connectionId, provider } = body;
    const resolvedTenantId = context.organization.id;
    const resolvedWorkspaceId = context.workspace.id;
    const resolvedUserId = context.user.id;

    if (action === 'disconnect') {
      const result = await SocialDisconnectService.disconnectSocialProvider({
        tenantId: resolvedTenantId,
        workspaceId: resolvedWorkspaceId,
        userId: resolvedUserId,
        provider: provider || 'facebook',
        connectionId,
      });

      await AuditLoggerService.log({
        eventType: 'SOCIAL_ACCOUNT_DISCONNECTED',
        eventCategory: 'META',
        userId: resolvedUserId,
        success: true,
        resourceType: 'social_connection',
        resourceId: connectionId || `${provider}_all`,
        metadata: { provider, result },
      });

      return corsJsonResponse({
        success: true,
        message: `${provider} disconnected successfully`,
        finalState: result.finalState,
      }, undefined, request);
    }

    if (action === 'facebook_state' || action === 'status') {
      const state = await FacebookConnectionStateService.resolveFacebookConnectionState({
        tenantId: resolvedTenantId,
        workspaceId: resolvedWorkspaceId,
        userId: resolvedUserId,
        forceRefresh: body.forceRefresh,
      });

      return corsJsonResponse({ success: true, state }, undefined, request);
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

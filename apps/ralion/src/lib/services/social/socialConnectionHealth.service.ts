/**
 * Ralion Unified Social Media Architecture — Connection Health Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Periodically verifies token validity, account status, and API reachability
 * across both Native and Zernio connected accounts.
 */

import 'server-only';
import {
  SocialPlatformType,
  SocialProviderRegistry,
  ConnectionHealthResult,
} from '@ralion/integrations/server';
import { SocialTokenManager } from './socialTokenManager.service';
import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

export interface SocialConnectionHealthScope {
  organizationId: string;
  workspaceId: string;
}

export class SocialConnectionHealthService {
  /**
   * Run a live health check on a specific social connection (Native or Zernio)
   */
  static async checkConnectionHealth(connectionId: string, scope: SocialConnectionHealthScope): Promise<ConnectionHealthResult> {
    if (!scope?.organizationId || !scope?.workspaceId) {
      throw Object.assign(new Error('Canonical tenant context is required.'), { statusCode: 403 });
    }
    const supabase = getServiceSupabase();

    const { data: conn, error } = await supabase
      .from('social_connections')
      .select('id, provider, provider_account_id, infrastructure_provider, zernio_account_id, zernio_profile_id')
      .eq('id', connectionId)
      .eq('organization_id', scope.organizationId)
      .eq('workspace_id', scope.workspaceId)
      .maybeSingle();

    if (error) {
      throw Object.assign(new Error('Unable to resolve social connection.'), { statusCode: 503 });
    }
    if (!conn) {
      throw Object.assign(new Error('Social connection not found.'), { statusCode: 404 });
    }

    const provider = conn.provider as SocialPlatformType;
    const isZernio = conn.infrastructure_provider === 'zernio';

    // 1. Zernio-managed Connection Health Check
    if (isZernio) {
      const zernioAccountId = conn.zernio_account_id || conn.provider_account_id;
      try {
        const zernioProvider = SocialProviderRegistry.getZernioProvider();
        const health = await zernioProvider.healthCheck('zernio_master', zernioAccountId);

        await supabase.from('social_connections').update({
          connection_status: health.status,
          token_status: health.tokenStatus,
          last_health_check_at: health.checkedAt,
          health_error_message: health.errorMessage || null,
        }).eq('id', connectionId)
          .eq('organization_id', scope.organizationId)
          .eq('workspace_id', scope.workspaceId);

        return health;
      } catch (err: any) {
        const failResult: ConnectionHealthResult = {
          healthy: false,
          status: 'PLATFORM_UNAVAILABLE',
          tokenStatus: 'REAUTH_REQUIRED',
          errorMessage: err.message || 'Zernio infrastructure health check failed',
          checkedAt: new Date().toISOString(),
        };

        await supabase.from('social_connections').update({
          connection_status: 'NEEDS_ATTENTION',
          last_health_check_at: failResult.checkedAt,
          health_error_message: failResult.errorMessage,
        }).eq('id', connectionId)
          .eq('organization_id', scope.organizationId)
          .eq('workspace_id', scope.workspaceId);

        return failResult;
      }
    }

    // 2. Native Connection Health Check
    const token = await SocialTokenManager.getValidToken(connectionId, provider);

    if (!token) {
      const result: ConnectionHealthResult = {
        healthy: false,
        status: 'RECONNECT_REQUIRED',
        tokenStatus: 'TOKEN_EXPIRED',
        errorMessage: 'OAuth access token has expired or is missing.',
        checkedAt: new Date().toISOString(),
      };

      await supabase.from('social_connections').update({
        connection_status: 'RECONNECT_REQUIRED',
        token_status: 'TOKEN_EXPIRED',
        last_health_check_at: result.checkedAt,
        health_error_message: result.errorMessage,
      }).eq('id', connectionId)
      .eq('organization_id', scope.organizationId)
      .eq('workspace_id', scope.workspaceId);

      return result;
    }

    try {
      const adapter = SocialProviderRegistry.getProvider(provider, 'native');
      const health = await adapter.healthCheck(token, conn.provider_account_id);

      await supabase.from('social_connections').update({
        connection_status: health.status,
        token_status: health.tokenStatus,
        last_health_check_at: health.checkedAt,
        health_error_message: health.errorMessage || null,
      }).eq('id', connectionId)
      .eq('organization_id', scope.organizationId)
      .eq('workspace_id', scope.workspaceId);

      return health;
    } catch (err: any) {
      const failResult: ConnectionHealthResult = {
        healthy: false,
        status: 'PLATFORM_UNAVAILABLE',
        tokenStatus: 'REAUTH_REQUIRED',
        errorMessage: err.message || 'API endpoint unreachable',
        checkedAt: new Date().toISOString(),
      };

      await supabase.from('social_connections').update({
        connection_status: 'NEEDS_ATTENTION',
        last_health_check_at: failResult.checkedAt,
        health_error_message: failResult.errorMessage,
      }).eq('id', connectionId)
      .eq('organization_id', scope.organizationId)
      .eq('workspace_id', scope.workspaceId);

      return failResult;
    }
  }

  /**
   * Health check all active connections for a user or workspace
   */
  static async checkAllConnections(userId: string, scope: SocialConnectionHealthScope): Promise<Record<string, ConnectionHealthResult>> {
    if (!scope?.organizationId || !scope?.workspaceId) {
      throw Object.assign(new Error('Canonical tenant context is required.'), { statusCode: 403 });
    }
    const supabase = getServiceSupabase();
    const { data: conns } = await supabase
      .from('social_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', scope.organizationId)
      .eq('workspace_id', scope.workspaceId)
      .eq('connection_status', 'CONNECTED');

    const results: Record<string, ConnectionHealthResult> = {};
    for (const conn of conns || []) {
      results[conn.id] = await this.checkConnectionHealth(conn.id, scope);
    }
    return results;
  }
}

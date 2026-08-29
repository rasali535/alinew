/**
 * Ralion Unified Social Media Architecture — Provider Routing Engine
 * Ras Ali Labs (Pty) Ltd
 *
 * Dynamically resolves provider execution (Zernio vs Native) based on:
 * 1. Global & platform-specific feature flags
 * 2. Workspace routing rules (social_provider_routing)
 * 3. Connection-level infrastructure_provider metadata
 * 4. Safe fallback rules (strictly prevents duplicate publishing)
 */

import { createClient } from '@supabase/supabase-js';
import {
  SocialPlatformType,
  InfrastructureProviderType,
  SocialProviderRegistry,
  SocialProvider,
  ZernioSocialService,
} from '@ralion/integrations';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export interface RoutingDecision {
  platform: SocialPlatformType;
  provider: InfrastructureProviderType;
  adapter: SocialProvider;
  zernioProfileId?: string;
  fallbackAllowed: boolean;
  reason: string;
}

export class SocialProviderRouter {
  /**
   * Check feature flags for Zernio and specific platforms
   */
  static isZernioEnabledForPlatform(platform: SocialPlatformType): boolean {
    // 1. Global Master Switch
    const globalEnabled = process.env.ZERNIO_SOCIAL_ENABLED !== 'false';
    if (!globalEnabled) return false;

    // 2. Check server-side key configuration
    if (!ZernioSocialService.isConfigured()) return false;

    // 3. Platform-Specific Switches
    const envKey = `ZERNIO_${platform.toUpperCase()}_ENABLED`;
    const platformEnabled = process.env[envKey] !== 'false';

    return platformEnabled;
  }

  private static provisioningLocks = new Map<string, Promise<string | null>>();

  /**
   * Resolve or provision a dedicated Zernio Profile for a Ralion Workspace/Organization.
   * Strictly enforces 1:1 workspace isolation:
   * - Never reuses another workspace's Zernio profile.
   * - Never selects existingZProfiles[0] or array position.
   * - Always calls ZernioSocialService.createProfile for new workspaces.
   */
  static async getOrCreateZernioProfile(params: {
    workspaceId?: string;
    organizationId?: string;
    userId: string;
    workspaceName?: string;
  }): Promise<string | null> {
    if (!ZernioSocialService.isConfigured()) return null;

    const targetWorkspaceId = params.workspaceId || params.organizationId || params.userId;
    const lockKey = `zernio_profile_${targetWorkspaceId}`;

    if (this.provisioningLocks.has(lockKey)) {
      return this.provisioningLocks.get(lockKey)!;
    }

    const provisioningPromise = (async () => {
      const supabase = getServiceSupabase();

      // 1. Check existing mapping in database for this specific workspace / user
      try {
        let query = supabase
          .from('social_provider_profiles')
          .select('provider_profile_id')
          .eq('provider', 'zernio')
          .eq('status', 'ACTIVE');

        if (params.workspaceId) {
          query = query.eq('workspace_id', params.workspaceId);
        } else if (params.organizationId) {
          query = query.eq('organization_id', params.organizationId);
        } else {
          query = query.eq('user_id', params.userId);
        }

        const { data: existing } = await query.maybeSingle();
        if (existing?.provider_profile_id) {
          return existing.provider_profile_id;
        }
      } catch (dbErr: any) {
        console.warn('[SocialProviderRouter] DB check error:', dbErr.message);
      }

      // 2. Create or find dedicated profile in Zernio for this specific workspace
      const uniqueProfileName = params.workspaceName 
        ? `${params.workspaceName} (${targetWorkspaceId.slice(0, 8)})`
        : `Ralion Workspace (${targetWorkspaceId})`;

      let zProfileId: string | null = null;

      try {
        const zProfile = await ZernioSocialService.createProfile(
          uniqueProfileName,
          `Dedicated Ralion Workspace Profile for ${targetWorkspaceId}`
        );
        if (zProfile?.id) {
          zProfileId = zProfile.id;
        }
      } catch (createErr: any) {
        // If profile with this unique workspace name already exists on Zernio, resolve ONLY that exact match
        if (createErr?.message?.includes('409') || createErr?.message?.includes('already exists')) {
          try {
            const zProfiles = await ZernioSocialService.listProfiles();
            const exactMatch = zProfiles.find(
              (p: any) => p.name === uniqueProfileName || p.name?.includes(targetWorkspaceId)
            );
            if (exactMatch?.id) {
              zProfileId = exactMatch.id;
            }
          } catch (listErr: any) {
            console.warn('[SocialProviderRouter] List profiles error on 409 resolution:', listErr.message);
          }
        }

        if (!zProfileId) {
          console.error('[SocialProviderRouter] Failed to auto-provision dedicated Zernio profile:', createErr.message);
          throw new Error(`Failed to provision dedicated Zernio social profile for workspace ${targetWorkspaceId}: ${createErr.message}`);
        }
      }

      if (zProfileId) {
        // Save mapping in database
        try {
          await supabase.from('social_provider_profiles').upsert({
            workspace_id: params.workspaceId || targetWorkspaceId,
            organization_id: params.organizationId || null,
            user_id: params.userId,
            provider: 'zernio',
            provider_profile_id: zProfileId,
            profile_name: uniqueProfileName,
            status: 'ACTIVE',
            metadata: {
              provisionedAt: new Date().toISOString(),
              workspaceId: targetWorkspaceId,
            },
          }, { onConflict: 'workspace_id,provider' });
        } catch (dbInsertErr: any) {
          console.warn('[SocialProviderRouter] DB insert warning for new profile:', dbInsertErr.message);
        }

        return zProfileId;
      }

      return null;
    })();

    this.provisioningLocks.set(lockKey, provisioningPromise);
    try {
      return await provisioningPromise;
    } finally {
      this.provisioningLocks.delete(lockKey);
    }
  }

  /**
   * Resolve provider routing for a specific platform and workspace
   */
  static async resolveRouting(params: {
    platform: SocialPlatformType;
    workspaceId?: string;
    organizationId?: string;
    userId: string;
    connectionInfrastructure?: InfrastructureProviderType;
  }): Promise<RoutingDecision> {
    // If connection explicitly specifies infrastructure provider, honor it
    if (params.connectionInfrastructure) {
      const adapter = SocialProviderRegistry.getProvider(params.platform, params.connectionInfrastructure);
      const zernioProfileId =
        params.connectionInfrastructure === 'zernio'
          ? await this.getOrCreateZernioProfile(params)
          : undefined;

      return {
        platform: params.platform,
        provider: params.connectionInfrastructure,
        adapter,
        zernioProfileId: zernioProfileId || undefined,
        fallbackAllowed: false, // Strict: do not auto-fallback if connection is bound to a provider
        reason: `Connection explicitly bound to ${params.connectionInfrastructure}`,
      };
    }

    // Check DB routing table
    const supabase = getServiceSupabase();
    if (params.workspaceId) {
      const { data: routingRow } = await supabase
        .from('social_provider_routing')
        .select('*')
        .eq('workspace_id', params.workspaceId)
        .eq('platform', params.platform)
        .eq('enabled', true)
        .maybeSingle();

      if (routingRow) {
        const providerType = routingRow.provider as InfrastructureProviderType;
        const adapter = SocialProviderRegistry.getProvider(params.platform, providerType);
        const zernioProfileId =
          providerType === 'zernio' ? await this.getOrCreateZernioProfile(params) : undefined;

        return {
          platform: params.platform,
          provider: providerType,
          adapter,
          zernioProfileId: zernioProfileId || undefined,
          fallbackAllowed: routingRow.fallback_provider !== 'none',
          reason: 'Custom workspace routing rule applied',
        };
      }
    }

    // Default strategy: Use Zernio if enabled and configured; otherwise Native
    const zernioActive = this.isZernioEnabledForPlatform(params.platform);
    if (zernioActive) {
      const zernioProfileId = await this.getOrCreateZernioProfile(params);
      if (zernioProfileId) {
        return {
          platform: params.platform,
          provider: 'zernio',
          adapter: SocialProviderRegistry.getZernioProvider(),
          zernioProfileId,
          fallbackAllowed: false, // Idempotency protection: fallback must be explicitly safe
          reason: 'Routed to Zernio infrastructure by default policy',
        };
      }
    }

    return {
      platform: params.platform,
      provider: 'native',
      adapter: SocialProviderRegistry.getProvider(params.platform, 'native'),
      fallbackAllowed: false,
      reason: 'Routed to Native provider adapter',
    };
  }

  /**
   * Synchronize all active accounts from Zernio into Ralion social_connections
   */
  static async syncAccountsFromZernio(params: {
    userId: string;
    workspaceId?: string;
    organizationId?: string;
  }): Promise<any[]> {
    if (!ZernioSocialService.isConfigured()) return [];

    const profileId = await this.getOrCreateZernioProfile(params);
    if (!profileId) return [];

    try {
      const zAccounts = await ZernioSocialService.getAccounts(profileId);
      const supabase = getServiceSupabase();
      const synced: any[] = [];

      for (const a of zAccounts) {
        const platform = (a.platform || 'facebook').toLowerCase();
        const row = {
          user_id: params.userId,
          organization_id: params.organizationId || null,
          workspace_id: params.workspaceId || null,
          provider: platform,
          provider_account_id: a.id,
          account_name: a.name || 'Connected Account',
          username: a.username || a.name,
          profile_image_url: a.avatarUrl || null,
          connection_status: (a.status === 'connected' ? 'CONNECTED' : a.status === 'reauth_required' ? 'RECONNECT_REQUIRED' : 'DISCONNECTED') as any,
          token_status: 'TOKEN_VALID' as any,
          infrastructure_provider: 'zernio' as any,
          zernio_account_id: a.id,
          zernio_profile_id: profileId,
          capabilities: a.capabilities || {},
          followers_count: a.followersCount || 0,
          last_sync_at: new Date().toISOString(),
          connected_at: a.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        try {
          await supabase.from('social_connections').upsert(row, {
            onConflict: 'user_id,provider,provider_account_id',
          });
          synced.push(row);
        } catch (dbErr: any) {
          console.warn(`[SocialProviderRouter] DB sync warning for ${platform}:`, dbErr.message);
          synced.push(row);
        }
      }

      return synced;
    } catch (err: any) {
      console.warn('[SocialProviderRouter] Zernio syncAccounts error:', err.message);
      return [];
    }
  }
}


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
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
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

  /**
   * Resolve or provision a Zernio Profile for a Ralion Workspace/Organization
   */
  static async getOrCreateZernioProfile(params: {
    workspaceId?: string;
    organizationId?: string;
    userId: string;
    workspaceName?: string;
  }): Promise<string | null> {
    if (!ZernioSocialService.isConfigured()) return null;

    const supabase = getServiceSupabase();

    // 1. Check existing mapping in database
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

    // 2. Check if Zernio already has active profiles
    try {
      const existingZProfiles = await ZernioSocialService.listProfiles();
      if (existingZProfiles.length > 0 && existingZProfiles[0].id) {
        const defaultId = existingZProfiles[0].id;
        // Attempt to persist mapping
        try {
          await supabase.from('social_provider_profiles').upsert({
            workspace_id: params.workspaceId || null,
            organization_id: params.organizationId || null,
            user_id: params.userId,
            provider: 'zernio',
            provider_profile_id: defaultId,
            profile_name: existingZProfiles[0].name || 'Default Workspace Profile',
            status: 'ACTIVE',
          }, { onConflict: 'provider_profile_id' });
        } catch {
          // Continue even if DB write is pending migration
        }
        return defaultId;
      }
    } catch (listErr: any) {
      console.warn('[SocialProviderRouter] List profiles error:', listErr.message);
    }

    // 3. Create new profile in Zernio
    try {
      const profileName = params.workspaceName || `Ralion Workspace ${params.workspaceId || params.userId}`;
      const zProfile = await ZernioSocialService.createProfile(
        profileName,
        `Ralion Workspace Profile (${params.workspaceId || params.userId})`
      );

      if (zProfile?.id) {
        // Save mapping in database
        try {
          await supabase.from('social_provider_profiles').insert({
            workspace_id: params.workspaceId || null,
            organization_id: params.organizationId || null,
            user_id: params.userId,
            provider: 'zernio',
            provider_profile_id: zProfile.id,
            profile_name: profileName,
            status: 'ACTIVE',
          });
        } catch {
          // Continue even if DB write is pending migration
        }

        return zProfile.id;
      }
    } catch (err: any) {
      console.warn('[SocialProviderRouter] Failed to auto-provision Zernio profile:', err.message);
    }

    return null;
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
}

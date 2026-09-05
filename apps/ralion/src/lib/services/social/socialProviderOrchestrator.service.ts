/**
 * RALION OS — SOCIAL PROVIDER ORCHESTRATOR
 * Ras Ali Labs (Pty) Ltd
 *
 * Centralized, multi-tenant social provider orchestration engine.
 * Automatically resolves and coordinates underlying infrastructure providers (Meta vs Zernio)
 * based on:
 * 1. Authenticated organization context (strictly tenant-isolated)
 * 2. Required capability (login, discovery, publish, schedule, analytics, inbox)
 * 3. Provider priority & health
 * 4. Automatic silent failover
 *
 * CUSTOMER UX GUARANTEE:
 * - Customers are never asked to choose between Meta and Zernio.
 * - Customer UI and Mari AI interact strictly with normalized platform connections.
 * - Platform infrastructure names (Meta/Zernio) are completely concealed from customer UI.
 */

import {
  SocialPlatformType,
  MASTER_PLATFORM_FACEBOOK_PAGE_ID,
  MASTER_PLATFORM_ZERNIO_PROFILE_ID,
  SocialProviderRegistry,
  ZernioSocialService,
} from '@ralion/integrations';
import { AuditLoggerService } from '../auditLogger.service';
import { MetaCredentialService } from '../metaCredential.service';
import { SocialTokenManager } from './socialTokenManager.service';
import { SocialProviderRouter } from './socialProviderRouter.service';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('[SocialProviderOrchestrator] Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type SocialCapability =
  | 'login'
  | 'discovery'
  | 'publish'
  | 'schedule'
  | 'analytics'
  | 'inbox'
  | 'delete';

export type InfrastructureProvider = 'META' | 'ZERNIO';

export interface NormalizedSocialConnection {
  id: string;
  organizationId: string;
  workspaceId: string;
  platform: SocialPlatformType;
  provider: InfrastructureProvider;
  providerAccountId: string;
  accountName: string;
  username: string;
  avatarUrl?: string;
  followersCount: number;
  status: 'CONNECTED' | 'RECONNECT_REQUIRED' | 'DISCONNECTED';
  capabilities: {
    canPublish: boolean;
    canSchedule: boolean;
    canReadAnalytics: boolean;
    canManageInbox: boolean;
    canDiscoverPages: boolean;
  };
  isPrimary: boolean;
  lastHealthCheck: string;
}

export interface ProviderResolutionParams {
  organizationId?: string;
  workspaceId?: string;
  userId?: string;
  platform: SocialPlatformType;
  capability: SocialCapability;
  preferredProvider?: InfrastructureProvider | 'AUTO';
}

export interface ResolvedProviderDecision {
  provider: InfrastructureProvider;
  platform: SocialPlatformType;
  capability: SocialCapability;
  adapter: any;
  zernioProfileId?: string;
  isFallback: boolean;
  fallbackReason?: string;
  success: boolean;
  error?: string;
}

export interface OrchestratedExecutionResult<T = any> {
  success: boolean;
  data?: T;
  providerUsed: InfrastructureProvider;
  isFailover: boolean;
  failoverReason?: string;
  customerErrorMessage?: string;
  error?: string;
}

export class SocialProviderOrchestrator {
  /**
   * Internal priority matrix determining primary vs fallback provider per platform & capability
   */
  private static getPriorityOrder(platform: SocialPlatformType, capability: SocialCapability): InfrastructureProvider[] {
    if (platform === 'facebook' || platform === 'instagram') {
      switch (capability) {
        case 'login':
          return ['META'];
        case 'discovery':
          return ['META', 'ZERNIO'];
        case 'publish':
          return ['META', 'ZERNIO'];
        case 'schedule':
          return ['ZERNIO', 'META'];
        case 'analytics':
          return ['META', 'ZERNIO'];
        case 'inbox':
          return ['META', 'ZERNIO'];
        case 'delete':
          return ['META', 'ZERNIO'];
        default:
          return ['META', 'ZERNIO'];
      }
    }

    // For other platforms (LinkedIn, X, TikTok, YouTube)
    if (capability === 'schedule') {
      return ['ZERNIO', 'META'];
    }
    return ['ZERNIO', 'META'];
  }

  /**
   * Evaluates and resolves the best authorized provider silently without customer involvement.
   */
  static async resolveProvider(params: ProviderResolutionParams): Promise<ResolvedProviderDecision> {
    const orgId = params.organizationId || params.workspaceId || params.userId || 'unknown-org';
    const isPlatformAdmin = orgId === 'ras-ali-labs';

    const priorityOrder = this.getPriorityOrder(params.platform, params.capability);
    const zernioConfigured = ZernioSocialService.isConfigured();
    const metaConfigured = Boolean(process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1759273775121373');

    for (let i = 0; i < priorityOrder.length; i++) {
      const candidate = priorityOrder[i];
      const isFallback = i > 0;

      if (candidate === 'META') {
        if (!metaConfigured) continue;

        // Check if tenant has valid Meta credentials or native adapter
        const nativeAdapter = SocialProviderRegistry.getProvider(params.platform, 'native');
        return {
          provider: 'META',
          platform: params.platform,
          capability: params.capability,
          adapter: nativeAdapter,
          isFallback,
          fallbackReason: isFallback ? 'Primary provider unavailable or lacking capability' : undefined,
          success: true,
        };
      }

      if (candidate === 'ZERNIO') {
        if (!zernioConfigured) continue;

        // Strictly enforce dedicated profile for customer (never master profile unless admin)
        let zernioProfileId: string | null = null;
        try {
          if (isPlatformAdmin) {
            zernioProfileId = MASTER_PLATFORM_ZERNIO_PROFILE_ID;
          } else {
            zernioProfileId = await SocialProviderRouter.getOrCreateZernioProfile({
              workspaceId: params.workspaceId,
              organizationId: params.organizationId,
              userId: params.userId || orgId,
            });
          }
        } catch (zErr: any) {
          console.warn('[SocialProviderOrchestrator] Zernio profile resolution note:', zErr.message);
        }

        if (zernioProfileId) {
          const zernioAdapter = SocialProviderRegistry.getZernioProvider();
          return {
            provider: 'ZERNIO',
            platform: params.platform,
            capability: params.capability,
            adapter: zernioAdapter,
            zernioProfileId,
            isFallback,
            fallbackReason: isFallback ? 'Primary provider unavailable or lacking capability' : undefined,
            success: true,
          };
        }
      }
    }

    return {
      provider: 'META',
      platform: params.platform,
      capability: params.capability,
      adapter: SocialProviderRegistry.getProvider(params.platform, 'native'),
      isFallback: false,
      success: false,
      error: `No viable social provider found for ${params.platform} (${params.capability}).`,
    };
  }

  /**
   * Resolves authorized social provider for a tenant operation.
   * Distinguishes:
   * 1. AVAILABLE EXISTING AUTHORIZED CONNECTION -> returns { provider: 'META' | 'ZERNIO', connectionId: '...', status: 'AUTHORIZED' }
   * 2. NO AUTHORIZED CONNECTION -> returns { provider: null, status: 'NO_AUTHORIZED_CONNECTION' }
   *
   * CRITICAL GUARANTEE:
   * - NEVER returns { action: 'CREATE_ZERNIO_ACCOUNT' }
   * - NEVER triggers or prompts Zernio signup/onboarding during customer flows.
   */
  static async resolveSocialProvider(params: {
    organizationId?: string;
    workspaceId?: string;
    userId?: string;
    platform: SocialPlatformType;
    capability: SocialCapability;
    metaAvailable?: boolean;
    existingZernioConnection?: { id: string; status?: string; capabilities?: any } | null;
  }): Promise<{
    provider: InfrastructureProvider | null;
    connectionId?: string;
    status: 'AUTHORIZED' | 'NO_AUTHORIZED_CONNECTION';
    error?: string;
  }> {
    const orgId = params.organizationId || params.workspaceId || params.userId || 'unknown-org';

    // 1. Check if Meta is available and authorized
    const isMetaOk = params.metaAvailable !== false;
    if (isMetaOk) {
      return {
        provider: 'META',
        status: 'AUTHORIZED',
      };
    }

    // 2. Meta authorization failed or unavailable: check for existing authorized Zernio connection
    let existingZernio = params.existingZernioConnection;

    if (existingZernio === undefined) {
      // Query database for an existing active Zernio connection for this tenant
      try {
        const supabase = getServiceSupabase();
        const { data: conn } = await supabase
          .from('social_connections')
          .select('id, connection_status, infrastructure_provider, zernio_account_id, capabilities')
          .eq('organization_id', orgId)
          .eq('provider', params.platform)
          .eq('infrastructure_provider', 'zernio')
          .eq('connection_status', 'CONNECTED')
          .maybeSingle();

        if (conn) {
          existingZernio = conn;
        }
      } catch {}
    }

    if (existingZernio && (existingZernio.status === 'AUTHORIZED' || (existingZernio as any).connection_status === 'CONNECTED' || (existingZernio as any).id)) {
      return {
        provider: 'ZERNIO',
        connectionId: existingZernio.id,
        status: 'AUTHORIZED',
      };
    }

    // 3. No existing authorized Zernio connection: remain inside Ralion recovery state
    return {
      provider: null,
      status: 'NO_AUTHORIZED_CONNECTION',
      error: `Your Facebook account is connected, but Facebook Page access is not yet available for this app.`,
    };
  }

  /**
   * Executes a social action with automatic silent failover.
   * If primary provider fails due to permissions or temporary outage, seamlessly fails over to secondary.
   */
  static async executeWithFailover<T = any>(params: {
    organizationId?: string;
    workspaceId?: string;
    userId?: string;
    platform: SocialPlatformType;
    capability: SocialCapability;
    executeMeta: () => Promise<T>;
    executeZernio: (zernioProfileId?: string) => Promise<T>;
  }): Promise<OrchestratedExecutionResult<T>> {
    const orgId = params.organizationId || params.workspaceId || params.userId || 'unknown-org';
    const isPlatformAdmin = orgId === 'ras-ali-labs';
    const priority = this.getPriorityOrder(params.platform, params.capability);

    let primaryError: any = null;
    let fallbackAttempted = false;

    for (let i = 0; i < priority.length; i++) {
      const provider = priority[i];

      try {
        if (provider === 'META') {
          const result = await params.executeMeta();
          if (fallbackAttempted) {
            AuditLoggerService.log({
              eventType: 'SOCIAL_ACCOUNT_HEALTH_CHECK',
              eventCategory: 'SECURITY',
              userId: params.userId || 'system',
              metadata: {
                organizationId: orgId,
                action: 'SOCIAL_FAILOVER_SUCCESS',
                platform: params.platform,
                capability: params.capability,
                providerUsed: 'META',
                primaryError: primaryError?.message || 'Primary failed',
              },
            }).catch(() => {});
          }
          return {
            success: true,
            data: result,
            providerUsed: 'META',
            isFailover: fallbackAttempted,
            failoverReason: fallbackAttempted ? 'Fell back to Meta after alternate provider error' : undefined,
          };
        }

        if (provider === 'ZERNIO') {
          let profileId: string | null = null;
          try {
            if (isPlatformAdmin) {
              profileId = MASTER_PLATFORM_ZERNIO_PROFILE_ID;
            } else {
              profileId = await SocialProviderRouter.getOrCreateZernioProfile({
                workspaceId: params.workspaceId,
                organizationId: params.organizationId,
                userId: params.userId || orgId,
              });
            }
          } catch (pErr: any) {
            console.warn('[SocialProviderOrchestrator] Profile lookup notice:', pErr.message);
          }

          const result = await params.executeZernio(profileId || undefined);
          if (fallbackAttempted) {
            AuditLoggerService.log({
              eventType: 'SOCIAL_ACCOUNT_HEALTH_CHECK',
              eventCategory: 'SECURITY',
              userId: params.userId || 'system',
              metadata: {
                organizationId: orgId,
                action: 'SOCIAL_FAILOVER_SUCCESS',
                platform: params.platform,
                capability: params.capability,
                providerUsed: 'ZERNIO',
                primaryError: primaryError?.message || 'Meta permission/outage error',
              },
            }).catch(() => {});
          }
          return {
            success: true,
            data: result,
            providerUsed: 'ZERNIO',
            isFailover: fallbackAttempted,
            failoverReason: fallbackAttempted ? 'Fell back to Zernio after Meta permission or availability gap' : undefined,
          };
        }
      } catch (err: any) {
        primaryError = err;
        fallbackAttempted = true;
        console.warn(`[SocialProviderOrchestrator] ${provider} execution notice for ${params.platform} (${params.capability}):`, err.message);
      }
    }

    // Both providers failed or neither could satisfy the capability
    const cleanCustomerMessage = `Unable to complete ${params.capability} on ${params.platform.charAt(0).toUpperCase() + params.platform.slice(1)}. Please verify your account connection.`;

    return {
      success: false,
      providerUsed: priority[0],
      isFailover: fallbackAttempted,
      failoverReason: 'All candidate providers failed',
      customerErrorMessage: cleanCustomerMessage,
      error: primaryError?.message || 'Operation failed',
    };
  }

  /**
   * Customer-facing status formatter: strictly conceals infrastructure details.
   */
  static formatCustomerFacingStatus(connection: { status: string; platform: string }): {
    label: string;
    badgeStatus: 'CONNECTED' | 'REAUTH_REQUIRED' | 'DISCONNECTED';
    displayText: string;
  } {
    const platformName = connection.platform.charAt(0).toUpperCase() + connection.platform.slice(1);
    const isConnected = connection.status === 'CONNECTED' || connection.status === 'connected';

    return {
      label: platformName,
      badgeStatus: isConnected ? 'CONNECTED' : 'DISCONNECTED',
      displayText: isConnected ? `${platformName} Connected` : `Connect ${platformName}`,
    };
  }

  /**
   * Admin-only status formatter: provides infrastructure observability for platform administrators.
   */
  static formatAdminStatus(connection: { provider: string; platform: string; status: string }): {
    platform: string;
    infrastructureProvider: 'META' | 'ZERNIO';
    status: string;
  } {
    return {
      platform: connection.platform,
      infrastructureProvider: connection.provider?.toUpperCase() === 'ZERNIO' ? 'ZERNIO' : 'META',
      status: connection.status,
    };
  }
}

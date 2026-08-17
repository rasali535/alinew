/**
 * Ralion Unified Social Media Architecture — Publishing Engine
 * Ras Ali Labs (Pty) Ltd
 *
 * Coordinates multi-platform parallel publishing with atomic per-platform statuses,
 * provider routing (Zernio vs Native), stable idempotency keys, and audit logging.
 */

import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  SocialPlatformType,
  PublishResponse,
  InfrastructureProviderType,
} from '@ralion/integrations';
import { SocialContentValidator } from './socialContentValidator.service';
import { SocialTokenManager } from './socialTokenManager.service';
import { SocialProviderRouter } from './socialProviderRouter.service';
import { AuditLoggerService } from '../auditLogger.service';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

export interface PublishRequest {
  userId: string;
  workspaceId?: string;
  organizationId?: string;
  title?: string;
  body: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
  platforms: SocialPlatformType[];
  scheduledFor?: Date;
  authorName?: string;
  idempotencyKey?: string;
}

export interface MultiPublishResult {
  postId: string;
  overallStatus: 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' | 'QUEUED';
  platformResults: Record<SocialPlatformType, PublishResponse>;
  errors: string[];
}

export class SocialPublishingService {
  /**
   * Execute multi-platform content publishing with idempotency and provider routing
   */
  static async publish(params: PublishRequest): Promise<MultiPublishResult> {
    // 1. Pre-Publish Content Validation
    const validation = SocialContentValidator.validate({
      platforms: params.platforms,
      body: params.body,
      mediaUrls: params.mediaUrls,
      mediaTypes: params.mediaTypes,
      scheduledFor: params.scheduledFor,
    });

    if (!validation.valid) {
      const errorMsgs = validation.issues.filter((i) => i.severity === 'ERROR').map((i) => i.message);
      throw new Error(`[SocialPublishing] Content validation failed: ${errorMsgs.join('; ')}`);
    }

    const supabase = getServiceSupabase();
    const idempotencyKey = params.idempotencyKey || `pub_${crypto.randomUUID()}`;

    // 2. If scheduled, save as QUEUED post and return
    if (params.scheduledFor && params.scheduledFor.getTime() > Date.now() + 60000) {
      const { data: post, error } = await supabase
        .from('social_posts')
        .insert({
          user_id: params.userId,
          workspace_id: params.workspaceId || null,
          title: params.title || null,
          body: params.body,
          media_urls: params.mediaUrls || [],
          media_types: params.mediaTypes || [],
          platforms: params.platforms,
          status: 'QUEUED',
          scheduled_for: params.scheduledFor.toISOString(),
          author_name: params.authorName || 'Ralion User',
        })
        .select()
        .single();

      if (error) throw error;

      await AuditLoggerService.log({
        eventType: 'SOCIAL_POST_SCHEDULED',
        eventCategory: 'META',
        userId: params.userId,
        success: true,
        resourceType: 'social_post',
        resourceId: post.id,
        metadata: {
          action: 'post_scheduled',
          platforms: params.platforms,
          scheduled_for: params.scheduledFor,
          idempotencyKey,
        },
      });

      return {
        postId: post.id,
        overallStatus: 'QUEUED',
        platformResults: {} as any,
        errors: [],
      };
    }

    // 3. Find active connections for requested platforms
    const { data: connections } = await supabase
      .from('social_connections')
      .select('id, provider, provider_account_id, connection_status, infrastructure_provider, zernio_account_id, zernio_profile_id')
      .eq('user_id', params.userId)
      .in('provider', params.platforms)
      .eq('connection_status', 'CONNECTED');

    const connMap = new Map<SocialPlatformType, any>();
    for (const c of connections || []) {
      connMap.set(c.provider as SocialPlatformType, c);
    }

    const platformResults: Partial<Record<SocialPlatformType, PublishResponse>> = {};
    const platformPostIds: Record<string, string> = {};
    const errors: string[] = [];

    // 4. Parallel Dispatch with Provider Routing
    const publishPromises = params.platforms.map(async (platform) => {
      const conn = connMap.get(platform);
      if (!conn) {
        platformResults[platform] = {
          success: false,
          error: `No active ${platform} connection found for this user/workspace.`,
          platform,
          publishedAt: new Date().toISOString(),
        };
        errors.push(`${platform}: No active connection`);
        return;
      }

      const infraProvider = (conn.infrastructure_provider || 'native') as InfrastructureProviderType;

      // Resolve routing decision
      const routing = await SocialProviderRouter.resolveRouting({
        platform,
        workspaceId: params.workspaceId,
        organizationId: params.organizationId,
        userId: params.userId,
        connectionInfrastructure: infraProvider,
      });

      try {
        let res: PublishResponse;

        if (routing.provider === 'zernio') {
          // Dispatch via Zernio Infrastructure
          res = await routing.adapter.publish('zernio_master', {
            title: params.title,
            body: params.body,
            mediaUrls: params.mediaUrls,
            mediaTypes: params.mediaTypes,
            idempotencyKey: `${idempotencyKey}_${platform}`,
            zernioProfileId: conn.zernio_profile_id || routing.zernioProfileId,
            zernioAccountIds: [conn.zernio_account_id || conn.provider_account_id],
          });
        } else {
          // Dispatch via Native Provider
          const token = await SocialTokenManager.getValidToken(conn.id, platform);
          if (!token) {
            platformResults[platform] = {
              success: false,
              error: `Authentication token for ${platform} has expired. Please reconnect.`,
              platform,
              publishedAt: new Date().toISOString(),
            };
            errors.push(`${platform}: Token expired`);
            return;
          }

          res = await routing.adapter.publish(token, {
            title: params.title,
            body: params.body,
            mediaUrls: params.mediaUrls,
            mediaTypes: params.mediaTypes,
            pageId: conn.provider_account_id,
          });
        }

        platformResults[platform] = res;
        if (res.success && res.postId) {
          platformPostIds[platform] = res.postId;
        } else if (res.error) {
          errors.push(`${platform}: ${res.error}`);
        }
      } catch (err: any) {
        platformResults[platform] = {
          success: false,
          error: err.message || `Failed to publish to ${platform}`,
          platform,
          publishedAt: new Date().toISOString(),
        };
        errors.push(`${platform}: ${err.message}`);
      }
    });

    await Promise.all(publishPromises);

    // 5. Calculate Overall Status
    const total = params.platforms.length;
    const successes = Object.values(platformResults).filter((r) => r?.success).length;

    let overallStatus: 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' = 'FAILED';
    if (successes === total) {
      overallStatus = 'PUBLISHED';
    } else if (successes > 0) {
      overallStatus = 'PARTIALLY_PUBLISHED';
    }

    // 6. Record Post in Database
    const { data: postRecord } = await supabase
      .from('social_posts')
      .insert({
        user_id: params.userId,
        workspace_id: params.workspaceId || null,
        title: params.title || null,
        body: params.body,
        media_urls: params.mediaUrls || [],
        media_types: params.mediaTypes || [],
        platforms: params.platforms,
        status: overallStatus,
        platform_post_ids: platformPostIds,
        platform_results: platformResults,
        published_at: new Date().toISOString(),
        author_name: params.authorName || 'Ralion User',
      })
      .select()
      .single();

    // 7. Emit Audit Event
    await AuditLoggerService.log({
      eventType: overallStatus === 'FAILED' ? 'SOCIAL_POST_FAILED' : 'SOCIAL_POST_PUBLISHED',
      eventCategory: 'META',
      userId: params.userId,
      success: overallStatus !== 'FAILED',
      resourceType: 'social_post',
      resourceId: postRecord?.id,
      metadata: {
        action: 'multi_platform_publish',
        platforms: params.platforms,
        status: overallStatus,
        success_count: successes,
        total_count: total,
        idempotencyKey,
      },
    });

    return {
      postId: postRecord?.id || `post_${Date.now()}`,
      overallStatus,
      platformResults: platformResults as Record<SocialPlatformType, PublishResponse>,
      errors,
    };
  }
}

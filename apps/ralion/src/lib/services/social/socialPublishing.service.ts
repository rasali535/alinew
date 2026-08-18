/**
 * Ralion Unified Social Media Architecture — Publishing Engine
 * Ras Ali Labs (Pty) Ltd
 *
 * Coordinates multi-platform parallel publishing with atomic per-platform statuses,
 * provider routing (Zernio vs Native), automatic base64 media asset hosting,
 * stable idempotency keys, and audit logging.
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
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';
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
  pageId?: string;
  socialConnectionId?: string;
  idempotencyKey?: string;
}

export interface MultiPublishResult {
  postId: string;
  overallStatus: 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' | 'QUEUED';
  platformResults: Record<SocialPlatformType, PublishResponse>;
  statusCode?: number;
  conflict?: boolean;
  conflictDetails?: any;
  errors: string[];
}

export class SocialPublishingService {
  /**
   * Process media items: Convert base64 data URLs to public Supabase Storage URLs
   */
  private static async processMediaUrls(rawMediaUrls?: string[]): Promise<string[]> {
    if (!rawMediaUrls || rawMediaUrls.length === 0) return [];

    const supabase = getServiceSupabase();
    const processed: string[] = [];

    for (let i = 0; i < rawMediaUrls.length; i++) {
      const item = rawMediaUrls[i];
      if (typeof item === 'string' && item.startsWith('data:')) {
        try {
          const match = item.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            const buffer = Buffer.from(base64Data, 'base64');
            const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg').split('+')[0] || 'png';
            const fileName = `pub_${Date.now()}_${i}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
            const storagePath = `social/${fileName}`;

            const { error: upErr } = await supabase.storage
              .from('social-media-assets')
              .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

            if (!upErr) {
              const { data: pubData } = supabase.storage
                .from('social-media-assets')
                .getPublicUrl(storagePath);
              if (pubData?.publicUrl) {
                processed.push(pubData.publicUrl);
                continue;
              }
            } else {
              console.warn('[SocialPublishing] Storage upload warning:', upErr.message);
            }
          }
        } catch (e: any) {
          console.warn('[SocialPublishing] Media normalization notice:', e.message);
        }
      }
      if (typeof item === 'string' && item.trim()) {
        processed.push(item);
      }
    }

    return processed;
  }

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
      const validationError = new Error(`[SocialPublishing] Content validation failed: ${errorMsgs.join('; ')}`);
      (validationError as any).statusCode = 400;
      throw validationError;
    }

    const supabase = getServiceSupabase();
    const idempotencyKey = params.idempotencyKey || `pub_${crypto.randomUUID()}`;

    // 2. Pre-process media URLs (turn base64 data URLs into persistent public storage URLs)
    const normalizedMediaUrls = await this.processMediaUrls(params.mediaUrls);

    // 3. If scheduled, save as QUEUED post and return
    if (params.scheduledFor && params.scheduledFor.getTime() > Date.now() + 60000) {
      let scheduledPostId = `sched_${Date.now()}`;
      try {
        const { data: post, error } = await supabase
          .from('social_posts')
          .insert({
            user_id: params.userId,
            workspace_id: params.workspaceId || null,
            title: params.title || null,
            body: params.body,
            media_urls: normalizedMediaUrls,
            media_types: params.mediaTypes || [],
            platforms: params.platforms,
            status: 'QUEUED',
            scheduled_for: params.scheduledFor.toISOString(),
            author_name: params.authorName || 'Ralion User',
          })
          .select()
          .maybeSingle();

        if (post?.id) {
          scheduledPostId = post.id;
        }
      } catch (dbErr: any) {
        console.warn('[SocialPublishing] Post schedule persistence notice:', dbErr.message);
      }

      try {
        await AuditLoggerService.log({
          eventType: 'SOCIAL_POST_SCHEDULED',
          eventCategory: 'META',
          userId: params.userId,
          success: true,
          resourceType: 'social_post',
          resourceId: scheduledPostId,
          metadata: {
            action: 'post_scheduled',
            platforms: params.platforms,
            scheduled_for: params.scheduledFor,
            idempotencyKey,
          },
        });
      } catch (auditErr: any) {
        console.warn('[SocialPublishing] Audit log notice:', auditErr.message);
      }

      return {
        postId: scheduledPostId,
        overallStatus: 'QUEUED',
        platformResults: {} as any,
        errors: [],
      };
    }

    // 4. Find active connections for requested platforms strictly matching user or workspace
    let connections: any[] = [];
    try {
      let connQuery = supabase
        .from('social_connections')
        .select('id, provider, provider_account_id, connection_status, infrastructure_provider, zernio_account_id, zernio_profile_id, user_id, workspace_id, organization_id')
        .in('provider', params.platforms)
        .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active']);

      if (params.workspaceId && params.workspaceId !== 'default' && params.workspaceId !== 'default-org') {
        connQuery = connQuery.or(`workspace_id.eq.${params.workspaceId},user_id.eq.${params.userId || params.workspaceId}`);
      } else if (params.userId && params.userId !== 'default-user') {
        connQuery = connQuery.eq('user_id', params.userId);
      }

      const { data } = await connQuery;
      connections = data || [];
    } catch (dbErr: any) {
      console.warn('[SocialPublishing] Connection fetch notice:', dbErr.message);
    }

    const connMap = new Map<SocialPlatformType, any>();
    for (const c of connections || []) {
      connMap.set(c.provider as SocialPlatformType, c);
    }

    const platformResults: Partial<Record<SocialPlatformType, PublishResponse>> = {};
    const platformPostIds: Record<string, string> = {};
    const errors: string[] = [];

    // 5. Parallel Dispatch with Provider Routing
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
          const zernioAccId = conn.zernio_account_id;
          const targetPageId = (params.pageId && !params.pageId.startsWith('6a82') ? params.pageId : null) || conn.metadata?.pageId || conn.page_id || conn.provider_account_id;
          const zernioProfId = conn.zernio_profile_id;

          if (!zernioAccId || !zernioProfId) {
            throw new Error(`[SocialPublishing] Connected ${platform} account is missing valid Zernio account/profile binding.`);
          }

          console.log('[PUBLISHER_IDENTITY]', JSON.stringify({
            platform,
            pageId: targetPageId,
            zernioProfileId: zernioProfId,
            zernioAccountId: zernioAccId,
            provider: 'zernio',
            targetBranding: 'Ralion OS',
          }));

          res = await routing.adapter.publish('zernio_master', {
            title: params.title,
            body: params.body,
            mediaUrls: normalizedMediaUrls,
            mediaTypes: params.mediaTypes,
            idempotencyKey: `${idempotencyKey}_${platform}`,
            zernioProfileId: zernioProfId,
            zernioAccountIds: [zernioAccId],
            pageId: targetPageId,
            options: {
              pageId: targetPageId,
            },
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
            mediaUrls: normalizedMediaUrls,
            mediaTypes: params.mediaTypes,
            pageId: params.pageId || conn.provider_account_id,
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

    // 6. Calculate Overall Status & Response Status Code
    const total = params.platforms.length;
    const successes = Object.values(platformResults).filter((r) => r?.success).length;

    let overallStatus: 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' = 'FAILED';
    if (successes === total) {
      overallStatus = 'PUBLISHED';
    } else if (successes > 0) {
      overallStatus = 'PARTIALLY_PUBLISHED';
    }

    let hasConflict = false;
    let conflictDetails: any = null;
    let highestStatusCode = 200;

    for (const res of Object.values(platformResults)) {
      if (res && res.statusCode) {
        if (res.statusCode === 409) {
          hasConflict = true;
          conflictDetails = res.details || conflictDetails;
        }
        if (!res.success && res.statusCode > highestStatusCode) {
          highestStatusCode = res.statusCode;
        }
      }
    }

    const calculatedStatusCode =
      overallStatus === 'PUBLISHED'
        ? 200
        : overallStatus === 'PARTIALLY_PUBLISHED'
        ? 200
        : hasConflict
        ? 409
        : highestStatusCode > 200
        ? highestStatusCode
        : 422;

    // 7. Record Post in Database (Graceful Non-Blocking Persistence)
    let postRecord: any = null;
    try {
      const { data } = await supabase
        .from('social_posts')
        .insert({
          user_id: params.userId,
          workspace_id: params.workspaceId || null,
          title: params.title || null,
          body: params.body,
          media_urls: normalizedMediaUrls,
          media_types: params.mediaTypes || [],
          platforms: params.platforms,
          status: overallStatus,
          platform_post_ids: platformPostIds,
          platform_results: platformResults,
          published_at: new Date().toISOString(),
          author_name: params.authorName || 'Ralion User',
        })
        .select()
        .maybeSingle();
      postRecord = data;
    } catch (dbErr: any) {
      console.warn('[SocialPublishing] Post record notice:', dbErr.message);
    }

    // 8. Emit Audit Event
    try {
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
          statusCode: calculatedStatusCode,
          conflict: hasConflict,
          success_count: successes,
          total_count: total,
          idempotencyKey,
        },
      });
    } catch (auditErr: any) {
      console.warn('[SocialPublishing] Audit log notice:', auditErr.message);
    }

    return {
      postId: postRecord?.id || `post_${Date.now()}`,
      overallStatus,
      platformResults: platformResults as Record<SocialPlatformType, PublishResponse>,
      statusCode: calculatedStatusCode,
      conflict: hasConflict,
      conflictDetails,
      errors,
    };
  }
}

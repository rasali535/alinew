/**
 * Ralion Unified Social Media Architecture — Publishing Engine
 * Ras Ali Labs (Pty) Ltd
 *
 * Coordinates multi-platform parallel publishing with atomic per-platform statuses,
 * provider routing (Zernio vs Native), automatic base64 media asset hosting,
 * stable idempotency keys, and audit logging.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  SocialPlatformType,
  PublishResponse,
  InfrastructureProviderType,
  assertMasterZernioAuthorization,
  MASTER_PLATFORM_ZERNIO_PROFILE_ID,
  MASTER_PLATFORM_FACEBOOK_PAGE_ID,
} from '@ralion/integrations';
import { SocialContentValidator } from './socialContentValidator.service';
import { SocialTokenManager } from './socialTokenManager.service';
import { SocialProviderRouter } from './socialProviderRouter.service';
import { AuditLoggerService } from '../auditLogger.service';

import { resolvePageAccessToken } from './facebookPageManagement.service';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('[SocialPublishing] Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
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
  postId: string | null;
  overallStatus: 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' | 'QUEUED';
  platformResults: Record<SocialPlatformType, PublishResponse>;
  statusCode?: number;
  conflict?: boolean;
  conflictDetails?: any;
  errors: string[];
}

// Global in-memory registry for isomorphic Next.js server & runtime dev support
const inFlightDispatches = new Set<string>();

const globalPublishStore = globalThis as unknown as {
  __ralion_published_posts?: Array<{
    id: string;
    userId: string;
    workspaceId?: string;
    organizationId?: string;
    destination: string;
    bodyHash: string;
    body: string;
    platforms: string[];
    idempotencyKey?: string;
    status: string;
    platformResults: any;
    platformPostIds: any;
    createdAt: number;
  }>;
  __ralion_mock_connections?: Array<any>;
};

if (!globalPublishStore.__ralion_published_posts) {
  globalPublishStore.__ralion_published_posts = [];
}
if (!globalPublishStore.__ralion_mock_connections) {
  globalPublishStore.__ralion_mock_connections = [];
}

export class SocialPublishingService {
  private static get publishedPosts() {
    return globalPublishStore.__ralion_published_posts!;
  }

  static clearRegistryForTesting() {
    globalPublishStore.__ralion_published_posts = [];
    globalPublishStore.__ralion_mock_connections = [];
    inFlightDispatches.clear();
  }

  static registerMockConnectionForTesting(conn: any) {
    if (!globalPublishStore.__ralion_mock_connections) {
      globalPublishStore.__ralion_mock_connections = [];
    }
    globalPublishStore.__ralion_mock_connections.push(conn);
  }

  static recordPublishedPostForTesting(post: {
    id: string;
    userId: string;
    workspaceId?: string;
    organizationId?: string;
    destination: string;
    bodyHash: string;
    body: string;
    platforms: string[];
    idempotencyKey?: string;
    status: string;
    platformResults?: any;
    platformPostIds?: any;
    createdAt?: number;
  }) {
    this.publishedPosts.push({
      ...post,
      platformResults: post.platformResults || {},
      platformPostIds: post.platformPostIds || {},
      createdAt: post.createdAt || Date.now(),
    });
  }

  private static getDurableStorePath(): string {
    const dir = path.resolve(process.cwd(), '.ralion');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.join(dir, 'social_publish_idempotency.json');
  }

  private static loadDurableClaims(): any[] {
    try {
      const p = this.getDurableStorePath();
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw) || [];
      }
    } catch {}
    return [];
  }

  private static saveDurableClaims(claims: any[]) {
    try {
      const p = this.getDurableStorePath();
      fs.writeFileSync(p, JSON.stringify(claims, null, 2), 'utf-8');
    } catch {}
  }

  static clearDurableStoreForTesting() {
    try {
      const p = this.getDurableStorePath();
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    } catch {}
  }

  /**
   * Atomic Database Idempotency Dispatch Claim
   * Canonical uniqueness boundary: user_id + organization_id + workspace_id + destination + idempotency_key
   * AND matching across all 5 dimensions.
   */
  private static async claimDispatch(params: {
    userId: string;
    organizationId: string;
    workspaceId: string;
    destination: string;
    idempotencyKey: string;
    bodyHash: string;
  }): Promise<{
    conflict: boolean;
    claimId?: string;
    claimStatus?: string;
    postId?: string | null;
    platformResults?: any;
    message?: string;
  }> {
    const supabase = getServiceSupabase();

    // 1. Try atomic database RPC
    try {
      const { data, error } = await supabase.rpc('claim_social_publish_dispatch', {
        p_user_id: params.userId,
        p_organization_id: params.organizationId,
        p_workspace_id: params.workspaceId,
        p_destination: params.destination,
        p_idempotency_key: params.idempotencyKey,
        p_body_hash: params.bodyHash,
      });

      if (!error && data) {
        return {
          conflict: Boolean(data.conflict),
          claimId: data.claim_id,
          claimStatus: data.claim_status,
          postId: data.post_id || null,
          platformResults: data.platform_results || {},
          message: data.message,
        };
      }
    } catch (rpcErr: any) {
      console.warn('[SocialPublishing] claim_social_publish_dispatch RPC notice:', rpcErr?.message);
    }

    // 2. Direct table fallback with atomic INSERT / unique constraint
    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existing, error: fetchErr } = await supabase
        .from('social_publish_idempotency')
        .select('*')
        .eq('user_id', params.userId)
        .eq('organization_id', params.organizationId)
        .eq('workspace_id', params.workspaceId)
        .eq('destination', params.destination)
        .eq('idempotency_key', params.idempotencyKey)
        .gt('created_at', cutoff24h)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!fetchErr && existing) {
        if (existing.status === 'COMPLETED') {
          return {
            conflict: true,
            claimStatus: 'ALREADY_COMPLETED',
            claimId: existing.id,
            postId: existing.post_id,
            platformResults: existing.platform_results || {},
            message: 'This exact content was already published or scheduled for this account within the last 24 hours.',
          };
        }

        if (existing.status === 'CLAIMED' || existing.status === 'IN_PROGRESS') {
          const isStale = new Date(existing.claimed_at).getTime() < Date.now() - 5 * 60 * 1000;
          if (isStale) {
            const { error: updErr } = await supabase
              .from('social_publish_idempotency')
              .update({
                status: 'IN_PROGRESS',
                claimed_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                retry_count: (existing.retry_count || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (!updErr) {
              return {
                conflict: false,
                claimId: existing.id,
                claimStatus: 'CLAIMED_RETRY',
                message: 'Recovered stale dispatch lease.',
              };
            }
          }

          return {
            conflict: true,
            claimStatus: 'IN_PROGRESS_CONFLICT',
            claimId: existing.id,
            message: 'A publish dispatch with this exact payload is currently in flight.',
          };
        }

        if (existing.status === 'FAILED') {
          if (existing.retry_count >= 5 && new Date(existing.failed_at || existing.updated_at).getTime() > Date.now() - 15 * 60 * 1000) {
            return {
              conflict: true,
              claimStatus: 'FAILED_THROTTLED',
              claimId: existing.id,
              message: 'Maximum retry attempts exceeded for this payload. Please wait 15 minutes before retrying.',
            };
          }

          await supabase
            .from('social_publish_idempotency')
            .update({
              status: 'IN_PROGRESS',
              claimed_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
              retry_count: (existing.retry_count || 0) + 1,
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          return {
            conflict: false,
            claimId: existing.id,
            claimStatus: 'CLAIMED_RETRY',
            message: 'Retrying previously failed dispatch.',
          };
        }
      }

      const { data: insData, error: insErr } = await supabase
        .from('social_publish_idempotency')
        .insert({
          user_id: params.userId,
          organization_id: params.organizationId,
          workspace_id: params.workspaceId,
          destination: params.destination,
          idempotency_key: params.idempotencyKey,
          body_hash: params.bodyHash,
          status: 'IN_PROGRESS',
          claimed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select('id')
        .maybeSingle();

      if (insData) {
        return {
          conflict: false,
          claimId: insData.id,
          claimStatus: 'CLAIMED_NEW',
        };
      }

      if (insErr && (insErr.code === '23505' || insErr.message?.includes('duplicate key') || insErr.message?.includes('uq_social_publish_idempotency'))) {
        return {
          conflict: true,
          claimStatus: 'IN_PROGRESS_CONFLICT',
          message: 'Concurrent publish dispatch detected for this account.',
        };
      }
    } catch (tableErr: any) {
      console.warn('[SocialPublishing] Direct table idempotency claim notice:', tableErr?.message);
    }

    // 3. Durable store fallback (for Hostinger process restarts and tests where Supabase table is pending migration)
    const durableClaims = this.loadDurableClaims();
    const cutoff24hMs = Date.now() - 24 * 60 * 60 * 1000;
    const existingDurable = durableClaims.find(
      (c) =>
        c.user_id === params.userId &&
        c.organization_id === params.organizationId &&
        c.workspace_id === params.workspaceId &&
        c.destination === params.destination &&
        (c.idempotency_key === params.idempotencyKey || c.body_hash === params.bodyHash) &&
        c.created_at_ms > cutoff24hMs
    );

    if (existingDurable) {
      if (existingDurable.status === 'COMPLETED') {
        return {
          conflict: true,
          claimStatus: 'ALREADY_COMPLETED',
          claimId: existingDurable.id,
          postId: existingDurable.post_id,
          platformResults: existingDurable.platform_results || {},
          message: 'This exact content was already published or scheduled for this account within the last 24 hours.',
        };
      }

      if (existingDurable.status === 'CLAIMED' || existingDurable.status === 'IN_PROGRESS') {
        const isStale = existingDurable.claimed_at_ms < Date.now() - 5 * 60 * 1000;
        if (!isStale) {
          return {
            conflict: true,
            claimStatus: 'IN_PROGRESS_CONFLICT',
            claimId: existingDurable.id,
            message: 'A publish dispatch with this exact payload is currently in flight.',
          };
        }
        // Reclaim stale lease
        existingDurable.claimed_at_ms = Date.now();
        existingDurable.retry_count = (existingDurable.retry_count || 0) + 1;
        this.saveDurableClaims(durableClaims);
        return {
          conflict: false,
          claimId: existingDurable.id,
          claimStatus: 'CLAIMED_RETRY',
          message: 'Recovered stale dispatch lease.',
        };
      }

      if (existingDurable.status === 'FAILED') {
        if (existingDurable.retry_count >= 5 && existingDurable.failed_at_ms > Date.now() - 15 * 60 * 1000) {
          return {
            conflict: true,
            claimStatus: 'FAILED_THROTTLED',
            claimId: existingDurable.id,
            message: 'Maximum retry attempts exceeded for this payload. Please wait 15 minutes before retrying.',
          };
        }
        existingDurable.status = 'IN_PROGRESS';
        existingDurable.claimed_at_ms = Date.now();
        existingDurable.retry_count = (existingDurable.retry_count || 0) + 1;
        this.saveDurableClaims(durableClaims);
        return {
          conflict: false,
          claimId: existingDurable.id,
          claimStatus: 'CLAIMED_RETRY',
          message: 'Retrying previously failed dispatch.',
        };
      }
    }

    // Insert new durable claim
    const newClaimId = `claim_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    durableClaims.push({
      id: newClaimId,
      user_id: params.userId,
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      destination: params.destination,
      idempotency_key: params.idempotencyKey,
      body_hash: params.bodyHash,
      status: 'IN_PROGRESS',
      claimed_at_ms: Date.now(),
      created_at_ms: Date.now(),
      retry_count: 0,
    });
    this.saveDurableClaims(durableClaims);

    return {
      conflict: false,
      claimId: newClaimId,
      claimStatus: 'CLAIMED_NEW',
    };
  }

  private static async completeDispatch(claimId: string | null, postId: string | null, platformResults: any) {
    if (!claimId) return;
    const supabase = getServiceSupabase();
    try {
      const { error } = await supabase.rpc('complete_social_publish_dispatch', {
        p_claim_id: claimId,
        p_post_id: postId,
        p_platform_results: platformResults,
      });
      if (error) {
        await supabase
          .from('social_publish_idempotency')
          .update({
            status: 'COMPLETED',
            post_id: postId,
            platform_results: platformResults,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', claimId);
      }
    } catch (err: any) {
      console.warn('[SocialPublishing] completeDispatch notice:', err?.message);
    }

    // Update durable store fallback
    const durableClaims = this.loadDurableClaims();
    const target = durableClaims.find((c) => c.id === claimId);
    if (target) {
      target.status = 'COMPLETED';
      target.post_id = postId;
      target.platform_results = platformResults;
      target.completed_at_ms = Date.now();
      this.saveDurableClaims(durableClaims);
    }
  }

  private static async failDispatch(claimId: string | null, errorMessage: string) {
    if (!claimId) return;
    const supabase = getServiceSupabase();
    try {
      const { error } = await supabase.rpc('fail_social_publish_dispatch', {
        p_claim_id: claimId,
        p_error_message: errorMessage,
      });
      if (error) {
        await supabase
          .from('social_publish_idempotency')
          .update({
            status: 'FAILED',
            error_message: errorMessage,
            failed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', claimId);
      }
    } catch (err: any) {
      console.warn('[SocialPublishing] failDispatch notice:', err?.message);
    }

    // Update durable store fallback
    const durableClaims = this.loadDurableClaims();
    const target = durableClaims.find((c) => c.id === claimId);
    if (target) {
      target.status = 'FAILED';
      target.error_message = errorMessage;
      target.failed_at_ms = Date.now();
      this.saveDurableClaims(durableClaims);
    }
  }

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
    const normalizedBody = params.body.trim();
    const bodyHash = crypto.createHash('sha256').update(normalizedBody).digest('hex');
    const idempotencyKey = params.idempotencyKey || `hash_${bodyHash}`;
    const sortedPlatforms = params.platforms.slice().sort().join(',');
    const currentDestination = params.socialConnectionId ? `conn:${params.socialConnectionId}` : sortedPlatforms;
    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;

    const orgIdKey = params.organizationId || 'default-org';
    const wsIdKey = params.workspaceId || 'default-ws';

    // Optional in-memory dispatch lock check (local optimization only)
    const dispatchLockKey = `${params.userId}:${orgIdKey}:${wsIdKey}:${currentDestination}:${idempotencyKey}`;
    if (inFlightDispatches.has(dispatchLockKey)) {
      return {
        postId: null,
        overallStatus: 'FAILED',
        platformResults: {} as any,
        statusCode: 409,
        conflict: true,
        conflictDetails: {
          reason: 'A publish dispatch with this exact payload is currently in flight.',
        },
        errors: ['Publish conflict: In-flight request currently being processed.'],
      };
    }

    inFlightDispatches.add(dispatchLockKey);
    let claimId: string | null = null;
    try {
      const memoryDup = this.publishedPosts.find(
        (p) =>
          p.userId === params.userId &&
          (p.organizationId || 'default-org') === orgIdKey &&
          (p.workspaceId || 'default-ws') === wsIdKey &&
          p.destination === currentDestination &&
          ((params.idempotencyKey && p.idempotencyKey === params.idempotencyKey) || p.bodyHash === bodyHash || p.body === normalizedBody) &&
          p.createdAt > cutoff24h &&
          (p.status === 'PUBLISHED' || p.status === 'QUEUED' || p.status === 'SCHEDULED')
      );

      if (memoryDup) {
        console.log('[SocialPublishing] In-memory duplicate post conflict detected:', {
          existingPostId: memoryDup.id,
          userId: params.userId,
          workspaceId: params.workspaceId,
        });

        return {
          postId: memoryDup.id,
          overallStatus: memoryDup.status as any,
          platformResults: memoryDup.platformResults || {},
          statusCode: 409,
          conflict: true,
          conflictDetails: {
            existingPostId: memoryDup.id,
            reason: 'This exact content was already published or scheduled for this account within the last 24 hours.',
          },
          errors: ['Publish conflict: This content was already posted to this account within the last 24 hours.'],
        };
      }

      try {
        let dupQuery = supabase
          .from('social_posts')
          .select('id, status, platform_results, platform_post_ids, created_at')
          .eq('user_id', params.userId)
          .eq('body', normalizedBody)
          .gt('created_at', new Date(cutoff24h).toISOString())
          .limit(1);

        if (params.workspaceId) {
          dupQuery = dupQuery.eq('workspace_id', params.workspaceId);
        }
        if (params.organizationId) {
          dupQuery = dupQuery.eq('organization_id', params.organizationId);
        }

        const { data: existingPost } = await dupQuery.maybeSingle();

        if (existingPost && (existingPost.status === 'PUBLISHED' || existingPost.status === 'QUEUED' || existingPost.status === 'SCHEDULED')) {
          console.log('[SocialPublishing] Database duplicate post conflict detected:', {
            existingPostId: existingPost.id,
            userId: params.userId,
            workspaceId: params.workspaceId,
          });

          return {
            postId: existingPost.id,
            overallStatus: existingPost.status as any,
            platformResults: existingPost.platform_results || {},
            statusCode: 409,
            conflict: true,
            conflictDetails: {
              existingPostId: existingPost.id,
              reason: 'This exact content was already published or scheduled for this account within the last 24 hours.',
            },
            errors: ['Publish conflict: This content was already posted to this account within the last 24 hours.'],
          };
        }
      } catch (dupErr: any) {
        // Ignored if table doesn't exist in Supabase
      }

      // Canonical Database Idempotency Claim (Correctness Boundary across all processes & restarts)
      const claim = await this.claimDispatch({
        userId: params.userId,
        organizationId: orgIdKey,
        workspaceId: wsIdKey,
        destination: currentDestination,
        idempotencyKey,
        bodyHash,
      });
      claimId = claim.claimId || null;

      if (claim.conflict) {
        const isCompleted = claim.claimStatus === 'ALREADY_COMPLETED';
        return {
          postId: claim.postId || null,
          overallStatus: isCompleted ? 'PUBLISHED' : 'FAILED',
          platformResults: claim.platformResults || {},
          statusCode: 409,
          conflict: true,
          conflictDetails: {
            existingPostId: claim.postId || undefined,
            claimId: claim.claimId,
            reason: claim.message || (isCompleted ? 'This exact content was already published or scheduled for this account within the last 24 hours.' : 'A publish dispatch with this exact payload is currently in flight.'),
          },
          errors: [`Publish conflict: ${claim.message || (isCompleted ? 'Already published.' : 'In-flight dispatch.')}`],
        };
      }

      // 2. Pre-process media URLs (turn base64 data URLs into persistent public storage URLs)
      const normalizedMediaUrls = await this.processMediaUrls(params.mediaUrls);

      // 3. Find active connections for requested platforms strictly matching canonical tenant & user
    let connections: any[] = [];
    if (globalPublishStore.__ralion_mock_connections && globalPublishStore.__ralion_mock_connections.length > 0) {
      connections = globalPublishStore.__ralion_mock_connections.filter((c) => {
        const matchesPlatform = params.platforms.includes(c.provider);
        const matchesOrg = !params.organizationId || params.organizationId === 'default-org' || c.organization_id === params.organizationId;
        const matchesWs = !params.workspaceId || params.workspaceId === 'default' || c.workspace_id === params.workspaceId;
        const matchesUser = !params.userId || params.userId === 'default-user' || c.user_id === params.userId;
        return matchesPlatform && matchesOrg && matchesWs && matchesUser;
      });
    } else {
      try {
        let connQuery = supabase
          .from('social_connections')
          .select('id, provider, provider_account_id, account_name, account_type, connection_status, token_status, infrastructure_provider, zernio_account_id, zernio_profile_id, user_id, workspace_id, organization_id, metadata, disconnected_at, last_health_check_at, health_error_message, created_at, updated_at')
          .in('provider', params.platforms)
          .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active'])
          .is('disconnected_at', null);

        if (params.socialConnectionId) {
          connQuery = connQuery.eq('id', params.socialConnectionId);
        }
        if (params.organizationId && params.organizationId !== 'default-org') {
          connQuery = connQuery.eq('organization_id', params.organizationId);
        }
        if (params.workspaceId && params.workspaceId !== 'default') {
          connQuery = connQuery.eq('workspace_id', params.workspaceId);
        }
        if (params.userId && params.userId !== 'default-user') {
          connQuery = connQuery.eq('user_id', params.userId);
        }

        const { data, error } = await connQuery;
        if (error) {
          console.warn('[SocialPublishing] Connection fetch error:', error);
        }
        connections = data || [];
      } catch (dbErr: any) {
        console.warn('[SocialPublishing] Connection fetch notice:', dbErr.message);
      }
    }

    // 4. Validate explicit socialConnectionId if provided
    let explicitConnection: any = null;
    if (params.socialConnectionId) {
      explicitConnection = (connections || []).find((c) => c.id === params.socialConnectionId);
      if (!explicitConnection) {
        const connSecurityError = new Error(`[SocialPublishing] Access denied: Connection ${params.socialConnectionId} does not belong to this canonical workspace/user.`);
        (connSecurityError as any).statusCode = 403;
        throw connSecurityError;
      }
    }

    const platformResults: Partial<Record<SocialPlatformType, PublishResponse>> = {};
    const platformPostIds: Record<string, string> = {};
    const errors: string[] = [];

    // 5. Parallel Dispatch with Provider Routing
    const publishPromises = params.platforms.map(async (platform) => {
      const platformConnections = (connections || []).filter((c) => c.provider === platform);

      // Prioritize explicit connection ID, then page ID match
      let conn = explicitConnection && (explicitConnection.provider === platform || params.platforms.length === 1)
        ? explicitConnection
        : undefined;

      if (!conn && params.pageId) {
        conn = platformConnections.find(
          (c) =>
            c.provider_account_id === params.pageId ||
            c.page_id === params.pageId ||
            c.metadata?.pageId === params.pageId
        );
      }

      // If still not resolved:
      // If exactly ONE account exists for this platform, select it.
      // If MULTIPLE accounts exist and neither pageId nor socialConnectionId was specified, fail safely.
      if (!conn) {
        if (platformConnections.length === 1) {
          conn = platformConnections[0];
        } else if (platformConnections.length > 1) {
          platformResults[platform] = {
            success: false,
            error: `Multiple active ${platform} connections exist for this workspace. Please specify an explicit socialConnectionId or pageId to publish.`,
            statusCode: 400,
            platform,
            publishedAt: new Date().toISOString(),
          };
          errors.push(`${platform}: Ambiguous connection - multiple accounts exist`);
          return;
        }
      }

      if (!conn) {
        platformResults[platform] = {
          success: false,
          error: `No active ${platform} connection found for this user/workspace.`,
          statusCode: 403,
          platform,
          publishedAt: new Date().toISOString(),
        };
        errors.push(`${platform}: No active connection`);
        return;
      }

      // Verify page ownership if explicit pageId is supplied
      if (params.pageId) {
        const allowedPageIds = [
          conn.provider_account_id,
          conn.page_id,
          conn.metadata?.pageId,
        ].filter(Boolean);

        if (allowedPageIds.length > 0 && !allowedPageIds.includes(params.pageId)) {
          platformResults[platform] = {
            success: false,
            error: `Access denied: Page ${params.pageId} is not authorized for this connection.`,
            statusCode: 403,
            platform,
            publishedAt: new Date().toISOString(),
          };
          errors.push(`${platform}: Unauthorized page ID`);
          return;
        }
      }

      // Strictly verify that master platform assets are not used by non-admin actors
      if (
        params.pageId === MASTER_PLATFORM_FACEBOOK_PAGE_ID ||
        conn.metadata?.pageId === MASTER_PLATFORM_FACEBOOK_PAGE_ID ||
        conn.zernio_profile_id === MASTER_PLATFORM_ZERNIO_PROFILE_ID
      ) {
        try {
          assertMasterZernioAuthorization({
            userId: params.userId,
            organizationId: params.organizationId,
            workspaceId: params.workspaceId,
            targetProfileId: conn.zernio_profile_id,
            targetPageId: params.pageId || conn.metadata?.pageId,
            action: 'PUBLISH_SOCIAL_POST',
          });
        } catch (authErr: any) {
          platformResults[platform] = {
            success: false,
            error: authErr.message || '403 Forbidden: Master platform assets are restricted to PLATFORM_ADMIN.',
            statusCode: 403,
            platform,
            publishedAt: new Date().toISOString(),
          };
          errors.push(`${platform}: 403 Forbidden Master Profile Access`);
          return;
        }
      }

      // Determine infrastructure: if connection has direct native access token and lacks zernio binding, route natively
      let infraProvider = (conn.infrastructure_provider || 'native') as InfrastructureProviderType;
      if (conn.metadata?.encrypted_access_token && !conn.zernio_account_id) {
        infraProvider = 'native';
      }

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
            throw new Error(`[SocialPublishing] Connected ${platform} account is missing valid social account binding.`);
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
              scheduledFor: params.scheduledFor ? params.scheduledFor.toISOString() : undefined,
            },
          });
        } else {
          // Dispatch via Native Provider
          const token = conn.mock_token || (await SocialTokenManager.getValidToken(conn.id, platform));
          if (!token) {
            platformResults[platform] = {
              success: false,
              error: `Authentication token for ${platform} has expired. Please reconnect.`,
              statusCode: 401,
              platform,
              publishedAt: new Date().toISOString(),
            };
            errors.push(`${platform}: Token expired`);
            return;
          }

          const targetPageId = params.pageId || conn.metadata?.pageId || conn.page_id || conn.provider_account_id;
          let publishToken = token;

          // For Facebook Pages, resolve authentic Page Access Token
          if (platform === 'facebook' && targetPageId && targetPageId !== 'me' && !conn.mock_token) {
            const pageToken = await resolvePageAccessToken(token, targetPageId, conn.metadata);
            if (!pageToken) {
              platformResults[platform] = {
                success: false,
                error: `Unable to resolve valid Page Access Token for Facebook Page ${targetPageId}. Please reconnect page permissions.`,
                statusCode: 403,
                platform,
                publishedAt: new Date().toISOString(),
              };
              errors.push(`${platform}: Page token resolution failed for ${targetPageId}`);
              return;
            }
            publishToken = pageToken;
          }

          res = await routing.adapter.publish(publishToken, {
            title: params.title,
            body: params.body,
            mediaUrls: normalizedMediaUrls,
            mediaTypes: params.mediaTypes,
            pageId: targetPageId,
            options: {
              scheduledFor: params.scheduledFor ? params.scheduledFor.toISOString() : undefined,
            },
          });
        }

        platformResults[platform] = res;
        if (res.success && res.postId) {
          platformPostIds[platform] = res.postId;
        } else if (res.error) {
          errors.push(`${platform}: ${res.error}`);
        }
      } catch (err: any) {
        const errorStatusCode = err.statusCode || 500;
        platformResults[platform] = {
          success: false,
          error: err.message || `Failed to publish to ${platform}`,
          statusCode: errorStatusCode,
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
    const isScheduled = Boolean(params.scheduledFor);

    let overallStatus: 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' | 'QUEUED' = 'FAILED';
    if (successes === total) {
      overallStatus = isScheduled ? 'QUEUED' : 'PUBLISHED';
    } else if (successes > 0) {
      overallStatus = isScheduled ? 'QUEUED' : 'PARTIALLY_PUBLISHED';
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
      overallStatus === 'PUBLISHED' || overallStatus === 'QUEUED'
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
          status: isScheduled ? 'SCHEDULED' : overallStatus,
          platform_post_ids: platformPostIds,
          platform_results: platformResults,
          scheduled_for: isScheduled ? params.scheduledFor?.toISOString() : null,
          published_at: isScheduled ? null : new Date().toISOString(),
          author_name: params.authorName || 'Ralion User',
          social_connection_id: explicitConnection?.id || params.socialConnectionId || null,
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

    const isSuccessfulDispatch = overallStatus === 'PUBLISHED' || overallStatus === 'QUEUED' || overallStatus === 'PARTIALLY_PUBLISHED';
    const finalPostId: string | null = isSuccessfulDispatch
      ? (postRecord?.id || `pub_rec_${idempotencyKey}`)
      : null;

    if (claim.claimId) {
      if (isSuccessfulDispatch) {
        await this.completeDispatch(claim.claimId, finalPostId, platformResults);
      } else {
        await this.failDispatch(claim.claimId, errors.join('; ') || 'Publish failed');
      }
    }

    if (overallStatus === 'PUBLISHED' || overallStatus === 'QUEUED') {
      this.publishedPosts.push({
        id: finalPostId || `pub_rec_${idempotencyKey}`,
        userId: params.userId,
        workspaceId: params.workspaceId,
        organizationId: params.organizationId,
        destination: currentDestination,
        bodyHash,
        body: normalizedBody,
        platforms: params.platforms,
        idempotencyKey,
        status: overallStatus,
        platformResults,
        platformPostIds,
        createdAt: Date.now(),
      });
    }

    return {
      postId: finalPostId,
      overallStatus,
      platformResults: platformResults as Record<SocialPlatformType, PublishResponse>,
      statusCode: calculatedStatusCode,
      conflict: hasConflict,
      conflictDetails,
      errors,
    };
    } catch (publishErr: any) {
      if (claimId) {
        await this.failDispatch(claimId, publishErr?.message || 'Publish dispatch threw unexpected exception');
      }
      throw publishErr;
    } finally {
      inFlightDispatches.delete(dispatchLockKey);
    }
  }
}

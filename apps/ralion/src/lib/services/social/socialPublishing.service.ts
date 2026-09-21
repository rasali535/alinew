/**
 * Ralion Unified Social Media Architecture — Publishing Engine
 * Ras Ali Labs (Pty) Ltd
 *
 * Coordinates multi-platform parallel publishing with atomic per-platform statuses,
 * provider routing (delivery network vs native), validated public HTTPS media,
 * stable idempotency keys, and audit logging.
 */

import 'server-only';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  SocialPlatformType,
  PublishResponse,
  InfrastructureProviderType,
  assertMasterZernioAuthorization,
  MASTER_PLATFORM_ZERNIO_PROFILE_ID,
  MASTER_PLATFORM_FACEBOOK_PAGE_ID,
} from '@ralion/integrations/server';
import { SocialContentValidator } from './socialContentValidator.service';
import { SocialTokenManager } from './socialTokenManager.service';
import { SocialProviderRouter } from './socialProviderRouter.service';
import { AuditLoggerService } from '../auditLogger.service';
import { getPrivilegedSupabase as getServiceSupabase } from '@/lib/supabase/server';

import { resolvePageAccessToken } from './facebookPageManagement.service';

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
  overallStatus: 'PUBLISHED' | 'PARTIALLY_PUBLISHED' | 'FAILED' | 'QUEUED' | 'PUBLISHED_WITH_PERSISTENCE_WARNING';
  platformResults: Record<SocialPlatformType, PublishResponse>;
  statusCode?: number;
  conflict?: boolean;
  conflictDetails?: any;
  errors: string[];
  persistenceWarning?: boolean;
  persistenceError?: 'PUBLICATION_HISTORY_PERSISTENCE_FAILED';
}

const PUBLISHABLE_PLATFORMS = new Set<string>([
  'facebook',
  'instagram',
  'linkedin',
  'x',
  'youtube',
  'tiktok',
  'threads',
  'pinterest',
  'reddit',
  'bluesky',
  'whatsapp',
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_INLINE_MEDIA_BYTES = 25 * 1024 * 1024;
const INLINE_MEDIA_PATTERN = /^data:((?:image|video)\/[a-z0-9.+-]+);base64,([a-z0-9+/]*={0,2})$/i;
const ALLOWED_INLINE_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

function publishingInputError(code: string, message: string): Error {
  const error = new Error(message);
  (error as any).statusCode = 400;
  (error as any).publicCode = code;
  return error;
}

function canonicalizePlatforms(platforms: unknown): SocialPlatformType[] {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    throw publishingInputError('INVALID_PLATFORM', 'At least one supported platform is required.');
  }

  const canonical = platforms.map((platform) => {
    if (typeof platform !== 'string') {
      throw publishingInputError('INVALID_PLATFORM', 'Every platform must be a string.');
    }
    const normalized = platform.trim().toLowerCase() === 'twitter'
      ? 'x'
      : platform.trim().toLowerCase();
    if (!PUBLISHABLE_PLATFORMS.has(normalized)) {
      throw publishingInputError('INVALID_PLATFORM', 'One or more requested platforms are unsupported.');
    }
    return normalized as SocialPlatformType;
  });

  return Array.from(new Set(canonical));
}

function isPrivateOrLocalHostname(hostname: string): boolean {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (value === 'localhost' || value.endsWith('.localhost') || value.endsWith('.local')) return true;
  if (value === '::1' || value.startsWith('fe80:') || value.startsWith('fc') || value.startsWith('fd')) return true;

  const octets = value.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  return octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 169 && octets[1] === 254)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
    || octets[0] === 0;
}

function validateMediaInputs(mediaUrls?: unknown, mediaTypes?: unknown): {
  mediaUrls: string[];
  mediaTypes: string[];
} {
  if (mediaUrls !== undefined && !Array.isArray(mediaUrls)) {
    throw publishingInputError('INVALID_MEDIA', 'mediaUrls must be an array.');
  }
  if (mediaTypes !== undefined && !Array.isArray(mediaTypes)) {
    throw publishingInputError('INVALID_MEDIA_TYPE', 'mediaTypes must be an array.');
  }

  const urls = (mediaUrls || []) as unknown[];
  const types = (mediaTypes || []) as unknown[];
  if (urls.length > 20) {
    throw publishingInputError('INVALID_MEDIA', 'No more than 20 media items may be published at once.');
  }
  if (types.length > 0 && types.length !== urls.length) {
    throw publishingInputError('INVALID_MEDIA_TYPE', 'mediaTypes must correspond one-to-one with mediaUrls.');
  }

  const inferredTypes: Array<string | null> = [];
  const safeUrls = urls.map((candidate) => {
    if (typeof candidate !== 'string') {
      throw publishingInputError('INVALID_MEDIA', 'Every media item must be a public HTTPS URL or supported upload.');
    }

    if (candidate.startsWith('data:')) {
      const match = candidate.match(INLINE_MEDIA_PATTERN);
      const mimeType = match?.[1]?.toLowerCase();
      const encoded = match?.[2] || '';
      if (!mimeType || !encoded || encoded.length % 4 !== 0 || !ALLOWED_INLINE_MEDIA_TYPES.has(mimeType)) {
        throw publishingInputError('INVALID_MEDIA', 'Uploaded media must be a supported base64 image or video.');
      }

      const paddingBytes = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
      const decodedBytes = Math.floor((encoded.length * 3) / 4) - paddingBytes;
      if (decodedBytes <= 0 || decodedBytes > MAX_INLINE_MEDIA_BYTES) {
        throw publishingInputError('INVALID_MEDIA', 'Uploaded media must not exceed 25 MiB.');
      }
      inferredTypes.push(mimeType);
      return candidate;
    }

    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw publishingInputError('INVALID_MEDIA', 'Every media item must be a valid HTTPS URL.');
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || isPrivateOrLocalHostname(parsed.hostname)) {
      throw publishingInputError('INVALID_MEDIA', 'Media URLs must use public HTTPS addresses.');
    }
    inferredTypes.push(null);
    return parsed.toString();
  });

  const safeTypes = types.map((candidate, index) => {
    if (typeof candidate !== 'string') {
      throw publishingInputError('INVALID_MEDIA_TYPE', 'Every media type must be a valid image or video MIME type.');
    }
    const normalized = candidate.trim().toLowerCase();
    const resolved = normalized === 'image'
      ? inferredTypes[index] || 'image/jpeg'
      : normalized === 'video'
        ? inferredTypes[index] || 'video/mp4'
        : normalized;
    if (!/^(image|video)\/[a-z0-9.+-]+$/i.test(resolved) || resolved === 'image/svg+xml') {
      throw publishingInputError('INVALID_MEDIA_TYPE', 'Every media type must be a valid image or video MIME type.');
    }
    if (inferredTypes[index] && inferredTypes[index] !== resolved) {
      throw publishingInputError('INVALID_MEDIA_TYPE', 'Uploaded media content and mediaTypes must match.');
    }
    return resolved;
  });

  return { mediaUrls: safeUrls, mediaTypes: safeTypes };
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

  /**
   * Generates a deterministic canonical payload hash across all publishing parameters:
   * normalized title, normalized body, sorted platforms, destination, sorted media references & types,
   * scheduled time, and publishing options.
   */
  public static computeCanonicalPayloadHash(params: {
    title?: string;
    body: string;
    platforms: string[];
    destination: string;
    mediaUrls?: string[];
    mediaTypes?: string[];
    scheduledFor?: Date | string;
    pageId?: string;
  }): string {
    const normTitle = (params.title || '').trim().toLowerCase();
    const normBody = (params.body || '').trim();
    const sortedPlatforms = params.platforms.slice().sort().join(',');
    const dest = params.destination.trim();
    const sortedMediaUrls = (params.mediaUrls || []).slice().sort().map((u) => u.trim());
    const sortedMediaTypes = (params.mediaTypes || []).slice().sort().map((t) => t.trim().toLowerCase());
    const sched = params.scheduledFor
      ? (params.scheduledFor instanceof Date ? params.scheduledFor.toISOString() : new Date(params.scheduledFor).toISOString())
      : '';
    const pid = (params.pageId || '').trim();

    const canonicalStructure = {
      t: normTitle,
      b: normBody,
      p: sortedPlatforms,
      d: dest,
      m: sortedMediaUrls,
      mt: sortedMediaTypes,
      s: sched,
      pid,
    };

    return crypto.createHash('sha256').update(JSON.stringify(canonicalStructure)).digest('hex');
  }

  /**
   * Atomic Database Idempotency Dispatch Claim
   * Canonical uniqueness boundary: user_id + organization_id + workspace_id + destination + idempotency_key
   * AND matching across all 5 dimensions.
   * Fails closed with 503 if PostgreSQL is unavailable.
   */
  private static async claimDispatch(params: {
    userId: string;
    organizationId: string;
    workspaceId: string;
    destination: string;
    idempotencyKey: string;
    bodyHash: string;
    leaseToken?: string;
  }): Promise<{
    conflict: boolean;
    claimId?: string;
    leaseToken?: string;
    claimStatus?: string;
    postId?: string | null;
    externalReceiptId?: string | null;
    platformResults?: any;
    message?: string;
    dbUnavailable?: boolean;
  }> {
    const supabase = getServiceSupabase();
    const leaseToken = params.leaseToken || crypto.randomUUID();

    // 1. Try atomic database RPC
    try {
      const { data, error } = await supabase.rpc('claim_social_publish_dispatch', {
        p_user_id: params.userId,
        p_organization_id: params.organizationId,
        p_workspace_id: params.workspaceId,
        p_destination: params.destination,
        p_idempotency_key: params.idempotencyKey,
        p_body_hash: params.bodyHash,
        p_lease_token: leaseToken,
      });

      if (!error && data) {
        return {
          conflict: Boolean(data.conflict),
          claimId: data.claim_id,
          leaseToken: data.lease_token || leaseToken,
          claimStatus: data.claim_status,
          postId: data.post_id || null,
          externalReceiptId: data.external_receipt_id || null,
          platformResults: data.platform_results || {},
          message: data.message,
        };
      }
    } catch (rpcErr: any) {
      console.warn('[SocialPublishing] claim_social_publish_dispatch RPC notice:', rpcErr?.message);
    }

    // 2. Direct table query with atomic row check & INSERT / ON CONFLICT
    try {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existing, error: fetchErr } = await supabase
        .from('social_publish_idempotency')
        .select('*')
        .eq('user_id', params.userId)
        .eq('organization_id', params.organizationId)
        .eq('workspace_id', params.workspaceId)
        .eq('destination', params.destination)
        .or(`idempotency_key.eq.${params.idempotencyKey},body_hash.eq.${params.bodyHash}`)
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
            externalReceiptId: existing.external_receipt_id,
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
                lease_token: leaseToken,
                claimed_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                retry_count: (existing.retry_count || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (!updErr) {
              return {
                conflict: false,
                claimId: existing.id,
                leaseToken,
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
              lease_token: leaseToken,
              claimed_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              retry_count: (existing.retry_count || 0) + 1,
              error_message: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          return {
            conflict: false,
            claimId: existing.id,
            leaseToken,
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
          lease_token: leaseToken,
          claimed_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        })
        .select('id')
        .maybeSingle();

      if (insData) {
        return {
          conflict: false,
          claimId: insData.id,
          leaseToken,
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
      console.error('[SocialPublishing] Direct table idempotency claim error:', tableErr?.message);
    }

    // Fail closed: PostgreSQL is the correctness boundary.
    // If the database claim RPC and table are unavailable, publishing must fail closed with HTTP 503.
    return {
      conflict: true,
      dbUnavailable: true,
      message: 'Publishing idempotency infrastructure is temporarily unavailable. Dispatch aborted to prevent uncoordinated publication.',
    };
  }

  private static async completeDispatch(params: {
    claimId: string;
    organizationId: string;
    workspaceId: string;
    postId: string | null;
    externalReceiptId?: string | null;
    platformResults: any;
    leaseToken?: string;
  }): Promise<boolean> {
    const { claimId, organizationId, workspaceId, postId, externalReceiptId, platformResults, leaseToken } = params;
    if (!claimId) return false;
    const supabase = getServiceSupabase();

    // Verify postId is a valid UUID before passing to database UUID column
    const isValidUuid = postId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId) : false;
    const cleanPostId = isValidUuid ? postId : null;

    try {
      const { data, error } = await supabase.rpc('complete_social_publish_dispatch', {
        p_claim_id: claimId,
        p_organization_id: organizationId,
        p_workspace_id: workspaceId,
        p_post_id: cleanPostId,
        p_external_receipt_id: externalReceiptId || (postId && !isValidUuid ? postId : null),
        p_platform_results: platformResults,
        p_lease_token: leaseToken || null,
      });

      if (!error && typeof data === 'boolean') {
        return data;
      }

      // Fallback conditional update
      let updQuery = supabase
        .from('social_publish_idempotency')
        .update({
          status: 'COMPLETED',
          post_id: cleanPostId,
          external_receipt_id: externalReceiptId || (postId && !isValidUuid ? postId : null),
          platform_results: platformResults,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimId)
        .eq('organization_id', organizationId)
        .eq('workspace_id', workspaceId)
        .eq('status', 'IN_PROGRESS');

      if (leaseToken) {
        updQuery = updQuery.eq('lease_token', leaseToken);
      }

      const { data: updData, error: updErr } = await updQuery.select('id');
      return !updErr && Boolean(updData && updData.length === 1);
    } catch (err: any) {
      console.warn('[SocialPublishing] completeDispatch notice:', err?.message);
      return false;
    }
  }

  private static async failDispatch(params: {
    claimId: string;
    organizationId: string;
    workspaceId: string;
    errorMessage: string;
    leaseToken?: string;
  }): Promise<boolean> {
    const { claimId, organizationId, workspaceId, errorMessage, leaseToken } = params;
    if (!claimId) return false;
    const supabase = getServiceSupabase();
    try {
      const { data, error } = await supabase.rpc('fail_social_publish_dispatch', {
        p_claim_id: claimId,
        p_organization_id: organizationId,
        p_workspace_id: workspaceId,
        p_error_message: errorMessage,
        p_lease_token: leaseToken || null,
      });

      if (!error && typeof data === 'boolean') {
        return data;
      }

      let updQuery = supabase
        .from('social_publish_idempotency')
        .update({
          status: 'FAILED',
          error_message: errorMessage,
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', claimId)
        .eq('organization_id', organizationId)
        .eq('workspace_id', workspaceId)
        .eq('status', 'IN_PROGRESS');

      if (leaseToken) {
        updQuery = updQuery.eq('lease_token', leaseToken);
      }

      const { data: updData, error: updErr } = await updQuery.select('id');
      return !updErr && Boolean(updData && updData.length === 1);
    } catch (err: any) {
      console.warn('[SocialPublishing] failDispatch notice:', err?.message);
      return false;
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
          const match = item.match(INLINE_MEDIA_PATTERN);
          if (!match) {
            throw new Error('INVALID_INLINE_MEDIA');
          }
          const mimeType = match[1].toLowerCase();
          const buffer = Buffer.from(match[2], 'base64');
          const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg').split('+')[0] || 'bin';
          const fileName = `pub_${Date.now()}_${i}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
          const storagePath = `social/${fileName}`;

          const { error: upErr } = await supabase.storage
            .from('social-media-assets')
            .upload(storagePath, buffer, { contentType: mimeType, upsert: false });
          if (upErr) throw new Error('STORAGE_UPLOAD_FAILED');

          const { data: pubData } = supabase.storage
            .from('social-media-assets')
            .getPublicUrl(storagePath);
          const publicUrl = pubData?.publicUrl;
          if (!publicUrl || !publicUrl.startsWith('https://')) {
            throw new Error('STORAGE_PUBLIC_URL_FAILED');
          }
          processed.push(publicUrl);
          continue;
        } catch (e: any) {
          console.warn('[SocialPublishing] Media storage normalization failed:', {
            code: e?.message || 'MEDIA_STORAGE_ERROR',
            mediaIndex: i,
          });
          const storageError = new Error('Uploaded media could not be prepared for publication. No provider request was sent.');
          (storageError as any).statusCode = 502;
          (storageError as any).publicCode = 'MEDIA_STORAGE_FAILED';
          throw storageError;
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
    // Tenant identity is mandatory at the service boundary because this method has
    // callers beyond the HTTP route.
    if (!params.userId || !params.organizationId || !params.workspaceId) {
      throw publishingInputError(
        'TENANT_CONTEXT_REQUIRED',
        'Canonical user, organization and workspace context is required.'
      );
    }

    const normalizedPlatforms = canonicalizePlatforms(params.platforms);
    const normalizedMedia = validateMediaInputs(params.mediaUrls, params.mediaTypes);
    if (params.socialConnectionId && !UUID_PATTERN.test(params.socialConnectionId)) {
      throw publishingInputError('INVALID_CONNECTION_ID', 'socialConnectionId must be a valid UUID.');
    }
    if (params.scheduledFor && Number.isNaN(params.scheduledFor.getTime())) {
      throw publishingInputError('INVALID_SCHEDULE_DATE', 'scheduledFor must be a valid timestamp.');
    }

    params = {
      ...params,
      platforms: normalizedPlatforms,
      mediaUrls: normalizedMedia.mediaUrls,
      mediaTypes: normalizedMedia.mediaTypes,
    };

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
    const sortedPlatforms = params.platforms.slice().sort().join(',');
    const currentDestination = params.socialConnectionId ? `conn:${params.socialConnectionId}` : sortedPlatforms;
    const bodyHash = this.computeCanonicalPayloadHash({
      title: params.title,
      body: normalizedBody,
      platforms: params.platforms,
      destination: currentDestination,
      mediaUrls: params.mediaUrls,
      mediaTypes: params.mediaTypes,
      scheduledFor: params.scheduledFor,
      pageId: params.pageId,
    });
    const idempotencyKey = params.idempotencyKey || `hash_${bodyHash}`;
    const cutoff24h = Date.now() - 24 * 60 * 60 * 1000;

    const orgIdKey = params.organizationId!;
    const wsIdKey = params.workspaceId!;

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
          p.organizationId === orgIdKey &&
          p.workspaceId === wsIdKey &&
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
        if (claim.dbUnavailable) {
          const infraError = new Error(`[SocialPublishing] ${claim.message || 'Publishing infrastructure unavailable'}`);
          (infraError as any).statusCode = 503;
          (infraError as any).conflict = false;
          throw infraError;
        }

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
        const matchesOrg = c.organization_id === params.organizationId;
        const matchesWs = c.workspace_id === params.workspaceId;
        const matchesUser = c.user_id === params.userId;
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
        connQuery = connQuery.eq('organization_id', params.organizationId);
        connQuery = connQuery.eq('workspace_id', params.workspaceId);
        connQuery = connQuery.eq('user_id', params.userId);

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

          // Facebook Page connections persist the genuine Page Access Token in
          // social_connections during explicit Page selection. Do not feed that
          // Page token back into /me/accounts as though it were a user token.
          // Only resolve user -> Page token for legacy/non-Page connections.
          if (
            platform === 'facebook' &&
            targetPageId &&
            targetPageId !== 'me' &&
            !conn.mock_token &&
            !(
              conn.account_type === 'BUSINESS' ||
              conn.account_type === 'PAGE' ||
              conn.metadata?.is_page === true ||
              conn.metadata?.provider_account_type === 'FACEBOOK_PAGE'
            )
          ) {
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

    let overallStatus: MultiPublishResult['overallStatus'] = 'FAILED';
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

    const isSuccessfulDispatch =
      overallStatus === 'PUBLISHED'
      || overallStatus === 'QUEUED'
      || overallStatus === 'PARTIALLY_PUBLISHED';
    const correlationHash = crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 32);
    const syntheticReceiptId = `pub_rec_${correlationHash}`;
    const persistenceRequestId = `alert_${crypto.randomUUID()}`;

    // 7. Record successful or partially successful provider execution. A history
    // failure must not cause an external provider retry.
    let postRecord: any = null;
    let persistenceWarning = false;
    let persistenceError: 'PUBLICATION_HISTORY_PERSISTENCE_FAILED' | undefined;

    if (isSuccessfulDispatch) {
      try {
        const { data, error: insertError } = await supabase
          .from('social_posts')
          .insert({
            user_id: params.userId,
            workspace_id: params.workspaceId,
            organization_id: params.organizationId,
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

        if (insertError) {
          persistenceWarning = true;
          persistenceError = 'PUBLICATION_HISTORY_PERSISTENCE_FAILED';
          console.warn('[OPERATIONAL_ALERT] Publication history persistence failed.', {
            alertCode: persistenceError,
            errorCode: insertError.code || 'POSTGREST_ERROR',
            requestId: persistenceRequestId,
            correlationHash,
          });
        } else {
          postRecord = data;
        }
      } catch {
        persistenceWarning = true;
        persistenceError = 'PUBLICATION_HISTORY_PERSISTENCE_FAILED';
        console.warn('[OPERATIONAL_ALERT] Publication history persistence failed.', {
          alertCode: persistenceError,
          errorCode: 'DATABASE_EXCEPTION',
          requestId: persistenceRequestId,
          correlationHash,
        });
      }
    }

    if (persistenceWarning && overallStatus === 'PUBLISHED') {
      overallStatus = 'PUBLISHED_WITH_PERSISTENCE_WARNING';
    }

    // 8. Emit a sanitized audit event.
    try {
      await AuditLoggerService.log({
        eventType: overallStatus === 'FAILED' ? 'SOCIAL_POST_FAILED' : 'SOCIAL_POST_PUBLISHED',
        eventCategory: 'META',
        userId: params.userId,
        success: overallStatus !== 'FAILED',
        resourceType: 'social_post',
        resourceId: postRecord?.id || syntheticReceiptId,
        metadata: {
          action: 'multi_platform_publish',
          platforms: params.platforms,
          status: overallStatus,
          statusCode: calculatedStatusCode,
          conflict: hasConflict,
          success_count: successes,
          total_count: total,
          correlationHash,
          persistenceWarning,
        },
      });
    } catch {
      console.warn('[OPERATIONAL_ALERT] Social publication audit persistence failed.', {
        alertCode: 'SOCIAL_AUDIT_PERSISTENCE_FAILED',
        requestId: persistenceRequestId,
        correlationHash,
      });
    }

    const finalPostId: string | null = isSuccessfulDispatch
      ? (postRecord?.id || syntheticReceiptId)
      : null;

    if (claim.claimId) {
      if (isSuccessfulDispatch) {
        await this.completeDispatch({
          claimId: claim.claimId,
          organizationId: orgIdKey,
          workspaceId: wsIdKey,
          postId: postRecord?.id || null,
          externalReceiptId: finalPostId,
          platformResults,
          leaseToken: claim.leaseToken,
        });
      } else {
        await this.failDispatch({
          claimId: claim.claimId,
          organizationId: orgIdKey,
          workspaceId: wsIdKey,
          errorMessage: errors.join('; ') || 'Publish failed',
          leaseToken: claim.leaseToken,
        });
      }
    }

    if (
      overallStatus === 'PUBLISHED'
      || overallStatus === 'QUEUED'
      || overallStatus === 'PARTIALLY_PUBLISHED'
      || overallStatus === 'PUBLISHED_WITH_PERSISTENCE_WARNING'
    ) {
      this.publishedPosts.push({
        id: finalPostId || syntheticReceiptId,
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
      persistenceWarning: persistenceWarning || undefined,
      persistenceError,
    };
    } catch (publishErr: any) {
      if (claimId) {
        await this.failDispatch({
          claimId,
          organizationId: orgIdKey,
          workspaceId: wsIdKey,
          errorMessage: publishErr?.message || 'Publish dispatch threw unexpected exception',
        });
      }
      throw publishErr;
    } finally {
      inFlightDispatches.delete(dispatchLockKey);
    }
  }

  /**
   * Returns publication history through the privileged server client while
   * enforcing organization, workspace and optional user scope in the query.
   */
  static async getPublicationHistory(params: {
    workspaceId: string;
    organizationId: string;
    userId?: string;
    limit?: number;
    offset?: number;
    platform?: string;
  }): Promise<{ posts: any[]; total: number; limit: number; offset: number }> {
    if (!params.organizationId || !params.workspaceId) {
      throw publishingInputError('TENANT_CONTEXT_REQUIRED', 'Canonical tenant context is required.');
    }

    const limit = Math.min(Math.max(Number.isInteger(params.limit) ? params.limit! : 50, 1), 100);
    const offset = Math.max(Number.isInteger(params.offset) ? params.offset! : 0, 0);
    let query = getServiceSupabase()
      .from('social_posts')
      .select(
        'id, user_id, workspace_id, organization_id, title, body, media_urls, media_types, platforms, status, platform_post_ids, platform_results, scheduled_for, published_at, author_name, social_connection_id, content_id, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.userId) query = query.eq('user_id', params.userId);
    if (params.platform) query = query.contains('platforms', [params.platform]);

    const { data, error, count } = await query;
    if (error) {
      const historyError = new Error('Publication history query failed.');
      (historyError as any).publicCode = 'PUBLICATION_HISTORY_UNAVAILABLE';
      throw historyError;
    }

    return {
      posts: data || [],
      total: count ?? 0,
      limit,
      offset,
    };
  }
}

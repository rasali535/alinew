import { NextRequest } from 'next/server';
import * as crypto from 'crypto';
import { SocialPublishingService } from '@/lib/services/social/socialPublishing.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

const PLATFORM_ALIASES: Record<string, string> = {
  twitter: 'x',
};

const SUPPORTED_PLATFORMS = new Set([
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
const SAFE_CLIENT_ERRORS = new Set([
  'TENANT_CONTEXT_REQUIRED',
  'INVALID_JSON',
  'CONTENT_REQUIRED',
  'INVALID_PLATFORM',
  'INVALID_SCHEDULE_DATE',
  'INVALID_MEDIA',
  'INVALID_MEDIA_TYPE',
  'INVALID_CONNECTION_ID',
  'INVALID_IDEMPOTENCY_KEY',
]);

function normalizePlatform(value: string): string {
  const normalized = value.trim().toLowerCase();
  return PLATFORM_ALIASES[normalized] || normalized;
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

function validatePublicHttpsUrls(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw Object.assign(new Error('Invalid media collection.'), {
      statusCode: 400,
      publicCode: 'INVALID_MEDIA',
    });
  }

  return value.map((candidate) => {
    if (typeof candidate !== 'string') {
      throw Object.assign(new Error('Invalid media URL.'), {
        statusCode: 400,
        publicCode: 'INVALID_MEDIA',
      });
    }

    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw Object.assign(new Error('Invalid media URL.'), {
        statusCode: 400,
        publicCode: 'INVALID_MEDIA',
      });
    }

    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || isPrivateOrLocalHostname(parsed.hostname)) {
      throw Object.assign(new Error('Unsafe media URL.'), {
        statusCode: 400,
        publicCode: 'INVALID_MEDIA',
      });
    }

    return parsed.toString();
  });
}

function publicPlatformResults(results: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(results || {}).map(([platform, result]) => [
      platform,
      {
        success: Boolean(result?.success),
        platform: result?.platform || platform,
        ...(typeof result?.statusCode === 'number' ? { statusCode: result.statusCode } : {}),
        ...(typeof result?.postId === 'string' ? { postId: result.postId } : {}),
        ...(result?.publishedAt ? { publishedAt: result.publishedAt } : {}),
        ...(!result?.success ? { error: 'PLATFORM_PUBLISH_FAILED' } : {}),
      },
    ])
  );
}

function parseIntegerParameter(raw: string | null, fallback: number, min: number, max: number): number | null {
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const requestId = `req_hist_${crypto.randomUUID()}`;
  const context = await getCurrentRalionContext(request, { requireAuth: true });
  if (!context) {
    return authRequiredResponse(request);
  }

  const organizationId = context.organization?.id;
  const workspaceId = context.workspace?.id;
  if (!organizationId || !workspaceId) {
    return corsJsonResponse(
      {
        success: false,
        error: 'TENANT_CONTEXT_REQUIRED',
        message: 'Canonical organization and workspace context is required.',
        requestId,
      },
      { status: 400 },
      request
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseIntegerParameter(searchParams.get('limit'), 50, 1, 100);
  const offset = parseIntegerParameter(searchParams.get('offset'), 0, 0, 100000);
  if (limit === null || offset === null) {
    return corsJsonResponse(
      {
        success: false,
        error: 'INVALID_PARAMETER',
        message: 'limit must be 1-100 and offset must be 0-100000.',
        requestId,
      },
      { status: 400 },
      request
    );
  }

  const rawPlatform = searchParams.get('platform');
  const platform = rawPlatform ? normalizePlatform(rawPlatform) : undefined;
  if (platform && !SUPPORTED_PLATFORMS.has(platform)) {
    return corsJsonResponse(
      {
        success: false,
        error: 'INVALID_PLATFORM',
        message: 'The requested platform is not supported.',
        requestId,
      },
      { status: 400 },
      request
    );
  }

  try {
    const history = await SocialPublishingService.getPublicationHistory({
      workspaceId,
      organizationId,
      userId: context.user.id,
      limit,
      offset,
      platform,
    });

    return corsJsonResponse({ success: true, ...history, requestId }, undefined, request);
  } catch (error: any) {
    console.error('[SocialPostsAPI] Publication history query failed:', {
      requestId,
      errorCode: error?.message?.startsWith('INTERNAL_DATABASE_ERROR') ? 'DB_QUERY_ERROR' : 'UNKNOWN',
    });
    return corsJsonResponse(
      {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve social publication history.',
        requestId,
      },
      { status: 500 },
      request
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = `req_post_${crypto.randomUUID()}`;

  try {
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const organizationId = context.organization?.id;
    const workspaceId = context.workspace?.id;
    if (!organizationId || !workspaceId) {
      return corsJsonResponse(
        {
          success: false,
          error: 'TENANT_CONTEXT_REQUIRED',
          message: 'Canonical organization and workspace context is required.',
          requestId,
        },
        { status: 400 },
        request
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return corsJsonResponse(
        { success: false, error: 'INVALID_JSON', message: 'Invalid JSON request body.', requestId },
        { status: 400 },
        request
      );
    }

    const actualContent = body.content || body.body;
    if (typeof actualContent !== 'string' || !actualContent.trim()) {
      return corsJsonResponse(
        { success: false, error: 'CONTENT_REQUIRED', message: 'Post content is required.', requestId },
        { status: 400 },
        request
      );
    }

    const requestedPlatforms = body.platforms === undefined ? ['facebook'] : body.platforms;
    if (!Array.isArray(requestedPlatforms) || requestedPlatforms.length === 0) {
      return corsJsonResponse(
        { success: false, error: 'INVALID_PLATFORM', message: 'At least one platform is required.', requestId },
        { status: 400 },
        request
      );
    }

    const targetPlatforms = Array.from(new Set(requestedPlatforms.map((platform: unknown) => {
      if (typeof platform !== 'string') return '';
      return normalizePlatform(platform);
    })));
    if (targetPlatforms.some((platform) => !platform || !SUPPORTED_PLATFORMS.has(platform))) {
      return corsJsonResponse(
        { success: false, error: 'INVALID_PLATFORM', message: 'One or more platforms are unsupported.', requestId },
        { status: 400 },
        request
      );
    }

    let scheduledFor: Date | undefined;
    if (body.scheduledFor !== undefined && body.scheduledFor !== null && body.scheduledFor !== '') {
      scheduledFor = new Date(body.scheduledFor);
      if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() < Date.now() - 60000) {
        return corsJsonResponse(
          {
            success: false,
            error: 'INVALID_SCHEDULE_DATE',
            message: 'scheduledFor must be a valid timestamp that is not in the past.',
            requestId,
          },
          { status: 400 },
          request
        );
      }
    }

    const mediaSource = body.mediaUrls ?? body.mediaItems;
    const mediaUrls = validatePublicHttpsUrls(mediaSource);
    let mediaTypes: string[] | undefined;
    if (body.mediaTypes !== undefined) {
      if (
        !Array.isArray(body.mediaTypes)
        || body.mediaTypes.length !== mediaUrls.length
        || body.mediaTypes.some((value: unknown) => typeof value !== 'string' || !/^(image|video)\/[a-z0-9.+-]+$/i.test(value))
      ) {
        return corsJsonResponse(
          {
            success: false,
            error: 'INVALID_MEDIA_TYPE',
            message: 'mediaTypes must correspond one-to-one with mediaUrls.',
            requestId,
          },
          { status: 400 },
          request
        );
      }
      mediaTypes = body.mediaTypes.map((value: string) => value.toLowerCase());
    }

    if (body.socialConnectionId !== undefined && !UUID_PATTERN.test(body.socialConnectionId)) {
      return corsJsonResponse(
        {
          success: false,
          error: 'INVALID_CONNECTION_ID',
          message: 'socialConnectionId must be a valid UUID.',
          requestId,
        },
        { status: 400 },
        request
      );
    }

    if (
      body.idempotencyKey !== undefined
      && (typeof body.idempotencyKey !== 'string' || !body.idempotencyKey.trim() || body.idempotencyKey.length > 256)
    ) {
      return corsJsonResponse(
        {
          success: false,
          error: 'INVALID_IDEMPOTENCY_KEY',
          message: 'idempotencyKey must be a non-empty string of at most 256 characters.',
          requestId,
        },
        { status: 400 },
        request
      );
    }

    const result = await SocialPublishingService.publish({
      userId: context.user.id,
      workspaceId,
      organizationId,
      title: typeof body.title === 'string' ? body.title : 'Social Post',
      body: actualContent.trim(),
      mediaUrls,
      mediaTypes,
      platforms: targetPlatforms as any,
      scheduledFor,
      authorName: context.organization?.name || context.workspace?.name || 'Ralion Member',
      pageId: typeof body.pageId === 'string' ? body.pageId : undefined,
      socialConnectionId: body.socialConnectionId,
      idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : undefined,
    });

    const success = ['PUBLISHED', 'QUEUED', 'PARTIALLY_PUBLISHED', 'PUBLISHED_WITH_PERSISTENCE_WARNING']
      .includes(result.overallStatus);
    const status = result.statusCode || (success ? 200 : 422);

    return corsJsonResponse(
      {
        success,
        postId: result.postId,
        overallStatus: result.overallStatus,
        statusCode: status,
        ...(result.conflict ? { conflict: true, error: 'PUBLISH_CONFLICT' } : {}),
        ...(result.persistenceWarning
          ? { persistenceWarning: true, persistenceError: result.persistenceError }
          : {}),
        platformResults: publicPlatformResults(result.platformResults),
        requestId,
      },
      { status },
      request
    );
  } catch (error: any) {
    const requestedStatus = Number(error?.statusCode || error?.status || 500);
    const status = [400, 401, 403, 409, 422, 429, 500, 502, 503, 504].includes(requestedStatus)
      ? requestedStatus
      : 500;
    const publicCode = SAFE_CLIENT_ERRORS.has(error?.publicCode)
      ? error.publicCode
      : status === 409
        ? 'PUBLISH_CONFLICT'
        : 'PUBLISH_EXECUTION_FAILED';

    console.error('[SocialPostsAPI] Execution failed:', {
      requestId,
      statusCode: status,
      errorCode: publicCode,
    });

    return corsJsonResponse(
      {
        success: false,
        error: publicCode,
        message: status >= 500 ? 'Failed to publish post.' : 'The publish request was rejected.',
        requestId,
      },
      { status },
      request
    );
  }
}

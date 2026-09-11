/**
 * Ralion Unified Social Media Architecture — Meta (Facebook) Provider Adapter
 * Ras Ali Labs (Pty) Ltd
 * Uses Official Meta Graph API v19.0+
 */

import { SocialProvider } from '../SocialProvider';
import {
  SocialPlatformType,
  SocialCapabilities,
  SocialProfile,
  SocialAuthResult,
  PublishContentParams,
  PublishResponse,
  SocialAnalyticsResult,
  SocialMessagePayload,
  SocialMessageResult,
  ConnectionHealthResult,
} from '../types';

export const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v24.0';

export function getMetaGraphVersion(): string {
  const configured = process.env.META_GRAPH_API_VERSION || META_GRAPH_API_VERSION;
  if (/^v\d+\.\d+$/i.test(configured.trim())) {
    return configured.trim();
  }
  return 'v24.0';
}

export function sanitizeMetaErrorMessage(msg?: string): string {
  if (!msg || typeof msg !== 'string') return 'Unknown Facebook error';
  return msg
    .replace(/EA[A-Za-z0-9]+/g, '[REDACTED_TOKEN]')
    .replace(/access_token=[^&\s]+/gi, 'access_token=[REDACTED]')
    .trim();
}

export function mapMetaErrorToHttpStatus(httpStatus: number, metaError?: any): number {
  if (!metaError) return httpStatus >= 400 ? httpStatus : 422;
  const code = Number(metaError.code);
  const subcode = Number(metaError.error_subcode);

  // 401 - Authentication / Expired or invalid token
  if (code === 190 || [458, 459, 460, 463, 467, 490, 492].includes(subcode)) {
    return 401;
  }

  // 403 - Missing permission / Unauthorized Page / pages_manage_posts missing
  if ((code >= 200 && code <= 299) || code === 10 || code === 283) {
    return 403;
  }

  // 409 - Duplicate post content conflict
  if (code === 506 || subcode === 506 || (typeof metaError.message === 'string' && metaError.message.toLowerCase().includes('duplicate'))) {
    return 409;
  }

  // 429 - Rate limit / call rate exceeded
  if ([4, 17, 32, 613].includes(code)) {
    return 429;
  }

  // 400 - Invalid parameters / Unsupported media / Missing required field
  if (code === 100 || subcode === 33 || (metaError.type === 'OAuthException' && metaError.message?.toLowerCase().includes('param'))) {
    return 400;
  }

  // 502 / 503 - Meta upstream temporary service error
  if ([1, 2, 341].includes(code)) {
    return 502;
  }

  if (httpStatus >= 400 && httpStatus < 600) {
    return httpStatus;
  }

  return 422;
}

export class MetaProvider extends SocialProvider {
  readonly platform: SocialPlatformType = 'facebook';
  readonly displayName = 'Facebook';
  readonly defaultScopes = [
    'public_profile',
    'email',
  ];

  readonly pageScopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_metadata',
  ];

  private getAppId(): string {
    return process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || '1759273775121373';
  }

  private getAppSecret(): string {
    return process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || '';
  }

  getCapabilities(scopes: string[] = []): SocialCapabilities {
    const hasPostScope = scopes.includes('pages_manage_posts') || scopes.length === 0;
    const hasAnalyticsScope = scopes.includes('read_insights') || scopes.includes('pages_read_engagement') || scopes.length === 0;
    const hasMsgScope = scopes.includes('pages_messaging');

    return {
      canPublish: hasPostScope,
      canSchedule: hasPostScope,
      canUploadImage: hasPostScope,
      canUploadVideo: hasPostScope,
      canPublishStories: hasPostScope,
      canPublishReels: hasPostScope,
      canPublishShortVideo: hasPostScope,
      canReadAnalytics: hasAnalyticsScope,
      canReadComments: true,
      canReplyToComments: hasPostScope,
      canReadMessages: hasMsgScope,
      canSendMessages: hasMsgScope,
      canManagePages: true,
      canManageBusinessAccounts: true,
    };
  }

  getAuthorizationUrl(
    state: string,
    redirectUri: string,
    options?: { intent?: 'login' | 'page_connection'; additionalScopes?: string[] } | string[]
  ): string {
    let intent: 'login' | 'page_connection' = 'login';
    let additional: string[] = [];

    if (Array.isArray(options)) {
      additional = options;
      if (options.some((s) => s.startsWith('pages_'))) {
        intent = 'page_connection';
      }
    } else if (options && typeof options === 'object') {
      intent = options.intent || 'login';
      additional = options.additionalScopes || [];
    }

    const baseScopes = intent === 'page_connection'
      ? [...this.defaultScopes, ...this.pageScopes]
      : this.defaultScopes;

    const scopes = Array.from(new Set([...baseScopes, ...additional])).join(',');
    const version = getMetaGraphVersion();
    const params = new URLSearchParams({
      client_id: this.getAppId(),
      redirect_uri: redirectUri,
      state,
      scope: scopes,
      response_type: 'code',
      ...(intent === 'page_connection' ? { auth_type: 'rerequest' } : {}),
    });
    return `https://www.facebook.com/${version}/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(code: string, redirectUri: string): Promise<SocialAuthResult> {
    const version = getMetaGraphVersion();
    const tokenUrl = `https://graph.facebook.com/${version}/oauth/access_token?` + new URLSearchParams({
      client_id: this.getAppId(),
      client_secret: this.getAppSecret(),
      redirect_uri: redirectUri,
      code,
    }).toString();

    const res = await fetch(tokenUrl);
    const data = await res.json();
    if (data.error) {
      throw new Error(`[MetaProvider] Token exchange failed: ${sanitizeMetaErrorMessage(data.error.message || JSON.stringify(data.error))}`);
    }

    const shortLivedToken = data.access_token;
    // Exchange for Long-Lived Token (60 days)
    const longTokenUrl = `https://graph.facebook.com/${version}/oauth/access_token?` + new URLSearchParams({
      grant_type: 'fb_extend_sso_token',
      client_id: this.getAppId(),
      client_secret: this.getAppSecret(),
      fb_exchange_token: shortLivedToken,
    }).toString();

    let finalToken = shortLivedToken;
    let expiresIn = data.expires_in || 5184000;

    try {
      const longRes = await fetch(longTokenUrl);
      const longData = await longRes.json();
      if (longData.access_token) {
        finalToken = longData.access_token;
        expiresIn = longData.expires_in || expiresIn;
      }
    } catch {
      // Use short-lived token if extension fails
    }

    const profile = await this.getProfile(finalToken);

    return {
      accessToken: finalToken,
      expiresIn,
      scopes: this.defaultScopes,
      profile,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn?: number }> {
    return { accessToken: refreshToken, expiresIn: 5184000 };
  }

  async getProfile(accessToken: string, options?: { pageId?: string }): Promise<SocialProfile> {
    const version = getMetaGraphVersion();
    const target = options?.pageId || 'me';
    const fields = 'id,name,email,picture.type(large),followers_count,fan_count';
    const res = await fetch(`https://graph.facebook.com/${version}/${target}?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`);
    const data = await res.json();

    if (data.error) {
      throw new Error(`[MetaProvider] Profile fetch failed: ${sanitizeMetaErrorMessage(data.error.message)}`);
    }

    const followers = Number(data.followers_count ?? data.fan_count ?? 0);

    return {
      provider: 'facebook',
      providerAccountId: data.id,
      accountName: data.name,
      username: data.name ? data.name.toLowerCase().replace(/\s+/g, '') : `@${data.id}`,
      avatarUrl: data.picture?.data?.url,
      accountType: options?.pageId ? 'PAGE' : 'PERSONAL',
      email: data.email,
      followersCount: followers,
      scopes: this.defaultScopes,
    };
  }

  async publish(accessToken: string, params: PublishContentParams): Promise<PublishResponse> {
    const targetId = params.pageId || 'me';
    const publishedAt = new Date().toISOString();
    const version = getMetaGraphVersion();

    try {
      let endpoint = `https://graph.facebook.com/${version}/${targetId}/feed`;
      let endpointType: 'feed' | 'photos' | 'videos' = 'feed';
      const bodyPayload: Record<string, any> = {
        message: params.body,
        access_token: accessToken,
      };

      const mediaUrls = params.mediaUrls || [];
      const mediaTypes = params.mediaTypes || [];

      if (mediaUrls.length > 0) {
        const firstUrl = mediaUrls[0];
        const isVideo =
          mediaTypes.some((t) => typeof t === 'string' && t.toLowerCase().includes('video')) ||
          /\.(mp4|mov|webm|avi|m4v)(\?.*)?$/i.test(firstUrl);

        if (isVideo) {
          endpointType = 'videos';
          endpoint = `https://graph.facebook.com/${version}/${targetId}/videos`;
          delete bodyPayload.message;
          bodyPayload.description = params.body;
          bodyPayload.file_url = firstUrl;
        } else {
          endpointType = 'photos';
          endpoint = `https://graph.facebook.com/${version}/${targetId}/photos`;
          delete bodyPayload.message;
          bodyPayload.caption = params.body;
          bodyPayload.url = firstUrl;
        }
      }

      console.log('[MetaProvider] Dispatching Facebook publish:', {
        version,
        targetId,
        endpointType,
        hasMedia: mediaUrls.length > 0,
        bodyLength: params.body?.length || 0,
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        const rawError = data.error || { message: `Meta Graph API returned HTTP ${res.status}` };
        const sanitizedMsg = sanitizeMetaErrorMessage(rawError.message);
        const mappedStatus = mapMetaErrorToHttpStatus(res.status, rawError);

        console.warn('[MetaProvider] Facebook publish failure:', {
          httpStatus: res.status,
          mappedStatus,
          errorCode: rawError.code,
          errorSubcode: rawError.error_subcode,
          errorType: rawError.type,
          fbtraceId: rawError.fbtrace_id,
          message: sanitizedMsg,
          targetPageId: targetId,
          endpointType,
        });

        return {
          success: false,
          error: sanitizedMsg,
          statusCode: mappedStatus,
          details: {
            httpStatus: res.status,
            errorCode: rawError.code,
            errorSubcode: rawError.error_subcode,
            errorType: rawError.type,
            fbtraceId: rawError.fbtrace_id,
            sanitizedMessage: sanitizedMsg,
            targetPageId: targetId,
            endpointType,
          },
          platform: 'facebook',
          publishedAt,
        };
      }

      const postId = data.id || data.post_id;
      return {
        success: true,
        postId,
        postUrl: `https://facebook.com/${postId}`,
        statusCode: 200,
        platform: 'facebook',
        publishedAt,
      };
    } catch (err: any) {
      const sanitizedMsg = sanitizeMetaErrorMessage(err.message || 'Network error publishing to Facebook');
      console.error('[MetaProvider] Network error during publish:', err);
      return {
        success: false,
        error: sanitizedMsg,
        statusCode: 502,
        details: {
          httpStatus: 502,
          message: sanitizedMsg,
          targetPageId: targetId,
          endpointType: 'unknown',
        },
        platform: 'facebook',
        publishedAt,
      };
    }
  }

  async deletePost(accessToken: string, postId: string): Promise<boolean> {
    const version = getMetaGraphVersion();
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/${postId}?access_token=${encodeURIComponent(accessToken)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async getAnalytics(accessToken: string, accountId: string): Promise<SocialAnalyticsResult> {
    const version = getMetaGraphVersion();
    const lastUpdated = new Date().toISOString();
    try {
      const res = await fetch(
        `https://graph.facebook.com/${version}/${accountId}/insights?metric=page_impressions,page_post_engagements,page_views_total&period=days_28&access_token=${encodeURIComponent(accessToken)}`
      );
      const data = await res.json();
      let impressions = 0;
      let engagement = 0;
      let followers = 0;

      if (data.data && Array.isArray(data.data)) {
        for (const metric of data.data) {
          const val = metric.values?.[metric.values.length - 1]?.value || 0;
          if (metric.name === 'page_impressions') impressions = Number(val);
          if (metric.name === 'page_post_engagements' || metric.name === 'page_engaged_users') engagement = Number(val);
          if (metric.name === 'page_views_total' || metric.name === 'page_fans') followers = Number(val);
        }
      }

      return {
        provider: 'facebook',
        providerAccountId: accountId,
        metrics: { impressions, reach: impressions, engagement, followers },
        lastUpdated,
      };
    } catch {
      return {
        provider: 'facebook',
        providerAccountId: accountId,
        metrics: { impressions: 0, reach: 0, engagement: 0, followers: 0 },
        lastUpdated,
      };
    }
  }

  async sendMessage(accessToken: string, message: SocialMessagePayload): Promise<SocialMessageResult> {
    const version = getMetaGraphVersion();
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: message.recipientId },
          message: { text: message.messageText },
        }),
      });
      const data = await res.json();
      if (data.error) {
        return { success: false, status: 'FAILED', error: sanitizeMetaErrorMessage(data.error.message) };
      }
      return { success: true, messageId: data.message_id, status: 'SENT' };
    } catch (err: any) {
      return { success: false, status: 'FAILED', error: sanitizeMetaErrorMessage(err.message) };
    }
  }

  async revokeAccess(accessToken: string): Promise<boolean> {
    const version = getMetaGraphVersion();
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/me/permissions?access_token=${encodeURIComponent(accessToken)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return Boolean(data.success);
    } catch {
      return false;
    }
  }

  async healthCheck(accessToken: string): Promise<ConnectionHealthResult> {
    const version = getMetaGraphVersion();
    const checkedAt = new Date().toISOString();
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`);
      const data = await res.json();
      if (data.error) {
        const isExpired = data.error.code === 190;
        return {
          healthy: false,
          status: isExpired ? 'RECONNECT_REQUIRED' : 'NEEDS_ATTENTION',
          tokenStatus: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_REVOKED',
          errorMessage: sanitizeMetaErrorMessage(data.error.message),
          checkedAt,
        };
      }
      return {
        healthy: true,
        status: 'CONNECTED',
        tokenStatus: 'TOKEN_VALID',
        checkedAt,
      };
    } catch (err: any) {
      return {
        healthy: false,
        status: 'PLATFORM_UNAVAILABLE',
        tokenStatus: 'REAUTH_REQUIRED',
        errorMessage: sanitizeMetaErrorMessage(err.message),
        checkedAt,
      };
    }
  }
}

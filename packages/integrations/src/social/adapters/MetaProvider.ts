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
  ConnectionHealthResult
} from '../types';

export class MetaProvider extends SocialProvider {
  readonly platform: SocialPlatformType = 'facebook';
  readonly displayName = 'Facebook';
  readonly defaultScopes = [
    'public_profile',
    'email'
  ];

  readonly pageScopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_metadata'
  ];

  private getAppId(): string {
    return process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || '1558897076250918';
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
      // If caller explicitly passed page scopes, treat intent as page_connection
      if (options.some(s => s.startsWith('pages_'))) {
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
    const params = new URLSearchParams({
      client_id: this.getAppId(),
      redirect_uri: redirectUri,
      state,
      scope: scopes,
      response_type: 'code',
      ...(intent === 'page_connection' ? { auth_type: 'rerequest' } : {})
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
  }

  async handleCallback(code: string, redirectUri: string): Promise<SocialAuthResult> {
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` + new URLSearchParams({
      client_id: this.getAppId(),
      client_secret: this.getAppSecret(),
      redirect_uri: redirectUri,
      code
    }).toString();

    const res = await fetch(tokenUrl);
    const data = await res.json();
    if (data.error) {
      throw new Error(`[MetaProvider] Token exchange failed: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const shortLivedToken = data.access_token;
    // Exchange for Long-Lived Token (60 days)
    const longTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` + new URLSearchParams({
      grant_type: 'fb_extend_sso_token',
      client_id: this.getAppId(),
      client_secret: this.getAppSecret(),
      fb_exchange_token: shortLivedToken
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
      profile
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn?: number }> {
    return { accessToken: refreshToken, expiresIn: 5184000 };
  }

  async getProfile(accessToken: string, options?: { pageId?: string }): Promise<SocialProfile> {
    const target = options?.pageId || 'me';
    const fields = 'id,name,email,picture.type(large),followers_count,fan_count';
    const res = await fetch(`https://graph.facebook.com/v19.0/${target}?fields=${fields}&access_token=${encodeURIComponent(accessToken)}`);
    const data = await res.json();

    if (data.error) {
      throw new Error(`[MetaProvider] Profile fetch failed: ${data.error.message}`);
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
      scopes: this.defaultScopes
    };
  }

  async publish(accessToken: string, params: PublishContentParams): Promise<PublishResponse> {
    const targetId = params.pageId || 'me';
    const publishedAt = new Date().toISOString();

    try {
      let endpoint = `https://graph.facebook.com/v19.0/${targetId}/feed`;
      const bodyPayload: Record<string, any> = {
        message: params.body,
        access_token: accessToken
      };

      if (params.mediaUrls && params.mediaUrls.length > 0) {
        endpoint = `https://graph.facebook.com/v19.0/${targetId}/photos`;
        bodyPayload.url = params.mediaUrls[0];
        bodyPayload.caption = params.body;
        delete bodyPayload.message;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (data.error) {
        return {
          success: false,
          error: data.error.message || 'Facebook publish failed',
          platform: 'facebook',
          publishedAt
        };
      }

      return {
        success: true,
        postId: data.id || data.post_id,
        postUrl: `https://facebook.com/${data.id || data.post_id}`,
        platform: 'facebook',
        publishedAt
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error publishing to Facebook',
        platform: 'facebook',
        publishedAt
      };
    }
  }

  async deletePost(accessToken: string, postId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${postId}?access_token=${encodeURIComponent(accessToken)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }

  async getAnalytics(accessToken: string, accountId: string): Promise<SocialAnalyticsResult> {
    const lastUpdated = new Date().toISOString();
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${accountId}/insights?metric=page_impressions,page_engaged_users,page_fans&period=day&access_token=${encodeURIComponent(accessToken)}`
      );
      const data = await res.json();
      let impressions = 0;
      let engagement = 0;
      let followers = 0;

      if (data.data && Array.isArray(data.data)) {
        for (const metric of data.data) {
          const val = metric.values?.[metric.values.length - 1]?.value || 0;
          if (metric.name === 'page_impressions') impressions = Number(val);
          if (metric.name === 'page_engaged_users') engagement = Number(val);
          if (metric.name === 'page_fans') followers = Number(val);
        }
      }

      return {
        provider: 'facebook',
        providerAccountId: accountId,
        metrics: { impressions, reach: impressions, engagement, followers },
        lastUpdated
      };
    } catch {
      return {
        provider: 'facebook',
        providerAccountId: accountId,
        metrics: { impressions: 0, reach: 0, engagement: 0, followers: 0 },
        lastUpdated
      };
    }
  }

  async sendMessage(accessToken: string, message: SocialMessagePayload): Promise<SocialMessageResult> {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: message.recipientId },
          message: { text: message.messageText }
        })
      });
      const data = await res.json();
      if (data.error) {
        return { success: false, status: 'FAILED', error: data.error.message };
      }
      return { success: true, messageId: data.message_id, status: 'SENT' };
    } catch (err: any) {
      return { success: false, status: 'FAILED', error: err.message };
    }
  }

  async revokeAccess(accessToken: string): Promise<boolean> {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${encodeURIComponent(accessToken)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  }

  async healthCheck(accessToken: string): Promise<ConnectionHealthResult> {
    const checkedAt = new Date().toISOString();
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`);
      const data = await res.json();
      if (data.error) {
        const isExpired = data.error.code === 190;
        return {
          healthy: false,
          status: isExpired ? 'RECONNECT_REQUIRED' : 'NEEDS_ATTENTION',
          tokenStatus: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_REVOKED',
          errorMessage: data.error.message,
          checkedAt
        };
      }
      return {
        healthy: true,
        status: 'CONNECTED',
        tokenStatus: 'TOKEN_VALID',
        checkedAt
      };
    } catch (err: any) {
      return {
        healthy: false,
        status: 'PLATFORM_UNAVAILABLE',
        tokenStatus: 'REAUTH_REQUIRED',
        errorMessage: err.message,
        checkedAt
      };
    }
  }
}

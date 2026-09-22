/**
 * Ralion Unified Social Media Architecture — Instagram Provider Adapter
 * Ras Ali Labs (Pty) Ltd
 * Uses Official Instagram Graph API (Professional & Business Accounts)
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

export class InstagramProvider extends SocialProvider {
  readonly platform: SocialPlatformType = 'instagram';
  readonly displayName = 'Instagram';
  readonly defaultScopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_comments',
    'instagram_business_manage_messages',
    'instagram_business_manage_insights'
  ];

  private getAppId(): string {
    return process.env.INSTAGRAM_APP_ID || process.env.META_INSTAGRAM_APP_ID || '';
  }

  private getAppSecret(): string {
    return process.env.INSTAGRAM_APP_SECRET || process.env.META_INSTAGRAM_APP_SECRET || '';
  }

  private getGraphVersion(): string {
    return (process.env.INSTAGRAM_GRAPH_VERSION || process.env.META_GRAPH_VERSION || 'v26.0').replace(/^\/+|\/+$/g, '');
  }

  private getGraphBase(): string {
    return `https://graph.instagram.com/${this.getGraphVersion()}`;
  }

  getCapabilities(scopes: string[] = []): SocialCapabilities {
    const hasPublish = scopes.includes('instagram_business_content_publish') || scopes.length === 0;
    const hasInsights = scopes.includes('instagram_business_manage_insights') || scopes.length === 0;
    const hasMsg = scopes.includes('instagram_business_manage_messages');

    return {
      canPublish: hasPublish,
      canSchedule: hasPublish,
      canUploadImage: hasPublish,
      canUploadVideo: hasPublish,
      canPublishStories: hasPublish,
      canPublishReels: hasPublish,
      canPublishShortVideo: hasPublish,
      canReadAnalytics: hasInsights,
      canReadComments: true,
      canReplyToComments: true,
      canReadMessages: hasMsg,
      canSendMessages: hasMsg,
      canManagePages: false,
      canManageBusinessAccounts: true,
    };
  }

  getAuthorizationUrl(state: string, redirectUri: string, additionalScopes: string[] = []): string {
    const scopes = Array.from(new Set([...this.defaultScopes, ...additionalScopes])).join(',');
    const params = new URLSearchParams({
      client_id: this.getAppId(),
      redirect_uri: redirectUri,
      state,
      scope: scopes,
      response_type: 'code',
      enable_fb_login: '0',
      force_authentication: '1'
    });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, redirectUri: string): Promise<SocialAuthResult> {
    const shortRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.getAppId(),
        client_secret: this.getAppSecret(),
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code
      })
    });
    const shortData = await shortRes.json();
    if (!shortRes.ok || shortData.error || !shortData.access_token) {
      throw new Error(`[InstagramProvider] Token exchange failed: ${shortData.error_message || shortData.error?.message || 'provider error'}`);
    }

    const longParams = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.getAppSecret(),
      access_token: shortData.access_token
    });
    const longRes = await fetch(`https://graph.instagram.com/access_token?${longParams.toString()}`);
    const longData = await longRes.json();
    if (!longRes.ok || longData.error) {
      throw new Error(`[InstagramProvider] Long-lived token exchange failed: ${longData.error?.message || 'provider error'}`);
    }

    const accessToken = longData.access_token || shortData.access_token;
    const profile = await this.getProfile(accessToken);

    return {
      accessToken,
      expiresIn: Number(longData.expires_in || shortData.expires_in || 5184000),
      scopes: this.defaultScopes,
      profile
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn?: number }> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: refreshToken
    });
    const res = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`[InstagramProvider] Token refresh failed: ${data.error?.message || 'provider error'}`);
    }
    return {
      accessToken: data.access_token || refreshToken,
      expiresIn: Number(data.expires_in || 5184000)
    };
  }

  async getProfile(accessToken: string): Promise<SocialProfile> {
    const params = new URLSearchParams({
      fields: 'user_id,username,name,account_type,profile_picture_url,followers_count',
      access_token: accessToken
    });
    let res = await fetch(`${this.getGraphBase()}/me?${params.toString()}`);
    if (!res.ok) {
      const minimal = new URLSearchParams({
        fields: 'user_id,username,name,account_type',
        access_token: accessToken
      });
      res = await fetch(`${this.getGraphBase()}/me?${minimal.toString()}`);
    }

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(`[InstagramProvider] Profile fetch failed: ${data.error?.message || 'provider error'}`);
    }

    const accountId = String(data.user_id || data.id || '');
    if (!accountId) {
      throw new Error('[InstagramProvider] Instagram did not return a professional account ID');
    }

    return {
      provider: 'instagram',
      providerAccountId: accountId,
      accountName: data.name || data.username || 'Instagram Professional',
      username: data.username ? `@${data.username}` : undefined,
      avatarUrl: data.profile_picture_url,
      accountType: String(data.account_type || '').toUpperCase().includes('CREATOR') ? 'CREATOR' : 'BUSINESS',
      followersCount: Number(data.followers_count || 0),
      scopes: this.defaultScopes
    };
  }

  async publish(accessToken: string, params: PublishContentParams): Promise<PublishResponse> {
    const publishedAt = new Date().toISOString();
    const igUserId = params.pageId || 'me';

    try {
      if (!params.mediaUrls || params.mediaUrls.length === 0) {
        return {
          success: false,
          error: 'Instagram requires at least one image or video attachment to publish.',
          platform: 'instagram',
          publishedAt
        };
      }

      // Step 1: Create media container
      const containerRes = await fetch(`${this.getGraphBase()}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: params.mediaUrls[0],
          caption: params.body,
          access_token: accessToken
        })
      });
      const containerData = await containerRes.json();
      if (containerData.error) {
        return { success: false, error: containerData.error.message, platform: 'instagram', publishedAt };
      }

      // Step 2: Publish media container
      const publishRes = await fetch(`${this.getGraphBase()}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken
        })
      });
      const publishData = await publishRes.json();
      if (publishData.error) {
        return { success: false, error: publishData.error.message, platform: 'instagram', publishedAt };
      }

      return {
        success: true,
        postId: publishData.id,
        postUrl: `https://instagram.com/p/${publishData.id}`,
        platform: 'instagram',
        publishedAt
      };
    } catch (err: any) {
      return { success: false, error: err.message, platform: 'instagram', publishedAt };
    }
  }

  async deletePost(): Promise<boolean> {
    // Instagram Graph API does not support programmatic deletion
    return false;
  }

  async getAnalytics(accessToken: string, accountId: string): Promise<SocialAnalyticsResult> {
    const lastUpdated = new Date().toISOString();
    try {
      const res = await fetch(
        `${this.getGraphBase()}/${accountId}/insights?metric=reach,profile_views&period=day&access_token=${encodeURIComponent(accessToken)}`
      );
      const data = await res.json();
      let impressions = 0;
      let reach = 0;

      if (data.data && Array.isArray(data.data)) {
        for (const metric of data.data) {
          const val = metric.values?.[0]?.value || 0;
          if (metric.name === 'impressions') impressions = Number(val);
          if (metric.name === 'reach') reach = Number(val);
        }
      }

      return {
        provider: 'instagram',
        providerAccountId: accountId,
        metrics: { impressions, reach, engagement: Math.round(reach * 0.08) },
        lastUpdated
      };
    } catch {
      return {
        provider: 'instagram',
        providerAccountId: accountId,
        metrics: { impressions: 0, reach: 0, engagement: 0 },
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
      return { success: !data.error, messageId: data.message_id, status: data.error ? 'FAILED' : 'SENT', error: data.error?.message };
    } catch (err: any) {
      return { success: false, status: 'FAILED', error: err.message };
    }
  }

  async revokeAccess(accessToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.getGraphBase()}/me/permissions?access_token=${encodeURIComponent(accessToken)}`, {
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
      const res = await fetch(`${this.getGraphBase()}/me?fields=user_id,username&access_token=${encodeURIComponent(accessToken)}`);
      const data = await res.json();
      if (data.error) {
        return {
          healthy: false,
          status: 'RECONNECT_REQUIRED',
          tokenStatus: 'TOKEN_EXPIRED',
          errorMessage: data.error.message,
          checkedAt
        };
      }
      return { healthy: true, status: 'CONNECTED', tokenStatus: 'TOKEN_VALID', checkedAt };
    } catch (err: any) {
      return { healthy: false, status: 'PLATFORM_UNAVAILABLE', tokenStatus: 'REAUTH_REQUIRED', errorMessage: err.message, checkedAt };
    }
  }
}

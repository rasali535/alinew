import 'server-only';

import type { PublishResult, SocialPost } from './social.service';

const META_GRAPH_VERSION = (process.env.META_GRAPH_VERSION || 'v26.0').replace(/^\/+|\/+$/g, '');
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const META_DIALOG_BASE = `https://www.facebook.com/${META_GRAPH_VERSION}`;

function getOAuthRedirectUri(provider: string): string {
  const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion').replace(/\/+$/, '');
  const cleanBase = rawAppUrl.endsWith('/ralion') ? rawAppUrl : `${rawAppUrl}/ralion`;
  return `${cleanBase}/api/oauth/${provider}/callback`;
}

export const metaAdapterV26 = {
  graphVersion: () => META_GRAPH_VERSION,
  graphBase: () => META_GRAPH_BASE,
  clientId: () => process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
  clientSecret: () => process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || '',
  redirectUri: (provider: string) => getOAuthRedirectUri(provider),
  scopes: {
    stage1_login: ['public_profile', 'email'],
    stage2_pages: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_metadata'],
    facebook: ['public_profile', 'email', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_metadata'],
    instagram: ['public_profile', 'email', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_metadata', 'instagram_basic'],
  },

  getAuthUrl(state: string, provider: string = 'facebook', intent: 'login' | 'page_connection' = 'page_connection'): string {
    if (!this.clientId()) throw new Error('Meta App ID is not configured');
    const customScopes = process.env.META_OAUTH_SCOPES;
    const baseScopes = customScopes
      ? customScopes.split(',').map((s) => s.trim()).filter(Boolean)
      : (intent === 'login' ? this.scopes.stage1_login : this.scopes.facebook);
    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: this.redirectUri(provider),
      state,
      scope: baseScopes.join(','),
      response_type: 'code',
      auth_type: 'rerequest',
    });
    return `${META_DIALOG_BASE}/dialog/oauth?${params}`;
  },

  async getUserProfile(userAccessToken: string) {
    const params = new URLSearchParams({ fields: 'id,name,email,picture.type(large)', access_token: userAccessToken });
    const res = await fetch(`${META_GRAPH_BASE}/me?${params}`);
    if (!res.ok) return null;
    return res.json();
  },

  async exchangeCode(code: string, provider: string = 'facebook', customRedirectUri?: string): Promise<{ accessToken: string; expiresIn: number }> {
    if (!this.clientId() || !this.clientSecret()) throw new Error('Meta App ID/secret is not configured');
    const candidateUris = Array.from(new Set([
      customRedirectUri,
      this.redirectUri(provider),
      `https://rasalilabs.com/ralion/api/oauth/${provider}/callback`,
      `https://www.rasalilabs.com/ralion/api/oauth/${provider}/callback`,
      `https://rasalilabs.com/api/oauth/${provider}/callback`,
      `https://www.rasalilabs.com/api/oauth/${provider}/callback`,
    ].filter(Boolean) as string[]));

    let lastError: Error | null = null;
    for (const redirectUri of candidateUris) {
      try {
        const params = new URLSearchParams({
          client_id: this.clientId(), client_secret: this.clientSecret(), redirect_uri: redirectUri, code,
        });
        const res = await fetch(`${META_GRAPH_BASE}/oauth/access_token?${params}`);
        if (res.ok) {
          const data = await res.json();
          const longParams = new URLSearchParams({
            grant_type: 'fb_exchange_token', client_id: this.clientId(), client_secret: this.clientSecret(), fb_exchange_token: data.access_token,
          });
          const longRes = await fetch(`${META_GRAPH_BASE}/oauth/access_token?${longParams}`);
          if (longRes.ok) {
            const longData = await longRes.json();
            return { accessToken: longData.access_token || data.access_token, expiresIn: longData.expires_in || data.expires_in || 5183944 };
          }
          return { accessToken: data.access_token, expiresIn: data.expires_in || 5183944 };
        }
        const body = await res.json().catch(() => ({}));
        lastError = new Error(`Meta token exchange failed (${res.status}): ${body?.error?.message || 'provider error'}`);
      } catch (error: any) {
        lastError = error;
      }
    }
    throw lastError || new Error('Meta token exchange failed on all callback URIs');
  },

  async debugToken(userAccessToken: string) {
    if (!this.clientId() || !this.clientSecret()) return null;
    const params = new URLSearchParams({ input_token: userAccessToken, access_token: `${this.clientId()}|${this.clientSecret()}` });
    const res = await fetch(`${META_GRAPH_BASE}/debug_token?${params}`);
    return res.ok ? res.json() : null;
  },

  async getPages(userAccessToken: string) {
    const params = new URLSearchParams({
      fields: 'id,name,username,category,access_token,tasks,picture,followers_count,fan_count',
      access_token: userAccessToken,
    });
    const res = await fetch(`${META_GRAPH_BASE}/me/accounts?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((p: any) => ({
      id: p.id, name: p.name,
      username: p.username || `@${p.name.toLowerCase().replace(/\s+/g, '_')}`,
      category: p.category || 'Business', accessToken: p.access_token,
      followers: p.followers_count ?? p.fan_count ?? 0,
      avatar: p.picture?.data?.url, tasks: p.tasks || [],
    }));
  },

  async getInstagramAccount(pageId: string, pageAccessToken: string) {
    const params = new URLSearchParams({
      fields: 'instagram_business_account{id,username,followers_count,profile_picture_url}',
      access_token: pageAccessToken,
    });
    const res = await fetch(`${META_GRAPH_BASE}/${encodeURIComponent(pageId)}?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const ig = data.instagram_business_account;
    return ig ? { id: ig.id, username: ig.username, followers: ig.followers_count || 0, avatar: ig.profile_picture_url } : null;
  },

  async publishFacebookPost(pageId: string, pageAccessToken: string, message: string): Promise<PublishResult> {
    const res = await fetch(`${META_GRAPH_BASE}/${encodeURIComponent(pageId)}/feed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: pageAccessToken }),
    });
    if (!res.ok) return { success: false, error: `Facebook publish failed: ${await res.text()}` };
    const data = await res.json();
    return { success: true, postId: data.id, postUrl: `https://www.facebook.com/${data.id}` };
  },

  async publishInstagramPost(igUserId: string, pageAccessToken: string, caption: string, imageUrl?: string): Promise<PublishResult> {
    if (!imageUrl) return { success: false, error: 'Instagram requires a media URL.' };
    const cRes = await fetch(`${META_GRAPH_BASE}/${encodeURIComponent(igUserId)}/media`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption, access_token: pageAccessToken, image_url: imageUrl, media_type: 'IMAGE' }),
    });
    if (!cRes.ok) return { success: false, error: `IG container failed: ${await cRes.text()}` };
    const { id: creationId } = await cRes.json();
    const pRes = await fetch(`${META_GRAPH_BASE}/${encodeURIComponent(igUserId)}/media_publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: pageAccessToken }),
    });
    if (!pRes.ok) return { success: false, error: `IG publish failed: ${await pRes.text()}` };
    const { id } = await pRes.json();
    return { success: true, postId: id, postUrl: `https://www.instagram.com/p/${id}/` };
  },

  async fetchFacebookPosts(pageId: string, pageAccessToken: string): Promise<SocialPost[]> {
    const params = new URLSearchParams({
      fields: 'id,message,created_time,likes.summary(true),shares,comments.summary(true)', limit: '10', access_token: pageAccessToken,
    });
    const res = await fetch(`${META_GRAPH_BASE}/${encodeURIComponent(pageId)}/posts?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((p: any) => ({
      id: p.id, platform: 'facebook', title: p.message?.substring(0, 60) || 'Facebook Post', body: p.message || '',
      publishedAt: p.created_time, url: `https://www.facebook.com/${p.id}`,
      engagement: { likes: p.likes?.summary?.total_count || 0, shares: p.shares?.count || 0, reach: 0, comments: p.comments?.summary?.total_count || 0 },
    }));
  },
};

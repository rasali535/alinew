/**
 * Ralion Growth OS - Real Social Media API Service
 * Server-side only (uses secret keys). Never import this in client components.
 *
 * Providers: LinkedIn, Facebook/Instagram, X (Twitter), TikTok, YouTube/Google
 */

import { createClient } from '@supabase/supabase-js';
import { encryptToken, decryptToken } from '@ralion/integrations';

// Service-role Supabase client (server-side only)
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Types
export interface SocialAccountRecord {
  id?: string;
  provider: string;
  account_handle: string;
  account_label: string;
  followers_count: number;
  avatar_url?: string;
  page_id?: string;
  scopes?: string[];
  status: 'connected' | 'expired' | 'pending';
  connected_at?: string;
  last_synced_at?: string;
  extra_meta?: Record<string, any>;
}

export interface SocialPost {
  id: string;
  platform: string;
  title: string;
  body: string;
  publishedAt: string;
  engagement: { likes: number; shares: number; reach: number; comments: number };
  url?: string;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

// Token Storage
export async function storeOAuthTokens(params: {
  userId: string; provider: string; accessToken: string; refreshToken?: string; expiresAt?: Date;
  accountHandle: string; accountLabel: string; followersCount?: number; avatarUrl?: string;
  pageId?: string; scopes?: string[]; extraMeta?: Record<string, any>;
}) {
  const supabase = getServiceSupabase();
  const encryptedAccessToken = encryptToken(params.accessToken);
  const encryptedRefreshToken = params.refreshToken ? encryptToken(params.refreshToken) : null;
  const tokenExpiresAt = params.expiresAt?.toISOString() ?? null;

  const { error } = await supabase.from('social_account_tokens').upsert({
    user_id: params.userId, provider: params.provider,
    encrypted_access_token: encryptedAccessToken,
    encrypted_refresh_token: encryptedRefreshToken,
    expires_at: tokenExpiresAt,
    account_handle: params.accountHandle, account_label: params.accountLabel,
    followers_count: params.followersCount ?? 0, avatar_url: params.avatarUrl ?? null,
    page_id: params.pageId ?? null, scopes: params.scopes ?? [], extra_meta: params.extraMeta ?? {},
    status: 'connected', connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' });
  if (error) throw new Error(`[SocialService] Token store failed: ${error.message}`);

  // If Meta provider (Facebook/Instagram), also synchronize with dedicated meta_connections table
  if (['facebook', 'instagram', 'meta', 'whatsapp'].includes(params.provider.toLowerCase())) {
    try {
      const metaUserId = params.pageId || params.accountHandle.replace(/^@/, '') || params.userId;
      await supabase.from('meta_connections').upsert({
        user_id: params.userId,
        meta_user_id: metaUserId,
        provider: params.provider.toLowerCase() as any,
        account_handle: params.accountHandle,
        account_name: params.accountLabel,
        profile_picture_url: params.avatarUrl || null,
        page_id: params.pageId || null,
        scopes: params.scopes || [],
        connection_status: 'connected',
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider,meta_user_id' });
    } catch (metaErr) {
      console.warn('[SocialService] meta_connections sync notice:', (metaErr as Error).message);
    }
  }
}

export async function loadOAuthTokens(userId: string, provider: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.from('social_account_tokens').select('*')
    .eq('user_id', userId).eq('provider', provider).single();
  if (error || !data) return null;
  return {
    accessToken: decryptToken(data.encrypted_access_token),
    refreshToken: data.encrypted_refresh_token ? decryptToken(data.encrypted_refresh_token) : undefined,
    expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    record: {
      provider: data.provider, account_handle: data.account_handle,
      account_label: data.account_label, followers_count: data.followers_count,
      avatar_url: data.avatar_url, page_id: data.page_id, scopes: data.scopes,
      status: data.status, connected_at: data.connected_at, last_synced_at: data.last_synced_at,
      extra_meta: data.extra_meta,
    } as SocialAccountRecord
  };
}

export async function loadAllUserAccounts(userId: string): Promise<SocialAccountRecord[]> {
  const supabase = getServiceSupabase();
  const accounts: SocialAccountRecord[] = [];

  try {
    const { data: legacyAccounts } = await supabase
      .from('social_accounts_safe')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected');
    if (legacyAccounts) accounts.push(...(legacyAccounts as SocialAccountRecord[]));
  } catch {}

  try {
    const { data: unifiedAccounts } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('connection_status', 'CONNECTED');
    if (unifiedAccounts) {
      unifiedAccounts.forEach((u: any) => {
        if (!accounts.some(a => a.provider.toLowerCase() === u.provider.toLowerCase())) {
          accounts.push({
            provider: u.provider,
            account_handle: u.username ? `@${u.username}` : `@${u.account_name.toLowerCase().replace(/\s+/g, '_')}`,
            account_label: u.account_name,
            followers_count: Number(u.followers_count || 0),
            avatar_url: u.profile_image_url,
            page_id: u.provider_account_id,
            status: 'connected',
            connected_at: u.connected_at,
            last_synced_at: u.last_sync_at,
            scopes: u.scopes || [],
            extra_meta: u.metadata || {},
          } as any);
        }
      });
    }
  } catch {}

  return accounts;
}

export async function deleteOAuthToken(userId: string, provider: string) {
  const supabase = getServiceSupabase();
  await supabase.from('social_account_tokens').delete().eq('user_id', userId).eq('provider', provider);

  if (['facebook', 'instagram', 'meta', 'whatsapp'].includes(provider.toLowerCase())) {
    await supabase.from('meta_connections').update({
      connection_status: 'disconnected',
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      disconnected_at: new Date().toISOString()
    }).eq('user_id', userId).eq('provider', provider.toLowerCase());
  }
}

export async function markTokenExpired(userId: string, provider: string) {
  const supabase = getServiceSupabase();
  await supabase.from('social_account_tokens').update({ status: 'expired' })
    .eq('user_id', userId).eq('provider', provider);
}

export async function updateLastSynced(userId: string, provider: string) {
  const supabase = getServiceSupabase();
  await supabase.from('social_account_tokens').update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId).eq('provider', provider);
}


// LinkedIn Adapter
export const linkedinAdapter = {
  clientId: () => process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: () => process.env.LINKEDIN_CLIENT_SECRET || '',
  redirectUri: () => `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/linkedin/callback`,
  scopes: ['openid', 'profile', 'email', 'w_member_social'],

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({ response_type: 'code', client_id: this.clientId(),
      redirect_uri: this.redirectUri(), state, scope: this.scopes.join(' ') });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  },

  async exchangeCode(code: string): Promise<{ accessToken: string; expiresIn: number }> {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code,
        redirect_uri: this.redirectUri(), client_id: this.clientId(), client_secret: this.clientSecret() }),
    });
    if (!res.ok) throw new Error(`LinkedIn token exchange failed: ${await res.text()}`);
    const data = await res.json();
    return { accessToken: data.access_token, expiresIn: data.expires_in };
  },

  async getProfile(accessToken: string) {
    const r = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    const p = r.ok ? await r.json() : {};
    const name = p.name || p.given_name || 'LinkedIn User';
    return { handle: `@${name.toLowerCase().replace(/\s+/g, '_')}`, name, avatar: p.picture, followersCount: 0 };
  },

  async publishPost(accessToken: string, content: string): Promise<PublishResult> {
    const r = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) return { success: false, error: 'Could not fetch LinkedIn URN' };
    const p = await r.json();
    const urn = p.sub ? `urn:li:person:${p.sub}` : null;
    if (!urn) return { success: false, error: 'LinkedIn URN not found' };
    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify({ author: urn, lifecycleState: 'PUBLISHED',
        specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: content }, shareMediaCategory: 'NONE' } },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' } })
    });
    if (!res.ok) return { success: false, error: `LinkedIn publish failed: ${await res.text()}` };
    const result = await res.json();
    return { success: true, postId: result.id, postUrl: `https://www.linkedin.com/feed/update/${result.id}/` };
  },

  async fetchPosts(accessToken: string): Promise<SocialPost[]> { return []; }
};

// Meta (Facebook/Instagram) Adapter
export const metaAdapter = {
  clientId: () => process.env.FACEBOOK_APP_ID || '',
  clientSecret: () => process.env.FACEBOOK_APP_SECRET || '',
  redirectUri: (provider: string) => `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/${provider}/callback`,
  scopes: {
    facebook: ['public_profile', 'email'],
    instagram: ['public_profile', 'email']
  },

  getAuthUrl(state: string, provider: string = 'facebook'): string {
    const scopes = provider === 'instagram' ? this.scopes.instagram : this.scopes.facebook;
    const params = new URLSearchParams({ client_id: this.clientId(), redirect_uri: this.redirectUri(provider),
      state, scope: scopes.join(','), response_type: 'code' });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  },

  async exchangeCode(code: string, provider: string = 'facebook'): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({ client_id: this.clientId(), client_secret: this.clientSecret(),
      redirect_uri: this.redirectUri(provider), code });
    const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`);
    if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
    const data = await res.json();
    const longRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.clientId()}&client_secret=${this.clientSecret()}&fb_exchange_token=${data.access_token}`);
    const longData = await longRes.json();
    return { accessToken: longData.access_token || data.access_token, expiresIn: longData.expires_in || 5183944 };
  },

  async getPages(userAccessToken: string) {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,followers_count,picture&access_token=${userAccessToken}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((p: any) => ({ id: p.id, name: p.name, accessToken: p.access_token, followers: p.followers_count || 0, avatar: p.picture?.data?.url }));
  },

  async getInstagramAccount(pageId: string, pageAccessToken: string) {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account{id,username,followers_count,profile_picture_url}&access_token=${pageAccessToken}`);
    if (!res.ok) return null;
    const data = await res.json();
    const ig = data.instagram_business_account;
    if (!ig) return null;
    return { id: ig.id, username: ig.username, followers: ig.followers_count || 0, avatar: ig.profile_picture_url };
  },

  async publishFacebookPost(pageId: string, pageAccessToken: string, message: string): Promise<PublishResult> {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, access_token: pageAccessToken }),
    });
    if (!res.ok) return { success: false, error: `Facebook publish failed: ${await res.text()}` };
    const data = await res.json();
    return { success: true, postId: data.id, postUrl: `https://www.facebook.com/${data.id}` };
  },

  async publishInstagramPost(igUserId: string, pageAccessToken: string, caption: string, imageUrl?: string): Promise<PublishResult> {
    if (!imageUrl) return { success: false, error: 'Instagram requires a media URL.' };
    const cRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption, access_token: pageAccessToken, image_url: imageUrl, media_type: 'IMAGE' }),
    });
    if (!cRes.ok) return { success: false, error: `IG container failed: ${await cRes.text()}` };
    const { id: creationId } = await cRes.json();
    const pRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: pageAccessToken }),
    });
    if (!pRes.ok) return { success: false, error: `IG publish failed: ${await pRes.text()}` };
    const { id } = await pRes.json();
    return { success: true, postId: id, postUrl: `https://www.instagram.com/p/${id}/` };
  },

  async fetchFacebookPosts(pageId: string, pageAccessToken: string): Promise<SocialPost[]> {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,created_time,likes.summary(true),shares,comments.summary(true)&limit=10&access_token=${pageAccessToken}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((p: any) => ({
      id: p.id, platform: 'facebook', title: p.message?.substring(0, 60) || 'Facebook Post', body: p.message || '',
      publishedAt: p.created_time, url: `https://www.facebook.com/${p.id}`,
      engagement: { likes: p.likes?.summary?.total_count || 0, shares: p.shares?.count || 0, reach: 0, comments: p.comments?.summary?.total_count || 0 },
    }));
  }
};

// X (Twitter) Adapter
export const xAdapter = {
  clientId: () => process.env.TWITTER_CLIENT_ID || '',
  clientSecret: () => process.env.TWITTER_CLIENT_SECRET || '',
  redirectUri: () => `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/x/callback`,
  scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],

  getAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({ response_type: 'code', client_id: this.clientId(),
      redirect_uri: this.redirectUri(), scope: this.scopes.join(' '), state,
      code_challenge: codeChallenge, code_challenge_method: 'S256' });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  },

  async exchangeCode(code: string, codeVerifier: string) {
    const credentials = Buffer.from(`${this.clientId()}:${this.clientSecret()}`).toString('base64');
    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: this.redirectUri(), code_verifier: codeVerifier }),
    });
    if (!res.ok) throw new Error(`X token exchange failed: ${await res.text()}`);
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in || 7200 };
  },

  async getProfile(accessToken: string) {
    const res = await fetch('https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url,public_metrics', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error('X profile fetch failed');
    const data = await res.json();
    const user = data.data;
    return { handle: `@${user.username}`, name: user.name, avatar: user.profile_image_url?.replace('_normal', '_400x400'), followersCount: user.public_metrics?.followers_count || 0 };
  },

  async publishTweet(accessToken: string, text: string): Promise<PublishResult> {
    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { success: false, error: `X tweet failed: ${await res.text()}` };
    const data = await res.json();
    return { success: true, postId: data.data?.id, postUrl: `https://x.com/i/web/status/${data.data?.id}` };
  },

  async fetchTweets(accessToken: string): Promise<SocialPost[]> {
    const meRes = await fetch('https://api.twitter.com/2/users/me', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!meRes.ok) return [];
    const me = await meRes.json();
    const userId = me.data?.id;
    if (!userId) return [];
    const res = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,public_metrics`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((t: any) => ({
      id: t.id, platform: 'twitter', title: t.text.substring(0, 60), body: t.text,
      publishedAt: t.created_at, url: `https://x.com/i/web/status/${t.id}`,
      engagement: { likes: t.public_metrics?.like_count || 0, shares: t.public_metrics?.retweet_count || 0, reach: t.public_metrics?.impression_count || 0, comments: t.public_metrics?.reply_count || 0 },
    }));
  },

  async refreshAccessToken(refreshToken: string) {
    const credentials = Buffer.from(`${this.clientId()}:${this.clientSecret()}`).toString('base64');
    const res = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST', headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error('X token refresh failed');
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in || 7200 };
  }
};

// TikTok Adapter
export const tiktokAdapter = {
  clientKey: () => process.env.TIKTOK_CLIENT_KEY || '',
  clientSecret: () => process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri: () => `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/tiktok/callback`,
  scopes: ['user.info.basic', 'video.list', 'video.upload'],

  getAuthUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({ client_key: this.clientKey(), scope: this.scopes.join(','),
      response_type: 'code', redirect_uri: this.redirectUri(), state,
      code_challenge: codeChallenge, code_challenge_method: 'S256' });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  },

  async exchangeCode(code: string, codeVerifier: string) {
    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: this.clientKey(), client_secret: this.clientSecret(),
        code, grant_type: 'authorization_code', redirect_uri: this.redirectUri(), code_verifier: codeVerifier }),
    });
    if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
    const data = await res.json();
    return { accessToken: data.data.access_token, refreshToken: data.data.refresh_token, expiresIn: data.data.expires_in };
  },

  async getProfile(accessToken: string) {
    const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username,follower_count', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error('TikTok profile fetch failed');
    const data = await res.json();
    const user = data.data?.user;
    return { handle: `@${user?.username || 'tiktok_user'}`, name: user?.display_name || 'TikTok User', avatar: user?.avatar_url, followersCount: user?.follower_count || 0 };
  },

  async fetchVideos(accessToken: string): Promise<SocialPost[]> {
    const res = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,statistics', {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_count: 10 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data?.videos || []).map((v: any) => ({
      id: v.id, platform: 'tiktok', title: v.title || 'TikTok Video', body: v.title || '',
      publishedAt: new Date(v.create_time * 1000).toISOString(), url: `https://www.tiktok.com/@user/video/${v.id}`,
      engagement: { likes: v.statistics?.like_count || 0, shares: v.statistics?.share_count || 0, reach: v.statistics?.play_count || 0, comments: v.statistics?.comment_count || 0 },
    }));
  }
};

// YouTube Adapter
export const youtubeAdapter = {
  clientId: () => process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: () => process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: (provider: string = 'youtube') => `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/oauth/${provider}/callback`,
  scopes: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/youtube.upload', 'openid', 'profile', 'email'],

  getAuthUrl(state: string, provider: string = 'youtube'): string {
    const params = new URLSearchParams({ client_id: this.clientId(), redirect_uri: this.redirectUri(provider),
      response_type: 'code', scope: this.scopes.join(' '), access_type: 'offline', prompt: 'consent', state });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async exchangeCode(code: string, provider: string = 'youtube') {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: this.clientId(), client_secret: this.clientSecret(),
        redirect_uri: this.redirectUri(provider), grant_type: 'authorization_code' }),
    });
    if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
  },

  async getProfile(accessToken: string) {
    const [pRes, cRes] = await Promise.allSettled([
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);
    const profile = pRes.status === 'fulfilled' && pRes.value.ok ? await pRes.value.json() : {};
    let followersCount = 0, channelId: string | undefined;
    if (cRes.status === 'fulfilled' && cRes.value.ok) {
      const chData = await cRes.value.json();
      const ch = chData.items?.[0];
      followersCount = parseInt(ch?.statistics?.subscriberCount || '0', 10);
      channelId = ch?.id;
    }
    return { handle: `@${profile.name?.toLowerCase().replace(/\s+/g, '') || 'youtube'}`, name: profile.name || 'YouTube Channel', avatar: profile.picture, followersCount, channelId };
  },

  async refreshToken(refreshToken: string) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: this.clientId(), client_secret: this.clientSecret() }),
    });
    if (!res.ok) throw new Error('Google token refresh failed');
    const data = await res.json();
    return { accessToken: data.access_token, expiresIn: data.expires_in };
  },

  async fetchVideos(accessToken: string): Promise<SocialPost[]> {
    const res = await fetch('https://www.googleapis.com/youtube/v3/search?part=snippet&mine=true&type=video&maxResults=10&order=date', { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((v: any) => ({
      id: v.id?.videoId || v.id, platform: 'youtube', title: v.snippet?.title || 'YouTube Video',
      body: v.snippet?.description || '', publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
      engagement: { likes: 0, shares: 0, reach: 0, comments: 0 }, url: `https://www.youtube.com/watch?v=${v.id?.videoId}`,
    }));
  }
};

// PKCE Helpers
export function generateCodeVerifier(): string {
  const { randomBytes } = require('crypto');
  return randomBytes(32).toString('base64url');
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const { createHash } = require('crypto');
  return createHash('sha256').update(verifier).digest('base64url');
}

// Provider Router
export function getProviderAdapter(provider: string) {
  switch (provider) {
    case 'linkedin': return linkedinAdapter;
    case 'facebook': case 'instagram': return metaAdapter;
    case 'x': case 'twitter': return xAdapter;
    case 'tiktok': return tiktokAdapter;
    case 'youtube': case 'google': return youtubeAdapter;
    default: throw new Error(`Unsupported social provider: ${provider}`);
  }
}

export const SUPPORTED_SOCIAL_PROVIDERS = ['linkedin', 'facebook', 'instagram', 'x', 'tiktok', 'youtube'] as const;
export type SupportedSocialProvider = typeof SUPPORTED_SOCIAL_PROVIDERS[number];

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
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('[SocialService] Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co',
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
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
  workspaceId?: string; organizationId?: string; providerAccountId?: string;
}) {
  const supabase = getServiceSupabase();
  const encryptedAccessToken = encryptToken(params.accessToken);
  const encryptedRefreshToken = params.refreshToken ? encryptToken(params.refreshToken) : null;
  const tokenExpiresAt = params.expiresAt?.toISOString() ?? null;

  const resolvedAccountId =
    params.providerAccountId ||
    params.pageId ||
    params.extraMeta?.providerAccountId ||
    params.extraMeta?.channelId ||
    params.extraMeta?.igUserId ||
    params.extraMeta?.facebookUserId ||
    params.accountHandle.replace(/^@/, '') ||
    `${params.provider}_${Date.now()}`;

  // 1. Primary multi-account isolated persistence in social_connections
  let connectionId: string | undefined;
  try {
    const { data: connData, error: connErr } = await supabase.from('social_connections').upsert({
      user_id: params.userId,
      organization_id: params.organizationId || null,
      workspace_id: params.workspaceId || null,
      provider: params.provider.toLowerCase(),
      provider_account_id: resolvedAccountId,
      account_name: params.accountLabel,
      username: params.accountHandle.replace(/^@/, ''),
      profile_image_url: params.avatarUrl || null,
      account_type: params.pageId ? 'PAGE' : 'PERSONAL',
      connection_status: 'CONNECTED',
      token_status: 'TOKEN_VALID',
      scopes: params.scopes || [],
      capabilities: {},
      metadata: {
        ...(params.extraMeta || {}),
        pageId: params.pageId,
        avatarUrl: params.avatarUrl,
        providerAccountId: resolvedAccountId,
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
      },
      followers_count: params.followersCount ?? 0,
      last_sync_at: new Date().toISOString(),
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider,provider_account_id' }).select('id').maybeSingle();

    if (!connErr && connData?.id) {
      connectionId = connData.id;

      // 2. Vault isolated AES-256-GCM token in social_credentials (if provisioned)
      try {
        await supabase.from('social_credentials').upsert({
          social_connection_id: connData.id,
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: encryptedRefreshToken,
          token_type: 'Bearer',
          expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'social_connection_id' });
      } catch {}
    } else if (connErr) {
      console.warn('[SocialService] connErr:', connErr.message);
    }
  } catch (dbErr: any) {
    console.warn('[SocialService] social_connections multi-account upsert notice:', dbErr.message);
  }

  // 3. Keep backward-compatible social_account_tokens table updated
  try {
    await supabase.from('social_account_tokens').upsert({
      user_id: params.userId, provider: params.provider,
      encrypted_access_token: encryptedAccessToken,
      encrypted_refresh_token: encryptedRefreshToken,
      expires_at: tokenExpiresAt,
      account_handle: params.accountHandle, account_label: params.accountLabel,
      followers_count: params.followersCount ?? 0, avatar_url: params.avatarUrl ?? null,
      page_id: params.pageId ?? null, scopes: params.scopes ?? [], extra_meta: {
        ...(params.extraMeta ?? {}),
        connectionId,
        providerAccountId: resolvedAccountId,
      },
      status: 'connected', connected_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });
  } catch (tokErr: any) {
    console.warn('[SocialService] social_account_tokens fallback notice:', tokErr.message);
  }

  // 4. If Meta provider (Facebook/Instagram), also synchronize with dedicated meta_connections table
  if (['facebook', 'instagram', 'meta', 'whatsapp'].includes(params.provider.toLowerCase())) {
    try {
      const metaUserId = params.pageId || resolvedAccountId || params.userId;
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

  return { success: true, connectionId, providerAccountId: resolvedAccountId };
}

export async function loadOAuthTokens(userId: string, provider: string, connectionId?: string) {
  const supabase = getServiceSupabase();

  if (connectionId) {
    // 1. Check social_connections by ID
    const { data: conn } = await supabase
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .maybeSingle();

    if (conn && conn.connection_status !== 'DISCONNECTED') {
      const encAccess = conn.metadata?.encrypted_access_token;
      const encRefresh = conn.metadata?.encrypted_refresh_token;
      if (encAccess) {
        return {
          accessToken: decryptToken(encAccess),
          refreshToken: encRefresh ? decryptToken(encRefresh) : undefined,
          expiresAt: conn.metadata?.token_expires_at ? new Date(conn.metadata.token_expires_at) : undefined,
          record: {
            id: conn.id,
            provider: conn.provider || provider,
            account_handle: conn.username ? `@${conn.username}` : `@${provider}`,
            account_label: conn.account_name || provider,
            followers_count: Number(conn.followers_count || 0),
            avatar_url: conn.profile_image_url,
            page_id: conn.provider_account_id,
            scopes: conn.scopes || [],
            status: 'connected',
            connected_at: conn.connected_at,
            last_synced_at: conn.last_sync_at,
            extra_meta: conn.metadata || {},
          } as SocialAccountRecord
        };
      }
    }

    // 2. Check social_credentials by connection ID
    try {
      const { data: creds } = await supabase
        .from('social_credentials')
        .select('*, social_connections(*)')
        .eq('social_connection_id', connectionId)
        .maybeSingle();

      if (creds && creds.encrypted_access_token) {
        const conn = creds.social_connections;
        return {
          accessToken: decryptToken(creds.encrypted_access_token),
          refreshToken: creds.encrypted_refresh_token ? decryptToken(creds.encrypted_refresh_token) : undefined,
          expiresAt: creds.expires_at ? new Date(creds.expires_at) : undefined,
          record: {
            id: creds.social_connection_id,
            provider: conn?.provider || provider,
            account_handle: conn?.username ? `@${conn.username}` : `@${provider}`,
            account_label: conn?.account_name || provider,
            followers_count: Number(conn?.followers_count || 0),
            avatar_url: conn?.profile_image_url,
            page_id: conn?.provider_account_id,
            scopes: conn?.scopes || [],
            status: 'connected',
            connected_at: conn?.connected_at,
            last_synced_at: conn?.last_sync_at,
            extra_meta: conn?.metadata || {},
          } as SocialAccountRecord
        };
      }
    } catch {}
  }

  // Fallback to social_connections by user and provider
  try {
    const { data: conn } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider.toLowerCase())
      .neq('connection_status', 'DISCONNECTED')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conn && conn.metadata?.encrypted_access_token) {
      return {
        accessToken: decryptToken(conn.metadata.encrypted_access_token),
        refreshToken: conn.metadata.encrypted_refresh_token ? decryptToken(conn.metadata.encrypted_refresh_token) : undefined,
        expiresAt: conn.metadata.token_expires_at ? new Date(conn.metadata.token_expires_at) : undefined,
        record: {
          id: conn.id,
          provider: conn.provider,
          account_handle: conn.username ? `@${conn.username}` : `@${provider}`,
          account_label: conn.account_name,
          followers_count: Number(conn.followers_count || 0),
          avatar_url: conn.profile_image_url,
          page_id: conn.provider_account_id,
          scopes: conn.scopes || [],
          status: 'connected',
          extra_meta: conn.metadata || {},
        } as SocialAccountRecord
      };
    }
  } catch {}

  const { data, error } = await supabase.from('social_account_tokens').select('*')
    .eq('user_id', userId).eq('provider', provider).maybeSingle();
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
  const seenConnectionKeys = new Set<string>();

  // 1. Primary: load from unified social_connections
  try {
    const { data: unifiedAccounts } = await supabase
      .from('social_connections')
      .select('*')
      .eq('user_id', userId)
      .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active']);

    if (Array.isArray(unifiedAccounts)) {
      unifiedAccounts.forEach((u: any) => {
        const uniqueKey = u.id || `${u.provider}_${u.provider_account_id}`;
        if (!seenConnectionKeys.has(uniqueKey)) {
          seenConnectionKeys.add(uniqueKey);
          accounts.push({
            id: u.id,
            provider: u.provider,
            account_handle: u.username ? (u.username.startsWith('@') ? u.username : `@${u.username}`) : `@${u.provider}`,
            account_label: u.account_name || u.provider,
            followers_count: Number(u.followers_count || 0),
            avatar_url: u.profile_image_url,
            page_id: u.provider_account_id,
            status: 'connected',
            connected_at: u.connected_at,
            last_synced_at: u.last_sync_at,
            scopes: u.scopes || [],
            extra_meta: {
              ...(u.metadata || {}),
              connectionId: u.id,
              providerAccountId: u.provider_account_id,
            },
          } as any);
        }
      });
    }
  } catch (err: any) {
    console.warn('[SocialService] social_connections load notice:', err.message);
  }

  // 2. Secondary: load legacy accounts if not already captured
  try {
    const { data: legacyAccounts } = await supabase
      .from('social_accounts_safe')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected');
    if (Array.isArray(legacyAccounts)) {
      legacyAccounts.forEach((leg: any) => {
        const legKey = leg.id || `${leg.provider}_${leg.account_handle}`;
        if (!seenConnectionKeys.has(legKey)) {
          seenConnectionKeys.add(legKey);
          accounts.push(leg as SocialAccountRecord);
        }
      });
    }
  } catch {}

  return accounts;
}

export async function deleteOAuthToken(userId: string, provider: string, connectionId?: string) {
  const supabase = getServiceSupabase();

  if (connectionId) {
    try {
      await supabase.from('social_credentials').delete().eq('social_connection_id', connectionId);
    } catch {}

    const { data: conn } = await supabase.from('social_connections').select('metadata').eq('id', connectionId).maybeSingle();
    const sanitizedMeta = { ...(conn?.metadata || {}) };
    delete sanitizedMeta.encrypted_access_token;
    delete sanitizedMeta.encrypted_refresh_token;

    await supabase.from('social_connections').update({
      metadata: sanitizedMeta,
      connection_status: 'DISCONNECTED',
      token_status: 'TOKEN_REVOKED',
      disconnected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', connectionId);
  } else {
    await supabase.from('social_account_tokens').delete().eq('user_id', userId).eq('provider', provider);
    await supabase.from('social_connections').update({
      connection_status: 'DISCONNECTED',
      token_status: 'TOKEN_REVOKED',
      disconnected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('provider', provider.toLowerCase());
  }

  if (['facebook', 'instagram', 'meta', 'whatsapp'].includes(provider.toLowerCase())) {
    await supabase.from('meta_connections').update({
      connection_status: 'disconnected',
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      disconnected_at: new Date().toISOString()
    }).eq('user_id', userId).eq('provider', provider.toLowerCase());
  }
}

export async function markTokenExpired(userId: string, provider: string, connectionId?: string) {
  const supabase = getServiceSupabase();
  if (connectionId) {
    await supabase.from('social_connections').update({ token_status: 'TOKEN_EXPIRED', connection_status: 'RECONNECT_REQUIRED' }).eq('id', connectionId);
  }
  await supabase.from('social_account_tokens').update({ status: 'expired' })
    .eq('user_id', userId).eq('provider', provider);
}

export async function updateLastSynced(userId: string, provider: string, connectionId?: string) {
  const supabase = getServiceSupabase();
  if (connectionId) {
    await supabase.from('social_connections').update({ last_sync_at: new Date().toISOString() }).eq('id', connectionId);
  }
  await supabase.from('social_account_tokens').update({ last_synced_at: new Date().toISOString() })
    .eq('user_id', userId).eq('provider', provider);
}


// LinkedIn Adapter
export const linkedinAdapter = {
  clientId: () => process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: () => process.env.LINKEDIN_CLIENT_SECRET || '',
  redirectUri: () => getOAuthRedirectUri('linkedin'),
  scopes: ['openid', 'profile', 'email', 'w_member_social'],

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({ response_type: 'code', client_id: this.clientId(),
      redirect_uri: this.redirectUri(), state, scope: this.scopes.join(' ') });
    return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  },

  async exchangeCode(code: string, customRedirectUri?: string): Promise<{ accessToken: string; expiresIn: number }> {
    const candidateUris = customRedirectUri 
      ? [customRedirectUri, this.redirectUri()]
      : [
          this.redirectUri(),
          getOAuthRedirectUri('linkedin'),
          'https://rasalilabs.com/ralion/api/oauth/linkedin/callback',
          'https://rasalilabs.com/ralion/growth'
        ];

    let lastError = '';
    for (const rUri of candidateUris) {
      try {
        const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: rUri,
            client_id: this.clientId(),
            client_secret: this.clientSecret()
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return { accessToken: data.access_token, expiresIn: data.expires_in };
        }
        lastError = await res.text();
      } catch (err: any) {
        lastError = err.message;
      }
    }
    throw new Error(`LinkedIn token exchange failed: ${lastError}`);
  },

  async getProfile(accessToken: string) {
    const r = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    const p = r.ok ? await r.json() : {};
    const name = p.name || p.given_name || 'LinkedIn User';
    return {
      id: p.sub || '',
      sub: p.sub,
      handle: `@${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      avatar: p.picture,
      followersCount: 0
    };
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

// Base redirect URI helper guaranteeing no duplicate /ralion subpaths
function getOAuthRedirectUri(provider: string): string {
  const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion').replace(/\/+$/, '');
  const cleanBase = rawAppUrl.endsWith('/ralion') ? rawAppUrl : `${rawAppUrl}/ralion`;
  return `${cleanBase}/api/oauth/${provider}/callback`;
}

// Meta (Facebook/Instagram) Adapter
export const metaAdapter = {
  clientId: () => process.env.FACEBOOK_APP_ID || process.env.META_APP_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1558897076250918',
  clientSecret: () => process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || '',
  redirectUri: (provider: string) => getOAuthRedirectUri(provider),
  scopes: {
    stage1_login: ['public_profile', 'email'],
    stage2_pages: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_metadata'],
    facebook: ['public_profile', 'email', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_metadata'],
    instagram: ['public_profile', 'email', 'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'pages_manage_metadata', 'instagram_basic']
  },

  getAuthUrl(state: string, provider: string = 'facebook', intent: 'login' | 'page_connection' = 'page_connection'): string {
    const baseScopes = this.scopes.facebook;
    const redirectUri = this.redirectUri(provider);
    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: redirectUri,
      state,
      scope: baseScopes.join(','),
      response_type: 'code',
      auth_type: 'rerequest'
    });
    return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
  },

  async getUserProfile(userAccessToken: string) {
    const res = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${userAccessToken}`);
    if (!res.ok) return null;
    return await res.json();
  },

  async exchangeCode(code: string, provider: string = 'facebook', customRedirectUri?: string): Promise<{ accessToken: string; expiresIn: number }> {
    const redirectUri = customRedirectUri || this.redirectUri(provider);
    console.log(`[OAuth Diagnostic] Starting Meta code exchange | provider=${provider} | redirect_uri=${redirectUri}`);
    const params = new URLSearchParams({
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      redirect_uri: redirectUri,
      code
    });
    const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params}`);
    console.log(`[OAuth Diagnostic] Meta token exchange HTTP status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const errText = await res.text();
      let sanitized = 'Meta token exchange failed';
      try {
        const parsed = JSON.parse(errText);
        sanitized = parsed.error?.message || errText;
      } catch {}
      console.error(`[OAuth Diagnostic] Meta code exchange error (${res.status}): ${sanitized}`);
      throw new Error(`Meta token exchange failed (${res.status}): ${sanitized}`);
    }
    const data = await res.json();
    console.log(`[OAuth Diagnostic] Meta code exchange finished successfully | hasAccessToken=${Boolean(data.access_token)}`);
    try {
      const longRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.clientId()}&client_secret=${this.clientSecret()}&fb_exchange_token=${data.access_token}`);
      if (longRes.ok) {
        const longData = await longRes.json();
        return { accessToken: longData.access_token || data.access_token, expiresIn: longData.expires_in || 5183944 };
      }
    } catch (longErr: any) {
      console.warn('[OAuth Diagnostic] Long-lived token exchange notice:', longErr.message);
    }
    return { accessToken: data.access_token, expiresIn: data.expires_in || 5183944 };
  },

  async getPages(userAccessToken: string) {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,username,category,access_token,tasks,picture,followers_count,fan_count&access_token=${userAccessToken}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      username: p.username || `@${p.name.toLowerCase().replace(/\s+/g, '_')}`,
      category: p.category || 'Business',
      accessToken: p.access_token,
      followers: p.followers_count ?? p.fan_count ?? 0,
      avatar: p.picture?.data?.url,
      tasks: p.tasks || [],
    }));
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
  redirectUri: () => getOAuthRedirectUri('x'),
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
  redirectUri: () => getOAuthRedirectUri('tiktok'),
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
  redirectUri: (provider: string = 'youtube') => getOAuthRedirectUri(provider),
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

import 'server-only';

const IG_GRAPH_VERSION = (process.env.INSTAGRAM_GRAPH_VERSION || process.env.META_GRAPH_VERSION || 'v26.0')
  .replace(/^\/+|\/+$/g, '');
const IG_GRAPH_BASE = `https://graph.instagram.com/${IG_GRAPH_VERSION}`;
const IG_OAUTH_AUTHORIZE = 'https://www.instagram.com/oauth/authorize';
const IG_OAUTH_TOKEN = 'https://api.instagram.com/oauth/access_token';

function getRedirectUri(): string {
  const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion').replace(/\/+$/, '');
  const cleanBase = rawAppUrl.endsWith('/ralion') ? rawAppUrl : `${rawAppUrl}/ralion`;
  return `${cleanBase}/api/oauth/instagram/callback`;
}

export const instagramBusinessAdapter = {
  graphVersion: () => IG_GRAPH_VERSION,
  graphBase: () => IG_GRAPH_BASE,
  clientId: () => process.env.INSTAGRAM_APP_ID || process.env.META_INSTAGRAM_APP_ID || '',
  clientSecret: () => process.env.INSTAGRAM_APP_SECRET || process.env.META_INSTAGRAM_APP_SECRET || '',
  redirectUri: () => getRedirectUri(),
  scopes: [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_comments',
    'instagram_business_manage_messages',
    'instagram_business_manage_insights',
  ],

  resolvedScopes(): string[] {
    const configuredScopes = process.env.INSTAGRAM_OAUTH_SCOPES;
    return configuredScopes
      ? configuredScopes.split(',').map((s) => s.trim()).filter(Boolean)
      : [...this.scopes];
  },

  getAuthUrl(state: string): string {
    if (!this.clientId()) throw new Error('Instagram App ID is not configured');
    const scopes = this.resolvedScopes();

    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      scope: scopes.join(','),
      state,
      enable_fb_login: '0',
      force_authentication: '1',
    });

    return `${IG_OAUTH_AUTHORIZE}?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<{ accessToken: string; expiresIn: number; userId?: string }> {
    if (!this.clientId() || !this.clientSecret()) {
      throw new Error('Instagram App ID/secret is not configured');
    }

    const shortBody = new URLSearchParams({
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri(),
      code,
    });

    const shortRes = await fetch(IG_OAUTH_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: shortBody,
    });

    if (!shortRes.ok) {
      const detail = await shortRes.json().catch(() => ({}));
      throw new Error(`Instagram token exchange failed (${shortRes.status}): ${detail?.error_message || detail?.error?.message || 'provider error'}`);
    }

    const shortData = await shortRes.json();
    const shortToken = shortData?.access_token;
    if (!shortToken) throw new Error('Instagram did not return an access token');

    const longParams = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: this.clientSecret(),
      access_token: shortToken,
    });

    const longRes = await fetch(`https://graph.instagram.com/access_token?${longParams.toString()}`);
    if (!longRes.ok) {
      const detail = await longRes.json().catch(() => ({}));
      throw new Error(`Instagram long-lived token exchange failed (${longRes.status}): ${detail?.error?.message || 'provider error'}`);
    }

    const longData = await longRes.json();
    return {
      accessToken: longData?.access_token || shortToken,
      expiresIn: Number(longData?.expires_in || shortData?.expires_in || 5184000),
      userId: shortData?.user_id ? String(shortData.user_id) : undefined,
    };
  },

  async getProfile(accessToken: string) {
    const preferred = new URLSearchParams({
      fields: 'user_id,username,name,account_type,profile_picture_url,followers_count',
      access_token: accessToken,
    });
    let res = await fetch(`${IG_GRAPH_BASE}/me?${preferred.toString()}`);

    if (!res.ok) {
      const minimal = new URLSearchParams({
        fields: 'user_id,username,name,account_type',
        access_token: accessToken,
      });
      res = await fetch(`${IG_GRAPH_BASE}/me?${minimal.toString()}`);
    }

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(`Instagram profile fetch failed (${res.status}): ${detail?.error?.message || 'provider error'}`);
    }

    const data = await res.json();
    const professionalId = String(data?.user_id || data?.id || '');
    if (!professionalId) throw new Error('Instagram did not return a professional account ID');

    return {
      id: professionalId,
      username: String(data?.username || 'instagram'),
      name: String(data?.name || data?.username || 'Instagram Professional'),
      accountType: String(data?.account_type || 'PROFESSIONAL'),
      avatar: data?.profile_picture_url ? String(data.profile_picture_url) : undefined,
      followersCount: Number(data?.followers_count || 0),
    };
  },

  async refreshLongLivedToken(accessToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: accessToken,
    });
    const res = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error(`Instagram token refresh failed (${res.status}): ${detail?.error?.message || 'provider error'}`);
    }
    const data = await res.json();
    return {
      accessToken: data?.access_token || accessToken,
      expiresIn: Number(data?.expires_in || 5184000),
    };
  },

  async publishImage(params: { igUserId: string; accessToken: string; imageUrl: string; caption?: string }) {
    const createBody = new URLSearchParams({
      image_url: params.imageUrl,
      caption: params.caption || '',
      access_token: params.accessToken,
    });
    const createRes = await fetch(`${IG_GRAPH_BASE}/${encodeURIComponent(params.igUserId)}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: createBody,
    });
    if (!createRes.ok) {
      const detail = await createRes.json().catch(() => ({}));
      throw new Error(`Instagram media container failed (${createRes.status}): ${detail?.error?.message || 'provider error'}`);
    }
    const createData = await createRes.json();
    if (!createData?.id) throw new Error('Instagram did not return a media container ID');

    const publishBody = new URLSearchParams({
      creation_id: String(createData.id),
      access_token: params.accessToken,
    });
    const publishRes = await fetch(`${IG_GRAPH_BASE}/${encodeURIComponent(params.igUserId)}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishBody,
    });
    if (!publishRes.ok) {
      const detail = await publishRes.json().catch(() => ({}));
      throw new Error(`Instagram publish failed (${publishRes.status}): ${detail?.error?.message || 'provider error'}`);
    }
    return publishRes.json();
  },
};

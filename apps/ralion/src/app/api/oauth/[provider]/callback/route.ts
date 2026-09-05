import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyOAuthState } from '@ralion/integrations';
import {
  linkedinAdapter, metaAdapter, xAdapter, tiktokAdapter, youtubeAdapter,
  storeOAuthTokens,
} from '@/lib/services/social.service';

const PROVIDERS = [
  'google', 'meta', 'facebook', 'instagram', 'whatsapp', 'microsoft', 'linkedin', 'tiktok',
  'x', 'youtube', 'pinterest', 'reddit', 'github', 'slack', 'discord', 'notion', 'dropbox',
  'onedrive', 'shopify', 'woocommerce', 'stripe', 'paypal', 'quickbooks', 'xero', 'sage',
  'hubspot', 'salesforce'
];

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion').replace(/\/+$/, '');
  const cleanBase = rawAppUrl.endsWith('/ralion') ? rawAppUrl : `${rawAppUrl}/ralion`;
  const growthRedirect = `${cleanBase}/growth`;

  const callbackPath = request.nextUrl.pathname;
  let providerName = 'unknown';

  try {
    const { provider } = await params;
    providerName = provider;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');
    const errorDescription = searchParams.get('error_description');

    console.log(`[OAuth Callback Received] path=${callbackPath} | provider=${provider} | hasCode=${Boolean(code)} | hasState=${Boolean(state)} | error=${errorParam || 'none'}`);

    // Handle user-denied access or Meta permission restriction
    if (errorParam) {
      let intent = 'login';
      if (state) {
        try {
          const verified = verifyOAuthState(state);
          if (verified.intent) intent = verified.intent;
        } catch {}
      }

      console.warn(`[OAuth Callback Provider Error] provider=${provider} | intent=${intent} | error=${errorParam} | reason=${errorReason || ''} | desc=${errorDescription || ''}`);

      if (intent === 'page_connection' || errorParam.includes('access_denied') || errorParam.includes('unavailable')) {
        return NextResponse.redirect(`${growthRedirect}?facebook=page_permission_pending&oauth_error=meta_permission_unavailable&provider=facebook&stage=2`);
      }
      return NextResponse.redirect(`${growthRedirect}?oauth_error=${encodeURIComponent(errorParam)}&provider=${provider}`);
    }

    if (!code || !state) {
      console.warn(`[OAuth Callback Warning] Missing code or state | path=${callbackPath} | provider=${provider}`);
      return NextResponse.redirect(`${growthRedirect}?oauth_error=missing_params&provider=${provider}`);
    }

    // Verify CSRF state token
    const verified = verifyOAuthState(state);
    console.log(`[OAuth Callback Verification] valid=${verified.valid} | provider=${provider} | intent=${verified.intent || 'login'} | orgId=${verified.organizationId || 'none'}`);

    if (!verified.valid) {
      console.warn(`[OAuth Callback Warning] Invalid CSRF state | path=${callbackPath} | provider=${provider}`);
      return NextResponse.redirect(`${growthRedirect}?oauth_error=invalid_state&provider=${provider}`);
    }

    const userId = verified.userId || verified.workspaceId;
    const organizationId = verified.organizationId || verified.workspaceId;
    const intent = verified.intent || 'login';

    // Retrieve PKCE code verifier from cookie
    const codeVerifier = request.cookies.get(`oauth_verifier_${provider}`)?.value || '';

    // Exchange code for real tokens + fetch real profile
    let accessToken = '';
    let refreshToken: string | undefined;
    let expiresAt: Date | undefined;
    let profile: { handle: string; name: string; avatar?: string; followersCount: number; channelId?: string; pageId?: string; sub?: string; id?: string } = {
      handle: '', name: '', followersCount: 0
    };
    let accountLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
    let pageId: string | undefined;
    let providerAccountId: string | undefined;
    let extraMeta: Record<string, any> = {};

    switch (provider) {
      case 'linkedin': {
        const tokens = await linkedinAdapter.exchangeCode(code);
        accessToken = tokens.accessToken;
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
        const p = await linkedinAdapter.getProfile(accessToken);
        profile = p;
        providerAccountId = p.sub || p.id || undefined;
        accountLabel = 'LinkedIn Organization';
        break;
      }
      case 'facebook': {
        const tokens = await metaAdapter.exchangeCode(code, 'facebook');
        accessToken = tokens.accessToken;
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        // 1. Verify token App ID and granted scopes via Meta debug_token
        try {
          const appId = metaAdapter.clientId();
          const appSecret = metaAdapter.clientSecret();
          const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${accessToken}&access_token=${appId}|${appSecret}`);
          if (debugRes.ok) {
            const debugData = await debugRes.json();
            const tokenAppId = debugData?.data?.app_id;
            const tokenScopes = debugData?.data?.scopes || [];
            console.log(`[OAuth Facebook] Token verified | App ID: ${tokenAppId} (Expected: ${appId}) | Granted Scopes: [${tokenScopes.join(', ')}]`);
            if (tokenAppId && String(tokenAppId) !== String(appId)) {
              console.warn(`[OAuth Facebook] Warning: Token App ID (${tokenAppId}) does not match configured App ID (${appId})`);
            }
          }
        } catch (debugErr: any) {
          console.warn('[OAuth Facebook] debug_token inspection notice:', debugErr.message);
        }

        // 2. Query /me/accounts to discover all manageable Pages
        let pages: any[] = [];
        try {
          pages = await metaAdapter.getPages(accessToken);
          const safePageSummaries = pages.map((p: any) => ({ id: p.id, name: p.name, username: p.username, category: p.category }));
          console.log(`[OAuth Facebook] /me/accounts discovered ${pages.length} manageable Pages:`, JSON.stringify(safePageSummaries, null, 2));
        } catch (pageErr: any) {
          console.warn('[OAuth Facebook] Page discovery error:', pageErr.message);
        }

        // 3. Fetch authenticated Facebook user profile
        let userProfile: any = null;
        try {
          userProfile = await metaAdapter.getUserProfile(accessToken);
        } catch {}

        providerAccountId = userProfile?.id || `fb_user_${Date.now()}`;
        profile = {
          handle: userProfile?.name ? `@${userProfile.name.toLowerCase().replace(/\s+/g, '_')}` : '@facebook_user',
          name: userProfile?.name || 'Facebook User',
          avatar: userProfile?.picture?.data?.url,
          followersCount: 0,
        };

        // 4. Do not auto-bind Ras Ali Labs or pages[0]. Persist as user profile with discovered pages for explicit selection
        extraMeta = {
          stage: 1,
          is_page: false,
          facebookUserId: userProfile?.id,
          email: userProfile?.email,
          organizationId,
          discovered_pages: pages.map((p: any) => ({
            id: p.id,
            name: p.name,
            username: p.username,
            category: p.category,
            avatar: p.avatar,
            followers: p.followers,
          })),
          page_selection_required: pages.length > 0,
        };

        accountLabel = `Facebook Profile (${userProfile?.name || 'Connected'})`;
        break;
      }
      case 'instagram': {
        const tokens = await metaAdapter.exchangeCode(code, 'instagram');
        accessToken = tokens.accessToken;
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
        const pages = await metaAdapter.getPages(accessToken);
        const firstPage = pages[0];
        if (firstPage) {
          const igAccount = await metaAdapter.getInstagramAccount(firstPage.id, firstPage.accessToken);
          if (igAccount) {
            pageId = igAccount.id;
            providerAccountId = igAccount.id;
            profile = { handle: `@${igAccount.username}`, name: igAccount.username, avatar: igAccount.avatar, followersCount: igAccount.followers };
            extraMeta = { pageAccessToken: firstPage.accessToken, pageId: firstPage.id, igUserId: igAccount.id };
          } else {
            profile = { handle: '@instagram_account', name: 'Instagram', followersCount: 0 };
          }
        }
        accountLabel = 'Instagram Professional';
        break;
      }
      case 'x':
      case 'twitter': {
        if (!codeVerifier) {
          return NextResponse.redirect(`${growthRedirect}?oauth_error=missing_verifier&provider=${provider}`);
        }
        const tokens = await xAdapter.exchangeCode(code, codeVerifier);
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
        const p = await xAdapter.getProfile(accessToken);
        profile = p;
        providerAccountId = p.handle?.replace(/^@/, '');
        accountLabel = 'X (formerly Twitter)';
        break;
      }
      case 'tiktok': {
        if (!codeVerifier) {
          return NextResponse.redirect(`${growthRedirect}?oauth_error=missing_verifier&provider=${provider}`);
        }
        const tokens = await tiktokAdapter.exchangeCode(code, codeVerifier);
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
        const p = await tiktokAdapter.getProfile(accessToken);
        profile = p;
        providerAccountId = p.handle?.replace(/^@/, '');
        accountLabel = 'TikTok Business Studio';
        break;
      }
      case 'youtube':
      case 'google': {
        const tokens = await youtubeAdapter.exchangeCode(code, provider as 'youtube' | 'google');
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
        expiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined;
        const p = await youtubeAdapter.getProfile(accessToken);
        profile = p;
        if (p.channelId) extraMeta.channelId = p.channelId;
        providerAccountId = p.channelId || p.handle?.replace(/^@/, '');
        accountLabel = provider === 'youtube' ? 'YouTube Content Studio' : 'Google Business Profile';
        break;
      }
      default:
        return NextResponse.redirect(`${growthRedirect}?oauth_error=unsupported_provider&provider=${provider}`);
    }

    // Store real encrypted tokens in Supabase with tenant + multi-account isolation
    const storeResult = await storeOAuthTokens({
      userId,
      workspaceId: verified.workspaceId || verified.organizationId,
      organizationId,
      provider,
      providerAccountId,
      accessToken,
      refreshToken,
      expiresAt,
      accountHandle: profile.handle,
      accountLabel,
      followersCount: profile.followersCount,
      avatarUrl: profile.avatar,
      pageId,
      scopes: [],
      extraMeta,
    });

    // Clear the PKCE verifier cookie
    const stageQuery = intent === 'page_connection' ? '&stage=2&page_connected=true' : '&stage=1&profile_connected=true';
    const connectionQuery = storeResult.connectionId ? `&connection_id=${encodeURIComponent(storeResult.connectionId)}` : '';
    const finalRedirectUrl = `${growthRedirect}?connected=${provider}&handle=${encodeURIComponent(profile.handle)}${connectionQuery}${stageQuery}`;
    console.log(`[OAuth Callback Success] Redirecting | provider=${provider} | user=${userId} | org=${organizationId} | connectionId=${storeResult.connectionId || 'created'}`);
    const redirectResponse = NextResponse.redirect(finalRedirectUrl);
    redirectResponse.cookies.set(`oauth_verifier_${provider}`, '', { maxAge: 0, path: '/' });

    return redirectResponse;
  } catch (error: any) {
    const rawMsg = error?.message || 'oauth_failed';
    const sanitizedError = rawMsg
      .replace(/([a-f0-9]{24,})/gi, '[REDACTED]')
      .replace(/(AQL[a-zA-Z0-9_-]{20,})/gi, '[REDACTED]')
      .replace(/(EAA[a-zA-Z0-9_-]{20,})/gi, '[REDACTED]')
      .replace(/(ya29\.[a-zA-Z0-9_-]{20,})/gi, '[REDACTED]');
    console.error(`[OAuth Callback Exception] class=${error?.name || 'Error'} | provider=${providerName} | message=${sanitizedError}`);
    return NextResponse.redirect(`${growthRedirect}?oauth_error=${encodeURIComponent(sanitizedError)}`);
  }
}


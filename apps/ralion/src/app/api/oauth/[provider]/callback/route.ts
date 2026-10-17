import { NextRequest, NextResponse } from 'next/server';
import { verifyOAuthState } from '@ralion/integrations/server';
import {
  linkedinAdapter, xAdapter, tiktokAdapter, youtubeAdapter,
  storeOAuthTokens,
} from '@/lib/services/social.service';
import { metaAdapterV26 } from '@/lib/services/metaAdapter.service';
import { instagramBusinessAdapter } from '@/lib/services/instagramBusinessAdapter.service';
import { tenantCache, buildTenantCacheKey } from '@/lib/cache/tenantCache';
import { FacebookConnectionStateService } from '@/lib/services/social/facebookConnectionState.service';
import { legacyOAuthVerifierCookieName, oauthProviderMatches, oauthStateCookieName, oauthVerifierCookieName } from '@/lib/services/oauthConnectionState.service';

export const dynamic = 'force-dynamic';

function redirectAndClearOAuthFlow(url: string, provider: string, state?: string | null) {
  const response = NextResponse.redirect(url);
  if (state) {
    response.cookies.set(oauthStateCookieName(provider, state), '', { maxAge: 0, path: '/' });
    response.cookies.set(oauthVerifierCookieName(provider, state), '', { maxAge: 0, path: '/' });
  }
  // Clear the pre-hardening cookie name as well so an old in-flight browser
  // cannot leave a stale verifier behind after deployment.
  response.cookies.set(legacyOAuthVerifierCookieName(provider), '', { maxAge: 0, path: '/' });
  return response;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const rawAppUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://rasalilabs.com/ralion').replace(/\/+$/, '');
  const cleanBase = rawAppUrl.endsWith('/ralion') ? rawAppUrl : `${rawAppUrl}/ralion`;
  const growthRedirect = `${cleanBase}/growth`;
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

    console.log(`[OAuth Callback Received] provider=${provider} | hasCode=${Boolean(code)} | hasState=${Boolean(state)} | error=${errorParam || 'none'}`);

    if (!state && errorParam) {
      return redirectAndClearOAuthFlow(
        `${growthRedirect}?oauth_error=missing_state&provider=${encodeURIComponent(provider)}`,
        provider,
        state
      );
    }

    if (!code && !errorParam) {
      return redirectAndClearOAuthFlow(
        `${growthRedirect}?oauth_error=missing_params&provider=${encodeURIComponent(provider)}`,
        provider,
        state
      );
    }

    const verified = state ? verifyOAuthState(state) : null;
    if (
      !verified ||
      !verified.valid ||
      !verified.userId ||
      !verified.workspaceId ||
      !oauthProviderMatches(provider, verified.provider)
    ) {
      console.warn(`[OAuth Callback Warning] Invalid/incomplete/mismatched state | provider=${provider}`);
      return redirectAndClearOAuthFlow(
        `${growthRedirect}?oauth_error=invalid_state&provider=${encodeURIComponent(provider)}`,
        provider,
        state
      );
    }

    const browserStateCookie = request.cookies.get(oauthStateCookieName(provider, state!))?.value;
    if (browserStateCookie !== 'pending') {
      console.warn(`[OAuth Callback Warning] OAuth state was not initiated by this browser session | provider=${provider}`);
      return redirectAndClearOAuthFlow(
        `${growthRedirect}?oauth_error=invalid_state_session&provider=${encodeURIComponent(provider)}`,
        provider,
        state
      );
    }

    const intent = verified.intent || 'login';

    if (errorParam) {
      console.warn(`[OAuth Callback Provider Error] provider=${provider} | intent=${intent} | error=${errorParam} | reason=${errorReason || ''} | desc=${errorDescription || ''}`);
      if (provider === 'facebook' && (intent === 'page_connection' || errorParam.includes('access_denied') || errorParam.includes('unavailable'))) {
        return redirectAndClearOAuthFlow(
          `${growthRedirect}?facebook=page_permission_pending&oauth_error=meta_permission_unavailable&provider=facebook&stage=2`,
          provider,
          state
        );
      }
      return redirectAndClearOAuthFlow(
        `${growthRedirect}?oauth_error=${encodeURIComponent(errorParam)}&provider=${encodeURIComponent(provider)}`,
        provider,
        state
      );
    }

    if (!code) {
      return redirectAndClearOAuthFlow(
        `${growthRedirect}?oauth_error=missing_params&provider=${encodeURIComponent(provider)}`,
        provider,
        state
      );
    }

    // Tenant identity comes only from the signed, browser-bound state created
    // after requireRalionContext().
    const userId = verified.userId;
    const workspaceId = verified.workspaceId;
    const organizationId = verified.organizationId || workspaceId;
    const codeVerifier =
      request.cookies.get(oauthVerifierCookieName(provider, state!))?.value ||
      request.cookies.get(legacyOAuthVerifierCookieName(provider))?.value ||
      '';

    let accessToken = '';
    let refreshToken: string | undefined;
    let expiresAt: Date | undefined;
    let profile: { handle: string; name: string; avatar?: string; followersCount: number; channelId?: string; pageId?: string; sub?: string; id?: string } = {
      handle: '', name: '', followersCount: 0,
    };
    let accountLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
    let pageId: string | undefined;
    let providerAccountId: string | undefined;
    let grantedScopes: string[] = [];
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
        const tokens = await metaAdapterV26.exchangeCode(code, 'facebook');
        accessToken = tokens.accessToken;
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        try {
          const debugData = await metaAdapterV26.debugToken(accessToken);
          const tokenAppId = debugData?.data?.app_id;
          const expectedAppId = metaAdapterV26.clientId();
          if (tokenAppId && String(tokenAppId) !== String(expectedAppId)) {
            throw new Error('Meta token was issued for a different app');
          }
        } catch (error: any) {
          console.warn('[OAuth Facebook] token inspection notice:', error.message);
          if (error.message === 'Meta token was issued for a different app') throw error;
        }

        const pages = await metaAdapterV26.getPages(accessToken).catch(() => []);
        const userProfile = await metaAdapterV26.getUserProfile(accessToken).catch(() => null);
        providerAccountId = userProfile?.id || `fb_user_${Date.now()}`;
        profile = {
          handle: userProfile?.name ? `@${userProfile.name.toLowerCase().replace(/\s+/g, '_')}` : '@facebook_user',
          name: userProfile?.name || 'Facebook User',
          avatar: userProfile?.picture?.data?.url,
          followersCount: 0,
        };
        extraMeta = {
          stage: 1,
          graphVersion: metaAdapterV26.graphVersion(),
          is_page: false,
          facebookUserId: userProfile?.id,
          email: userProfile?.email,
          organizationId,
          workspaceId,
          discovered_pages: pages.map((p: any) => ({
            id: p.id, name: p.name, username: p.username, category: p.category,
            avatar: p.avatar, followers: p.followers,
          })),
          page_selection_required: pages.length > 0,
        };
        accountLabel = `Facebook Profile (${userProfile?.name || 'Connected'})`;
        break;
      }
      case 'instagram': {
        const tokens = await instagramBusinessAdapter.exchangeCode(code);
        accessToken = tokens.accessToken;
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        const igProfile = await instagramBusinessAdapter.getProfile(accessToken);
        pageId = igProfile.id;
        providerAccountId = igProfile.id;
        profile = {
          handle: `@${igProfile.username}`,
          name: igProfile.name,
          avatar: igProfile.avatar,
          followersCount: igProfile.followersCount,
        };
        grantedScopes = instagramBusinessAdapter.resolvedScopes();
        extraMeta = {
          graphVersion: instagramBusinessAdapter.graphVersion(),
          oauthMode: 'instagram_login',
          igUserId: igProfile.id,
          accountType: igProfile.accountType,
          organizationId,
          workspaceId,
          tokenRefreshSupported: true,
        };
        accountLabel = `Instagram Professional (@${igProfile.username})`;
        break;
      }
      case 'x':
      case 'twitter': {
        if (!codeVerifier) return redirectAndClearOAuthFlow(`${growthRedirect}?oauth_error=missing_verifier&provider=${encodeURIComponent(provider)}`, provider, state);
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
        if (!codeVerifier) return redirectAndClearOAuthFlow(`${growthRedirect}?oauth_error=missing_verifier&provider=${encodeURIComponent(provider)}`, provider, state);
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
        return redirectAndClearOAuthFlow(`${growthRedirect}?oauth_error=unsupported_provider&provider=${encodeURIComponent(provider)}`, provider, state);
    }

    const storeResult = await storeOAuthTokens({
      userId,
      workspaceId,
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
      scopes: grantedScopes,
      extraMeta,
    });

    if (provider === 'facebook') {
      const pageCacheKey = buildTenantCacheKey(userId, workspaceId, 'facebook_pages', 'list');
      tenantCache.invalidate(pageCacheKey);
      FacebookConnectionStateService.invalidateCache(workspaceId);
    }

    // Facebook OAuth only establishes the user/profile token and discovers
    // manageable Pages. A Page is not connected until the user explicitly
    // selects one via POST /api/social/facebook/pages.
    const stageQuery = provider === 'facebook'
      ? '&stage=1&profile_connected=true'
      : (intent === 'page_connection' ? '&stage=2&page_connected=true' : '&stage=1&profile_connected=true');
    const connectionQuery = storeResult.connectionId ? `&connection_id=${encodeURIComponent(storeResult.connectionId)}` : '';
    const finalRedirectUrl = `${growthRedirect}?connected=${provider}&handle=${encodeURIComponent(profile.handle)}${connectionQuery}${stageQuery}`;
    return redirectAndClearOAuthFlow(finalRedirectUrl, provider, state);
  } catch (error: any) {
    const rawMsg = error?.message || 'oauth_failed';
    const sanitizedError = rawMsg
      .replace(/([a-f0-9]{24,})/gi, '[REDACTED]')
      .replace(/(AQL[a-zA-Z0-9_-]{20,})/gi, '[REDACTED]')
      .replace(/(EAA[a-zA-Z0-9_-]{20,})/gi, '[REDACTED]')
      .replace(/(ya29\.[a-zA-Z0-9_-]{20,})/gi, '[REDACTED]');
    console.error(`[OAuth Callback Exception] provider=${providerName} | message=${sanitizedError}`);
    return NextResponse.redirect(`${growthRedirect}?oauth_error=${encodeURIComponent(sanitizedError)}`);
  }
}

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const growthRedirect = `${appUrl}/ralion/growth`;

  try {
    const { provider } = await params;
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    // Handle user-denied access
    if (errorParam) {
      return NextResponse.redirect(`${growthRedirect}?oauth_error=${encodeURIComponent(errorParam)}&provider=${provider}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${growthRedirect}?oauth_error=missing_params&provider=${provider}`);
    }

    // Verify CSRF state token
    const verified = verifyOAuthState(state);
    if (!verified.valid) {
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
    let profile: { handle: string; name: string; avatar?: string; followersCount: number; channelId?: string; pageId?: string } = {
      handle: '', name: '', followersCount: 0
    };
    let accountLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
    let pageId: string | undefined;
    let extraMeta: Record<string, any> = {};

    switch (provider) {
      case 'linkedin': {
        const tokens = await linkedinAdapter.exchangeCode(code);
        accessToken = tokens.accessToken;
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
        const p = await linkedinAdapter.getProfile(accessToken);
        profile = p;
        accountLabel = 'LinkedIn Organization';
        break;
      }
      case 'facebook': {
        const tokens = await metaAdapter.exchangeCode(code, 'facebook');
        accessToken = tokens.accessToken;
        expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        if (intent === 'page_connection') {
          // Stage 2: Discover and connect managed Facebook Page
          let pages: any[] = [];
          try {
            pages = await metaAdapter.getPages(accessToken);
          } catch (pageErr: any) {
            console.warn('[OAuth Callback] Page discovery note:', pageErr.message);
          }

          if (!pages || pages.length === 0) {
            // Permission or app availability failure on Page scopes
            return NextResponse.redirect(`${growthRedirect}?oauth_error=meta_permission_unavailable&provider=facebook&stage=2`);
          }

          const firstPage = pages[0];
          pageId = firstPage.id;
          profile = {
            handle: `@${firstPage.name.toLowerCase().replace(/\s+/g, '_')}`,
            name: firstPage.name,
            avatar: firstPage.avatar,
            followersCount: firstPage.followers || 0,
            pageId: firstPage.id,
          };
          extraMeta = {
            pageAccessToken: firstPage.accessToken,
            pages,
            stage: 2,
            organizationId,
          };
          accountLabel = 'Facebook Business Page';
        } else {
          // Stage 1: Basic Facebook Login / Profile Link
          let userProfile: any = null;
          try {
            userProfile = await metaAdapter.getUserProfile(accessToken);
          } catch {}

          profile = {
            handle: userProfile?.name ? `@${userProfile.name.toLowerCase().replace(/\s+/g, '_')}` : '@facebook_user',
            name: userProfile?.name || 'Facebook User',
            avatar: userProfile?.picture?.data?.url,
            followersCount: 0,
          };
          extraMeta = {
            stage: 1,
            facebookUserId: userProfile?.id,
            email: userProfile?.email,
            organizationId,
          };
          accountLabel = 'Facebook Profile (Connected)';
        }
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
        accountLabel = provider === 'youtube' ? 'YouTube Content Studio' : 'Google Business Profile';
        break;
      }
      default:
        return NextResponse.redirect(`${growthRedirect}?oauth_error=unsupported_provider&provider=${provider}`);
    }

    // Store real encrypted tokens in Supabase
    await storeOAuthTokens({
      userId,
      provider,
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
    const redirectResponse = NextResponse.redirect(`${growthRedirect}?connected=${provider}&handle=${encodeURIComponent(profile.handle)}${stageQuery}`);
    redirectResponse.cookies.set(`oauth_verifier_${provider}`, '', { maxAge: 0, path: '/' });

    return redirectResponse;
  } catch (error: any) {
    console.error('[OAuth Callback Error]', error);
    return NextResponse.redirect(`${growthRedirect}?oauth_error=${encodeURIComponent(error.message || 'oauth_failed')}`);
  }
}


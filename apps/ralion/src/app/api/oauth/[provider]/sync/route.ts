import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  loadOAuthTokens, updateLastSynced, markTokenExpired,
  linkedinAdapter, metaAdapter, xAdapter, tiktokAdapter, youtubeAdapter,
} from '@/lib/services/social.service';

const PROVIDERS = [
  'google', 'meta', 'facebook', 'instagram', 'whatsapp', 'microsoft', 'linkedin', 'tiktok',
  'x', 'youtube', 'pinterest', 'reddit', 'github', 'slack', 'discord', 'notion', 'dropbox',
  'onedrive', 'shopify', 'woocommerce', 'stripe', 'paypal', 'quickbooks', 'xero', 'sage',
  'hubspot', 'salesforce'
];

export async function generateStaticParams() {
  return PROVIDERS.map(provider => ({ provider }));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    // Get authenticated user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: request.headers.get('cookie') || '' } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Load token from Supabase
    const tokenData = await loadOAuthTokens(user.id, provider);
    if (!tokenData?.accessToken) {
      return NextResponse.json({ success: false, error: `No connected token found for provider: ${provider}` }, { status: 404 });
    }

    const { accessToken, record } = tokenData;

    // Fetch real posts from platform
    let posts: any[] = [];
    try {
      switch (provider) {
        case 'linkedin':
          posts = await linkedinAdapter.fetchPosts(accessToken);
          break;
        case 'facebook':
          if (record.page_id && record.extra_meta?.pageAccessToken) {
            posts = await metaAdapter.fetchFacebookPosts(record.page_id, record.extra_meta.pageAccessToken);
          }
          break;
        case 'instagram':
          // Instagram media insights require a business account
          posts = [];
          break;
        case 'x':
        case 'twitter':
          posts = await xAdapter.fetchTweets(accessToken);
          break;
        case 'tiktok':
          posts = await tiktokAdapter.fetchVideos(accessToken);
          break;
        case 'youtube':
        case 'google':
          posts = await youtubeAdapter.fetchVideos(accessToken);
          break;
        default:
          posts = [];
      }
    } catch (fetchError: any) {
      // Token might be expired — mark it
      if (fetchError.message?.includes('401') || fetchError.message?.includes('unauthorized')) {
        await markTokenExpired(user.id, provider);
        return NextResponse.json({ success: false, error: 'Token expired — please reconnect this account.', tokenExpired: true }, { status: 401 });
      }
      throw fetchError;
    }

    // Update last synced timestamp
    await updateLastSynced(user.id, provider);

    return NextResponse.json({
      success: true,
      provider,
      postsCount: posts.length,
      posts,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[OAuth Sync]', error);
    return NextResponse.json({ success: false, error: error.message || 'Sync failed' }, { status: 500 });
  }
}


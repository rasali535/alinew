import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  loadOAuthTokens, markTokenExpired,
  linkedinAdapter, metaAdapter, xAdapter,
} from "@/lib/services/social.service";

const PROVIDERS = [
  "google", "meta", "facebook", "instagram", "whatsapp", "microsoft", "linkedin", "tiktok",
  "x", "youtube", "pinterest", "reddit", "github", "slack", "discord", "notion", "dropbox",
  "onedrive", "shopify", "woocommerce", "stripe", "paypal", "quickbooks", "xero", "sage",
  "hubspot", "salesforce"
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
    const body = await request.json();
    const { content, imageUrl } = body;

    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: "Post content is required" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { cookie: request.headers.get("cookie") || "" } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const tokenData = await loadOAuthTokens(user.id, provider);
    if (!tokenData?.accessToken) {
      return NextResponse.json({ success: false, error: "No connected account found for " + provider + ". Please connect your account first." }, { status: 404 });
    }

    const { accessToken, record } = tokenData;
    let result;

    switch (provider) {
      case "linkedin":
        result = await linkedinAdapter.publishPost(accessToken, content);
        break;
      case "facebook":
        if (!record.page_id || !record.extra_meta?.pageAccessToken) {
          return NextResponse.json({ success: false, error: "Facebook Page token not found" }, { status: 400 });
        }
        result = await metaAdapter.publishFacebookPost(record.page_id, record.extra_meta.pageAccessToken, content);
        break;
      case "instagram":
        if (!record.extra_meta?.igUserId || !record.extra_meta?.pageAccessToken) {
          return NextResponse.json({ success: false, error: "Instagram Business account not linked" }, { status: 400 });
        }
        if (!imageUrl) {
          return NextResponse.json({ success: false, error: "Instagram publishing requires an image URL" }, { status: 400 });
        }
        result = await metaAdapter.publishInstagramPost(record.extra_meta.igUserId, record.extra_meta.pageAccessToken, content, imageUrl);
        break;
      case "x":
      case "twitter":
        const tweetText = content.length > 280 ? content.substring(0, 277) + "..." : content;
        result = await xAdapter.publishTweet(accessToken, tweetText);
        break;
      default:
        return NextResponse.json({ success: false, error: "Publishing to " + provider + " is not supported yet." }, { status: 400 });
    }

    if (!result.success) {
      if (result.error?.includes("401") || result.error?.toLowerCase().includes("unauthorized")) {
        await markTokenExpired(user.id, provider);
        return NextResponse.json({ success: false, error: "Token expired — please reconnect your account.", tokenExpired: true }, { status: 401 });
      }
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      provider,
      postId: result.postId,
      postUrl: result.postUrl,
      publishedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[OAuth Publish]", error);
    return NextResponse.json({ success: false, error: error.message || "Publish failed" }, { status: 500 });
  }
}
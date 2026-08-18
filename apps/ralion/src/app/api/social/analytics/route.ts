import { NextRequest } from 'next/server';
import { SocialAnalyticsService } from '@/lib/services/social/socialAnalytics.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const analytics = await SocialAnalyticsService.getAggregatedAnalytics(userId);

    return corsJsonResponse({
      success: true,
      analytics,
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message }, { status: 500 }, request);
  }
}

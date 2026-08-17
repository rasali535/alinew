import { NextRequest, NextResponse } from 'next/server';
import { SocialAnalyticsService } from '@/lib/services/social/socialAnalytics.service';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default-user';
    const analytics = await SocialAnalyticsService.getAggregatedAnalytics(userId);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

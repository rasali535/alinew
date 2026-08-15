import { NextRequest, NextResponse } from 'next/server';
import { SocialPublishingService } from '@/lib/services/social/socialPublishing.service';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, workspaceId, title, body: postBody, mediaUrls, mediaTypes, platforms, scheduledFor, authorName } = body;

    if (!postBody || !platforms || platforms.length === 0) {
      return NextResponse.json({ success: false, error: 'Post content and at least one platform are required.' }, { status: 400 });
    }

    const result = await SocialPublishingService.publish({
      userId: userId || 'default-user',
      workspaceId,
      title,
      body: postBody,
      mediaUrls,
      mediaTypes,
      platforms,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      authorName,
    });

    return NextResponse.json({
      success: result.overallStatus !== 'FAILED',
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

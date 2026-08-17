import { NextRequest, NextResponse } from 'next/server';
import { SocialPublishingService } from '@/lib/services/social/socialPublishing.service';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Ralion Unified Social Posts API ready.',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      workspaceId,
      organizationId,
      title,
      content,
      body: postBody,
      mediaItems,
      mediaUrls,
      mediaTypes,
      platforms,
      scheduledFor,
      publishNow,
      socialConnectionId,
      pageId,
      authorName,
    } = body;

    const actualContent = content || postBody;

    if (!actualContent) {
      return NextResponse.json(
        { success: false, error: 'Post content is required.' },
        { status: 400 }
      );
    }

    const targetPlatforms = Array.isArray(platforms) && platforms.length > 0
      ? platforms
      : ['facebook'];

    const result = await SocialPublishingService.publish({
      userId: userId || 'default-user',
      workspaceId,
      organizationId,
      title,
      body: actualContent,
      mediaUrls: mediaUrls || mediaItems || [],
      mediaTypes,
      platforms: targetPlatforms,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      authorName,
    });

    const isSuccess = result.overallStatus === 'PUBLISHED' || result.overallStatus === 'QUEUED';

    return NextResponse.json({
      success: isSuccess,
      postId: result.postId,
      overallStatus: result.overallStatus,
      platformResults: result.platformResults,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to publish post' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { SocialPublishingService } from '@/lib/services/social/socialPublishing.service';

export const dynamic = 'force-dynamic';

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

    console.log('[UI_PUBLISH_REQUEST_RECEIVED]', {
      endpoint: '/api/social/posts',
      platforms: platforms || ['facebook'],
      hasContent: Boolean(actualContent),
      contentLength: actualContent?.length || 0,
      hasMedia: Boolean((mediaUrls || mediaItems)?.length),
      isScheduled: Boolean(scheduledFor),
      timestamp: new Date().toISOString(),
    });

    if (!actualContent) {
      return NextResponse.json(
        { success: false, error: 'Post content is required before publishing.' },
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
      title: title || 'Social Post',
      body: actualContent,
      mediaUrls: mediaUrls || mediaItems || [],
      mediaTypes,
      platforms: targetPlatforms,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      authorName: authorName || 'Ras Ali Labs',
    });

    const isSuccess = result.overallStatus === 'PUBLISHED' || result.overallStatus === 'QUEUED';

    console.log('[ZERNIO_PUBLISH_RESPONSE]', {
      overallStatus: result.overallStatus,
      postId: result.postId,
      platformResults: result.platformResults,
      success: isSuccess,
    });

    return NextResponse.json({
      success: isSuccess,
      postId: result.postId,
      overallStatus: result.overallStatus,
      platformResults: result.platformResults,
      result,
    }, { status: isSuccess ? 200 : 500 });
  } catch (error: any) {
    console.error('[UI_PUBLISH_REQUEST_ERROR]', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to publish post' },
      { status: 500 }
    );
  }
}

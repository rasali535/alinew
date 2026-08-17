import { NextRequest, NextResponse } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';

export async function generateStaticParams() {
  return [{ pageId: '477334159265235' }, { pageId: 'default' }];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const orgId = request.headers.get('x-organization-id') || 'default-org';
    const userId = request.headers.get('x-user-id') || 'default-user';

    const posts = await FacebookPageManagementService.getPagePosts({
      organizationId: orgId,
      userId,
      pageId,
    });

    return NextResponse.json({
      success: true,
      pageId,
      posts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve Facebook posts' },
      { status: 500 }
    );
  }
}

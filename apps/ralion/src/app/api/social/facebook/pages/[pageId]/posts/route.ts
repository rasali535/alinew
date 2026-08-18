import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  return [{ pageId: '477334159265235' }, { pageId: 'default' }];
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
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

    return corsJsonResponse({
      success: true,
      pageId,
      posts,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to retrieve Facebook posts' },
      { status: 500 },
      request
    );
  }
}

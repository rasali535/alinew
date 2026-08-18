import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext } from '@/lib/auth/serverAuth';

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
    const context = await getCurrentRalionContext(request, { requireAuth: false });
    const orgId = context?.workspace.id || request.headers.get('x-organization-id') || undefined;
    const userId = context?.user.id || request.headers.get('x-user-id') || undefined;
    const workspaceId = context?.workspace.id || request.headers.get('x-workspace-id') || undefined;

    const posts = await FacebookPageManagementService.getPagePosts({
      organizationId: orgId,
      workspaceId,
      userId,
      pageId,
    });

    return corsJsonResponse({
      success: true,
      pageId,
      posts,
      total: posts.length,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to retrieve Facebook posts' },
      { status: 500 },
      request
    );
  }
}

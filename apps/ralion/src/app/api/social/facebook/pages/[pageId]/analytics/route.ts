import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, forbiddenResponse, getServiceSupabase } from '@/lib/auth/serverAuth';

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

    const analytics = await FacebookPageManagementService.getPageAnalytics({
      organizationId: context?.workspace.id || 'org-rasalilabs-demo',
      workspaceId: context?.workspace.id || 'ws-default',
      userId: context?.user.id || 'usr-admin-1',
      pageId: pageId || '477334159265235',
    });

    return corsJsonResponse({
      success: true,
      analytics,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to retrieve Facebook analytics' },
      { status: 500 },
      request
    );
  }
}

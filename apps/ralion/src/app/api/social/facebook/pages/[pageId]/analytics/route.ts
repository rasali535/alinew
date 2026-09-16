import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { resolveFacebookPageRouteConnection } from '@/lib/services/social/facebookPageRouteAccess.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, forbiddenResponse } from '@/lib/auth/serverAuth';

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
    const context = await getCurrentRalionContext(request, { requireAuth: true });

    if (!context?.workspace?.id || !context?.user?.id) {
      return authRequiredResponse(request);
    }

    const organizationId = context.organization?.id || context.workspace.organization_id || context.workspace.id;
    const conn = await resolveFacebookPageRouteConnection({
      organizationId,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      pageId,
    });

    if (pageId && pageId !== 'default' && !conn) {
      return forbiddenResponse(request, 'You do not have access to this Facebook Page');
    }

    if (conn) {
      const { getSocialConnectionCapabilities } = require('@ralion/integrations');
      if (getSocialConnectionCapabilities(conn).isPersonalProfile) {
        return corsJsonResponse({
          success: true,
          analytics: {
            pageId,
            pageName: 'Personal Facebook Profile',
            followers: 0,
            engagementRate: 0,
            analyticsAvailable: false,
            reason: 'facebook_personal_profile',
            message: 'Facebook Page analytics unavailable for personal profiles.',
          }
        }, undefined, request);
      }
    }

    const resolvedPageId = conn?.provider_account_id || conn?.metadata?.pageId || pageId;
    const analytics = await FacebookPageManagementService.getPageAnalytics({
      organizationId,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      pageId: resolvedPageId,
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

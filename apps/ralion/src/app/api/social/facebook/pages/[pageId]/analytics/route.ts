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
    const context = await getCurrentRalionContext(request, { requireAuth: true });

    if (!context?.workspace?.id || !context?.user?.id) {
      return authRequiredResponse(request);
    }

    // Verify page ownership if specific pageId is requested
    if (pageId && pageId !== 'default') {
      const supabase = getServiceSupabase();
      const { data: conn } = await supabase
        .from('social_connections')
        .select('provider_account_id, zernio_account_id, account_type, metadata')
        .eq('provider', 'facebook')
        .or(`workspace_id.eq.${context.workspace.id},user_id.eq.${context.user.id}`)
        .maybeSingle();

      const pageMatched =
        conn &&
        (conn.provider_account_id === pageId ||
          conn.zernio_account_id === pageId ||
          conn.metadata?.pageId === pageId ||
          conn.metadata?.zernioAccountId === pageId);

      if (!pageMatched) {
        return forbiddenResponse(request, 'You do not have access to this Facebook Page');
      }

      const { getSocialConnectionCapabilities } = require('@ralion/integrations');
      if (conn && getSocialConnectionCapabilities(conn).isPersonalProfile) {
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

    const analytics = await FacebookPageManagementService.getPageAnalytics({
      organizationId: context.workspace.id,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      pageId: pageId,
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

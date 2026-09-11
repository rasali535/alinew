import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, forbiddenResponse, getServiceSupabase } from '@/lib/auth/serverAuth';
import { tenantCache, buildTenantCacheKey } from '@/lib/cache/tenantCache';

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

    // 1. Enforce 401 Unauthorized for unauthenticated requests
    if (!context) {
      return authRequiredResponse(request);
    }

    const cacheKey = buildTenantCacheKey(context.user.id, context.workspace.id, 'facebook_page_posts', pageId);
    const cached = tenantCache.get<any>(cacheKey);
    if (cached) {
      return corsJsonResponse(cached, undefined, request);
    }

    // 2. If a specific non-default pageId is requested, verify strict tenant ownership
    if (pageId && pageId !== 'default') {
      const supabase = getServiceSupabase();
      const { data: conn } = await supabase
        .from('social_connections')
        .select('provider_account_id, zernio_account_id, metadata')
        .eq('provider', 'facebook')
        .eq('workspace_id', context.workspace.id)
        .eq('organization_id', context.organization.id)
        .in('connection_status', ['CONNECTED', 'ACTIVE', 'connected', 'active'])
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
    }

    const posts = await FacebookPageManagementService.getPagePosts({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      pageId,
    });

    const respPayload = {
      success: true,
      pageId,
      posts,
      total: posts.length,
    };
    tenantCache.set(cacheKey, respPayload, 60);

    return corsJsonResponse(respPayload, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to retrieve Facebook posts' },
      { status: 500 },
      request
    );
  }
}

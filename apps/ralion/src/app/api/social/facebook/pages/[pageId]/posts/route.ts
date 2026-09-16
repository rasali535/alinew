import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { resolveFacebookPageRouteConnection } from '@/lib/services/social/facebookPageRouteAccess.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse, forbiddenResponse } from '@/lib/auth/serverAuth';
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

    if (!context) {
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

    const resolvedPageId = conn?.provider_account_id || conn?.metadata?.pageId || pageId;
    const cacheKey = buildTenantCacheKey(context.user.id, context.workspace.id, 'facebook_page_posts', resolvedPageId);
    const cached = tenantCache.get<any>(cacheKey);
    if (cached) {
      return corsJsonResponse(cached, undefined, request);
    }

    const posts = await FacebookPageManagementService.getPagePosts({
      organizationId,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      pageId: resolvedPageId,
    });

    const respPayload = {
      success: true,
      pageId: resolvedPageId,
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

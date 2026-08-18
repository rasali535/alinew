import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const result = await FacebookPageManagementService.discoverAvailablePages({
      organizationId: context.workspace.id,
      workspaceId: context.workspace.id,
      userId: context.user.id,
    });

    return corsJsonResponse({
      success: true,
      pages: result.pages,
      entitlement: result.entitlement,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to discover Facebook Pages' },
      { status: 500 },
      request
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const body = await request.json();

    if (!body.pageId) {
      return corsJsonResponse({ success: false, error: 'pageId is required' }, { status: 400 }, request);
    }

    const result = await FacebookPageManagementService.connectPage({
      organizationId: context.workspace.id,
      workspaceId: context.workspace.id,
      userId: context.user.id,
      pageId: body.pageId,
      pageData: body.pageData || {},
    });

    return corsJsonResponse({
      success: true,
      destination: result.destination,
      entitlement: result.entitlement,
    }, undefined, request);
  } catch (err: any) {
    if (err.code === 'FEATURE_LIMIT_REACHED' || err.statusCode === 403) {
      return corsJsonResponse(
        {
          success: false,
          code: 'FEATURE_LIMIT_REACHED',
          feature: 'facebook_pages',
          current: err.current || 1,
          limit: err.limit || 1,
          upgradeRequired: true,
          error: err.message,
        },
        { status: 403 },
        request
      );
    }

    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to connect Facebook Page' },
      { status: 500 },
      request
    );
  }
}

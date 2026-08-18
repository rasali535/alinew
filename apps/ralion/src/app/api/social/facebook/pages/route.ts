import { NextRequest } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const orgId = request.headers.get('x-organization-id') || 'default-org';
    const userId = request.headers.get('x-user-id') || 'default-user';

    const result = await FacebookPageManagementService.discoverAvailablePages({
      organizationId: orgId,
      userId,
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
    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || body.organizationId || 'default-org';
    const userId = request.headers.get('x-user-id') || body.userId || 'default-user';

    if (!body.pageId) {
      return corsJsonResponse({ success: false, error: 'pageId is required' }, { status: 400 }, request);
    }

    const result = await FacebookPageManagementService.connectPage({
      organizationId: orgId,
      userId,
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

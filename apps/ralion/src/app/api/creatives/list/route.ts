import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { CreativeAssetService } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/creatives/list
 * Returns all real durable creative assets for the organization.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organizationId =
    searchParams.get('organizationId') ||
    request.headers.get('x-organization-id') ||
    request.headers.get('x-workspace-id') ||
    request.headers.get('x-user-id');

  if (!organizationId || organizationId === 'default-org') {
    return corsJsonResponse(
      {
        success: false,
        error: 'Unauthorized: A valid authenticated organizationId is required. Defaulting to default-org is forbidden.',
        errorCode: 'TENANT_UNAUTHORIZED',
      },
      { status: 401 },
      request
    );
  }

  const type = searchParams.get('type');

  let assets = CreativeAssetService.listAssets(organizationId);
  if (type) {
    assets = assets.filter(a => a.type === type);
  }

  return corsJsonResponse({
    success: true,
    assets,
    count: assets.length,
  }, undefined, request);
}

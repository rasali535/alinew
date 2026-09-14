import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { CreativeAssetService } from '@ralion/ai/server';
import { requireRalionContext } from '../../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/creatives/[assetId]/status
 * Polls the current status of an asynchronous generation job for the authenticated tenant.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;

  // 1. Require authenticated server session
  const authResult = await requireRalionContext(request);
  if (authResult.response || !authResult.context) {
    return authResult.response || corsJsonResponse(
      { success: false, error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required.' },
      { status: 401 },
      request
    );
  }

  const authenticatedOrgId = authResult.context.organization.id;
  const authenticatedWorkspaceId = authResult.context.workspace.id;

  // 2. Locate asset and verify tenant ownership
  let asset = CreativeAssetService.getAsset(assetId, authenticatedOrgId, authenticatedWorkspaceId);
  if (!asset) {
    asset = await CreativeAssetService.getAssetAsync(assetId, authenticatedOrgId, authenticatedWorkspaceId);
  }

  if (!asset) {
    return corsJsonResponse({ success: false, error: 'Asset not found', status: 'FAILED' }, { status: 404 }, request);
  }

  if (asset.organizationId !== authenticatedOrgId) {
    return corsJsonResponse(
      { success: false, error: 'FORBIDDEN', message: 'Access denied: Cross-tenant asset status inspection prohibited.' },
      { status: 403 },
      request
    );
  }

  if (asset.workspaceId && asset.workspaceId !== authenticatedWorkspaceId) {
    return corsJsonResponse(
      { success: false, error: 'FORBIDDEN', message: 'Access denied: Cross-workspace asset status inspection prohibited.' },
      { status: 403 },
      request
    );
  }

  return corsJsonResponse({
    success: true,
    status: asset.status,
    asset,
  }, undefined, request);
}

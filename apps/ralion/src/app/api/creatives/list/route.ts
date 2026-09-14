import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { CreativeAssetService } from '@ralion/ai/server';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/creatives/list
 * Returns all real durable creative assets for the authenticated organization.
 */
export async function GET(request: NextRequest) {
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

  // 2. Reject untrusted query hints if they do not match
  const { searchParams } = new URL(request.url);
  const hintOrgId = searchParams.get('organizationId') || request.headers.get('x-organization-id');
  const hintWorkspaceId = searchParams.get('workspaceId') || request.headers.get('x-workspace-id');

  if (hintOrgId && hintOrgId !== authenticatedOrgId) {
    return corsJsonResponse(
      { success: false, error: 'FORBIDDEN', message: 'Access denied: Organization mismatch.' },
      { status: 403 },
      request
    );
  }

  if (hintWorkspaceId && hintWorkspaceId !== authenticatedWorkspaceId) {
    return corsJsonResponse(
      { success: false, error: 'FORBIDDEN', message: 'Access denied: Workspace mismatch.' },
      { status: 403 },
      request
    );
  }

  const type = searchParams.get('type') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0;

  const assets = await CreativeAssetService.listAssetsAsync({
    organizationId: authenticatedOrgId,
    workspaceId: authenticatedWorkspaceId,
    type,
    limit,
    offset,
  });

  return corsJsonResponse({
    success: true,
    assets,
    count: assets.length,
  }, undefined, request);
}

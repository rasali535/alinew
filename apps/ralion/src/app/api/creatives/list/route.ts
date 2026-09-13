import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { CreativeAssetService } from '@ralion/ai';
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

  // 2. Reject untrusted query hints if they do not match
  const { searchParams } = new URL(request.url);
  const hintOrgId = searchParams.get('organizationId') || request.headers.get('x-organization-id');
  if (hintOrgId && hintOrgId !== authenticatedOrgId) {
    return corsJsonResponse(
      { success: false, error: 'FORBIDDEN', message: 'Access denied: Organization mismatch.' },
      { status: 403 },
      request
    );
  }

  const type = searchParams.get('type');

  let assets = CreativeAssetService.listAssets(authenticatedOrgId);
  if (type) {
    assets = assets.filter(a => a.type === type);
  }

  return corsJsonResponse({
    success: true,
    assets,
    count: assets.length,
  }, undefined, request);
}

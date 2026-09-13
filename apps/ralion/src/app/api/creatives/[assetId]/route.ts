import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { CreativeAssetService } from '@ralion/ai';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

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

  // 2. Verify untrusted query hints
  const { searchParams } = new URL(request.url);
  const hintOrgId = searchParams.get('organizationId') || request.headers.get('x-organization-id');
  if (hintOrgId && hintOrgId !== authenticatedOrgId) {
    return corsJsonResponse(
      { success: false, error: 'FORBIDDEN', message: 'Access denied: Organization mismatch.' },
      { status: 403 },
      request
    );
  }

  // 3. Locate asset and verify tenant ownership
  let rawAsset = CreativeAssetService.getAsset(assetId);
  if (!rawAsset) {
    rawAsset = await CreativeAssetService.getAssetAsync(assetId);
  }

  if (!rawAsset) {
    return corsJsonResponse({ success: false, error: 'Asset not found' }, { status: 404 }, request);
  }

  if (rawAsset.organizationId !== authenticatedOrgId) {
    return corsJsonResponse(
      { success: false, error: 'FORBIDDEN', message: 'Access denied: Cross-tenant asset access prohibited.' },
      { status: 403 },
      request
    );
  }

  return corsJsonResponse({ success: true, asset: rawAsset }, undefined, request);
}

export async function DELETE(
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

  // 2. Verify untrusted query hints
  const { searchParams } = new URL(request.url);
  const hintOrgId = searchParams.get('organizationId') || request.headers.get('x-organization-id');
  if (hintOrgId && hintOrgId !== authenticatedOrgId) {
    return corsJsonResponse(
      { success: false, error: 'FORBIDDEN', message: 'Access denied: Organization mismatch.' },
      { status: 403 },
      request
    );
  }

  // 3. Locate asset and verify tenant ownership
  let rawAsset = CreativeAssetService.getAsset(assetId);
  if (!rawAsset) {
    rawAsset = await CreativeAssetService.getAssetAsync(assetId);
  }

  if (!rawAsset) {
    return corsJsonResponse({ success: false, error: 'Asset not found' }, { status: 404 }, request);
  }

  if (rawAsset.organizationId !== authenticatedOrgId) {
    return corsJsonResponse(
      { success: false, error: 'FORBIDDEN', message: 'Access denied: Cross-tenant asset deletion prohibited.' },
      { status: 403 },
      request
    );
  }

  const deleted = await CreativeAssetService.deleteAsset(assetId, authenticatedOrgId);
  if (!deleted) {
    return corsJsonResponse({ success: false, error: 'Failed to delete asset' }, { status: 400 }, request);
  }

  return corsJsonResponse({ success: true, message: 'Asset deleted successfully' }, undefined, request);
}

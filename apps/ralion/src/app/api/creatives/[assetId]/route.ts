import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { CreativeAssetService } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const { searchParams } = new URL(request.url);
  const requestingOrgId = searchParams.get('organizationId') || request.headers.get('x-organization-id') || undefined;

  const rawAsset = CreativeAssetService.getAsset(assetId);
  if (!rawAsset) {
    return corsJsonResponse({ success: false, error: 'Asset not found' }, { status: 404 }, request);
  }

  if (requestingOrgId && rawAsset.organizationId !== requestingOrgId) {
    return corsJsonResponse(
      { success: false, error: 'Access denied: Cross-tenant asset access prohibited' },
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
  const { searchParams } = new URL(request.url);
  const requestingOrgId = searchParams.get('organizationId') || request.headers.get('x-organization-id') || undefined;

  const rawAsset = CreativeAssetService.getAsset(assetId);
  if (!rawAsset) {
    return corsJsonResponse({ success: false, error: 'Asset not found' }, { status: 404 }, request);
  }

  if (requestingOrgId && rawAsset.organizationId !== requestingOrgId) {
    return corsJsonResponse(
      { success: false, error: 'Access denied: Cross-tenant asset deletion prohibited' },
      { status: 403 },
      request
    );
  }

  const deleted = CreativeAssetService.deleteAsset(assetId, requestingOrgId);
  if (!deleted) {
    return corsJsonResponse({ success: false, error: 'Failed to delete asset' }, { status: 400 }, request);
  }

  return corsJsonResponse({ success: true, message: 'Asset deleted successfully' }, undefined, request);
}

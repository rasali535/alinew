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
  const asset = CreativeAssetService.getAsset(assetId);

  if (!asset) {
    return corsJsonResponse({ success: false, error: 'Asset not found' }, { status: 404 }, request);
  }

  return corsJsonResponse({ success: true, asset }, undefined, request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const deleted = CreativeAssetService.deleteAsset(assetId);

  if (!deleted) {
    return corsJsonResponse({ success: false, error: 'Asset not found' }, { status: 404 }, request);
  }

  return corsJsonResponse({ success: true, message: 'Asset deleted successfully' }, undefined, request);
}

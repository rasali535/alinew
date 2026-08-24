import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { CreativeAssetService } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/creatives/[assetId]/status
 * Polls the current status of an asynchronous generation job.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const asset = CreativeAssetService.getAsset(assetId);

  if (!asset) {
    return corsJsonResponse({ success: false, error: 'Asset not found', status: 'FAILED' }, { status: 404 }, request);
  }

  return corsJsonResponse({
    success: true,
    status: asset.status,
    asset,
  }, undefined, request);
}

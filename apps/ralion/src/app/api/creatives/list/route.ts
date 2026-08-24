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
  const organizationId = searchParams.get('organizationId') || 'default-org';
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

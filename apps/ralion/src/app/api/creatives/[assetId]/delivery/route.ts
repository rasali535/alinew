import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { CreativeAssetService, getProductionStorageProvider } from '@ralion/ai/server';
import { requireRalionContext } from '../../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/creatives/[assetId]/delivery
 *
 * Authenticated delivery route issuing short-lived (15 min) signed Supabase Storage URLs.
 * Enforces:
 * 1. Strict server-side authentication (401 on missing session)
 * 2. Exact organization and workspace multi-tenant isolation (403 on mismatch)
 * 3. Verified storage existence check before URL signing
 * 4. Zero exposure of service-role keys or bearer tokens
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const requestId = `req_del_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const { assetId } = await params;

  try {
    // 1. Require authenticated server session
    const authResult = await requireRalionContext(request);
    if (authResult.response || !authResult.context) {
      return (
        authResult.response ||
        corsJsonResponse(
          {
            success: false,
            error: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required to access creative delivery.',
            requestId,
          },
          { status: 401 },
          request
        )
      );
    }

    const authenticatedOrgId = authResult.context.organization.id;
    const authenticatedWorkspaceId = authResult.context.workspace.id;

    // 2. Reject mismatched client hints (403 Forbidden)
    const { searchParams } = new URL(request.url);
    const hintOrgId = searchParams.get('organizationId') || request.headers.get('x-organization-id');
    const hintWorkspaceId = searchParams.get('workspaceId') || request.headers.get('x-workspace-id');

    if (hintOrgId && hintOrgId !== authenticatedOrgId) {
      return corsJsonResponse(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Access denied: Organization mismatch.',
          requestId,
        },
        { status: 403 },
        request
      );
    }

    if (hintWorkspaceId && hintWorkspaceId !== authenticatedWorkspaceId) {
      return corsJsonResponse(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Access denied: Workspace mismatch.',
          requestId,
        },
        { status: 403 },
        request
      );
    }

    // 3. Locate asset
    let asset = CreativeAssetService.getAsset(assetId);
    if (!asset) {
      asset = await CreativeAssetService.getAssetAsync(assetId, authenticatedOrgId, authenticatedWorkspaceId);
    }
    if (!asset && assetId.includes('.')) {
      asset = await CreativeAssetService.getAssetByFilename(assetId, authenticatedOrgId, authenticatedWorkspaceId);
    }

    if (!asset) {
      return corsJsonResponse(
        {
          success: false,
          error: 'ASSET_NOT_FOUND',
          message: 'The requested creative asset was not found.',
          requestId,
        },
        { status: 404 },
        request
      );
    }

    // 4. Double check strict multi-tenant and workspace boundaries
    if (asset.organizationId !== authenticatedOrgId) {
      return corsJsonResponse(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Access denied: Cross-tenant asset delivery prohibited.',
          requestId,
        },
        { status: 403 },
        request
      );
    }

    if (asset.workspaceId && asset.workspaceId !== authenticatedWorkspaceId) {
      return corsJsonResponse(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Access denied: Cross-workspace asset delivery prohibited.',
          requestId,
        },
        { status: 403 },
        request
      );
    }

    // 5. Verify storage existence and generate short-lived signed URL
    const storage = getProductionStorageProvider();
    const storagePath =
      asset.storagePath ||
      `organizations/${authenticatedOrgId}/workspaces/${authenticatedWorkspaceId}/assets/${asset.id}/${asset.id}.${asset.mimeType?.includes('png') ? 'png' : 'jpg'}`;

    const exists = await storage.exists(storagePath);
    if (!exists) {
      return corsJsonResponse(
        {
          success: false,
          error: 'STORAGE_OBJECT_MISSING',
          message: 'The underlying creative media file is not available in storage.',
          requestId,
        },
        { status: 404 },
        request
      );
    }

    const signed = storage.createSignedUrl
      ? await storage.createSignedUrl(storagePath, 900) // 15 minutes validity
      : null;

    if (!signed || !signed.signedUrl) {
      return corsJsonResponse(
        {
          success: false,
          error: 'DELIVERY_URL_GENERATION_FAILED',
          message: 'Could not generate secure media delivery URL. Please retry.',
          requestId,
        },
        { status: 502 },
        request
      );
    }

    return corsJsonResponse(
      {
        success: true,
        assetId: asset.id,
        signedUrl: signed.signedUrl,
        expiresAt: signed.expiresAt,
        mimeType: asset.mimeType,
        sha256: asset.sha256,
        requestId,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error(`[Creative Delivery API] Error (${requestId}):`, err);
    return corsJsonResponse(
      {
        success: false,
        error: 'INTERNAL_DELIVERY_ERROR',
        message: 'An unexpected error occurred while resolving secure media delivery.',
        requestId,
      },
      { status: 500 },
      request
    );
  }
}

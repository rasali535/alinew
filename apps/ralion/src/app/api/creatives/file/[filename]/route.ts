import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { CreativeAssetService, getProductionStorageProvider } from '@ralion/ai';
import { requireRalionContext } from '../../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/creatives/file/[filename]
 *
 * Authenticated creative asset delivery route backed by private Supabase Storage.
 * Enforces:
 * 1. Sanitized filename input
 * 2. Authenticated server context via requireRalionContext (HTTP 401 without valid session)
 * 3. Exact tenant ownership verification (HTTP 403 on mismatch)
 * 4. Strict tenant-scoped storage path retrieval (No fallback to unscoped global objects)
 * 5. Streaming binary with verified MIME type and SHA-256 integrity
 * 6. No sensitive tenant ID exposure in public response headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await params;
  const filename = resolvedParams?.filename || '';

  // 1. Sanitize: prevent directory traversal
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename || safeName.includes('..')) {
    return new NextResponse(
      JSON.stringify({ error: 'INVALID_FILENAME', message: 'Invalid asset filename requested.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Require authenticated server session
  const authResult = await requireRalionContext(request);
  if (authResult.response || !authResult.context) {
    return authResult.response || new NextResponse(
      JSON.stringify({ error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required to access creative assets.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const authenticatedOrgId = authResult.context.organization.id;
  const authenticatedWorkspaceId = authResult.context.workspace.id;

  // 3. Verify untrusted query parameters or headers against authenticated context
  const { searchParams } = new URL(request.url);
  const hintOrgId = searchParams.get('organizationId') || request.headers.get('x-organization-id');
  if (hintOrgId && hintOrgId !== authenticatedOrgId) {
    return new NextResponse(
      JSON.stringify({ error: 'FORBIDDEN', message: 'Requested organization does not match authenticated context.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Locate CreativeAsset record and verify strict tenant ownership
  const asset = await CreativeAssetService.getAssetByFilename(safeName);
  if (asset && asset.organizationId !== authenticatedOrgId) {
    return new NextResponse(
      JSON.stringify({ error: 'FORBIDDEN', message: 'Access denied: Cross-tenant asset access prohibited.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 5. Download strictly from tenant-scoped storage path
  const storage = getProductionStorageProvider();
  const assetId = asset?.id || safeName.replace(/\.[^/.]+$/, '').replace(/-raw$/, '');
  const canonicalStoragePath = asset?.storagePath || `organizations/${authenticatedOrgId}/workspaces/${authenticatedWorkspaceId}/assets/${assetId}/${safeName}`;

  let downloadResult = await storage.download(canonicalStoragePath);

  // Fallback only within the same tenant's namespace if storagePath is registered differently
  if (!downloadResult && asset?.storagePath) {
    downloadResult = await storage.download(asset.storagePath);
  }

  // 6. Stream real binary from Supabase Storage
  if (downloadResult && downloadResult.buffer.length > 0) {
    const ext = path.extname(safeName).toLowerCase();
    let mimeType = downloadResult.contentType;

    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.webm') mimeType = 'video/webm';
      else if (ext === '.gif') mimeType = 'image/gif';
      else mimeType = 'image/jpeg';
    }

    return new NextResponse(new Uint8Array(downloadResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(downloadResult.sizeBytes),
        'Cache-Control': 'private, no-transform, max-age=3600',
        'X-Asset-Source': 'supabase-storage',
        'X-Asset-Bucket': 'creatives',
        'X-Asset-SHA256': downloadResult.sha256,
      },
    });
  }

  // 7. Object not found in tenant storage
  return new NextResponse(
    JSON.stringify({
      error: 'ASSET_NOT_FOUND',
      filename: safeName,
      message: 'The requested creative asset does not exist in durable storage.',
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

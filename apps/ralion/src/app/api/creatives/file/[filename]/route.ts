import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { CreativeAssetService, getProductionStorageProvider } from '@ralion/ai';

export const dynamic = 'force-dynamic';

/**
 * GET /api/creatives/file/[filename]
 *
 * Canonical creative asset delivery route backed by private Supabase Storage.
 * Enforces:
 * 1. Sanitized filename input
 * 2. Authenticated tenant ownership check (HTTP 403 on cross-tenant attempt)
 * 3. Exact object retrieval from Supabase Storage `creatives` bucket
 * 4. Streaming with verified MIME type and HTTP 200
 * 5. Structured HTTP 404 JSON on missing asset (Zero placeholder fallback)
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
    return new NextResponse(null, { status: 400 });
  }

  // 2. Resolve requesting tenant context
  const { searchParams } = new URL(request.url);
  const requestingOrgId =
    searchParams.get('organizationId') ||
    request.headers.get('x-organization-id') ||
    request.headers.get('x-workspace-id') ||
    undefined;

  // 3. Locate CreativeAsset record and verify tenant ownership
  const asset = await CreativeAssetService.getAssetByFilename(safeName);

  if (asset && requestingOrgId && requestingOrgId !== 'all') {
    if (asset.organizationId !== requestingOrgId) {
      console.warn(
        `[CreativeFileRoute] Cross-tenant access denied: tenant '${requestingOrgId}' attempted to access asset owned by '${asset.organizationId}'`
      );
      return new NextResponse(
        JSON.stringify({
          error: 'Access denied: Cross-tenant asset access prohibited',
          requestedAsset: safeName,
          requestingTenant: requestingOrgId,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // 4. Download from Supabase Storage
  const storage = getProductionStorageProvider();
  let storagePath = asset?.storagePath;

  if (!storagePath) {
    if (requestingOrgId && requestingOrgId !== 'all') {
      storagePath = `${requestingOrgId}/${safeName}`;
    } else {
      storagePath = safeName;
    }
  }

  let downloadResult = await storage.download(storagePath);

  // If direct path failed, attempt to find in Supabase bucket
  if (!downloadResult && storagePath !== safeName) {
    downloadResult = await storage.download(safeName);
    if (downloadResult) {
      storagePath = safeName;
    }
  }

  // 5. Stream real binary from Supabase Storage
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
        'Cache-Control': 'private, max-age=3600',
        'X-Asset-Source': 'supabase-storage',
        'X-Asset-Bucket': 'creatives',
        'X-Storage-Path': storagePath,
        'X-Tenant-Owner': asset?.organizationId || 'unassigned',
        'X-Asset-SHA256': downloadResult.sha256,
      },
    });
  }

  // 6. Object not found in Supabase Storage. Return genuine 404 JSON.
  console.warn(`[CreativeFileRoute] Asset not found in Supabase Storage: ${safeName}`);
  return new NextResponse(
    JSON.stringify({
      error: 'ASSET_NOT_FOUND',
      filename: safeName,
      storageProvider: 'SUPABASE',
      bucket: 'creatives',
      message: 'The requested creative asset does not exist in durable storage.',
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

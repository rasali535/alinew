import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/creatives/file/[filename]
 *
 * Canonical creative asset file serving route.
 * Works regardless of Next.js basePath or deployment mode (standalone vs hosted).
 * Returns the real binary asset or HTTP 404. Never substitutes a placeholder.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await params;
  const filename = resolvedParams?.filename || '';

  // Sanitize: no path traversal
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename || safeName.includes('..')) {
    return new NextResponse(null, { status: 400 });
  }

  const cwd = process.cwd();

  const candidatePaths = [
    path.join(cwd, 'public', 'uploads', 'creatives', safeName),
    path.join(cwd, 'apps', 'ralion', 'public', 'uploads', 'creatives', safeName),
    path.join(cwd, 'uploads', 'creatives', safeName),
    path.join(cwd, '.creatives_storage', safeName),
  ];

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      const stat = fs.statSync(candidatePath);
      if (!stat.isFile() || stat.size === 0) continue;

      const buffer = fs.readFileSync(candidatePath);
      const ext = path.extname(safeName).toLowerCase();

      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.webm') mimeType = 'video/webm';
      else if (ext === '.gif') mimeType = 'image/gif';

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(buffer.byteLength),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Asset-Source': 'local-storage',
          'X-Asset-Path': candidatePath,
        },
      });
    }
  }

  // File does not exist. Return genuine 404. Never substitute a placeholder.
  console.warn(`[CreativeAssetRoute] Asset not found: ${safeName}`);
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

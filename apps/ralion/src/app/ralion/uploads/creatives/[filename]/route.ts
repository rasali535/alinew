import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const resolvedParams = await params;
  const filename = resolvedParams?.filename || '';
  const cwd = process.cwd();

  const candidatePaths = [
    path.join(cwd, 'public', 'uploads', 'creatives', filename),
    path.join(cwd, 'apps', 'ralion', 'public', 'uploads', 'creatives', filename),
    path.join(cwd, 'uploads', 'creatives', filename),
    path.join(cwd, '.creatives_storage', filename),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const buffer = fs.readFileSync(p);
      const ext = path.extname(filename).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.mp4') mimeType = 'video/mp4';

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  }

  // File does not exist. Return genuine 404. Never substitute a placeholder.
  console.warn(`[CreativeAssetRoute] Asset not found on ralion static path: ${filename}`);
  return new NextResponse(
    JSON.stringify({
      error: 'ASSET_NOT_FOUND',
      filename,
      message: 'The requested creative asset does not exist in durable storage.',
    }),
    {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

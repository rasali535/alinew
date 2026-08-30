import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename || '';
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

  // Fallback: Generate dynamic SVG poster rather than failing with 404
  const title = filename.replace(/^asset-\d+-|\.[^.]+$/g, '').replace(/[-_]/g, ' ') || 'Ralion Creative Asset';
  const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);
  const svg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#030712" />
    </linearGradient>
    <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)" />
  <rect x="32" y="32" width="960" height="960" rx="24" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" fill="rgba(15,23,42,0.4)" />
  <g transform="translate(64, 64)">
    <rect width="180" height="36" rx="18" fill="rgba(59,130,246,0.15)" stroke="rgba(96,165,250,0.35)" stroke-width="1" />
    <circle cx="20" cy="18" r="5" fill="#38bdf8" />
    <text x="36" y="23" fill="#93c5fd" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" letter-spacing="1">RALION GROWTH</text>
  </g>
  <g transform="translate(64, 430)">
    <text fill="url(#acc)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="36" font-weight="800" letter-spacing="-0.5">${cleanTitle}</text>
    <text y="54" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="400">Engineered for high-velocity enterprise market expansion &amp; strategic growth.</text>
  </g>
  <g transform="translate(64, 928)">
    <text fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">STYLE: CORPORATE EXECUTIVE</text>
  </g>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GITHUB_RELEASE_BASE = 'https://github.com/rasali535/alinew/releases/latest/download';
const SAFE_UPDATE_FILE = /^(latest\.yml|ralion-os-[0-9A-Za-z.+-]+-setup\.exe(?:\.blockmap)?)$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  const { file } = await params;
  const requested = Array.isArray(file) ? file.join('/') : '';
  if (!SAFE_UPDATE_FILE.test(requested)) {
    return NextResponse.json({ error: 'Update metadata not found.' }, { status: 404 });
  }

  try {
    const response = await fetch(`${GITHUB_RELEASE_BASE}/${requested}`, { cache: 'no-store', redirect: 'follow' });
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Desktop update metadata is not available yet.' },
        { status: response.status === 404 ? 404 : 502 }
      );
    }

    const contentType = requested.endsWith('.yml')
      ? 'text/yaml; charset=utf-8'
      : response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': requested === 'latest.yml' ? 'no-store, max-age=0' : 'public, max-age=31536000, immutable',
        ...(response.headers.get('content-length')
          ? { 'Content-Length': response.headers.get('content-length') as string }
          : {}),
      },
    });
  } catch (error) {
    console.error('[Desktop Update Feed] Failed to proxy release metadata:', error);
    return NextResponse.json({ error: 'Desktop update feed unavailable.' }, { status: 502 });
  }
}

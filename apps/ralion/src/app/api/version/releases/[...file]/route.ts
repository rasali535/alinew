import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GITHUB_RELEASE_BASE = 'https://github.com/rasali535/alinew/releases/latest/download';
const ALLOWED_UPDATE_FILES = new Set(['latest.yml']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  const { file } = await params;
  const requested = Array.isArray(file) ? file.join('/') : '';
  if (!ALLOWED_UPDATE_FILES.has(requested)) {
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

    return new NextResponse(await response.text(), {
      status: 200,
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[Desktop Update Feed] Failed to proxy release metadata:', error);
    return NextResponse.json({ error: 'Desktop update feed unavailable.' }, { status: 502 });
  }
}

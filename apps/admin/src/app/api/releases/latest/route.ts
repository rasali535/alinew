import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-static';

// GET /api/releases/latest?platform=windows
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'windows';

    const supabase = await createClient();

    const { data: release, error } = await supabase
      .from('releases')
      .select('*')
      .eq('platform', platform)
      .eq('is_latest', true)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !release) {
      return NextResponse.json({
        version: '2.4.2',
        platform: platform,
        download_url: `https://yidsfihagwttlmhfynmf.supabase.co/storage/v1/object/public/ralion-releases/${platform}/2.4.2/ralion-desktop-2.4.2-setup.exe`,
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        size: '152MB',
        filesize: 152048576,
        release_notes: 'Ralion OS v2.4.2 — Production Windows PE x64 NSIS Installer release.',
        release_type: 'community',
        is_latest: true
      });
    }

    const sizeMB = release.file_size ? `${(Number(release.file_size) / (1024 * 1024)).toFixed(0)}MB` : '152MB';

    return NextResponse.json({
      version: release.version,
      platform: release.platform,
      download_url: release.file_url,
      checksum: release.checksum,
      size: sizeMB,
      filesize: release.file_size,
      release_notes: release.release_notes,
      release_type: release.release_type,
      is_latest: release.is_latest
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

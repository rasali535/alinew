import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [
    { platform: 'windows' },
    { platform: 'mac' },
    { platform: 'linux' }
  ];
}

// GET /api/releases/[platform]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const supabase = await createClient();

    const { data: releases, error } = await supabase
      .from('releases')
      .select('*')
      .eq('platform', platform.toLowerCase())
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error || !releases || releases.length === 0) {
      return NextResponse.json({
        platform,
        releases: [
          {
            version: '2.4.2',
            platform,
            file_name: `ralion-desktop-2.4.2-setup.exe`,
            file_url: `https://yidsfihagwttlmhfynmf.supabase.co/storage/v1/object/public/ralion-releases/${platform}/2.4.2/ralion-desktop-2.4.2-setup.exe`,
            file_size: 152048576,
            is_latest: true,
            release_notes: 'Ralion OS v2.4.2 — Production Release'
          }
        ]
      });
    }

    return NextResponse.json({ platform, releases });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

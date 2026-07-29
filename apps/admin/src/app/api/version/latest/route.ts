import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    version: '2.4.2',
    name: 'Ralion Platform',
    releaseDate: '2026-07-28',
    changelog: 'Production Windows PE x64 NSIS release with Mari AI intelligence engine, multi-agent advisory, SaaS monetization, and industry modules.',
    downloads: {
      windows: 'https://yidsfihagwttlmhfynmf.supabase.co/storage/v1/object/public/ralion-releases/windows/2.4.2/ralion-desktop-2.4.2-setup.exe',
      mac: 'https://ralion.rasalilabs.com/downloads/mac/v2.4.2',
      linux: 'https://ralion.rasalilabs.com/downloads/linux/v2.4.2'
    }
  });
}

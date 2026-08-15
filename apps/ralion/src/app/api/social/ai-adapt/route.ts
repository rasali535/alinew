import { NextRequest, NextResponse } from 'next/server';
import { SocialAiService } from '@/lib/services/social/socialAi.service';
import { SocialPlatformType } from '@ralion/integrations';

export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea, platforms } = body;

    if (!idea) {
      return NextResponse.json({ success: false, error: 'Content idea is required.' }, { status: 400 });
    }

    const targetPlatforms: SocialPlatformType[] = platforms || ['facebook', 'instagram', 'linkedin', 'x', 'tiktok', 'whatsapp'];
    const adapted = SocialAiService.adaptContent(idea, targetPlatforms);

    return NextResponse.json({
      success: true,
      adapted,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

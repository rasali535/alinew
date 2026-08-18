import { NextRequest } from 'next/server';
import { SocialAiService } from '@/lib/services/social/socialAi.service';
import { SocialPlatformType } from '@ralion/integrations';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getCurrentRalionContext, authRequiredResponse } from '@/lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const context = await getCurrentRalionContext(request, { requireAuth: true });
    if (!context) {
      return authRequiredResponse(request);
    }

    const body = await request.json();
    const { idea, platforms } = body;

    if (!idea) {
      return corsJsonResponse({ success: false, error: 'Content idea is required.' }, { status: 400 }, request);
    }

    const targetPlatforms: SocialPlatformType[] = platforms || ['facebook', 'instagram', 'linkedin', 'x', 'tiktok', 'whatsapp'];
    const adapted = SocialAiService.adaptContent(idea, targetPlatforms);

    return corsJsonResponse({
      success: true,
      adapted,
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, error: error.message }, { status: 500 }, request);
  }
}

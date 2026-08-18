import { NextRequest } from 'next/server';
import { MariBusinessLearningService } from '@/lib/services/social/mariBusinessLearning.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export async function generateStaticParams() {
  return [{ pageId: '477334159265235' }, { pageId: 'default' }];
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const orgId = request.headers.get('x-organization-id') || 'default-org';

    const knowledge = MariBusinessLearningService.getBusinessKnowledge({
      organizationId: orgId,
      pageId,
      pageName: 'Ras Ali Labs',
    });

    return corsJsonResponse({
      success: true,
      knowledge,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to retrieve business knowledge' },
      { status: 500 },
      request
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const { pageId } = await params;
    const body = await request.json();
    const orgId = request.headers.get('x-organization-id') || 'default-org';
    const userId = request.headers.get('x-user-id') || 'default-user';

    const updated = await MariBusinessLearningService.updateBrandVoice({
      organizationId: orgId,
      pageId,
      userId,
      customTone: body.customTone,
      customKeywords: body.customKeywords,
    });

    return corsJsonResponse({
      success: true,
      knowledge: updated,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to update business knowledge' },
      { status: 500 },
      request
    );
  }
}

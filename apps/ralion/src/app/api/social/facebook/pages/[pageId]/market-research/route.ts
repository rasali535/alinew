import { NextRequest } from 'next/server';
import { MariCompetitiveIntelligenceService } from '@/lib/services/social/mariCompetitiveIntelligence.service';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';

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
    const userId = request.headers.get('x-user-id') || 'default-user';

    const report = MariCompetitiveIntelligenceService.getMarketResearchReport({
      pageId,
      organizationId: orgId,
    });

    await MariCompetitiveIntelligenceService.auditMarketResearchAccess({
      userId,
      pageId,
    });

    return corsJsonResponse({
      success: true,
      report,
    }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to generate market research report' },
      { status: 500 },
      request
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { MariCompetitiveIntelligenceService } from '@/lib/services/social/mariCompetitiveIntelligence.service';

export async function generateStaticParams() {
  return [{ pageId: '477334159265235' }, { pageId: 'default' }];
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

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to generate market research report' },
      { status: 500 }
    );
  }
}

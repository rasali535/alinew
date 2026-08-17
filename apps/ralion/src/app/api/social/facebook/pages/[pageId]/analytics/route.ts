import { NextRequest, NextResponse } from 'next/server';
import { FacebookPageManagementService } from '@/lib/services/social/facebookPageManagement.service';

export const dynamic = 'force-dynamic';

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
    const period = request.nextUrl.searchParams.get('period') || '30d';

    const analytics = await FacebookPageManagementService.getPageAnalytics({
      organizationId: orgId,
      pageId,
      period,
    });

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to retrieve Facebook analytics' },
      { status: 500 }
    );
  }
}

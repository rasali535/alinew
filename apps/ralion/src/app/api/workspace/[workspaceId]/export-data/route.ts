import { NextRequest, NextResponse } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { TrialAccessService } from '@/lib/services/trial/trialAccess.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const resolvedParams = await Promise.resolve(params);
    const targetWsId = resolvedParams.workspaceId;

    // Must be either workspace member/owner or platform admin
    if (!context.isPlatformAdmin && context.workspace.id !== targetWsId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to export data from this workspace.' },
        { status: 403 }
      );
    }

    const exportData = await TrialAccessService.exportTrialData(targetWsId);

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ralion-workspace-export-${targetWsId.slice(0, 8)}.json"`,
      },
    });
  } catch (err: any) {
    console.error('[ExportDataAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

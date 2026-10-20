import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '@/lib/auth/adminAuth';
import { TrialAccessService } from '@/lib/services/trial/trialAccess.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized: Platform administrator privilege required.' },
      { status: auth.statusCode || 403 }
    );
  }

  try {
    const body = await request.json();
    const { codeId, workspaceId, reason } = body;

    if (!codeId && !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Either codeId or workspaceId is required to revoke access.' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'A justification reason of at least 5 characters is required for the audit trail.' },
        { status: 400 }
      );
    }

    const result = await TrialAccessService.revokeTrial({
      codeId,
      workspaceId,
      adminUserId: auth.user!.id,
      adminEmail: auth.user!.email,
      reason: reason.trim(),
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[AdminTrialRevokeAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

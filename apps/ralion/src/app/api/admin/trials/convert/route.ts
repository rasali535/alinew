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
    const { organizationId, workspaceId, targetTier, notes } = body;

    if (!organizationId || !workspaceId) {
      return NextResponse.json(
        { success: false, error: 'Both organizationId and workspaceId are required for commercial conversion.' },
        { status: 400 }
      );
    }

    const tier = targetTier && ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE'].includes(targetTier)
      ? targetTier
      : 'STANDARD';

    const result = await TrialAccessService.convertTrialToPaid({
      organizationId,
      workspaceId,
      targetTier: tier,
      adminUserId: auth.user!.id,
      adminEmail: auth.user!.email,
      notes: notes || 'Commercial subscription conversion approved by platform administrator',
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[AdminTrialConvertAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

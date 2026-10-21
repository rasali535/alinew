import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '@/lib/auth/adminAuth';
import { TrialAccessService } from '@/lib/services/trial/trialAccess.service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized: Platform administrator privilege required.' },
      { status: auth.statusCode || 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      organizationId,
      workspaceId,
      eligibleProducts,
      durationDays,
      currency,
      workspaceMode,
      reason,
      notes,
    } = body;

    if (!organizationId || typeof organizationId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid organizationId is required.' },
        { status: 400 }
      );
    }

    if (!workspaceId || typeof workspaceId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid workspaceId is required.' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'A mandatory audit justification of at least 5 characters is required.' },
        { status: 400 }
      );
    }

    const result = await TrialAccessService.grantWorkspaceTrialDirectly({
      organizationId,
      workspaceId,
      eligibleProducts: Array.isArray(eligibleProducts) && eligibleProducts.length > 0 ? eligibleProducts : ['retail'],
      durationDays: parseInt(durationDays) || 14,
      currency: currency || 'USD',
      workspaceMode: workspaceMode === 'DEMO_DATA' ? 'DEMO_DATA' : 'CLEAN_WORKSPACE',
      reason: reason.trim(),
      notes: notes || undefined,
      adminUserId: auth.user.id,
      adminEmail: auth.user.email,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('[AdminTrialGrantAPI] Error:', err);
    const msg = err.message || 'Internal server error processing direct trial grant.';
    let status = 500;
    if (msg.includes('SAFEGUARD_BLOCKED')) {
      status = 409;
    } else if (
      msg.includes('CROSS_TENANT_REJECTED') ||
      msg.includes('INVALID_WORKSPACE') ||
      msg.includes('INVALID_ARGUMENT')
    ) {
      status = 400;
    } else if (msg.includes('PERSISTENCE_FAILED') || msg.includes('DATABASE_ERROR')) {
      status = 502;
    }

    return NextResponse.json(
      { success: false, error: msg },
      { status }
    );
  }
}

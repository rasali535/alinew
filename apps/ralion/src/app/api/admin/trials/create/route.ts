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
    const {
      eligibleProducts,
      durationDays,
      maxRedemptions,
      workspaceMode,
      restrictedEmail,
      restrictedOrganizationId,
      restrictedWorkspaceId,
      expiresAt,
      notes,
    } = body;

    if (!eligibleProducts || !Array.isArray(eligibleProducts) || eligibleProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one eligible product (retail or trade) must be selected.' },
        { status: 400 }
      );
    }

    const invalidProducts = eligibleProducts.filter(p => !['retail', 'trade'].includes(p));
    if (invalidProducts.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid product(s): ${invalidProducts.join(', ')}. Must be 'retail' or 'trade'.` },
        { status: 400 }
      );
    }

    const result = await TrialAccessService.createTrialCode({
      eligibleProducts,
      durationDays: parseInt(durationDays) || 14,
      maxRedemptions: parseInt(maxRedemptions) || 1,
      workspaceMode: workspaceMode === 'CLEAN_WORKSPACE' ? 'CLEAN_WORKSPACE' : 'DEMO_DATA',
      restrictedEmail: restrictedEmail ? String(restrictedEmail).trim() : undefined,
      restrictedOrganizationId,
      restrictedWorkspaceId,
      expiresAt,
      notes,
      createdByUserId: auth.user!.id,
      adminEmail: auth.user!.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Cryptographically secure demo access code generated successfully.',
      code: result,
    }, { status: 201 });
  } catch (err: any) {
    console.error('[AdminTrialCreateAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

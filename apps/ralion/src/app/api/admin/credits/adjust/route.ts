import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../lib/auth/adminAuth';
import { DurableTenantCreditsService } from '@ralion/ai/server';
import { PlatformAdminService } from '@ralion/auth/server';

export async function POST(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode || 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { organizationId, amount, reason } = body;

  if (!organizationId || typeof organizationId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'organizationId is required.' },
      { status: 400 }
    );
  }

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount === 0) {
    return NextResponse.json(
      { success: false, error: 'A non-zero integer amount is required for adjustment.' },
      { status: 400 }
    );
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return NextResponse.json(
      { success: false, error: 'An explicit administrative reason (min 5 chars) is mandatory for financial adjustments.' },
      { status: 400 }
    );
  }

  try {
    const correlationId = typeof body.correlationId === 'string' && body.correlationId.trim()
      ? body.correlationId.trim()
      : `admin-credit:${randomUUID()}`;
    const adjustment = await DurableTenantCreditsService.adjustCredits({
      organizationId,
      userId: auth.user!.id,
      amount,
      correlationId,
      reason: `${amount > 0 ? 'ADMIN_GRANT' : 'ADMIN_DEDUCT'}: ${reason.trim()} (by ${auth.user!.email})`,
      metadata: {
        adminEmail: auth.user!.email,
        requestedAmount: amount,
      },
    });
    const currentWallet = await DurableTenantCreditsService.getSummary(organizationId);

    PlatformAdminService.recordAuditLog({
      adminUserId: auth.user!.id,
      adminEmail: auth.user!.email,
      action: 'CREDIT_ADJUST',
      targetType: 'CREDIT',
      targetId: organizationId,
      result: 'SUCCESS',
      reason: reason.trim(),
      details: {
        requestedAdjustmentAmount: amount,
        appliedAdjustmentAmount: adjustment.amount,
        newBalance: currentWallet.remainingCredits,
        lifetimeConsumed: currentWallet.lifetimeCreditsConsumed || 0,
        transactionId: adjustment.transactionId,
        correlationId,
        idempotent: adjustment.idempotent,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        requestedAdjustmentAmount: amount,
        appliedAdjustmentAmount: adjustment.amount,
        newBalance: currentWallet.remainingCredits,
        wallet: currentWallet,
        transactionId: adjustment.transactionId,
        correlationId,
        idempotent: adjustment.idempotent,
      },
      message: `Successfully adjusted credits by ${adjustment.amount > 0 ? '+' : ''}${adjustment.amount} for ${organizationId}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

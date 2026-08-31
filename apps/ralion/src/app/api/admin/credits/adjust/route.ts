import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../lib/auth/adminAuth';
import { TenantCreditsService } from '@ralion/ai';
import { PlatformAdminService } from '@ralion/auth';

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

  if (typeof amount !== 'number' || amount === 0 || isNaN(amount)) {
    return NextResponse.json(
      { success: false, error: 'A non-zero numeric amount is required for adjustment.' },
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
    let txId = '';
    if (amount > 0) {
      const grantRes = TenantCreditsService.addCredits(
        organizationId,
        amount,
        `ADMIN_GRANT: ${reason.trim()} (by ${auth.user!.email})`
      );
      txId = grantRes.transactionId;
    } else {
      const deductRes = TenantCreditsService.deductCredits(
        organizationId,
        Math.abs(amount),
        `ADMIN_DEDUCT: ${reason.trim()} (by ${auth.user!.email})`
      );
      txId = deductRes.transactionId;
    }

    const currentWallet = TenantCreditsService.getOrCreateWallet(organizationId);

    // Record immutable admin audit log
    PlatformAdminService.recordAuditLog({
      adminUserId: auth.user!.id,
      adminEmail: auth.user!.email,
      action: 'CREDIT_ADJUST',
      targetType: 'CREDIT',
      targetId: organizationId,
      result: 'SUCCESS',
      reason: reason.trim(),
      details: {
        adjustmentAmount: amount,
        newBalance: currentWallet.balance,
        lifetimeConsumed: currentWallet.lifetimeConsumed,
        transactionId: txId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        adjustmentAmount: amount,
        newBalance: currentWallet.balance,
        wallet: currentWallet,
        transactionId: txId,
      },
      message: `Successfully adjusted credits by ${amount > 0 ? '+' : ''}${amount} for ${organizationId}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

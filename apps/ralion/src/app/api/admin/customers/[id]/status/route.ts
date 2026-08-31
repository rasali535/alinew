import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../../lib/auth/adminAuth';
import { PlatformAdminService } from '@ralion/auth';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode || 403 }
    );
  }

  const { id: organizationId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const { status, reason } = body;

  if (!status || !['ACTIVE', 'SUSPENDED'].includes(status)) {
    return NextResponse.json(
      { success: false, error: 'Valid status ("ACTIVE" or "SUSPENDED") is required.' },
      { status: 400 }
    );
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return NextResponse.json(
      { success: false, error: 'A detailed audit reason (min 5 characters) is mandatory.' },
      { status: 400 }
    );
  }

  try {
    const result = PlatformAdminService.setCustomerStatus({
      organizationId,
      status,
      reason: reason.trim(),
      adminUserId: auth.user!.id,
      adminEmail: auth.user!.email,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Tenant '${organizationId}' successfully marked as ${status}.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

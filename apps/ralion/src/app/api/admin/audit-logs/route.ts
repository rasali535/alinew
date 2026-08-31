import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../lib/auth/adminAuth';
import { PlatformAdminService } from '@ralion/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode || 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || undefined;
  const targetId = searchParams.get('targetId') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const logs = PlatformAdminService.getAuditLogs({
    action,
    targetId,
    limit,
  });

  return NextResponse.json({
    success: true,
    data: logs,
    total: logs.length,
  });
}

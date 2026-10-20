import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '@/lib/auth/adminAuth';
import { PreviewSessionService } from '@/lib/services/preview/previewSession.service';

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
    const { sessionId, reason } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid sessionId is required.' },
        { status: 400 }
      );
    }

    const justification = reason && typeof reason === 'string' && reason.trim().length >= 5
      ? reason.trim()
      : 'Session revoked by platform administrator';

    const result = await PreviewSessionService.revokePreviewSession(
      sessionId,
      auth.user.id,
      justification
    );

    const response = NextResponse.json({
      success: true,
      message: 'Preview session successfully revoked.',
      revokedId: result.revokedId,
    });

    // Clear preview session cookie
    response.cookies.delete('ralion_preview_session');

    return response;
  } catch (err: any) {
    console.error('[AdminPreviewRevokeAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

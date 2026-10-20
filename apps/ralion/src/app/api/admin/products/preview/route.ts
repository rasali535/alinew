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
    const { product, reason } = body;

    if (!product || !['retail', 'trade'].includes(product)) {
      return NextResponse.json(
        { success: false, error: "Product must be 'retail' or 'trade'." },
        { status: 400 }
      );
    }

    const justification = reason && typeof reason === 'string' && reason.trim().length >= 5
      ? reason.trim()
      : `Platform administrator operational inspection for Ralion ${product}`;

    const ipAddress = request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Create server-authorized preview session bound to this platform admin and dedicated preview workspace
    const sessionResult = await PreviewSessionService.createPreviewSession({
      adminUserId: auth.user.id,
      adminEmail: auth.user.email,
      product,
      reason: justification,
      ipAddress,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      product,
      sessionId: sessionResult.sessionId,
      sessionToken: sessionResult.sessionToken,
      previewWorkspaceId: sessionResult.workspaceId,
      previewUrl: sessionResult.previewUrl,
      expiresAt: sessionResult.expiresAt,
      message: `Audited preview session generated for Ralion ${product === 'retail' ? 'Retail' : 'Trade'}.`,
    });

    // Set secure HTTP-only cookie for session persistence across preview navigation
    response.cookies.set('ralion_preview_session', sessionResult.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 3600, // 1 hour
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (err: any) {
    console.error('[AdminProductsPreviewAPI] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

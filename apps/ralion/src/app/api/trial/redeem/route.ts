import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { TrialAccessService } from '@/lib/services/trial/trialAccess.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.trim().length < 6) {
      return corsJsonResponse(
        { success: false, error: 'A valid Ralion demo access code is required.' },
        { status: 400 },
        request
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const result = await TrialAccessService.redeemTrialCode({
      rawCode: code.trim(),
      userId: context.user.id,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      userEmail: context.user.email,
      ipAddress,
      userAgent,
    });

    // Determine redirect destination based on unlocked products
    const primaryProduct = result.eligible_products.includes('retail')
      ? '/ralion/retail'
      : '/industry/trade';

    return corsJsonResponse(
      {
        success: true,
        message: 'Demo access code successfully redeemed! Your product trial is now active.',
        redemption: result,
        redirectUrl: primaryProduct,
      },
      { status: 200 },
      request
    );
  } catch (err: any) {
    console.error('[TrialRedeemAPI] Redemption failed:', err);
    return corsJsonResponse(
      { success: false, error: err.message || 'Failed to redeem trial access code.' },
      { status: 400 },
      request
    );
  }
}

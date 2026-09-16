import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../../lib/cors';
import { requireRalionContext } from '../../../../../lib/auth/serverAuth';
import { PayPalCardVaultService } from '@ralion/integrations/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  const required = await requireRalionContext(request);
  if (required.response) return required.response;
  if (!['owner', 'admin'].includes(required.context.membership.role)) {
    return corsJsonResponse(
      { success: false, code: 'BILLING_ADMIN_REQUIRED', error: 'Only an organization owner or administrator can access billing checkout.' },
      { status: 403 },
      request
    );
  }

  try {
    return corsJsonResponse({
      success: true,
      clientId: PayPalCardVaultService.getClientId(),
      currency: 'USD',
      intent: 'capture',
    }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'PayPal card checkout is not configured.' },
      { status: 503 },
      request
    );
  }
}

import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { BillingDatabaseService } from '@ralion/database';
import { TenantCreditsService } from '@ralion/ai';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || request.headers.get('x-organization-id');

    if (!organizationId) {
      return corsJsonResponse(
        { success: false, error: 'organizationId is required' },
        { status: 400 },
        request
      );
    }

    const transactions = BillingDatabaseService.listTransactions(organizationId);
    const creditHistory = TenantCreditsService.getLedger(organizationId);

    return corsJsonResponse(
      {
        success: true,
        transactions,
        creditHistory,
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[Billing History API] Error:', err);
    return corsJsonResponse(
      { success: false, error: 'Internal server error fetching billing history' },
      { status: 500 },
      request
    );
  }
}

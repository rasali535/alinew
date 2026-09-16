import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { getServiceSupabase, requireRalionContext } from '../../../../lib/auth/serverAuth';
import { DurableBillingDatabaseService } from '@ralion/database/server';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const serverCtx = required.context;

    const organizationId = serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id;
    const requestedOrgId = new URL(request.url).searchParams.get('organizationId') || request.headers.get('x-organization-id');
    if (requestedOrgId && requestedOrgId !== organizationId && requestedOrgId !== serverCtx.workspace.id) {
      return corsJsonResponse(
        { success: false, code: 'TENANT_CONTEXT_MISMATCH', error: 'The requested billing history does not match the authenticated tenant.' },
        { status: 403 },
        request
      );
    }

    const transactions = await DurableBillingDatabaseService.listTransactions(organizationId);
    const supabase = getServiceSupabase();
    const { data: ledgerRows, error: ledgerError } = await supabase
      .from('tenant_credit_ledger')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (ledgerError) throw new Error(`Failed to load credit ledger: ${ledgerError.message}`);

    const creditHistory = (ledgerRows || []).map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id || undefined,
      amount: Number(row.amount || 0),
      balanceBefore: Number(row.balance_before || 0),
      balanceAfter: Number(row.balance_after || 0),
      planCreditsBefore: Number(row.plan_credits_before || 0),
      planCreditsAfter: Number(row.plan_credits_after || 0),
      bonusCreditsBefore: Number(row.bonus_credits_before || 0),
      bonusCreditsAfter: Number(row.bonus_credits_after || 0),
      type: row.type,
      sourceFeature: row.source_feature,
      provider: row.provider || undefined,
      model: row.model || undefined,
      correlationId: row.correlation_id || undefined,
      reason: row.reason || '',
      metadata: row.metadata || {},
      createdAt: row.created_at,
      timestamp: row.created_at,
    }));

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
      { success: false, error: 'Internal server error fetching billing history.' },
      { status: 500 },
      request
    );
  }
}

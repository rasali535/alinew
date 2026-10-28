import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_DISCREPANCY_ACCESS' }, { status: 403 }, request);
    }

    const { searchParams } = new URL(request.url);
    const transferId = searchParams.get('transferId') || undefined;

    const discrepancies = await RetailDatabaseService.listTransferDiscrepancies(context.workspace.id, transferId);

    return corsJsonResponse({ success: true, discrepancies }, undefined, request);
  } catch (err: any) {
    console.error('[DiscrepanciesAPI] GET Error:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

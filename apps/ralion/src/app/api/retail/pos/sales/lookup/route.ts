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

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || (!entitlement.canAccessPOS && !entitlement.canAccessSales)) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_SALE_LOOKUP' }, { status: 403 }, request);
    }

    const identifier = request.nextUrl.searchParams.get('identifier')?.trim();
    if (!identifier) {
      return corsJsonResponse({ success: false, error: 'Identifier (sale number or ID) is required.' }, { status: 400 }, request);
    }

    const sale = await RetailDatabaseService.getSaleByIdOrNumber(context.workspace.id, identifier);
    if (!sale) {
      return corsJsonResponse({ success: false, error: `Sale '${identifier}' not found in this workspace.` }, { status: 404 }, request);
    }

    return corsJsonResponse({ success: true, sale }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

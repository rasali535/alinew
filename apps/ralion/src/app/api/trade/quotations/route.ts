import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { TradeEntitlementService } from '@/lib/services/trade/tradeEntitlement.service';
import { TradeDatabaseService } from '@/lib/services/trade/tradeDatabase.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const scopeCheck = TradeEntitlementService.validateClientWorkspaceScope(request, context);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await TradeEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled) {
      return corsJsonResponse(
        { success: false, error: 'TRADE_MODULE_NOT_ENTITLED', message: entitlement.reason },
        { status: 403 },
        request
      );
    }

    const quotations = await TradeDatabaseService.getQuotations(context.workspace.id);
    return corsJsonResponse({ success: true, quotations }, undefined, request);
  } catch (err: any) {
    console.error('[TradeQuotesAPI] Error:', err);
    return corsJsonResponse({ success: false, error: err.message || 'Failed to load quotations' }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const body = await request.json();
    const scopeCheck = TradeEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const entitlement = await TradeEntitlementService.verifyEntitlement(context, 'SALES_REPRESENTATIVE');
    if (!entitlement.isEntitled) {
      return corsJsonResponse(
        { success: false, error: 'FORBIDDEN', message: entitlement.reason || 'Sales representative capability required.' },
        { status: 403 },
        request
      );
    }

    if (!body.buyer_name || typeof body.buyer_name !== 'string') {
      return corsJsonResponse({ success: false, error: 'Buyer name is required.' }, { status: 400 }, request);
    }

    const quote = await TradeDatabaseService.createQuotation(context.workspace.id, context.organization.id, body);
    return corsJsonResponse({ success: true, quotation: quote }, { status: 201 }, request);
  } catch (err: any) {
    console.error('[TradeQuotesAPI] Error:', err);
    return corsJsonResponse({ success: false, error: err.message || 'Failed to create quotation' }, { status: 500 }, request);
  }
}

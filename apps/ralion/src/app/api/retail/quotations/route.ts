import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { RetailQuotation, RetailQuoteItem } from '@ralion/database';

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
    if (!entitlement.isEntitled || !entitlement.canAccessQuotations) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_QUOTATIONS_ACCESS' }, { status: 403 }, request);
    }

    const quotations = await RetailDatabaseService.listQuotations(context.workspace.id);
    return corsJsonResponse({ success: true, quotations }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessQuotations) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_QUOTATIONS_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    if (!body.customerName || !Array.isArray(body.items) || body.items.length === 0) {
      return corsJsonResponse({ success: false, error: 'Customer name and at least one item are required.' }, { status: 400 }, request);
    }

    const quoteId = body.id || `quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const quoteNumber = body.quoteNumber || `Q-${Date.now().toString().slice(-6)}`;

    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const quoteItems: RetailQuoteItem[] = body.items.map((it: any) => {
      const lineSubtotal = Number(it.quantity) * Number(it.unitPrice);
      const lineDiscount = lineSubtotal * ((Number(it.discountRate) || 0) / 100);
      const taxable = lineSubtotal - lineDiscount;
      const lineTax = taxable * ((Number(it.taxRate) || 0) / 100);
      const lineTotal = taxable + lineTax;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;

      return {
        id: `qi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        quotationId: quoteId,
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        description: it.description || it.productName || 'Hardware Item',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        unitCost: Number(it.unitCost) || 0,
        discountRate: Number(it.discountRate) || 0,
        taxRate: Number(it.taxRate) || 0,
        lineTotal,
      };
    });

    const totalAmount = subtotal - discountTotal + taxTotal;

    const quotation: RetailQuotation = {
      id: quoteId,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      quoteNumber,
      customerId: body.customerId,
      customerName: body.customerName.trim(),
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      status: body.status || 'SENT',
      currency: 'USD',
      subtotal,
      taxTotal,
      discountTotal,
      totalAmount,
      validUntil: body.validUntil || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      notes: body.notes,
      createdBy: context.user.id,
      items: quoteItems,
      isPilotDemo: Boolean(body.isPilotDemo),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await RetailDatabaseService.createQuotation(quotation, quoteItems);
    return corsJsonResponse({ success: true, quotation: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

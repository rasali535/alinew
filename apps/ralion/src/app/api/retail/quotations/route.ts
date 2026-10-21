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

    if (!body || typeof body !== 'object') {
      return corsJsonResponse({ success: false, error: 'Invalid JSON request body.' }, { status: 400 }, request);
    }

    const customerName = (body.customerName || body.customer_name || '').trim();
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!customerName || rawItems.length === 0) {
      return corsJsonResponse({ success: false, error: 'Customer name and at least one item are required.' }, { status: 400 }, request);
    }

    const quoteId = body.id || `quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const quoteNumber = body.quoteNumber || body.quotation_number || `Q-${Date.now().toString().slice(-6)}`;

    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    const quoteItems: RetailQuoteItem[] = [];
    for (const it of rawItems) {
      const quantity = Number(it.quantity ?? 1);
      const unitPriceRaw = it.unitPrice !== undefined ? it.unitPrice : it.unit_price;

      if (
        unitPriceRaw === undefined ||
        unitPriceRaw === null ||
        typeof unitPriceRaw === 'boolean' ||
        isNaN(Number(unitPriceRaw)) ||
        !Number.isFinite(Number(unitPriceRaw)) ||
        Number(unitPriceRaw) < 0
      ) {
        return corsJsonResponse(
          { success: false, error: `Invalid unitPrice for item ${it.productName || it.product_name || it.productId || ''}: must be a valid non-negative number.` },
          { status: 400 },
          request
        );
      }

      const unitPrice = Number(unitPriceRaw);
      const unitCost = Number(it.unitCost ?? it.unit_cost ?? 0) || 0;
      const discountRate = Number(it.discountRate ?? it.discount_rate ?? it.discount_amount ?? 0) || 0;
      const taxRate = Number(it.taxRate ?? it.tax_rate ?? 0) || 0;

      const lineSubtotal = quantity * unitPrice;
      const lineDiscount = lineSubtotal * (discountRate / 100);
      const taxable = lineSubtotal - lineDiscount;
      const lineTax = taxable * (taxRate / 100);
      const lineTotal = taxable + lineTax;

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;

      quoteItems.push({
        id: `qi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        quotationId: quoteId,
        productId: it.productId || it.product_id,
        productName: it.productName || it.product_name || 'Hardware Item',
        sku: it.sku || 'SKU-ITEM',
        description: it.description || it.productName || it.product_name || 'Hardware Item',
        quantity,
        unitPrice,
        unitCost,
        discountRate,
        taxRate,
        lineTotal,
      });
    }

    const totalAmount = subtotal - discountTotal + taxTotal;

    const quotation: RetailQuotation = {
      id: quoteId,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      quoteNumber,
      customerId: body.customerId || body.customer_id,
      customerName,
      customerPhone: body.customerPhone || body.customer_phone,
      customerEmail: body.customerEmail || body.customer_email,
      status: body.status || 'SENT',
      currency: 'USD',
      subtotal,
      taxTotal,
      discountTotal,
      totalAmount,
      validUntil: body.validUntil || body.valid_until || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
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

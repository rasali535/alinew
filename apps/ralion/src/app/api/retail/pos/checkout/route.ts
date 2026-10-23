import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { requireRalionContext, getServiceSupabase } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { PosManagerApprovalService } from '@/lib/services/retail/posManagerApproval.service';
import { RetailCurrency } from '@ralion/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessPOS) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_POS_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json().catch(() => ({}));

    // Multi-tenant workspace scope validation
    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const { items, payments, customerName, customerId, shiftId, notes, isPilotDemo } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return corsJsonResponse({ success: false, error: 'Cart must contain at least one product.' }, { status: 400 }, request);
    }
    if (!Array.isArray(payments) || payments.length === 0) {
      return corsJsonResponse({ success: false, error: 'At least one payment method is required.' }, { status: 400 }, request);
    }

    // 1. Authoritative Currency Derivation
    const settings = await RetailDatabaseService.getSettings(context.workspace.id);
    const authoritativeCurrency: RetailCurrency = (
      settings?.defaultCurrency ||
      entitlement.defaultCurrency ||
      'USD'
    ).toUpperCase() as RetailCurrency;

    if (body.currency && body.currency.toUpperCase() !== authoritativeCurrency) {
      return corsJsonResponse(
        {
          success: false,
          code: 'CURRENCY_MISMATCH',
          error: `Currency mismatch: transaction currency (${body.currency}) does not match workspace operating currency (${authoritativeCurrency}).`,
        },
        { status: 400 },
        request
      );
    }

    // 2. Authoritative Server-Side Product Validation & Recalculation
    // The server recalculates selling prices, taxes, and costs exclusively from DB records.
    const productIds = Array.from(new Set(items.map((i: any) => String(i.productId)).filter(Boolean)));
    if (productIds.length === 0) {
      return corsJsonResponse({ success: false, error: 'All cart items must specify a productId.' }, { status: 400 }, request);
    }

    const db = getServiceSupabase();
    const { data: dbProducts, error: prodErr } = await db
      .from('retail_products')
      .select('id, name, sku, purchase_cost, selling_price, vat_rate, status')
      .eq('workspace_id', context.workspace.id)
      .in('id', productIds);

    if (prodErr || !dbProducts || dbProducts.length !== productIds.length) {
      return corsJsonResponse(
        {
          success: false,
          error: 'PRODUCT_LOOKUP_FAILED: One or more products do not exist in this workspace catalog.',
        },
        { status: 400 },
        request
      );
    }

    const prodMap = new Map<string, any>(dbProducts.map((p) => [p.id, p]));

    let calculatedSubtotal = 0;
    let calculatedDiscountTotal = 0;
    let calculatedTaxTotal = 0;

    const sanitizedItems = items.map((i: any) => {
      const prod = prodMap.get(String(i.productId));
      const quantity = Math.max(1, Number(i.quantity || 1));
      const discountRate = Math.max(0, Math.min(100, Number(i.discountRate || 0)));
      const unitPrice = Number(prod?.selling_price || 0);
      const taxRate = Number(prod?.vat_rate || 0);

      const lineSubtotal = quantity * unitPrice;
      const lineDiscount = lineSubtotal * (discountRate / 100);
      const taxable = lineSubtotal - lineDiscount;
      const lineTax = taxable * (taxRate / 100);

      calculatedSubtotal += lineSubtotal;
      calculatedDiscountTotal += lineDiscount;
      calculatedTaxTotal += lineTax;

      return {
        productId: String(i.productId),
        quantity,
        discountRate,
        productName: prod?.name || (i.productName ? String(i.productName) : undefined),
        sku: prod?.sku || (i.sku ? String(i.sku) : undefined),
      };
    });

    const calculatedGrandTotal = Math.round((calculatedSubtotal - calculatedDiscountTotal + calculatedTaxTotal) * 100) / 100;

    // 3. Untrusted Payment Amounts Validation
    // Tendered payment amount must cover the authoritative grand total
    const totalTendered = Math.round(payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) * 100) / 100;

    if (totalTendered < calculatedGrandTotal - 0.005) {
      return corsJsonResponse(
        {
          success: false,
          code: 'INSUFFICIENT_PAYMENT',
          error: `Payment tendered (${totalTendered} ${authoritativeCurrency}) is less than authoritative required total (${calculatedGrandTotal} ${authoritativeCurrency}).`,
        },
        { status: 400 },
        request
      );
    }

    // 4. Cart Hash for Action-Binding Verification
    const cartHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify(
          sanitizedItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            discountRate: i.discountRate,
          }))
        )
      )
      .digest('hex');

    // 5. Server-Side Discount Policy Enforcement
    // Discounts > 10% strictly require a server-verified, single-use, actor-bound Manager Approval Token
    const maxDiscount = Math.max(0, ...sanitizedItems.map((i) => i.discountRate));
    const managerApprovalToken = request.headers.get('x-manager-approval-token') || body.managerApprovalToken;

    if (maxDiscount > 10) {
      const isCallerManagerOrOwner =
        entitlement.effectiveRole === 'STORE_OWNER' ||
        entitlement.effectiveRole === 'RETAIL_MANAGER' ||
        entitlement.isPlatformAdmin;

      if (!isCallerManagerOrOwner) {
        if (!managerApprovalToken) {
          return corsJsonResponse(
            {
              success: false,
              code: 'MANAGER_APPROVAL_REQUIRED',
              error: `Discounts exceeding 10% (requested: ${maxDiscount}%) require server-verified Manager Approval.`,
            },
            { status: 403 },
            request
          );
        }

        const verifyResult = PosManagerApprovalService.verifyApprovalToken({
          token: managerApprovalToken,
          expectedWorkspaceId: context.workspace.id,
          expectedOrganizationId: context.organization.id,
          expectedCashierUserId: context.user.id,
          expectedAction: 'DISCOUNT_OVERRIDE',
          discountRate: maxDiscount,
          expectedActionPayloadHash: cartHash,
          consumeOnVerify: true, // Strict single-use consumption
        });

        if (!verifyResult.valid) {
          return corsJsonResponse(
            {
              success: false,
              code: 'MANAGER_APPROVAL_INVALID',
              error: verifyResult.error || 'Invalid, expired, or previously consumed manager approval token.',
            },
            { status: 403 },
            request
          );
        }
      }
    }

    // Idempotency key from header or body
    const idempotencyKey = request.headers.get('idempotency-key') || body.idempotencyKey || undefined;
    const saleNumber = body.saleNumber || `POS-${Date.now().toString().slice(-6)}`;

    const result = await RetailDatabaseService.executeAtomicSale({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      saleNumber,
      source: 'POS',
      customerId,
      customerName: customerName ? customerName.trim() : 'Walk-in Customer',
      cashierUserId: context.user.id,
      cashierName: context.profile.fullName || 'Cashier',
      shiftId,
      currency: authoritativeCurrency,
      items: sanitizedItems,
      payments,
      idempotencyKey,
      notes,
      isPilotDemo: Boolean(isPilotDemo),
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, sale: result.sale }, undefined, request);
  } catch (err: any) {
    console.error('[CheckoutRoute] Exception:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

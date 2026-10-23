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

    const { items, payments, customerName, customerId, shiftId, notes, isPilotDemo, terminalId } = body;

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

    // 2. Strict Payment Validation & Unverified External Tender Handling
    // Reject invalid/NaN/negative tender entries; avoid describing unverified card payments as paid
    const validPaymentMethods = ['CASH', 'CARD', 'CARD_EXTERNAL', 'BANK_TRANSFER'];
    let containsUnverifiedExternalTender = false;
    let totalTendered = 0;

    const validatedPayments: any[] = [];
    for (let idx = 0; idx < payments.length; idx++) {
      const p = payments[idx];
      const method = String(p.paymentMethod || '').toUpperCase();
      if (!validPaymentMethods.includes(method)) {
        return corsJsonResponse(
          {
            success: false,
            code: 'INVALID_PAYMENT_METHOD',
            error: `Payment method '${p.paymentMethod}' is not supported. Supported methods: ${validPaymentMethods.join(', ')}.`,
          },
          { status: 400 },
          request
        );
      }

      const amount = Number(p.amount);
      if (!Number.isFinite(amount) || amount <= 0 || isNaN(amount)) {
        return corsJsonResponse(
          {
            success: false,
            code: 'INVALID_PAYMENT_AMOUNT',
            error: `Payment entry #${idx + 1} amount must be a positive finite number (got ${p.amount}).`,
          },
          { status: 400 },
          request
        );
      }

      totalTendered += amount;

      const isExternalUnverified = method === 'CARD_EXTERNAL' || method === 'BANK_TRANSFER';
      if (isExternalUnverified) {
        containsUnverifiedExternalTender = true;
      }

      validatedPayments.push({
        paymentMethod: method,
        amount,
        reference: isExternalUnverified
          ? `[UNVERIFIED_EXTERNAL_SETTLEMENT: Pending Reconciliation] ${p.reference || ''}`.trim()
          : p.reference || null,
        isVerifiedSettlement: !isExternalUnverified,
      });
    }

    totalTendered = Math.round(totalTendered * 100) / 100;

    // 3. Authoritative Server-Side Product Validation & Pricing
    // Recalculates selling prices, taxes, and costs exclusively from DB records
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

    // Validate that tendered amount covers authoritative total
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

    // 5. Store Policy Discount Ceiling & Server-Side Approval Verification
    const maxDiscount = Math.max(0, ...sanitizedItems.map((i) => i.discountRate));
    const storeMaxDiscountCeiling = 50; // Store policy ceiling (50% max)

    // Enforce discount policy ceiling even for direct admin roles
    if (maxDiscount > storeMaxDiscountCeiling) {
      return corsJsonResponse(
        {
          success: false,
          code: 'EXCEEDS_STORE_MAX_DISCOUNT_POLICY',
          error: `Requested discount (${maxDiscount}%) exceeds store policy ceiling of ${storeMaxDiscountCeiling}%. Even administrators cannot apply discounts exceeding store policy.`,
        },
        { status: 403 },
        request
      );
    }

    const resolvedTerminalId = terminalId ? String(terminalId).trim() : 'DEFAULT_POS_TERMINAL';
    const managerApprovalToken = request.headers.get('x-manager-approval-token') || body.managerApprovalToken;
    let verifiedApprovalPayload: any = null;

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

        // Check if token was already consumed in shared database storage
        const isConsumed = await PosManagerApprovalService.isTokenConsumed(
          // Extract token JTI if string
          (() => {
            try {
              const [p] = managerApprovalToken.split('.');
              const dec = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
              return dec.id;
            } catch {
              return '';
            }
          })()
        );

        if (isConsumed) {
          return corsJsonResponse(
            {
              success: false,
              code: 'MANAGER_APPROVAL_INVALID',
              error: 'TOKEN_ALREADY_CONSUMED: Approval token has already been consumed in a completed sale.',
            },
            { status: 403 },
            request
          );
        }

        // Pre-flight verify token WITHOUT consuming to avoid burning approval on transient failures
        const verifyResult = PosManagerApprovalService.verifyApprovalToken({
          token: managerApprovalToken,
          expectedWorkspaceId: context.workspace.id,
          expectedOrganizationId: context.organization.id,
          expectedCashierUserId: context.user.id,
          expectedAction: 'DISCOUNT_OVERRIDE',
          expectedTerminalId: resolvedTerminalId,
          expectedActionPayloadHash: cartHash,
          discountRate: maxDiscount,
          consumeOnVerify: false, // Pre-flight check only; atomic consume occurs upon sale commit
        });

        if (!verifyResult.valid || !verifyResult.payload) {
          return corsJsonResponse(
            {
              success: false,
              code: 'MANAGER_APPROVAL_INVALID',
              error: verifyResult.error || 'Invalid or expired manager approval token.',
            },
            { status: 403 },
            request
          );
        }

        verifiedApprovalPayload = verifyResult.payload;
      }
    }

    // 6. Execute Atomic PostgreSQL Sale Transaction
    const idempotencyKey = request.headers.get('idempotency-key') || body.idempotencyKey || undefined;
    const saleNumber = body.saleNumber || `POS-${Date.now().toString().slice(-6)}`;

    // If external unverified tender is present, mark payment_status as PARTIAL (unconfirmed settlement)
    const authoritativePaymentStatus = containsUnverifiedExternalTender ? 'PARTIAL' : 'PAID';
    const auditNotes = [
      notes ? notes.trim() : null,
      containsUnverifiedExternalTender
        ? '[SETTLEMENT_NOTICE: Contains unverified external tender (CARD_EXTERNAL/BANK_TRANSFER) - pending manual reconciliation]'
        : null,
    ]
      .filter(Boolean)
      .join(' | ');

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
      payments: validatedPayments,
      idempotencyKey,
      notes: auditNotes || undefined,
      isPilotDemo: Boolean(isPilotDemo),
    });

    if (!result.success || !result.sale) {
      return corsJsonResponse({ success: false, error: result.error || 'Sale execution failed.' }, { status: 400 }, request);
    }

    // 7. Atomically Consume Approval Token Nonce in Shared DB Storage Upon Successful Sale
    if (verifiedApprovalPayload) {
      const consumeRes = await PosManagerApprovalService.consumeTokenDurable({
        tokenId: verifiedApprovalPayload.id,
        workspaceId: context.workspace.id,
        organizationId: context.organization.id,
        cashierUserId: context.user.id,
        action: verifiedApprovalPayload.action,
        actionPayloadHash: verifiedApprovalPayload.actionPayloadHash,
        terminalId: verifiedApprovalPayload.terminalId,
        saleId: result.sale.id,
        expiresAt: verifiedApprovalPayload.expiresAt,
      });

      if (!consumeRes.consumed) {
        console.error('[CheckoutRoute] Notice: Concurrent duplicate token consumption prevented:', consumeRes.error);
      }
    }

    return corsJsonResponse(
      {
        success: true,
        sale: {
          ...result.sale,
          paymentStatus: authoritativePaymentStatus,
          containsUnverifiedExternalTender,
        },
      },
      undefined,
      request
    );
  } catch (err: any) {
    console.error('[CheckoutRoute] Exception:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

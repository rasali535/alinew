import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { RetailExpense } from '@ralion/database';

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
    if (!entitlement.isEntitled || !entitlement.canAccessExpenses) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_EXPENSES_ACCESS' }, { status: 403 }, request);
    }

    const expenses = await RetailDatabaseService.listExpenses(context.workspace.id);
    return corsJsonResponse({ success: true, expenses }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessExpenses) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_EXPENSES_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();

    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    if (!body || typeof body !== 'object') {
      return corsJsonResponse({ success: false, error: 'Invalid JSON request body.' }, { status: 400 }, request);
    }

    const category = body.category ? String(body.category).trim() : '';
    const payee = body.payee ? String(body.payee).trim() : '';
    const amountRaw = body.amount;

    if (!category || !payee) {
      return corsJsonResponse({ success: false, error: 'Category and payee are required.' }, { status: 400 }, request);
    }

    if (
      amountRaw === undefined ||
      amountRaw === null ||
      amountRaw === '' ||
      typeof amountRaw === 'boolean' ||
      isNaN(Number(amountRaw)) ||
      !Number.isFinite(Number(amountRaw)) ||
      Number(amountRaw) <= 0
    ) {
      return corsJsonResponse(
        { success: false, error: 'Valid positive numeric amount is required for expense.' },
        { status: 400 },
        request
      );
    }

    const amount = Number(amountRaw);
    const taxAmount = Number(body.taxAmount ?? body.tax_amount ?? 0) || 0;
    const paymentMethod = body.paymentMethod || body.payment_method || 'BANK_TRANSFER';
    const expenseDate = body.expenseDate || body.expense_date || new Date().toISOString().slice(0, 10);
    const expenseNumber = body.expenseNumber || body.reference_number || body.expense_number || `EXP-${Date.now().toString().slice(-6)}`;

    const expense: RetailExpense = {
      id: body.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      expenseNumber,
      category: category as any,
      payee,
      amount,
      taxAmount,
      currency: 'USD',
      paymentMethod,
      expenseDate,
      status: body.status || 'APPROVED',
      approvedBy: context.user.id,
      receiptUrl: body.receiptUrl || body.receipt_url,
      notes: body.notes,
      isPilotDemo: Boolean(body.isPilotDemo || body.is_pilot_demo),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await RetailDatabaseService.recordExpense(expense);
    return corsJsonResponse({ success: true, expense: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

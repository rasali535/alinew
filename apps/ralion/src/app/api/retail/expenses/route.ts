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

    const entitlement = RetailEntitlementService.verifyEntitlement(context);
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

    const entitlement = RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessExpenses) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_EXPENSES_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();
    if (!body.category || !body.payee || body.amount === undefined) {
      return corsJsonResponse({ success: false, error: 'Category, payee, and amount are required.' }, { status: 400 }, request);
    }

    const expenseNumber = body.expenseNumber || `EXP-${Date.now().toString().slice(-6)}`;
    const expense: RetailExpense = {
      id: body.id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      expenseNumber,
      category: body.category,
      payee: body.payee.trim(),
      amount: Number(body.amount) || 0,
      taxAmount: Number(body.taxAmount) || 0,
      currency: 'USD',
      paymentMethod: body.paymentMethod || 'BANK_TRANSFER',
      expenseDate: body.expenseDate || new Date().toISOString().slice(0, 10),
      status: body.status || 'APPROVED',
      approvedBy: context.user.id,
      receiptUrl: body.receiptUrl,
      notes: body.notes,
      isPilotDemo: Boolean(body.isPilotDemo),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await RetailDatabaseService.recordExpense(expense);
    return corsJsonResponse({ success: true, expense: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

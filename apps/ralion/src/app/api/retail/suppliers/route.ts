import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { RetailSupplier } from '@ralion/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_PURCHASING_ACCESS' }, { status: 403 }, request);
    }

    const suppliers = await RetailDatabaseService.listSuppliers(context.workspace.id);
    return corsJsonResponse({ success: true, suppliers }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canAccessInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_PURCHASING_ACCESS' }, { status: 403 }, request);
    }

    const body = await request.json();
    if (!body.name) {
      return corsJsonResponse({ success: false, error: 'Supplier name is required.' }, { status: 400 }, request);
    }

    const supplier: RetailSupplier = {
      id: body.id || `sup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      name: body.name.trim(),
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      address: body.address,
      paymentTerms: body.paymentTerms || '30_DAYS',
      currency: 'USD',
      balanceOwed: Number(body.balanceOwed) || 0,
      notes: body.notes,
      isPilotDemo: Boolean(body.isPilotDemo),
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await RetailDatabaseService.upsertSupplier(supplier);
    return corsJsonResponse({ success: true, supplier: saved }, undefined, request);
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

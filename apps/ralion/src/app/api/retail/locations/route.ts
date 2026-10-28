import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDatabaseService } from '@/lib/services/retail/retailDatabase.service';
import { RetailLocationType } from '@ralion/database';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_RETAIL_ACCESS' }, { status: 403 }, request);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as RetailLocationType | null;

    const locations = await RetailDatabaseService.listLocations(context.workspace.id, type || undefined);

    return corsJsonResponse({ success: true, locations }, undefined, request);
  } catch (err: any) {
    console.error('[RetailLocationsAPI] GET Error:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canManageInventory) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_INVENTORY_MANAGEMENT' }, { status: 403 }, request);
    }

    const body = await request.json().catch(() => ({}));
    const scopeCheck = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scopeCheck.valid) {
      return corsJsonResponse({ success: false, error: scopeCheck.error }, { status: 403 }, request);
    }

    const { name, code, locationType, address, phone, email, isDefault } = body;

    if (!name || !code) {
      return corsJsonResponse({ success: false, error: 'Location name and code are required.' }, { status: 400 }, request);
    }

    const result = await RetailDatabaseService.createLocation({
      workspaceId: context.workspace.id,
      organizationId: context.organization.id,
      name,
      code,
      locationType: locationType === 'WAREHOUSE' ? 'WAREHOUSE' : 'RETAIL_BRANCH',
      address,
      phone,
      email,
      isDefault: Boolean(isDefault),
    });

    if (!result.success) {
      return corsJsonResponse({ success: false, error: result.error }, { status: 400 }, request);
    }

    return corsJsonResponse({ success: true, location: result.location }, { status: 201 }, request);
  } catch (err: any) {
    console.error('[RetailLocationsAPI] POST Error:', err);
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

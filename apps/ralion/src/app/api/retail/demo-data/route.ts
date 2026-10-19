import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { RetailEntitlementService } from '@/lib/services/retail/retailEntitlement.service';
import { RetailDemoDataService } from '@/lib/services/retail/retailDemoData.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function POST(request: NextRequest) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;

    const entitlement = RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled || !entitlement.canManageSettings) {
      return corsJsonResponse({ success: false, error: 'FORBIDDEN_DEMO_MANAGEMENT' }, { status: 403 }, request);
    }

    const result = await RetailDemoDataService.loadHardwareStoreDemoData(
      context.organization.id,
      context.workspace.id,
      context.user.id
    );

    return corsJsonResponse(
      {
        success: true,
        message: 'Hardware store pilot sample dataset loaded successfully in USD.',
        result,
      },
      undefined,
      request
    );
  } catch (err: any) {
    return corsJsonResponse({ success: false, error: err.message }, { status: 500 }, request);
  }
}

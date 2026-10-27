/**
 * Shared guard for the Retail catalogue / purchasing routes.
 *
 * Authorization is ALWAYS derived server-side from the authenticated session
 * and tenant entitlement. Request-supplied workspace/organization identifiers
 * are only cross-checked against the session, never trusted.
 *
 *   SEARCH     cashier / quotations / inventory roles (read-only, cost-free projection)
 *   INVENTORY  purchaser / manager / owner (catalogue, supplier, tax, packaging, purchasing edits)
 */
import { NextRequest } from 'next/server';
import { requireRalionContext } from '@/lib/auth/serverAuth';
import { corsJsonResponse } from '@/lib/cors';
import { RetailEntitlementService, RetailEntitlementCheck } from '@/lib/services/retail/retailEntitlement.service';
import { CatalogueError } from '@/lib/services/retail/retailCatalogue.service';

export type RetailAccessLevel = 'SEARCH' | 'INVENTORY';

export interface RetailRouteContext {
  context: NonNullable<Awaited<ReturnType<typeof requireRalionContext>>['context']>;
  entitlement: RetailEntitlementCheck;
  body: any;
  ctx: { organizationId: string; workspaceId: string };
}

export async function handleRetailRoute(
  request: NextRequest,
  level: RetailAccessLevel,
  fn: (rc: RetailRouteContext) => Promise<unknown>,
  options: { readBody?: boolean } = {}
) {
  try {
    const { context, response } = await requireRalionContext(request);
    if (response) return response;
    if (!context) return corsJsonResponse({ success: false, error: 'UNAUTHENTICATED' }, { status: 401 }, request);

    const entitlement = await RetailEntitlementService.verifyEntitlement(context);
    if (!entitlement.isEntitled) {
      return corsJsonResponse({ success: false, error: 'RETAIL_MODULE_NOT_ENTITLED' }, { status: 403 }, request);
    }
    const allowed =
      level === 'INVENTORY'
        ? entitlement.canAccessInventory
        : entitlement.canAccessPOS || entitlement.canAccessQuotations || entitlement.canAccessInventory;
    if (!allowed) {
      return corsJsonResponse({ success: false, error: level === 'INVENTORY' ? 'FORBIDDEN_INVENTORY_ACCESS' : 'FORBIDDEN_RETAIL_ACCESS' }, { status: 403 }, request);
    }

    let body: any = undefined;
    if (options.readBody) {
      body = await request.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return corsJsonResponse({ success: false, error: 'Invalid JSON request body.' }, { status: 400 }, request);
      }
    }
    const scope = RetailEntitlementService.validateClientWorkspaceScope(request, context, body);
    if (!scope.valid) {
      return corsJsonResponse({ success: false, error: scope.error }, { status: 403 }, request);
    }

    const result = await fn({
      context,
      entitlement,
      body,
      ctx: { organizationId: context.organization.id, workspaceId: context.workspace.id },
    });
    return corsJsonResponse({ success: true, ...(result as object) }, undefined, request);
  } catch (err: any) {
    if (err instanceof CatalogueError) {
      return corsJsonResponse({ success: false, code: err.code, error: err.message, details: err.details }, { status: err.status }, request);
    }
    console.error('[RetailRoute] Unexpected error:', err);
    return corsJsonResponse({ success: false, error: 'INTERNAL_ERROR' }, { status: 500 }, request);
  }
}

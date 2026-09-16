import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';
import { MariCompetitiveIntelligenceService } from '../../../../lib/services/mari/mariCompetitiveIntelligence.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function tenantFromContext(serverCtx: any) {
  return {
    organizationId: serverCtx.organization?.id || serverCtx.workspace.organization_id || serverCtx.workspace.id,
    workspaceId: serverCtx.workspace.id,
    userId: serverCtx.user.id,
  };
}

function publicError(error: any): { code: string; message: string; status: number } {
  const message = String(error?.message || 'Competitive intelligence request failed.');
  if (message.includes('COMPETITOR_NOT_FOUND')) return { code: 'COMPETITOR_NOT_FOUND', message: 'Competitor was not found in this tenant watchlist.', status: 404 };
  if (message.includes('COMPETITOR_PAUSED')) return { code: 'COMPETITOR_PAUSED', message: 'This competitor is paused.', status: 409 };
  if (message.includes('SCAN_THROTTLED')) return { code: 'SCAN_THROTTLED', message: 'This competitor was scanned recently. Try again after the 6-hour collection window.', status: 429 };
  if (message.includes('ROBOTS_DISALLOWED')) return { code: 'ROBOTS_DISALLOWED', message: 'The public website has asked this crawler not to access that path, so Mari did not collect it.', status: 403 };
  if (message.includes('ROBOTS_UNREACHABLE')) return { code: 'ROBOTS_UNREACHABLE', message: 'Mari could not safely verify the website crawling rules, so the scan was stopped.', status: 503 };
  if (message.includes('ACCESS_RESTRICTED')) return { code: 'ACCESS_RESTRICTED', message: 'The source requires or restricts access. Mari will not bypass it.', status: 403 };
  if (message.includes('PUBLIC_SOURCE_REJECTED')) return { code: 'PUBLIC_SOURCE_REJECTED', message: 'The supplied source is not eligible for public-source collection.', status: 400 };
  if (message.includes('PUBLIC_FETCH_FAILED') || message.includes('UNSUPPORTED_PUBLIC_CONTENT') || message.includes('PUBLIC_SOURCE_TOO_LARGE')) {
    return { code: 'PUBLIC_FETCH_FAILED', message: 'Mari could not collect usable public evidence from that source.', status: 422 };
  }
  return { code: 'COMPETITIVE_INTELLIGENCE_FAILED', message: 'Competitive intelligence could not complete that request.', status: 500 };
}

/**
 * GET /api/mari/competitive-intelligence
 * Tenant-scoped watchlist, recent public observations and latest briefing.
 */
export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const tenant = tenantFromContext(required.context);
    const snapshot = await MariCompetitiveIntelligenceService.getSnapshot(tenant);
    return corsJsonResponse({ success: true, data: snapshot }, undefined, request);
  } catch (error: any) {
    const safe = publicError(error);
    console.error('[Mari Competitive Intelligence API] GET failed:', error?.message || error);
    return corsJsonResponse({ success: false, code: safe.code, error: safe.message }, { status: safe.status }, request);
  }
}

/**
 * POST actions:
 * - ADD_COMPETITOR
 * - SCAN_COMPETITOR
 * - GENERATE_BRIEFING
 * - SCAN_DUE (used by authenticated lazy weekly refresh)
 */
export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const tenant = tenantFromContext(required.context);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim().toUpperCase();

    if (action === 'ADD_COMPETITOR') {
      const existing = await MariCompetitiveIntelligenceService.listWatchlist(tenant);
      const sameWebsite = existing.find((item) => item.websiteUrl === body.websiteUrl || item.websiteUrl.replace(/\/$/, '') === String(body.websiteUrl || '').replace(/\/$/, ''));
      if (!sameWebsite && existing.filter((item) => item.status === 'ACTIVE').length >= 5) {
        return corsJsonResponse({ success: false, code: 'WATCHLIST_LIMIT', error: 'Competitive Intelligence v1 supports up to 5 active competitors per tenant.' }, { status: 409 }, request);
      }

      const competitor = await MariCompetitiveIntelligenceService.upsertCompetitor({
        ...tenant,
        name: body.name,
        websiteUrl: body.websiteUrl,
        metaAdLibraryUrl: body.metaAdLibraryUrl,
        googleBusinessUrl: body.googleBusinessUrl,
        notes: body.notes,
        scanFrequency: body.scanFrequency === 'ON_DEMAND' ? 'ON_DEMAND' : 'WEEKLY',
      });
      return corsJsonResponse({ success: true, data: competitor }, undefined, request);
    }

    if (action === 'SCAN_COMPETITOR') {
      const result = await MariCompetitiveIntelligenceService.scanCompetitor({
        ...tenant,
        competitorId: body.competitorId,
      });
      return corsJsonResponse({ success: true, data: result }, undefined, request);
    }

    if (action === 'GENERATE_BRIEFING') {
      const briefing = await MariCompetitiveIntelligenceService.generateBriefing({
        ...tenant,
        days: Number(body.days) || 7,
      });
      return corsJsonResponse({ success: true, data: briefing }, undefined, request);
    }

    if (action === 'SCAN_DUE') {
      const scans = await MariCompetitiveIntelligenceService.scanDueCompetitors(tenant, 5);
      return corsJsonResponse({ success: true, data: { scans } }, undefined, request);
    }

    return corsJsonResponse({
      success: false,
      code: 'INVALID_ACTION',
      error: 'Supported actions: ADD_COMPETITOR, SCAN_COMPETITOR, GENERATE_BRIEFING, SCAN_DUE.',
    }, { status: 400 }, request);
  } catch (error: any) {
    const safe = publicError(error);
    console.error('[Mari Competitive Intelligence API] POST failed:', error?.message || error);
    return corsJsonResponse({ success: false, code: safe.code, error: safe.message }, { status: safe.status }, request);
  }
}

/**
 * DELETE /api/mari/competitive-intelligence?competitorId=<uuid>
 */
export async function DELETE(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const tenant = tenantFromContext(required.context);
    const competitorId = request.nextUrl.searchParams.get('competitorId') || '';
    await MariCompetitiveIntelligenceService.removeCompetitor({ ...tenant, competitorId });
    return corsJsonResponse({ success: true }, undefined, request);
  } catch (error: any) {
    const safe = publicError(error);
    console.error('[Mari Competitive Intelligence API] DELETE failed:', error?.message || error);
    return corsJsonResponse({ success: false, code: safe.code, error: safe.message }, { status: safe.status }, request);
  }
}

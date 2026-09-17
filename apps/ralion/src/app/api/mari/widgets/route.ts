import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';
import { MariWidgetService } from '../../../../lib/services/mari/mariWidget.service';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function canManage(role?: string): boolean {
  const normalized = String(role || '').toLowerCase();
  return normalized === 'owner' || normalized === 'admin';
}

function organizationIdFor(ctx: any): string {
  return ctx.organization?.id || ctx.workspace.organization_id || ctx.workspace.id;
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;

    if (!canManage(ctx.membership.role)) {
      return corsJsonResponse({ success: false, code: 'FORBIDDEN', error: 'Owner or admin access is required.' }, { status: 403 }, request);
    }

    const widgets = await MariWidgetService.list({
      organizationId: organizationIdFor(ctx),
      workspaceId: ctx.workspace.id,
    });

    return corsJsonResponse({ success: true, widgets }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, code: 'MARI_WIDGET_LIST_FAILED', error: error.message || 'Failed to list Mari widgets.' }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;

    if (!canManage(ctx.membership.role)) {
      return corsJsonResponse({ success: false, code: 'FORBIDDEN', error: 'Owner or admin access is required.' }, { status: 403 }, request);
    }

    const body = await request.json().catch(() => ({}));
    const widget = await MariWidgetService.create({
      organizationId: organizationIdFor(ctx),
      workspaceId: ctx.workspace.id,
      createdBy: ctx.user.id,
      name: body.name || 'Website assistant',
      allowedDomains: body.allowedDomains,
      assistantName: body.assistantName,
      welcomeMessage: body.welcomeMessage,
      accentColor: body.accentColor,
      position: body.position,
    });

    return corsJsonResponse({ success: true, widget }, { status: 201 }, request);
  } catch (error: any) {
    const code = error?.code || 'MARI_WIDGET_CREATE_FAILED';
    const status = code === 'MARI_WIDGET_LIMIT_REACHED' ? 409 : 400;
    return corsJsonResponse({ success: false, code, error: error.message || 'Failed to create Mari widget.' }, { status }, request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;

    if (!canManage(ctx.membership.role)) {
      return corsJsonResponse({ success: false, code: 'FORBIDDEN', error: 'Owner or admin access is required.' }, { status: 403 }, request);
    }

    const body = await request.json().catch(() => ({}));
    const widgetId = String(body.widgetId || '').trim();
    if (!widgetId) {
      return corsJsonResponse({ success: false, code: 'WIDGET_ID_REQUIRED', error: 'widgetId is required.' }, { status: 400 }, request);
    }

    const widget = await MariWidgetService.update({
      widgetId,
      organizationId: organizationIdFor(ctx),
      workspaceId: ctx.workspace.id,
      allowedDomains: body.allowedDomains,
      assistantName: body.assistantName,
      welcomeMessage: body.welcomeMessage,
      accentColor: body.accentColor,
      position: body.position,
      status: body.status,
    });

    return corsJsonResponse({ success: true, widget }, undefined, request);
  } catch (error: any) {
    const code = error?.code || 'MARI_WIDGET_UPDATE_FAILED';
    const status = code === 'MARI_WIDGET_NOT_FOUND' ? 404 : 400;
    return corsJsonResponse({ success: false, code, error: error.message || 'Failed to update Mari widget.' }, { status }, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;

    if (!canManage(ctx.membership.role)) {
      return corsJsonResponse({ success: false, code: 'FORBIDDEN', error: 'Owner or admin access is required.' }, { status: 403 }, request);
    }

    const widgetId = new URL(request.url).searchParams.get('widgetId');
    if (!widgetId) {
      return corsJsonResponse({ success: false, code: 'WIDGET_ID_REQUIRED', error: 'widgetId is required.' }, { status: 400 }, request);
    }

    await MariWidgetService.revoke({
      widgetId,
      organizationId: organizationIdFor(ctx),
      workspaceId: ctx.workspace.id,
    });

    return corsJsonResponse({ success: true, widgetId, status: 'REVOKED' }, undefined, request);
  } catch (error: any) {
    const code = error?.code || 'MARI_WIDGET_REVOKE_FAILED';
    const status = code === 'MARI_WIDGET_NOT_FOUND' ? 404 : 500;
    return corsJsonResponse({ success: false, code, error: error.message || 'Failed to revoke Mari widget.' }, { status }, request);
  }
}

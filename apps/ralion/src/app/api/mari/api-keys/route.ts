import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { requireRalionContext } from '../../../../lib/auth/serverAuth';
import { MariApiKeyService } from '../../../../lib/services/mari/mariApiKey.service';

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

    const keys = await MariApiKeyService.listKeys({
      organizationId: organizationIdFor(ctx),
      workspaceId: ctx.workspace.id,
    });

    return corsJsonResponse({ success: true, keys }, undefined, request);
  } catch (error: any) {
    return corsJsonResponse({ success: false, code: 'MARI_API_KEYS_LIST_FAILED', error: error.message || 'Failed to list Mari API keys.' }, { status: 500 }, request);
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
    const result = await MariApiKeyService.createKey({
      organizationId: organizationIdFor(ctx),
      workspaceId: ctx.workspace.id,
      createdBy: ctx.user.id,
      name: body.name || 'Mari Intelligence API',
      scopes: body.scopes,
      expiresAt: body.expiresAt || null,
    });

    return corsJsonResponse({
      success: true,
      apiKey: result.apiKey,
      key: result.record,
      warning: 'Copy this API key now. For security, the full secret will not be shown again.',
    }, { status: 201 }, request);
  } catch (error: any) {
    const code = error?.code || 'MARI_API_KEY_CREATE_FAILED';
    const status = code === 'MARI_API_KEY_LIMIT_REACHED' ? 409 : 400;
    return corsJsonResponse({ success: false, code, error: error.message || 'Failed to create Mari API key.' }, { status }, request);
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
    const keyId = String(body.keyId || '').trim();
    if (!keyId) {
      return corsJsonResponse({ success: false, code: 'KEY_ID_REQUIRED', error: 'keyId is required.' }, { status: 400 }, request);
    }

    const result = await MariApiKeyService.rotateKey({
      keyId,
      organizationId: organizationIdFor(ctx),
      workspaceId: ctx.workspace.id,
    });

    return corsJsonResponse({
      success: true,
      apiKey: result.apiKey,
      key: result.record,
      warning: 'The previous secret is now invalid. Copy this replacement API key now; it will not be shown again.',
    }, undefined, request);
  } catch (error: any) {
    const code = error?.code || 'MARI_API_KEY_ROTATE_FAILED';
    const status = code === 'MARI_API_KEY_NOT_FOUND' ? 404 : code === 'MARI_API_KEY_EXPIRED' ? 409 : 400;
    return corsJsonResponse({ success: false, code, error: error.message || 'Failed to rotate Mari API key.' }, { status }, request);
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

    const keyId = new URL(request.url).searchParams.get('keyId');
    if (!keyId) {
      return corsJsonResponse({ success: false, code: 'KEY_ID_REQUIRED', error: 'keyId is required.' }, { status: 400 }, request);
    }

    await MariApiKeyService.revokeKey({
      keyId,
      organizationId: organizationIdFor(ctx),
      workspaceId: ctx.workspace.id,
    });

    return corsJsonResponse({ success: true, keyId, status: 'REVOKED' }, undefined, request);
  } catch (error: any) {
    const code = error?.code || 'MARI_API_KEY_REVOKE_FAILED';
    const status = code === 'MARI_API_KEY_NOT_FOUND' ? 404 : 500;
    return corsJsonResponse({ success: false, code, error: error.message || 'Failed to revoke Mari API key.' }, { status }, request);
  }
}

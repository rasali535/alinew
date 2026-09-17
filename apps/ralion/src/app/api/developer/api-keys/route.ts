import { NextRequest, NextResponse } from 'next/server';
import { forbiddenResponse, requireRalionContext } from '@/lib/auth/serverAuth';
import {
  DeveloperApiKeysService,
  MARI_CHAT_SCOPE,
} from '@/lib/services/developerApiKeys.service';

export const dynamic = 'force-dynamic';

function canManageApiKeys(role: string): boolean {
  return role === 'owner' || role === 'admin';
}

export async function GET(request: NextRequest) {
  const auth = await requireRalionContext(request);
  if (auth.response) return auth.response;

  const { context } = auth;
  if (!canManageApiKeys(context.membership.role)) {
    return forbiddenResponse(request, 'Only workspace owners and admins can manage API keys.', 'API_KEY_MANAGEMENT_FORBIDDEN');
  }

  try {
    const apiKeys = await DeveloperApiKeysService.list(context.organization.id, context.workspace.id);
    return NextResponse.json({ success: true, apiKeys });
  } catch (error: any) {
    console.error('[DeveloperApiKeys] List failed:', error?.message || error);
    return NextResponse.json(
      { success: false, code: 'API_KEY_LIST_FAILED', message: 'Unable to load API keys.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRalionContext(request);
  if (auth.response) return auth.response;

  const { context } = auth;
  if (!canManageApiKeys(context.membership.role)) {
    return forbiddenResponse(request, 'Only workspace owners and admins can create API keys.', 'API_KEY_MANAGEMENT_FORBIDDEN');
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, code: 'INVALID_JSON', message: 'A valid JSON body is required.' },
      { status: 400 }
    );
  }

  const name = String(body?.name || '').trim();
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json(
      { success: false, code: 'INVALID_API_KEY_NAME', message: 'API key name must be between 2 and 80 characters.' },
      { status: 400 }
    );
  }

  let expiresAt: string | null = null;
  if (body?.expiresInDays !== undefined && body?.expiresInDays !== null && body?.expiresInDays !== '') {
    const expiresInDays = Number(body.expiresInDays);
    if (!Number.isFinite(expiresInDays) || expiresInDays < 1 || expiresInDays > 3650) {
      return NextResponse.json(
        { success: false, code: 'INVALID_EXPIRY', message: 'API key expiry must be between 1 and 3650 days.' },
        { status: 400 }
      );
    }
    expiresAt = new Date(Date.now() + Math.floor(expiresInDays) * 86_400_000).toISOString();
  }

  try {
    const existing = await DeveloperApiKeysService.list(context.organization.id, context.workspace.id);
    const activeCount = existing.filter((key) => key.status === 'active').length;
    if (activeCount >= 10) {
      return NextResponse.json(
        { success: false, code: 'API_KEY_LIMIT_REACHED', message: 'Revoke an existing key before creating another. Maximum 10 active keys per workspace.' },
        { status: 409 }
      );
    }

    const created = await DeveloperApiKeysService.create({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      createdBy: context.user.id,
      name,
      scopes: [MARI_CHAT_SCOPE],
      expiresAt,
      rateLimitPerMinute: 60,
    });

    return NextResponse.json(
      {
        success: true,
        apiKey: created.apiKey,
        secret: created.secret,
        warning: 'Copy this API key now. Ralion will not show the full secret again.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[DeveloperApiKeys] Create failed:', error?.message || error);
    return NextResponse.json(
      { success: false, code: 'API_KEY_CREATE_FAILED', message: 'Unable to create API key.' },
      { status: 500 }
    );
  }
}

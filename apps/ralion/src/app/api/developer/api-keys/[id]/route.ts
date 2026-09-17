import { NextRequest, NextResponse } from 'next/server';
import { forbiddenResponse, requireRalionContext } from '@/lib/auth/serverAuth';
import { DeveloperApiKeysService } from '@/lib/services/developerApiKeys.service';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRalionContext(request);
  if (auth.response) return auth.response;

  const { context } = auth;
  if (context.membership.role !== 'owner' && context.membership.role !== 'admin') {
    return forbiddenResponse(request, 'Only workspace owners and admins can revoke API keys.', 'API_KEY_MANAGEMENT_FORBIDDEN');
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, code: 'API_KEY_ID_REQUIRED', message: 'API key identifier is required.' },
      { status: 400 }
    );
  }

  try {
    const revoked = await DeveloperApiKeysService.revoke({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      apiKeyId: id,
    });

    if (!revoked) {
      return NextResponse.json(
        { success: false, code: 'API_KEY_NOT_FOUND', message: 'API key was not found or is already revoked.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, apiKey: revoked });
  } catch (error: any) {
    console.error('[DeveloperApiKeys] Revoke failed:', error?.message || error);
    return NextResponse.json(
      { success: false, code: 'API_KEY_REVOKE_FAILED', message: 'Unable to revoke API key.' },
      { status: 500 }
    );
  }
}

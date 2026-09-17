import { NextRequest, NextResponse } from 'next/server';
import { forbiddenResponse, requireRalionContext } from '@/lib/auth/serverAuth';
import { DeveloperApiKeysService } from '@/lib/services/developerApiKeys.service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRalionContext(request);
  if (auth.response) return auth.response;

  const { context } = auth;
  if (context.membership.role !== 'owner' && context.membership.role !== 'admin') {
    return forbiddenResponse(request, 'Only workspace owners and admins can rotate API keys.', 'API_KEY_MANAGEMENT_FORBIDDEN');
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, code: 'API_KEY_ID_REQUIRED', message: 'API key identifier is required.' },
      { status: 400 }
    );
  }

  try {
    const rotated = await DeveloperApiKeysService.rotate({
      organizationId: context.organization.id,
      workspaceId: context.workspace.id,
      apiKeyId: id,
      rotatedBy: context.user.id,
    });

    if (!rotated) {
      return NextResponse.json(
        { success: false, code: 'API_KEY_NOT_FOUND', message: 'API key was not found or has been revoked.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      apiKey: rotated.apiKey,
      secret: rotated.secret,
      warning: 'The previous secret is now invalid. Copy this replacement key now; Ralion will not show it again.',
    });
  } catch (error: any) {
    console.error('[DeveloperApiKeys] Rotation failed:', error?.message || error);
    return NextResponse.json(
      { success: false, code: 'API_KEY_ROTATION_FAILED', message: 'Unable to rotate API key.' },
      { status: 500 }
    );
  }
}

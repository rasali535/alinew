import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import {
  extractAuthToken,
  getCurrentRalionContext,
  getServiceSupabase,
} from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

export async function GET(request: NextRequest) {
  try {
    const token = extractAuthToken(request);
    if (!token) {
      return corsJsonResponse(
        {
          success: false,
          code: 'AUTH_TOKEN_MISSING',
          error: 'Authentication required',
          message: 'Bearer token is required.',
        },
        { status: 401 },
        request
      );
    }

    // Validate the authenticated user independently from workspace resolution.
    // This prevents a missing/misaligned workspace from masquerading as an
    // expired session and triggering pointless client refresh loops.
    const supabase = getServiceSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData?.user) {
      console.warn('[AuthContext API] Supabase session rejected');
      return corsJsonResponse(
        {
          success: false,
          code: 'AUTH_TOKEN_INVALID',
          error: 'Session is invalid or expired',
          message: 'Please sign in again.',
        },
        { status: 401 },
        request
      );
    }

    const ctx = await getCurrentRalionContext(request, { requireAuth: true });
    if (!ctx) {
      console.warn('[AuthContext API] Authenticated user has no verified workspace context', {
        userId: authData.user.id,
      });
      return corsJsonResponse(
        {
          success: false,
          code: 'WORKSPACE_CONTEXT_MISSING',
          authenticated: true,
          error: 'Workspace context unavailable',
          message: 'Your account is authenticated, but its organization workspace has not been resolved yet.',
        },
        { status: 409 },
        request
      );
    }

    return corsJsonResponse(
      {
        success: true,
        user: {
          id: ctx.user.id,
          email: ctx.user.email,
          fullName: ctx.profile.fullName,
          avatarUrl: ctx.profile.avatarUrl,
          role: ctx.membership.role,
        },
        workspace: {
          id: ctx.workspace.id,
          name: ctx.workspace.name,
          slug: ctx.workspace.slug,
          ownerId: ctx.workspace.owner_id,
          organizationId: ctx.workspace.organization_id,
        },
        organization: {
          id: ctx.organization.id,
          name: ctx.organization.name,
          tier: ctx.organization.tier,
        },
        membership: {
          id: ctx.membership.id,
          workspaceId: ctx.membership.workspace_id,
          userId: ctx.membership.user_id,
          role: ctx.membership.role,
        },
      },
      undefined,
      request
    );
  } catch (err) {
    console.error('[AuthContext API] Failed to resolve context');
    return corsJsonResponse(
      { success: false, code: 'INTERNAL_ERROR', error: 'Internal error', message: 'Failed to resolve auth context.' },
      { status: 500 },
      request
    );
  }
}

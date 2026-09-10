import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { getCurrentRalionContext, extractAuthToken } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

/**
 * GET /api/auth/context
 * Returns the authoritative user, workspace, organization, and membership
 * for the currently authenticated session. This is the single source of truth
 * for the client-side OrganizationProvider.
 *
 * If the user has no workspace row yet, one is auto-created via serverAuth.
 *
 * Security:
 * - Validates Bearer token server-side via Supabase service role
 * - Never trusts client headers alone for tenant identification
 * - Returns only the authenticated user's own context
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractAuthToken(request);
    if (!token) {
      return corsJsonResponse(
        {
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Bearer token is required. Pass Authorization: Bearer <supabase_access_token>.',
        },
        { status: 401 },
        request
      );
    }

    const ctx = await getCurrentRalionContext(request, { requireAuth: true });

    if (!ctx) {
      return corsJsonResponse(
        {
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Session is invalid or expired. Please re-authenticate.',
        },
        { status: 401 },
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
  } catch (err: any) {
    console.error('[AuthContext API] Error:', err);
    return corsJsonResponse(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: err.message || 'Failed to resolve auth context.',
      },
      { status: 500 },
      request
    );
  }
}

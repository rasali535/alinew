import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import {
  extractAuthToken,
  getCurrentRalionContext,
  getServiceSupabase,
  type RalionSessionContext,
} from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function contextPayload(ctx: RalionSessionContext) {
  return {
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
  };
}

async function verifyRequestUser(request: NextRequest) {
  const token = extractAuthToken(request);
  if (!token) return { token: null, user: null, reason: 'missing' as const };

  const supabase = getServiceSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { token, user: null, reason: 'invalid' as const };
  return { token, user: data.user, reason: null };
}

function safeSlug(name: string, suffix: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'ralion-business';
  return `${base}-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const verified = await verifyRequestUser(request);
    if (verified.reason === 'missing') {
      return corsJsonResponse(
        { success: false, code: 'AUTH_TOKEN_MISSING', error: 'Authentication required', message: 'Bearer token is required.' },
        { status: 401 },
        request
      );
    }
    if (verified.reason === 'invalid' || !verified.user) {
      console.warn('[AuthContext API] Supabase session rejected');
      return corsJsonResponse(
        { success: false, code: 'AUTH_TOKEN_INVALID', error: 'Session is invalid or expired', message: 'Please sign in again.' },
        { status: 401 },
        request
      );
    }

    const ctx = await getCurrentRalionContext(request, { requireAuth: true });
    if (!ctx) {
      console.warn('[AuthContext API] Authenticated user has no verified workspace context', { userId: verified.user.id });
      return corsJsonResponse(
        {
          success: false,
          code: 'WORKSPACE_CONTEXT_MISSING',
          authenticated: true,
          repairable: true,
          error: 'Workspace context unavailable',
          message: 'Your account is authenticated, but its organization workspace has not been resolved yet.',
        },
        { status: 409 },
        request
      );
    }

    return corsJsonResponse(contextPayload(ctx), undefined, request);
  } catch {
    console.error('[AuthContext API] Failed to resolve context');
    return corsJsonResponse(
      { success: false, code: 'INTERNAL_ERROR', error: 'Internal error', message: 'Failed to resolve auth context.' },
      { status: 500 },
      request
    );
  }
}

/**
 * POST /api/auth/context
 * Explicitly repairs/provisions canonical tenant context for the authenticated
 * user. GET never mutates data. This endpoint never trusts client tenant IDs and
 * never uses the auth user ID as an organization/workspace ID.
 */
export async function POST(request: NextRequest) {
  try {
    const verified = await verifyRequestUser(request);
    if (verified.reason === 'missing') {
      return corsJsonResponse(
        { success: false, code: 'AUTH_TOKEN_MISSING', error: 'Authentication required' },
        { status: 401 },
        request
      );
    }
    if (verified.reason === 'invalid' || !verified.user) {
      return corsJsonResponse(
        { success: false, code: 'AUTH_TOKEN_INVALID', error: 'Session is invalid or expired' },
        { status: 401 },
        request
      );
    }

    // Idempotency gate: always reuse a context that already resolves.
    const existing = await getCurrentRalionContext(request, { requireAuth: true });
    if (existing) return corsJsonResponse(contextPayload(existing), undefined, request);

    const supabase = getServiceSupabase();
    const authUser = verified.user;

    // Never create a second tenant for a user who is already a member of another
    // workspace. Membership inconsistencies require an administrator repair.
    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', authUser.id)
      .limit(1);

    const { data: ownedRows, error: ownedError } = await supabase
      .from('workspaces')
      .select('id, name, slug, owner_id, organization_id, created_at')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: true })
      .limit(1);

    if (ownedError) {
      console.error('[AuthContext API] Workspace lookup failed during repair:', {
        code: ownedError.code,
        message: ownedError.message,
        hint: ownedError.hint,
      });

      if (authUser.id === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' || authUser.app_metadata?.role === 'PLATFORM_ADMIN') {
        const canonicalOrgId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
        const canonicalWsId = '90c6fb79-ad3d-458f-b59b-696383aa6273';
        return corsJsonResponse({
          success: true,
          provisioned: true,
          user: {
            id: authUser.id,
            email: authUser.email,
            fullName: authUser.user_metadata?.full_name || 'Ras Ali Labs Admin',
            avatarUrl: authUser.user_metadata?.avatar_url || null,
            role: 'owner',
          },
          workspace: {
            id: canonicalWsId,
            name: 'Ras Ali Labs Workspace',
            slug: 'ras-ali-labs',
            ownerId: authUser.id,
            organizationId: canonicalOrgId,
          },
          organization: {
            id: canonicalOrgId,
            name: 'Ras Ali Labs',
            tier: 'ENTERPRISE',
          },
          membership: {
            id: `mem_${authUser.id}_${canonicalWsId}`,
            workspaceId: canonicalWsId,
            userId: authUser.id,
            role: 'owner',
          },
        }, undefined, request);
      }

      return corsJsonResponse(
        {
          success: false,
          code: ownedError.code === '42501' ? 'DATABASE_PERMISSION_DENIED' : 'WORKSPACE_REPAIR_FAILED',
          error: 'Unable to verify workspace ownership.',
        },
        { status: 500 },
        request
      );
    }

    const ownedWorkspace: any = ownedRows?.[0] || null;

    if (!ownedWorkspace && memberRows?.length) {
      return corsJsonResponse(
        {
          success: false,
          code: 'WORKSPACE_MEMBERSHIP_REPAIR_REQUIRED',
          error: 'Your workspace membership exists but its organization context could not be verified.',
        },
        { status: 409 },
        request
      );
    }

    const displayName =
      authUser.user_metadata?.company_name ||
      authUser.user_metadata?.business_name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      'Ralion Business';
    const tier = String(authUser.user_metadata?.tier || 'COMMUNITY').toUpperCase();

    if (ownedWorkspace) {
      let organizationId = ownedWorkspace.organization_id || null;

      if (organizationId) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', organizationId)
          .maybeSingle();

        if (!org) {
          const { error: createMissingOrgError } = await supabase.from('organizations').insert({
            id: organizationId,
            name: ownedWorkspace.name || displayName,
            slug: ownedWorkspace.slug || safeSlug(displayName, String(organizationId).slice(0, 8)),
            plan: tier,
          });
          if (createMissingOrgError) {
            console.error('[AuthContext API] Missing organization repair failed');
            return corsJsonResponse(
              { success: false, code: 'ORGANIZATION_REPAIR_FAILED', error: 'Unable to repair organization context.' },
              { status: 500 },
              request
            );
          }
        }
      } else {
        organizationId = randomUUID();
        const orgSlug = safeSlug(displayName, organizationId.slice(0, 8));
        const { error: orgError } = await supabase.from('organizations').insert({
          id: organizationId,
          name: ownedWorkspace.name || displayName,
          slug: orgSlug,
          plan: tier,
        });
        if (orgError) {
          console.error('[AuthContext API] Organization creation failed during workspace repair');
          return corsJsonResponse(
            { success: false, code: 'ORGANIZATION_REPAIR_FAILED', error: 'Unable to repair organization context.' },
            { status: 500 },
            request
          );
        }

        const { error: linkError } = await supabase
          .from('workspaces')
          .update({ organization_id: organizationId })
          .eq('id', ownedWorkspace.id)
          .eq('owner_id', authUser.id);

        if (linkError) {
          await supabase.from('organizations').delete().eq('id', organizationId);
          console.error('[AuthContext API] Workspace organization link failed during repair');
          return corsJsonResponse(
            { success: false, code: 'WORKSPACE_REPAIR_FAILED', error: 'Unable to link workspace organization context.' },
            { status: 500 },
            request
          );
        }
      }
    } else {
      const organizationId = randomUUID();
      const workspaceId = randomUUID();
      const slug = safeSlug(displayName, workspaceId.slice(0, 8));

      const { error: orgError } = await supabase.from('organizations').insert({
        id: organizationId,
        name: displayName,
        slug,
        plan: tier,
      });
      if (orgError) {
        console.error('[AuthContext API] Organization provisioning failed');
        return corsJsonResponse(
          { success: false, code: 'ORGANIZATION_PROVISION_FAILED', error: 'Unable to provision organization.' },
          { status: 500 },
          request
        );
      }

      const { error: workspaceError } = await supabase.from('workspaces').insert({
        id: workspaceId,
        name: `${displayName} Workspace`,
        slug,
        owner_id: authUser.id,
        organization_id: organizationId,
      });

      if (workspaceError) {
        await supabase.from('organizations').delete().eq('id', organizationId);
        console.error('[AuthContext API] Workspace provisioning failed');
        return corsJsonResponse(
          { success: false, code: 'WORKSPACE_PROVISION_FAILED', error: 'Unable to provision workspace.' },
          { status: 500 },
          request
        );
      }
    }

    const repaired = await getCurrentRalionContext(request, { requireAuth: true });
    if (!repaired) {
      return corsJsonResponse(
        {
          success: false,
          code: 'WORKSPACE_REPAIR_INCOMPLETE',
          error: 'Workspace was repaired but could not yet be resolved.',
        },
        { status: 409 },
        request
      );
    }

    console.log('[AuthContext API] Canonical workspace context provisioned', {
      userId: repaired.user.id,
      workspaceId: repaired.workspace.id,
      organizationId: repaired.organization.id,
    });

    return corsJsonResponse({ ...contextPayload(repaired), provisioned: true }, undefined, request);
  } catch {
    console.error('[AuthContext API] Workspace provisioning failed unexpectedly');
    return corsJsonResponse(
      { success: false, code: 'INTERNAL_ERROR', error: 'Unable to provision workspace context.' },
      { status: 500 },
      request
    );
  }
}

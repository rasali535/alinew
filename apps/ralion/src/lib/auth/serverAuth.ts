/**
 * Ralion OS — Authoritative Server-Side Auth & Workspace Context Resolver
 * Ras Ali Labs (Pty) Ltd
 *
 * Enforces strict multi-tenant isolation across all Ralion API routes.
 * Validates Supabase JWT, resolves user profile, checks workspace membership,
 * and ensures no tenant cross-leakage.
 */

import { NextRequest } from 'next/server';
import { createClient, User } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('[ServerAuth] Configuration error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  }
  return createClient(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

import { corsJsonResponse } from '../cors';

export interface RalionUserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface RalionWorkspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  organization_id?: string | null;
}

export interface RalionWorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface RalionSessionContext {
  user: {
    id: string;
    email: string;
    user_metadata?: any;
  };
  profile: RalionUserProfile;
  workspace: RalionWorkspace;
  membership: RalionWorkspaceMembership;
  organization: {
    id: string;
    name: string;
    tier?: string;
  };
}

export function authRequiredResponse(request: NextRequest) {
  return corsJsonResponse(
    {
      success: false,
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required',
    },
    { status: 401 },
    request
  );
}

export function forbiddenResponse(request: NextRequest, message = 'You do not have access to this resource') {
  return corsJsonResponse(
    {
      success: false,
      error: 'FORBIDDEN',
      message,
    },
    { status: 403 },
    request
  );
}

export function notFoundResponse(request: NextRequest, message = 'Resource not found') {
  return corsJsonResponse(
    {
      success: false,
      error: 'NOT_FOUND',
      message,
    },
    { status: 404 },
    request
  );
}

/**
 * Extract Bearer token from Request headers or cookies
 */
export function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // Cookie extraction (Supabase default cookie naming conventions)
  const cookieNames = [
    'sb-yidsfihagwttlmhfynmf-auth-token',
    'sb-access-token',
    'supabase-auth-token',
    'sb:token',
  ];

  for (const name of cookieNames) {
    const cookie = request.cookies.get(name);
    if (cookie?.value) {
      try {
        const parsed = JSON.parse(cookie.value);
        if (parsed.access_token) return parsed.access_token;
        if (Array.isArray(parsed) && parsed[0]) return parsed[0];
      } catch {
        return cookie.value;
      }
    }
  }

  return null;
}

/**
 * Authoritatively resolve the current user, profile, workspace, and membership for an API request.
 */
export async function getCurrentRalionContext(
  request: NextRequest,
  options: { requireAuth?: boolean } = { requireAuth: true }
): Promise<RalionSessionContext | null> {
  let supabase: ReturnType<typeof getServiceSupabase> | null = null;
  try {
    supabase = getServiceSupabase();
  } catch (e: any) {
    if (options.requireAuth) {
      throw e;
    }
    return null;
  }

  const token = extractAuthToken(request);
  const headerUserId = request.headers.get('x-user-id');
  const headerWorkspaceId = request.headers.get('x-workspace-id') || request.headers.get('x-organization-id');

  let authUser: User | null = null;

  // 1. Authoritative JWT Token Verification
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        authUser = data.user;
      } else if (error) {
        console.warn('[ServerAuth] JWT validation rejected:', error.message);
      }
    } catch (e: any) {
      console.warn('[ServerAuth] Token verification warning:', e.message);
    }
  }

  // If unauthenticated, return null (never trust client header spoofing)
  if (!authUser) {
    if (options.requireAuth) {
      return null;
    }
    return null;
  }

  // 3. Resolve or create profile
  let profile: RalionUserProfile = {
    id: authUser.id,
    fullName:
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email?.split('@')[0] ||
      'Ralion User',
    email: authUser.email || '',
    avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
  };

  try {
    const { data: dbProfile, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', authUser.id)
      .maybeSingle();

    if (dbProfile) {
      profile.fullName = dbProfile.full_name || profile.fullName;
      profile.email = dbProfile.email || profile.email;
      profile.avatarUrl = dbProfile.avatar_url || profile.avatarUrl;
    } else if (!pErr) {
      // Auto-insert profile on first lookup
      await supabase.from('profiles').insert({
        id: authUser.id,
        full_name: profile.fullName,
        email: profile.email,
        avatar_url: profile.avatarUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.warn('[ServerAuth] Profile query notice:', err.message);
  }

  // 4. Resolve Workspace from database (authoritative source)
  const workspaceName = `${profile.fullName}'s Workspace`;
  const companyName =
    authUser.user_metadata?.org_name?.trim() ||
    (authUser.email?.endsWith('@rasalilabs.com') ? 'Ras Ali Labs' : '') ||
    workspaceName;

  let dbWorkspace: any = null;
  let dbMembership: any = null;
  let dbOrganization: any = null;

  // 4a. Look up existing workspace owned by this user
  try {
    const { data: ownedWs } = await supabase
      .from('workspaces')
      .select('id, name, slug, owner_id, organization_id, created_at')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownedWs) {
      dbWorkspace = ownedWs;
    }
  } catch (err: any) {
    console.warn('[ServerAuth] Workspace lookup notice:', err.message);
  }

  // 4b. If no owned workspace, check membership in any workspace
  if (!dbWorkspace) {
    try {
      const { data: memberWs } = await supabase
        .from('workspace_members')
        .select('workspace_id, role, workspaces ( id, name, slug, owner_id, organization_id, created_at )')
        .eq('user_id', authUser.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (memberWs?.workspaces) {
        dbWorkspace = (memberWs as any).workspaces;
        dbMembership = { workspace_id: memberWs.workspace_id, role: memberWs.role };
      }
    } catch (err: any) {
      console.warn('[ServerAuth] Membership lookup notice:', err.message);
    }
  }

  // 4c. Auto-create workspace + membership if authenticated user has none
  if (!dbWorkspace) {
    try {
      const wsSlug = `ws-${authUser.id.slice(0, 8)}`;

      // Create organization first
      const { data: newOrg } = await supabase
        .from('organizations')
        .insert({
          name: companyName,
          slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || wsSlug,
          plan: authUser.user_metadata?.tier || 'PROFESSIONAL',
        })
        .select('id, name, slug, plan, created_at')
        .single();

      if (newOrg) {
        dbOrganization = newOrg;

        // Create workspace linked to the organization
        const { data: newWs } = await supabase
          .from('workspaces')
          .insert({
            organization_id: newOrg.id,
            name: companyName,
            slug: wsSlug,
            owner_id: authUser.id,
            industry: authUser.user_metadata?.industry || null,
          })
          .select('id, name, slug, owner_id, organization_id, created_at')
          .single();

        if (newWs) {
          dbWorkspace = newWs;

          // Create owner membership
          await supabase
            .from('workspace_members')
            .insert({
              workspace_id: newWs.id,
              user_id: authUser.id,
              role: 'OWNER',
            });

          console.log('[ServerAuth] Auto-provisioned workspace for new user:', {
            userId: authUser.id,
            workspaceId: newWs.id,
            organizationId: newOrg.id,
          });
        }
      }
    } catch (err: any) {
      console.warn('[ServerAuth] Auto-provision notice:', err.message);
    }
  }

  // 4d. Resolve the organization from the workspace's organization_id
  if (!dbOrganization && dbWorkspace?.organization_id) {
    try {
      const { data: orgRow } = await supabase
        .from('organizations')
        .select('id, name, slug, plan, created_at')
        .eq('id', dbWorkspace.organization_id)
        .maybeSingle();

      if (orgRow) {
        dbOrganization = orgRow;
      }
    } catch (err: any) {
      console.warn('[ServerAuth] Organization lookup notice:', err.message);
    }
  }

  // 4e. If a specific workspace ID was requested via header, verify membership
  let targetWorkspaceId = dbWorkspace?.id || authUser.id;

  if (headerWorkspaceId && headerWorkspaceId !== 'default-org' && headerWorkspaceId !== 'default' && headerWorkspaceId !== targetWorkspaceId) {
    try {
      const { data: member } = await supabase
        .from('workspace_members')
        .select('workspace_id, role')
        .eq('workspace_id', headerWorkspaceId)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (member) {
        targetWorkspaceId = headerWorkspaceId;
        // Re-fetch the target workspace details
        const { data: targetWs } = await supabase
          .from('workspaces')
          .select('id, name, slug, owner_id, organization_id, created_at')
          .eq('id', headerWorkspaceId)
          .maybeSingle();
        if (targetWs) {
          dbWorkspace = targetWs;
        }
      }
    } catch {
      // Keep the user's primary workspace
    }
  }

  // 4f. Resolve membership if not already resolved
  if (!dbMembership && dbWorkspace) {
    try {
      const { data: mem } = await supabase
        .from('workspace_members')
        .select('id, workspace_id, user_id, role')
        .eq('workspace_id', dbWorkspace.id)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (mem) {
        dbMembership = mem;
      }
    } catch {}
  }

  // Build canonical response objects
  const canonicalOrgId = dbOrganization?.id || dbWorkspace?.organization_id || targetWorkspaceId;

  const workspace: RalionWorkspace = {
    id: targetWorkspaceId,
    name: dbWorkspace?.name || companyName,
    slug: dbWorkspace?.slug || `ws-${authUser.id.slice(0, 8)}`,
    owner_id: dbWorkspace?.owner_id || authUser.id,
    organization_id: canonicalOrgId,
  };

  const membership: RalionWorkspaceMembership = {
    id: dbMembership?.id || `mem_${authUser.id.slice(0, 12)}`,
    workspace_id: targetWorkspaceId,
    user_id: authUser.id,
    role: (dbMembership?.role?.toLowerCase() as any) || 'owner',
  };

  console.log('[ServerAuth] Context verified:', {
    userId: authUser.id,
    userEmail: authUser.email ? authUser.email.replace(/(?<=.).(?=.*@)/g, '*') : 'hidden',
    workspaceId: workspace.id,
    organizationId: canonicalOrgId,
    companyName: dbOrganization?.name || companyName,
    role: membership.role,
    source: dbWorkspace ? 'DATABASE' : 'FALLBACK',
  });

  return {
    user: {
      id: authUser.id,
      email: authUser.email || '',
      user_metadata: authUser.user_metadata,
    },
    profile,
    workspace,
    membership,
    organization: {
      id: canonicalOrgId,
      name: dbOrganization?.name || companyName,
      tier: dbOrganization?.plan || authUser.user_metadata?.tier || 'STANDARD',
    },
  };
}

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
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('[ServerAuth] Configuration error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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
  const supabase = getServiceSupabase();
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

  // 4. Resolve Workspace
  // Default workspace ID is deterministic to the user ID if not explicitly specified
  const primaryWorkspaceId = authUser.id;
  let targetWorkspaceId = primaryWorkspaceId;

  if (headerWorkspaceId && headerWorkspaceId !== 'default-org' && headerWorkspaceId !== 'default') {
    // If a specific workspace ID is requested, verify the user owns or belongs to it
    if (headerWorkspaceId === authUser.id) {
      targetWorkspaceId = headerWorkspaceId;
    } else {
      // Check membership
      try {
        const { data: member } = await supabase
          .from('workspace_members')
          .select('workspace_id, role')
          .eq('workspace_id', headerWorkspaceId)
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (member) {
          targetWorkspaceId = headerWorkspaceId;
        } else {
          // Denied cross-tenant access, restrict back to user's primary workspace
          targetWorkspaceId = primaryWorkspaceId;
        }
      } catch {
        targetWorkspaceId = primaryWorkspaceId;
      }
    }
  }

  const workspaceName = `${profile.fullName}'s Workspace`;

  const companyName =
    authUser.user_metadata?.org_name?.trim() ||
    (authUser.email?.endsWith('@rasalilabs.com') ? 'Ras Ali Labs' : '') ||
    workspaceName;

  const orgId =
    authUser.user_metadata?.organizationId ||
    authUser.user_metadata?.organization_id ||
    (authUser.email?.endsWith('@rasalilabs.com') ? 'ras-ali-labs' : '') ||
    (authUser.user_metadata?.org_name ? authUser.user_metadata.org_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : '') ||
    targetWorkspaceId;

  const workspace: RalionWorkspace = {
    id: targetWorkspaceId,
    name: companyName,
    slug: `ws-${authUser.id.slice(0, 8)}`,
    owner_id: authUser.id,
    organization_id: orgId,
  };

  const membership: RalionWorkspaceMembership = {
    id: `mem_${authUser.id.slice(0, 12)}`,
    workspace_id: targetWorkspaceId,
    user_id: authUser.id,
    role: 'owner',
  };

  console.log('[ServerAuth] Context verified:', {
    userId: authUser.id,
    userEmail: authUser.email ? authUser.email.replace(/(?<=.).(?=.*@)/g, '*') : 'hidden',
    workspaceId: workspace.id,
    organizationId: orgId,
    companyName,
    role: membership.role,
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
      id: orgId,
      name: companyName,
      tier: authUser.user_metadata?.tier || 'STANDARD',
    },
  };
}

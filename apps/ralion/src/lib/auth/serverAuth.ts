/**
 * Ralion OS — Authoritative Server-Side Auth & Workspace Context Resolver
 * Ras Ali Labs (Pty) Ltd
 *
 * Validates Supabase JWTs and derives tenant context from authenticated
 * ownership or workspace membership. Client tenant headers are requests only;
 * they never grant access by themselves.
 */

import { NextRequest } from 'next/server';
import { createClient, User } from '@supabase/supabase-js';
import { corsJsonResponse } from '../cors';

function requireSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('[ServerAuth] SUPABASE_URL is required.');
  return url;
}

export function getServiceSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('[ServerAuth] SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  }

  return createClient(requireSupabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function canonicalUuid(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

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
    { success: false, error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' },
    { status: 401 },
    request
  );
}

export function forbiddenResponse(request: NextRequest, message = 'You do not have access to this resource') {
  return corsJsonResponse(
    { success: false, error: 'FORBIDDEN', message },
    { status: 403 },
    request
  );
}

export function notFoundResponse(request: NextRequest, message = 'Resource not found') {
  return corsJsonResponse(
    { success: false, error: 'NOT_FOUND', message },
    { status: 404 },
    request
  );
}

export function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7).trim();

  const cookieNames = [
    'sb-yidsfihagwttlmhfynmf-auth-token',
    'sb-access-token',
    'supabase-auth-token',
    'sb:token',
  ];

  for (const name of cookieNames) {
    const cookie = request.cookies.get(name);
    if (!cookie?.value) continue;
    try {
      const parsed = JSON.parse(cookie.value);
      if (parsed.access_token) return parsed.access_token;
      if (Array.isArray(parsed) && parsed[0]) return parsed[0];
    } catch {
      return cookie.value;
    }
  }

  return null;
}

export async function getCurrentRalionContext(
  request: NextRequest,
  options: { requireAuth?: boolean } = { requireAuth: true }
): Promise<RalionSessionContext | null> {
  let supabase: ReturnType<typeof getServiceSupabase>;
  try {
    supabase = getServiceSupabase();
  } catch (error) {
    if (options.requireAuth) throw error;
    return null;
  }

  const token = extractAuthToken(request);
  if (!token) return null;

  let authUser: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) authUser = data.user;
  } catch {
    return null;
  }
  if (!authUser) return null;

  let profile: RalionUserProfile = {
    id: authUser.id,
    fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Ralion User',
    email: authUser.email || '',
    avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
  };

  try {
    const { data: dbProfile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', authUser.id)
      .maybeSingle();

    if (dbProfile) {
      profile = {
        id: authUser.id,
        fullName: dbProfile.full_name || profile.fullName,
        email: dbProfile.email || profile.email,
        avatarUrl: dbProfile.avatar_url || profile.avatarUrl,
      };
    } else if (!error) {
      await supabase.from('profiles').insert({
        id: authUser.id,
        full_name: profile.fullName,
        email: profile.email,
        avatar_url: profile.avatarUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  } catch {
    // Profile enrichment is optional; authenticated identity remains authoritative.
  }

  const requestedRaw = request.headers.get('x-workspace-id') || request.headers.get('x-organization-id');
  const requestedWorkspaceId = requestedRaw ? canonicalUuid(requestedRaw) : null;

  // Invalid non-empty tenant headers fail closed rather than falling back to another tenant.
  if (requestedRaw && !requestedWorkspaceId) return null;

  let targetWorkspaceId = requestedWorkspaceId || authUser.id;
  let membershipRole: RalionWorkspaceMembership['role'] = 'owner';
  let membershipId = `owner_${authUser.id}`;

  if (targetWorkspaceId !== authUser.id) {
    const { data: member, error } = await supabase
      .from('workspace_members')
      .select('id, workspace_id, user_id, role')
      .eq('workspace_id', targetWorkspaceId)
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (error || !member) return null;
    membershipRole = ['owner', 'admin', 'member', 'viewer'].includes(member.role) ? member.role : 'viewer';
    membershipId = member.id || `mem_${authUser.id}_${targetWorkspaceId}`;
  }

  let workspaceRow: any = null;
  try {
    const { data } = await supabase
      .from('workspaces')
      .select('id, name, slug, owner_id, organization_id')
      .eq('id', targetWorkspaceId)
      .maybeSingle();
    workspaceRow = data || null;
  } catch {
    workspaceRow = null;
  }

  // If a persisted workspace exists and the user is not its owner, membership must already have been verified.
  if (workspaceRow?.owner_id === authUser.id) membershipRole = 'owner';

  const workspaceName = workspaceRow?.name || authUser.user_metadata?.org_name?.trim() || `${profile.fullName}'s Workspace`;
  const organizationId = canonicalUuid(workspaceRow?.organization_id) || targetWorkspaceId;

  const workspace: RalionWorkspace = {
    id: targetWorkspaceId,
    name: workspaceName,
    slug: workspaceRow?.slug || `ws-${targetWorkspaceId.slice(0, 8)}`,
    owner_id: workspaceRow?.owner_id || authUser.id,
    organization_id: organizationId,
  };

  const membership: RalionWorkspaceMembership = {
    id: membershipId,
    workspace_id: targetWorkspaceId,
    user_id: authUser.id,
    role: membershipRole,
  };

  console.log('[ServerAuth] Context verified:', {
    userId: authUser.id,
    workspaceId: targetWorkspaceId,
    organizationId,
    role: membershipRole,
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
      id: organizationId,
      name: workspaceName,
      tier: authUser.user_metadata?.tier || 'STANDARD',
    },
  };
}

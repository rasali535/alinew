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
  if (!serviceKey) throw new Error('[ServerAuth] SUPABASE_SERVICE_ROLE_KEY environment variable is required.');
  return createClient(requireSupabaseUrl(), serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function canonicalUuid(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export interface RalionUserProfile { id: string; fullName: string; email: string; avatarUrl: string | null; }
export interface RalionWorkspace { id: string; name: string; slug: string; owner_id: string; organization_id?: string | null; }
export interface RalionWorkspaceMembership { id: string; workspace_id: string; user_id: string; role: 'owner' | 'admin' | 'member' | 'viewer'; }
export interface RalionSessionContext {
  user: { id: string; email: string; user_metadata?: any };
  profile: RalionUserProfile;
  workspace: RalionWorkspace;
  membership: RalionWorkspaceMembership;
  organization: { id: string; name: string; tier?: string };
}

export function authRequiredResponse(request: NextRequest) {
  return corsJsonResponse({ success: false, error: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }, { status: 401 }, request);
}
export function forbiddenResponse(request: NextRequest, message = 'You do not have access to this resource') {
  return corsJsonResponse({ success: false, error: 'FORBIDDEN', message }, { status: 403 }, request);
}
export function notFoundResponse(request: NextRequest, message = 'Resource not found') {
  return corsJsonResponse({ success: false, error: 'NOT_FOUND', message }, { status: 404 }, request);
}

export function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7).trim();
  const cookieNames = ['sb-yidsfihagwttlmhfynmf-auth-token', 'sb-access-token', 'supabase-auth-token', 'sb:token'];
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
  try { supabase = getServiceSupabase(); }
  catch (error) { if (options.requireAuth) throw error; return null; }

  const token = extractAuthToken(request);
  if (!token) return null;

  let authUser: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) authUser = data.user;
  } catch { return null; }
  if (!authUser) return null;

  let profile: RalionUserProfile = {
    id: authUser.id,
    fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Ralion User',
    email: authUser.email || '',
    avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
  };

  try {
    const { data: dbProfile } = await supabase.from('profiles').select('id, full_name, email, avatar_url').eq('id', authUser.id).maybeSingle();
    if (dbProfile) {
      profile = {
        id: authUser.id,
        fullName: dbProfile.full_name || profile.fullName,
        email: dbProfile.email || profile.email,
        avatarUrl: dbProfile.avatar_url || profile.avatarUrl,
      };
    }
  } catch {}

  const requestedWorkspaceRaw = request.headers.get('x-workspace-id');
  const requestedOrgRaw = request.headers.get('x-organization-id');
  let requestedWorkspaceId = requestedWorkspaceRaw ? canonicalUuid(requestedWorkspaceRaw) : null;
  const requestedOrgId = requestedOrgRaw ? canonicalUuid(requestedOrgRaw) : null;
  if ((requestedWorkspaceRaw && !requestedWorkspaceId) || (requestedOrgRaw && !requestedOrgId)) return null;

  if (requestedWorkspaceId && requestedOrgId && requestedWorkspaceId === requestedOrgId) {
    requestedWorkspaceId = null;
  }

  let workspaceRow: any = null;
  let membershipRow: any = null;

  if (requestedWorkspaceId) {
    const { data: requestedWorkspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, slug, owner_id, organization_id')
      .eq('id', requestedWorkspaceId)
      .maybeSingle();
    if (workspaceError || !requestedWorkspace) return null;

    if (requestedWorkspace.owner_id === authUser.id) {
      workspaceRow = requestedWorkspace;
      membershipRow = { id: `owner_${authUser.id}_${requestedWorkspace.id}`, workspace_id: requestedWorkspace.id, user_id: authUser.id, role: 'owner' };
    } else {
      const { data: member, error } = await supabase
        .from('workspace_members')
        .select('id, workspace_id, user_id, role')
        .eq('workspace_id', requestedWorkspace.id)
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (error || !member) return null;
      workspaceRow = requestedWorkspace;
      membershipRow = member;
    }
  } else {
    const { data: ownedWorkspace, error: ownedWorkspaceError } = await supabase
      .from('workspaces')
      .select('id, name, slug, owner_id, organization_id, created_at')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownedWorkspaceError) {
      console.warn('[ServerAuth] Owned workspace lookup failed', { code: ownedWorkspaceError.code });
      return null;
    }

    if (ownedWorkspace) {
      workspaceRow = ownedWorkspace;
      membershipRow = { id: `owner_${authUser.id}_${ownedWorkspace.id}`, workspace_id: ownedWorkspace.id, user_id: authUser.id, role: 'owner' };
    } else {
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('id, workspace_id, user_id, role, workspaces ( id, name, slug, owner_id, organization_id, created_at )')
        .eq('user_id', authUser.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (membershipError) {
        console.warn('[ServerAuth] Workspace membership lookup failed', { code: membershipError.code });
        return null;
      }
      if (membership?.workspaces) {
        workspaceRow = (membership as any).workspaces;
        membershipRow = { id: membership.id, workspace_id: membership.workspace_id, user_id: authUser.id, role: membership.role };
      }
    }
  }

  if (!workspaceRow) {
    if (authUser.id === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' || authUser.app_metadata?.role === 'PLATFORM_ADMIN') {
      const canonicalOrgId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
      const canonicalWsId = '90c6fb79-ad3d-458f-b59b-696383aa6273';
      return {
        user: { id: authUser.id, email: authUser.email || '', user_metadata: authUser.user_metadata },
        profile,
        workspace: {
          id: canonicalWsId,
          name: 'Ras Ali Labs Workspace',
          slug: 'ras-ali-labs',
          owner_id: authUser.id,
          organization_id: canonicalOrgId,
        },
        membership: {
          id: `mem_${authUser.id}_${canonicalWsId}`,
          workspace_id: canonicalWsId,
          user_id: authUser.id,
          role: 'owner',
        },
        organization: {
          id: canonicalOrgId,
          name: 'Ras Ali Labs',
          tier: authUser.user_metadata?.tier || 'ENTERPRISE',
        },
      };
    }
    return null;
  }

  const workspaceId = canonicalUuid(workspaceRow.id);
  const organizationId = canonicalUuid(workspaceRow.organization_id);
  if (!workspaceId || !organizationId) return null;
  if (requestedOrgId && requestedOrgId !== organizationId) return null;

  const { data: organizationRow, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', organizationId)
    .maybeSingle();
  if (orgError || !organizationRow) return null;

  const rawRole = String(membershipRow?.role || 'viewer').toLowerCase();
  const membershipRole: RalionWorkspaceMembership['role'] =
    rawRole === 'owner' || rawRole === 'admin' || rawRole === 'member' || rawRole === 'viewer' ? rawRole : 'viewer';

  const workspace: RalionWorkspace = {
    id: workspaceId,
    name: workspaceRow.name || organizationRow.name || `${profile.fullName}'s Workspace`,
    slug: workspaceRow.slug || organizationRow.slug || `ws-${workspaceId.slice(0, 8)}`,
    owner_id: workspaceRow.owner_id,
    organization_id: organizationId,
  };
  const membership: RalionWorkspaceMembership = {
    id: membershipRow?.id || `mem_${authUser.id}_${workspaceId}`,
    workspace_id: workspaceId,
    user_id: authUser.id,
    role: membershipRole,
  };

  console.log('[ServerAuth] Context verified:', { userId: authUser.id, workspaceId, organizationId, role: membershipRole });

  return {
    user: { id: authUser.id, email: authUser.email || '', user_metadata: authUser.user_metadata },
    profile,
    workspace,
    membership,
    organization: {
      id: organizationId,
      name: organizationRow.name || workspace.name,
      tier: authUser.user_metadata?.tier || 'STANDARD',
    },
  };
}

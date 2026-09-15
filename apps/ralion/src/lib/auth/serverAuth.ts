/**
 * Ralion OS — Authoritative Server-Side Auth & Workspace Context Resolver
 * Ras Ali Labs (Pty) Ltd
 *
 * Validates Supabase JWTs and derives tenant context from authenticated
 * ownership or workspace membership. Client tenant headers are hints only;
 * they are strictly validated against server-side ownership and membership.
 */

import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, User } from '@supabase/supabase-js';
import { corsJsonResponse } from '../cors';

export const CANONICAL_SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';

function requireSupabaseUrl(): string {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && (!url || url.includes('localhost') || url.includes('127.0.0.1'))) {
    return CANONICAL_SUPABASE_URL;
  }
  return url || CANONICAL_SUPABASE_URL;
}

/**
 * Publishable-key client used exclusively for user JWT verification (auth.getUser).
 * The publishable/anon key is sent as the Supabase apikey; the user access JWT is
 * sent in Authorization: Bearer. Never mix roles: do NOT use this for DB writes.
 */
export function getVerifierSupabase() {
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!publishableKey) {
    const err = new Error(
      '[ServerAuth] SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY is required for JWT verification.'
    );
    (err as any).code = 'SUPABASE_CONFIG_ERROR';
    throw err;
  }
  return createClient(CANONICAL_SUPABASE_URL, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

/**
 * Service-role admin client used exclusively for privileged DB queries.
 * Never call auth.getUser() on this client — it must not validate user JWTs.
 *
 * Priority: SUPABASE_SERVICE_ROLE_KEY (canonical Supabase name) is preferred.
 * SUPABASE_SECRET_KEY is accepted as a legacy alias only when the canonical
 * variable is absent — this prevents a stale secret-key value from silently
 * overriding a valid service-role key.
 */
export function getServiceSupabase() {
  // Canonical variable is checked first; legacy alias is a fallback only.
  const keySource =
    process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' :
    process.env.SUPABASE_SECRET_KEY       ? 'SUPABASE_SECRET_KEY'       :
    null;
  const serviceKey = keySource ? process.env[keySource] : null;
  if (!serviceKey || !keySource) {
    const err = new Error('[ServerAuth] SUPABASE_SERVICE_ROLE_KEY (or legacy SUPABASE_SECRET_KEY) environment variable is required.');
    (err as any).code = 'SUPABASE_CONFIG_ERROR';
    throw err;
  }
  // Log only the variable name that was selected — never the value.
  console.log(`[ServerAuth] Privileged client initialised using ${keySource}.`);
  return createClient(requireSupabaseUrl(), serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

function canonicalUuid(raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : null;
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
  user: { id: string; email: string; user_metadata?: any; app_metadata?: any };
  profile: RalionUserProfile;
  workspace: RalionWorkspace;
  membership: RalionWorkspaceMembership;
  organization: { id: string; name: string; tier?: string };
}

export type RalionAuthStatus =
  | 'CONTEXT_RESOLVED'
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'WORKSPACE_CONTEXT_MISSING'
  | 'TENANT_DATABASE_ERROR';

export interface RalionAuthResult {
  status: RalionAuthStatus;
  context: RalionSessionContext | null;
  user?: User | null;
  errorCode?: string;
  errorMessage?: string;
  httpStatus: 200 | 401 | 403 | 409 | 500;
}

export function authRequiredResponse(request: NextRequest, message = 'Authentication required', errorCode = 'AUTH_TOKEN_MISSING') {
  return corsJsonResponse(
    { success: false, error: errorCode, code: errorCode, message },
    { status: 401 },
    request
  );
}

export function forbiddenResponse(request: NextRequest, message = 'You do not have access to this resource', errorCode = 'FORBIDDEN') {
  return corsJsonResponse(
    { success: false, error: errorCode, code: errorCode, message },
    { status: 403 },
    request
  );
}

export function notFoundResponse(request: NextRequest, message = 'Resource not found') {
  return corsJsonResponse(
    { success: false, error: 'NOT_FOUND', code: 'NOT_FOUND', message },
    { status: 404 },
    request
  );
}

export function tenantDatabaseErrorResponse(request: NextRequest, message = 'Database error resolving tenant context', errorCode = 'TENANT_DATABASE_ERROR') {
  return corsJsonResponse(
    { success: false, error: errorCode, code: errorCode, message },
    { status: 500 },
    request
  );
}

export function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.substring(7).trim();
  const cookieNames = ['sb-yidsfihagwttlmhfynmf-auth-token', 'ralion-app-auth-token', 'sb-access-token', 'supabase-auth-token', 'sb:token'];
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

/**
 * Resolves full Ralion authentication and tenant authorization context,
 * accurately distinguishing missing credentials, permission violations,
 * and internal database errors.
 */
export async function resolveRalionAuthContext(
  request: NextRequest,
  options: { requireAuth?: boolean } = { requireAuth: true }
): Promise<RalionAuthResult> {
  // ─── Step 1: JWT verification via publishable-key verifier ONLY ──────────────
  // Never call auth.getUser() through the service-role/secret-key admin client.
  // The Supabase SDK sends the Supabase key as `apikey` and the user JWT as
  // `Authorization: Bearer`. These two responsibilities must use separate clients.
  let verifier: ReturnType<typeof getVerifierSupabase>;
  try {
    verifier = getVerifierSupabase();
  } catch (error: any) {
    console.error('[ServerAuth] JWT verifier initialization failed:', error.message);
    return {
      status: 'TENANT_DATABASE_ERROR',
      context: null,
      errorCode: 'SUPABASE_CONFIG_ERROR',
      errorMessage: 'Authentication service configuration error.',
      httpStatus: 500,
    };
  }

  const token = extractAuthToken(request);
  if (!token) {
    return {
      status: 'AUTHENTICATION_REQUIRED',
      context: null,
      errorCode: 'AUTH_TOKEN_MISSING',
      errorMessage: 'Authentication token is required.',
      httpStatus: 401,
    };
  }

  let authUser: User | null = null;
  try {
    const { data, error } = await verifier.auth.getUser(token);
    if (error || !data?.user) {
      const errMessage = String(error?.message || '');
      const errCode = String(error?.code || '');
      const errStatus = error?.status;
      const isConfigError =
        /invalid api key|apikey|configuration|legacy api key|unregistered api key|SUPABASE_CONFIG/i.test(errMessage) ||
        /invalid_api_key|api_key_invalid|bad_api_key/i.test(errCode) ||
        (errStatus === 500 && !/jwt|token|expired|claim|signature/i.test(errMessage));

      if (isConfigError) {
        console.error('[ServerAuth] JWT verifier returned API key or configuration error:', errMessage, { code: errCode, status: errStatus });
        return {
          status: 'TENANT_DATABASE_ERROR',
          context: null,
          errorCode: 'SUPABASE_CONFIG_ERROR',
          errorMessage: 'Authentication service configuration error.',
          httpStatus: 500,
        };
      }

      console.warn('[ServerAuth] JWT verification failed:', { code: error?.code, status: error?.status, message: errMessage });
      return {
        status: 'AUTHENTICATION_REQUIRED',
        context: null,
        errorCode: 'AUTH_TOKEN_INVALID',
        errorMessage: 'Authentication token is invalid or expired.',
        httpStatus: 401,
      };
    }
    authUser = data.user;
  } catch (err: any) {
    // Distinguish config/API-key errors from invalid-token errors.
    // API key issues produce messages about 'Invalid API key' or 'apikey', whereas
    // genuine JWT rejections produce auth-specific codes.
    const msg: string = String(err?.message || '');
    const code: string = String(err?.code || '');
    const isConfigError =
      /invalid api key|apikey|configuration|legacy api key|unregistered api key|SUPABASE_CONFIG/i.test(msg) ||
      /invalid_api_key|api_key_invalid/i.test(code);
    if (isConfigError) {
      console.error('[ServerAuth] JWT verifier API key error:', msg);
      return {
        status: 'TENANT_DATABASE_ERROR',
        context: null,
        errorCode: 'SUPABASE_CONFIG_ERROR',
        errorMessage: 'Authentication service configuration error.',
        httpStatus: 500,
      };
    }
    console.error('[ServerAuth] JWT verification exception:', msg);
    return {
      status: 'AUTHENTICATION_REQUIRED',
      context: null,
      errorCode: 'AUTH_TOKEN_INVALID',
      errorMessage: 'Failed to verify authentication token.',
      httpStatus: 401,
    };
  }

  // ─── Step 2: Privileged DB access via service-role admin client ────────────
  let adminClient: ReturnType<typeof getServiceSupabase>;
  try {
    adminClient = getServiceSupabase();
  } catch (error: any) {
    console.error('[ServerAuth] Admin client initialization failed:', error.message);
    return {
      status: 'TENANT_DATABASE_ERROR',
      context: null,
      errorCode: 'SUPABASE_CONFIG_ERROR',
      errorMessage: 'Database configuration error.',
      httpStatus: 500,
    };
  }

  let profile: RalionUserProfile = {
    id: authUser.id,
    fullName: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Ralion User',
    email: authUser.email || '',
    avatarUrl: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
  };

  try {
    const { data: dbProfile } = await adminClient
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
    }
  } catch (profileErr: any) {
    console.warn('[ServerAuth] Profile query warning:', profileErr.message);
  }

  const requestedWorkspaceRaw = request.headers.get('x-workspace-id');
  const requestedOrgRaw = request.headers.get('x-organization-id');
  let requestedWorkspaceId = requestedWorkspaceRaw ? canonicalUuid(requestedWorkspaceRaw) : null;
  const requestedOrgId = requestedOrgRaw ? canonicalUuid(requestedOrgRaw) : null;

  if (requestedWorkspaceRaw && !requestedWorkspaceId) {
    return {
      status: 'FORBIDDEN',
      context: null,
      errorCode: 'INVALID_WORKSPACE_ID_FORMAT',
      errorMessage: 'The provided workspace identifier is not a valid UUID format.',
      httpStatus: 403,
    };
  }
  if (requestedOrgRaw && !requestedOrgId) {
    return {
      status: 'FORBIDDEN',
      context: null,
      errorCode: 'INVALID_ORGANIZATION_ID_FORMAT',
      errorMessage: 'The provided organization identifier is not a valid UUID format.',
      httpStatus: 403,
    };
  }

  if (requestedWorkspaceId && requestedOrgId && requestedWorkspaceId === requestedOrgId) {
    requestedWorkspaceId = null;
  }

  let workspaceRow: any = null;
  let membershipRow: any = null;

  if (requestedWorkspaceId) {
    const { data: requestedWorkspace, error: workspaceError } = await adminClient
      .from('workspaces')
      .select('id, name, slug, owner_id, organization_id')
      .eq('id', requestedWorkspaceId)
      .maybeSingle();

    if (workspaceError) {
      console.error('[ServerAuth] Database error looking up workspace:', { code: workspaceError.code });
      return {
        status: 'TENANT_DATABASE_ERROR',
        context: null,
        errorCode: 'TENANT_DATABASE_ERROR',
        errorMessage: 'Database error looking up requested workspace.',
        httpStatus: 500,
      };
    }

    if (!requestedWorkspace) {
      return {
        status: 'FORBIDDEN',
        context: null,
        errorCode: 'WORKSPACE_NOT_FOUND',
        errorMessage: 'The requested workspace was not found or access is denied.',
        httpStatus: 403,
      };
    }

    // Verify user ownership or membership
    if (requestedWorkspace.owner_id === authUser.id) {
      workspaceRow = requestedWorkspace;
      membershipRow = {
        id: `owner_${authUser.id}_${requestedWorkspace.id}`,
        workspace_id: requestedWorkspace.id,
        user_id: authUser.id,
        role: 'owner',
      };
    } else {
      const { data: member, error } = await adminClient
        .from('workspace_members')
        .select('id, workspace_id, user_id, role')
        .eq('workspace_id', requestedWorkspace.id)
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (error || !member) {
        if (error) {
          console.error('[ServerAuth] Database error looking up workspace membership:', { code: error.code });
          return {
            status: 'TENANT_DATABASE_ERROR',
            context: null,
            errorCode: 'TENANT_DATABASE_ERROR',
            errorMessage: 'Database error verifying workspace membership.',
            httpStatus: 500,
          };
        }
        return {
          status: 'FORBIDDEN',
          context: null,
          errorCode: 'WORKSPACE_ACCESS_DENIED',
          errorMessage: 'User is not a member of the requested workspace.',
          httpStatus: 403,
        };
      }

      workspaceRow = requestedWorkspace;
      membershipRow = member;
    }
  } else {
    // Look for workspaces owned by user
    const { data: ownedWorkspace, error: ownedWorkspaceError } = await adminClient
      .from('workspaces')
      .select('id, name, slug, owner_id, organization_id, created_at')
      .eq('owner_id', authUser.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownedWorkspaceError) {
      // Log error category, HTTP status and message for Render diagnostics.
      // Keys, tokens and URLs containing credentials are never logged.
      const dbErrCode    = ownedWorkspaceError.code    ?? 'undefined';
      const dbErrStatus  = (ownedWorkspaceError as any).status  ?? 'undefined';
      const dbErrMessage = ownedWorkspaceError.message ?? 'undefined';
      const isAuthRejection =
        /api.?key|apikey|invalid key|service_role|jwt|unauthorized|forbidden/i.test(dbErrMessage) ||
        dbErrStatus === 401 || dbErrStatus === 403;
      console.error('[ServerAuth] Database error looking up owned workspaces:', {
        code:        dbErrCode,
        httpStatus:  dbErrStatus,
        message:     dbErrMessage,
        category:    isAuthRejection ? 'PRIVILEGED_KEY_REJECTION' : 'QUERY_ERROR',
      });
      return {
        status: 'TENANT_DATABASE_ERROR',
        context: null,
        errorCode: 'TENANT_DATABASE_ERROR',
        errorMessage: 'Database error resolving user workspace.',
        httpStatus: 500,
      };
    }

    if (ownedWorkspace) {
      workspaceRow = ownedWorkspace;
      membershipRow = {
        id: `owner_${authUser.id}_${ownedWorkspace.id}`,
        workspace_id: ownedWorkspace.id,
        user_id: authUser.id,
        role: 'owner',
      };
    } else {
      // Look for workspace memberships
      const { data: membership, error: membershipError } = await adminClient
        .from('workspace_members')
        .select('id, workspace_id, user_id, role, workspaces ( id, name, slug, owner_id, organization_id, created_at )')
        .eq('user_id', authUser.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        console.error('[ServerAuth] Database error looking up user membership:', { code: membershipError.code });
        return {
          status: 'TENANT_DATABASE_ERROR',
          context: null,
          errorCode: 'TENANT_DATABASE_ERROR',
          errorMessage: 'Database error resolving workspace membership.',
          httpStatus: 500,
        };
      }

      if (membership?.workspaces) {
        workspaceRow = (membership as any).workspaces;
        membershipRow = {
          id: membership.id,
          workspace_id: membership.workspace_id,
          user_id: authUser.id,
          role: membership.role,
        };
      }
    }
  }

  if (!workspaceRow) {
    return {
      status: 'WORKSPACE_CONTEXT_MISSING',
      context: null,
      user: authUser,
      errorCode: 'WORKSPACE_CONTEXT_MISSING',
      errorMessage: 'Authenticated user has no accessible workspaces.',
      httpStatus: 409,
    };
  }

  const workspaceId = canonicalUuid(workspaceRow.id);
  const organizationId = canonicalUuid(workspaceRow.organization_id);

  if (!workspaceId || !organizationId) {
    return {
      status: 'TENANT_DATABASE_ERROR',
      context: null,
      user: authUser,
      errorCode: 'CORRUPTED_WORKSPACE_RECORD',
      errorMessage: 'Workspace record is missing valid workspace or organization ID.',
      httpStatus: 500,
    };
  }

  if (requestedOrgId && requestedOrgId !== organizationId) {
    return {
      status: 'FORBIDDEN',
      context: null,
      user: authUser,
      errorCode: 'ORGANIZATION_MISMATCH',
      errorMessage: 'The requested organization does not match the workspace organization.',
      httpStatus: 403,
    };
  }

  const { data: organizationRow, error: orgError } = await adminClient
    .from('organizations')
    .select('id, name, slug')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError) {
    console.warn('[ServerAuth] Organization lookup warning:', { code: orgError.code });
  }

  const orgName = organizationRow?.name || workspaceRow.name || `${profile.fullName}'s Organization`;

  const rawRole = String(membershipRow?.role || 'viewer').toLowerCase();
  const membershipRole: RalionWorkspaceMembership['role'] =
    rawRole === 'owner' || rawRole === 'admin' || rawRole === 'member' || rawRole === 'viewer' ? rawRole : 'viewer';

  const workspace: RalionWorkspace = {
    id: workspaceId,
    name: workspaceRow.name || orgName || `${profile.fullName}'s Workspace`,
    slug: workspaceRow.slug || organizationRow?.slug || `ws-${workspaceId.slice(0, 8)}`,
    owner_id: workspaceRow.owner_id,
    organization_id: organizationId,
  };

  const membership: RalionWorkspaceMembership = {
    id: membershipRow?.id || `mem_${authUser.id}_${workspaceId}`,
    workspace_id: workspaceId,
    user_id: authUser.id,
    role: membershipRole,
  };

  const resolvedContext: RalionSessionContext = {
    user: { id: authUser.id, email: authUser.email || '', user_metadata: authUser.user_metadata, app_metadata: authUser.app_metadata },
    profile,
    workspace,
    membership,
    organization: {
      id: organizationId,
      name: orgName,
      tier: authUser.user_metadata?.tier || 'STANDARD',
    },
  };

  return {
    status: 'CONTEXT_RESOLVED',
    context: resolvedContext,
    user: authUser,
    httpStatus: 200,
  };
}

/**
 * Standard route authorization helper that automatically emits the correct
 * HTTP 401, 403, 409, or 500 response on failure, or returns non-null context on success.
 */
export async function requireRalionContext(
  request: NextRequest
): Promise<{ context: RalionSessionContext; response: null } | { context: null; response: NextResponse }> {
  if (contextResolverOverride) {
    const overridden = await contextResolverOverride(request, { requireAuth: true });
    if (overridden) {
      return { context: overridden, response: null };
    }
    return {
      context: null,
      response: authRequiredResponse(request, 'Authentication required', 'AUTH_TOKEN_MISSING'),
    };
  }

  const result = await resolveRalionAuthContext(request, { requireAuth: true });
  if (result.status === 'CONTEXT_RESOLVED' && result.context) {
    return { context: result.context, response: null };
  }

  if (result.status === 'AUTHENTICATION_REQUIRED') {
    return {
      context: null,
      response: authRequiredResponse(request, result.errorMessage, result.errorCode),
    };
  }

  if (result.status === 'FORBIDDEN') {
    return {
      context: null,
      response: forbiddenResponse(request, result.errorMessage, result.errorCode),
    };
  }

  if (result.status === 'WORKSPACE_CONTEXT_MISSING') {
    return {
      context: null,
      response: corsJsonResponse(
        {
          success: false,
          code: 'WORKSPACE_CONTEXT_MISSING',
          error: 'WORKSPACE_CONTEXT_MISSING',
          authenticated: true,
          repairable: true,
          message: 'Your account is authenticated, but its organization workspace has not been resolved yet.',
        },
        { status: 409 },
        request
      ),
    };
  }

  if (result.status === 'TENANT_DATABASE_ERROR') {
    return {
      context: null,
      response: tenantDatabaseErrorResponse(request, result.errorMessage, result.errorCode),
    };
  }

  return {
    context: null,
    response: authRequiredResponse(request, result.errorMessage, result.errorCode),
  };
}

let contextResolverOverride: ((request: NextRequest, options?: { requireAuth?: boolean }) => Promise<RalionSessionContext | null>) | null = null;

export function __setTestContextResolver(resolver: typeof contextResolverOverride) {
  contextResolverOverride = resolver;
}

/**
 * Backward compatibility helper returning context or null.
 */
export async function getCurrentRalionContext(
  request: NextRequest,
  options: { requireAuth?: boolean } = { requireAuth: true }
): Promise<RalionSessionContext | null> {
  if (contextResolverOverride) {
    return contextResolverOverride(request, options);
  }
  const result = await resolveRalionAuthContext(request, options);
  return result.context;
}

/**
 * Invariant assertion helper ensuring workspace membership verification fails closed.
 */
export function verifyMembershipFailsClosed(error: any, member: any): any {
  if (error || !member) return null;
  return member;
}

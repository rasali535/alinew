'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Organization, Branch, LicenseTier } from './types';

export interface WorkspaceContextSummary {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  organizationId: string;
}

export interface OrganizationContextType {
  user: UserProfile | null;
  organization: Organization | null;
  workspace: WorkspaceContextSummary | null;
  activeBranch: Branch | null;
  isLoading: boolean;
  isContextResolved: boolean;
  setOrganization: (org: Organization) => void;
  setActiveBranch: (branch: Branch) => void;
  refreshOrganization: () => Promise<void>;
  logout: () => void;
}

const OrganizationContext = createContext<OrganizationContextType>({
  user: null,
  organization: null,
  workspace: null,
  activeBranch: null,
  isLoading: true,
  isContextResolved: false,
  setOrganization: () => {},
  setActiveBranch: () => {},
  refreshOrganization: async () => {},
  logout: () => {},
});

// ─── Module-level resolution guards ────────────────────────────────────────────
// Promise-based coalescing: all concurrent callers share a single resolution.
// This is intentionally module-level (not a ref) so it survives across renders.
let _activeContextResolution: Promise<void> | null = null;
// Terminal redirect guard: once we redirect to /login we must not do it again.
let _redirectedToLogin = false;

function getContextApiBase(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  const hostname = window.location.hostname;
  if (hostname.includes('rasalilabs.com')) return `${origin}/ralion`;
  const port = window.location.port;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (port === '6509' || port === '3000') return origin;
    return 'http://localhost:6509';
  }
  return `${origin}/ralion`;
}

function getSharedSupabaseClient(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).__ralion_supabase_instance__ || (globalThis as any).__ralion_supabase_instance__ || null;
}

/**
 * Call the canonical global refresh function.
 * Never call sharedClient.auth.refreshSession() directly — that bypasses
 * the shared in-flight promise coalescing in client.ts.
 */
async function callGlobalRefresh(): Promise<{ data: { session: any | null }; error: any | null }> {
  // Prefer the globally exposed deduplicated refresh function set by client.ts
  if (typeof (window as any).__ralion_refresh_session__ === 'function') {
    return (window as any).__ralion_refresh_session__();
  }
  // Fall back to an already-in-flight promise if the function hasn't been registered yet
  if ((window as any).__ralion_refresh_promise__) {
    return (window as any).__ralion_refresh_promise__;
  }
  // If no global is available (e.g., client hasn't been instantiated), return a clean error
  return { data: { session: null }, error: { message: 'Refresh function not available' } };
}

function readStoredSessionFallback(): { accessToken: string | null; user: any | null } {
  let accessToken: string | null = null;
  let user: any | null = null;
  try {
    const directSession = localStorage.getItem('ralion-app-auth-token');
    if (directSession) {
      const parsed = JSON.parse(directSession);
      accessToken = parsed?.access_token || parsed?.currentSession?.access_token || null;
      user = parsed?.user || parsed?.currentSession?.user || null;
    }
    for (let i = 0; !accessToken && i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      accessToken = parsed?.access_token || parsed?.currentSession?.access_token || null;
      user = user || parsed?.user || parsed?.currentSession?.user || null;
    }
  } catch {}
  return { accessToken, user };
}

async function readCurrentSession(forceRefresh = false): Promise<{ accessToken: string | null; user: any | null }> {
  const sharedClient = getSharedSupabaseClient();

  if (sharedClient?.auth) {
    try {
      if (forceRefresh) {
        // ALWAYS go through the global deduplicated refresh function.
        // Never call sharedClient.auth.refreshSession() directly.
        const refreshed = await callGlobalRefresh();
        const refreshedSession = refreshed?.data?.session;
        if (refreshedSession?.access_token) {
          return { accessToken: refreshedSession.access_token, user: refreshedSession.user || null };
        }
        // Refresh failed — do not fall through to getSession (stale token may re-trigger storm)
        return { accessToken: null, user: null };
      }

      if (typeof sharedClient.auth.getSession === 'function') {
        const result = await sharedClient.auth.getSession();
        const session = result?.data?.session;
        if (session?.access_token) {
          return { accessToken: session.access_token, user: session.user || null };
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Supabase session resolution note:', err);
    }
  }

  return readStoredSessionFallback();
}

async function fetchAuthoritativeContext(accessToken: string, method: 'GET' | 'POST' = 'GET') {
  return fetch(`${getContextApiBase()}/api/auth/context`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    credentials: 'include',
    cache: 'no-store',
    ...(method === 'POST' ? { body: '{}' } : {}),
  });
}

async function readResponseCode(res: Response): Promise<string | null> {
  try {
    const payload = await res.clone().json();
    return payload?.code || payload?.error || null;
  } catch {
    return null;
  }
}

/**
 * Purge all auth-related storage entries and redirect to /login exactly once.
 * This is called after a session is irrecoverably invalid (double AUTH_TOKEN_INVALID).
 */
async function terminateInvalidSession(): Promise<void> {
  if (_redirectedToLogin) return;
  _redirectedToLogin = true;

  // Sign out locally only \u2014 do not call the Supabase server (server may be rejecting us anyway)
  const client = getSharedSupabaseClient();
  if (client?.auth?.signOut) {
    await client.auth.signOut({ scope: 'local' }).catch(() => {});
  }

  // Clear all Ralion and Supabase auth storage
  try {
    localStorage.removeItem('ralion-app-auth-token');
    localStorage.removeItem('ralion_active_workspace_id');
    localStorage.removeItem('ralion_organization_id');
    localStorage.removeItem('ralion_org_name');
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    }
    sessionStorage.clear();
  } catch {}

  // Redirect once
  window.location.href = '/login';
}

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceContextSummary | null>(null);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContextResolved, setIsContextResolved] = useState(false);
  // isResolvingRef guards setIsLoading(true) from running after unmount
  const isResolvingRef = useRef(false);

  const clearResolvedContext = useCallback(() => {
    setUser(null);
    setOrganization(null);
    setWorkspace(null);
    setActiveBranch(null);
    setIsContextResolved(true);
  }, []);

  const resolveAuthoritativeContext = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // ─── Promise-based coalescing ────────────────────────────────────────────
    // All callers that arrive while a resolution is in progress will await the
    // existing promise and return immediately after it settles. Only one full
    // resolution runs at a time, regardless of how many events arrive.
    if (_activeContextResolution) {
      await _activeContextResolution;
      return;
    }

    let resolveGuard!: () => void;
    _activeContextResolution = new Promise<void>(r => { resolveGuard = r; });

    isResolvingRef.current = true;
    setIsLoading(true);
    setIsContextResolved(false);

    try {
      let { accessToken, user: supabaseUser } = await readCurrentSession(false);
      if (!accessToken) {
        clearResolvedContext();
        return;
      }

      let res = await fetchAuthoritativeContext(accessToken);
      let responseCode = await readResponseCode(res);

      // Refresh exactly once only when the server says the authentication token
      // itself is invalid. Do NOT refresh on missing tokens or other error statuses.
      if (res.status === 401 && responseCode === 'AUTH_TOKEN_INVALID') {
        const refreshed = await readCurrentSession(true);

        if (refreshed.accessToken && refreshed.accessToken !== accessToken) {
          accessToken = refreshed.accessToken;
          supabaseUser = refreshed.user || supabaseUser;
          res = await fetchAuthoritativeContext(accessToken);
          responseCode = await readResponseCode(res);
        }

        // If server still returns AUTH_TOKEN_INVALID after a successful refresh,
        // the session is irrecoverably dead. Terminate it and redirect to login.
        if (res.status === 401 && responseCode === 'AUTH_TOKEN_INVALID') {
          console.warn('[AuthContext] Session irrecoverably invalid after refresh — signing out.');
          await terminateInvalidSession();
          return; // Do not call clearResolvedContext; redirect is in flight.
        }
      }

      // Legacy/current accounts may be authenticated but have no canonical
      // workspace records because older registration flows only created auth.users.
      // Repair is explicit POST, idempotent, and still fully server-authenticated.
      if (res.status === 409 && responseCode === 'WORKSPACE_CONTEXT_MISSING') {
        console.info('[AuthContext] Authenticated session has no workspace; requesting canonical provisioning');
        res = await fetchAuthoritativeContext(accessToken, 'POST');
        responseCode = await readResponseCode(res);
      }

      if (!res.ok) {
        console.warn('[AuthContext] Server context resolution failed:', {
          status: res.status,
          code: responseCode || 'UNKNOWN',
        });
        clearResolvedContext();
        return;
      }

      const data = await res.json();
      if (!data.success || !data.user || !data.workspace || !data.organization || !data.membership) {
        console.warn('[AuthContext] Server returned incomplete context');
        clearResolvedContext();
        return;
      }

      const branch: Branch = {
        id: 'b-main',
        name: supabaseUser?.user_metadata?.branch_name || 'Main HQ Branch',
        code: 'HQ-01',
        isMain: true,
      };

      const resolvedWorkspace: WorkspaceContextSummary = {
        id: data.workspace.id,
        name: data.workspace.name,
        slug: data.workspace.slug,
        ownerId: data.workspace.ownerId,
        organizationId: data.workspace.organizationId || data.organization.id,
      };

      const resolvedOrg: Organization = {
        id: data.organization.id,
        name: data.organization.name,
        slug: data.workspace.slug || data.organization.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        ownerId: data.workspace.ownerId || data.user.id,
        licenseTier: (data.organization.tier || 'COMMUNITY') as LicenseTier,
        maxUsers: data.organization.tier === 'ENTERPRISE' ? 999 : data.organization.tier === 'PROFESSIONAL' ? 20 : 5,
        enabledModules: ['mari', 'crm', 'tasks', 'calendar', 'documents', 'workflows', 'billing', 'growth'],
        activeBranches: [branch],
        activeDepartments: [{ id: 'd-1', name: 'Operations', code: 'OPS' }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const profile: UserProfile = {
        uid: data.user.id,
        email: data.user.email || '',
        displayName: data.user.fullName || data.user.email?.split('@')[0] || 'User',
        orgId: resolvedOrg.id,
        role: (data.membership.role?.toUpperCase() as any) || 'ORGANIZATION_OWNER',
        permissions: ['org:manage', 'billing:manage', 'crm:read', 'crm:write'],
        branchId: 'b-main',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setUser(profile);
      setOrganization(resolvedOrg);
      setWorkspace(resolvedWorkspace);
      setActiveBranch(branch);
      setIsContextResolved(true);

      try {
        localStorage.setItem('ralion_active_workspace_id', resolvedWorkspace.id);
        localStorage.setItem('ralion_organization_id', resolvedOrg.id);
        if (resolvedOrg.name) localStorage.setItem('ralion_org_name', resolvedOrg.name);
      } catch {}

      console.log('[AuthContext]', {
        hasSession: true,
        resolvedWorkspaceId: resolvedWorkspace.id,
        resolvedOrganizationId: resolvedOrg.id,
        source: data.provisioned ? 'SERVER_PROVISIONED' : 'SERVER_VERIFIED',
      });
    } catch (err) {
      console.warn('[AuthContext] Context resolution error:', err);
      clearResolvedContext();
    } finally {
      setIsLoading(false);
      isResolvingRef.current = false;
      // Release the coalescing guard so the next independent event can trigger
      resolveGuard();
      _activeContextResolution = null;
    }
  }, [clearResolvedContext]);

  useEffect(() => {
    // Resolve once on mount from the current getSession() result \u2014 no forced refresh.
    resolveAuthoritativeContext();

    const handleOrgUpdate = () => resolveAuthoritativeContext();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key === 'ralion-app-auth-token') {
        resolveAuthoritativeContext();
      }
    };

    const sharedClient = getSharedSupabaseClient();
    const authSubscription = sharedClient?.auth?.onAuthStateChange?.((event: string) => {
      // ─── Deliberate omissions ────────────────────────────────────────────────
      // SIGNED_IN: deliberately NOT handled here.
      //   Supabase fires SIGNED_IN on every tab visibility recovery via
      //   _onVisibilityChanged → _recoverAndRefresh. Listening to it causes the
      //   refresh storm seen in production: each tab focus triggers a context
      //   resolution which may in turn trigger another refresh event.
      //   The initial mount resolution above handles the first login.
      //
      // USER_UPDATED: deliberately NOT handled here.
      //   This event can be fired by GoTrue during refresh cycles and would
      //   cascade into repeated resolution. If user profile updates require
      //   re-resolution, callers should invoke refreshOrganization() explicitly.
      //
      // TOKEN_REFRESHED: deliberately NOT handled here.
      //   Would create infinite loops: refresh → TOKEN_REFRESHED → resolve →
      //   AUTH_TOKEN_INVALID → refresh → ...
      if (event === 'SIGNED_OUT') {
        clearResolvedContext();
      }
    });

    window.addEventListener('ralion_subscription_updated', handleOrgUpdate);
    window.addEventListener('ralion_organization_updated', handleOrgUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('ralion_subscription_updated', handleOrgUpdate);
      window.removeEventListener('ralion_organization_updated', handleOrgUpdate);
      window.removeEventListener('storage', handleStorageChange);
      authSubscription?.data?.subscription?.unsubscribe?.();
    };
  }, [resolveAuthoritativeContext, clearResolvedContext]);

  const logout = () => {
    setUser(null);
    setOrganization(null);
    setWorkspace(null);
    setActiveBranch(null);
    setIsContextResolved(false);
    if (typeof window !== 'undefined') {
      try {
        const keysToPurge = Object.keys(localStorage).filter(
          k => k.startsWith('ralion:') || k.startsWith('ralion_') || k.startsWith('sb-') || k.includes('auth') || k.includes('tenant')
        );
        keysToPurge.forEach(k => localStorage.removeItem(k));
        sessionStorage.clear();
      } catch (e) {
        console.warn('[OrganizationContext] Error clearing storage during logout:', e);
      }
    }
  };

  return (
    <OrganizationContext.Provider value={{ user, organization, workspace, activeBranch, isLoading, isContextResolved, setOrganization, setActiveBranch, refreshOrganization: resolveAuthoritativeContext, logout }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export function useOrganization() {
  return useContext(OrganizationContext);
}

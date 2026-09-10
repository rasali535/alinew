'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Organization, Branch, LicenseTier } from './types';

export interface OrganizationContextType {
  user: UserProfile | null;
  organization: Organization | null;
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
  activeBranch: null,
  isLoading: true,
  isContextResolved: false,
  setOrganization: () => {},
  setActiveBranch: () => {},
  refreshOrganization: async () => {},
  logout: () => {},
});

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
      if (forceRefresh && typeof sharedClient.auth.refreshSession === 'function') {
        const refreshed = await sharedClient.auth.refreshSession();
        const refreshedSession = refreshed?.data?.session;
        if (refreshedSession?.access_token) {
          return { accessToken: refreshedSession.access_token, user: refreshedSession.user || null };
        }
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

async function fetchAuthoritativeContext(accessToken: string) {
  return fetch(`${getContextApiBase()}/api/auth/context`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    credentials: 'include',
    cache: 'no-store',
  });
}

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isContextResolved, setIsContextResolved] = useState(false);
  const isResolvingRef = useRef(false);

  const clearResolvedContext = useCallback(() => {
    setUser(null);
    setOrganization(null);
    setActiveBranch(null);
    setIsContextResolved(true);
  }, []);

  const resolveAuthoritativeContext = useCallback(async () => {
    if (typeof window === 'undefined' || isResolvingRef.current) return;
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

      // A 401 commonly means the browser still has an expired access token while
      // a valid refresh token exists. Refresh through the canonical Supabase client
      // once, then retry with the newly issued JWT. Never weaken server validation.
      if (res.status === 401) {
        const refreshed = await readCurrentSession(true);
        if (refreshed.accessToken && refreshed.accessToken !== accessToken) {
          accessToken = refreshed.accessToken;
          supabaseUser = refreshed.user || supabaseUser;
          res = await fetchAuthoritativeContext(accessToken);
        }
      }

      if (!res.ok) {
        console.warn('[AuthContext] Server context resolution failed:', res.status);
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
      setActiveBranch(branch);
      setIsContextResolved(true);

      try {
        localStorage.setItem('ralion_active_workspace_id', data.workspace.id);
        localStorage.setItem('ralion_organization_id', data.organization.id);
        if (data.organization.name) localStorage.setItem('ralion_org_name', data.organization.name);
      } catch {}

      console.log('[AuthContext]', {
        hasSession: true,
        resolvedWorkspaceId: data.workspace.id,
        resolvedOrganizationId: data.organization.id,
        source: 'SERVER_VERIFIED',
      });
    } catch (err) {
      console.warn('[AuthContext] Context resolution error:', err);
      clearResolvedContext();
    } finally {
      setIsLoading(false);
      isResolvingRef.current = false;
    }
  }, [clearResolvedContext]);

  useEffect(() => {
    resolveAuthoritativeContext();

    const handleOrgUpdate = () => resolveAuthoritativeContext();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key === 'ralion-app-auth-token' || (e.key.startsWith('sb-') && e.key.endsWith('-auth-token')))) {
        resolveAuthoritativeContext();
      }
    };

    const sharedClient = getSharedSupabaseClient();
    const authSubscription = sharedClient?.auth?.onAuthStateChange?.((event: string) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        resolveAuthoritativeContext();
      }
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
    <OrganizationContext.Provider value={{ user, organization, activeBranch, isLoading, isContextResolved, setOrganization, setActiveBranch, refreshOrganization: resolveAuthoritativeContext, logout }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export function useOrganization() {
  return useContext(OrganizationContext);
}

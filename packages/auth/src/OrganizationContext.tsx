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

/**
 * Resolves the API base URL for server context calls.
 * Mirrors the logic in api-config.ts but avoids a cross-package import.
 */
function getContextApiBase(): string {
  if (typeof window === 'undefined') return '';

  const origin = window.location.origin;
  const hostname = window.location.hostname;

  if (hostname.includes('rasalilabs.com')) {
    return `${origin}/ralion`;
  }

  const port = window.location.port;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (port === '6509' || port === '3000') {
      return origin;
    }
    return 'http://localhost:6509';
  }

  return `${origin}/ralion`;
}

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isContextResolved, setIsContextResolved] = useState<boolean>(false);
  const isResolvingRef = useRef(false);

  /**
   * Core resolution: get Supabase session → call /api/auth/context → hydrate state.
   * This is the ONLY path for tenant resolution. No localStorage guessing.
   */
  const resolveAuthoritativeContext = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (isResolvingRef.current) return;
    isResolvingRef.current = true;

    try {
      // 1. Get the current Supabase session for the access token
      let accessToken: string | null = null;
      let supabaseUser: any = null;

      try {
        // Dynamically import to avoid circular deps with the app's supabase client
        const storageKey = 'ralion-app-auth-token';
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          accessToken = parsed?.access_token || null;
          supabaseUser = parsed?.user || null;
        }

        // Fallback: scan for any sb-*-auth-token key
        if (!accessToken) {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              const rawSb = localStorage.getItem(key);
              if (rawSb) {
                const parsedSb = JSON.parse(rawSb);
                if (parsedSb?.access_token) {
                  accessToken = parsedSb.access_token;
                  supabaseUser = parsedSb?.user || null;
                  break;
                }
              }
            }
          }
        }
      } catch {
        // Storage access failed
      }

      if (!accessToken) {
        console.log('[AuthContext] No active session found — user not authenticated');
        setUser(null);
        setOrganization(null);
        setActiveBranch(null);
        setIsContextResolved(true);
        return;
      }

      // 2. Call the authoritative server endpoint
      const apiBase = getContextApiBase();
      const contextUrl = `${apiBase}/api/auth/context`;

      const res = await fetch(contextUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        console.warn('[AuthContext] Server context resolution failed:', res.status);
        // If 401, session is invalid — clear state
        if (res.status === 401) {
          setUser(null);
          setOrganization(null);
          setActiveBranch(null);
        }
        setIsContextResolved(true);
        return;
      }

      const data = await res.json();

      if (!data.success || !data.user || !data.workspace || !data.organization) {
        console.warn('[AuthContext] Server returned incomplete context:', data);
        setIsContextResolved(true);
        return;
      }

      // 3. Hydrate organization context from verified server response
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
        role: (data.user.role?.toUpperCase() as any) || 'ORGANIZATION_OWNER',
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

      // 4. Persist workspace ID for subsidiary reads that still reference localStorage
      try {
        localStorage.setItem('ralion_active_workspace_id', data.workspace.id);
        localStorage.setItem('ralion_organization_id', data.organization.id);
        if (data.organization.name) {
          localStorage.setItem('ralion_org_name', data.organization.name);
        }
      } catch {}

      // 5. Diagnostic logging (non-sensitive)
      console.log('[AuthContext]', {
        hasSession: true,
        userId: data.user.id,
        resolvedWorkspaceId: data.workspace.id,
        resolvedOrganizationId: data.organization.id,
        organizationName: data.organization.name,
        tier: data.organization.tier,
        hasAccessToken: true,
        source: 'SERVER_VERIFIED',
      });

    } catch (err) {
      console.warn('[AuthContext] Context resolution error:', err);
      setIsContextResolved(true);
    } finally {
      setIsLoading(false);
      isResolvingRef.current = false;
    }
  }, []);

  useEffect(() => {
    resolveAuthoritativeContext();

    // Listen for auth state changes via custom events
    const handleOrgUpdate = () => {
      resolveAuthoritativeContext();
    };

    // Listen for Supabase storage changes (session refresh/logout)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key === 'ralion-app-auth-token' || (e.key.startsWith('sb-') && e.key.endsWith('-auth-token')))) {
        resolveAuthoritativeContext();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('ralion_subscription_updated', handleOrgUpdate);
      window.addEventListener('ralion_organization_updated', handleOrgUpdate);
      window.addEventListener('storage', handleStorageChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ralion_subscription_updated', handleOrgUpdate);
        window.removeEventListener('ralion_organization_updated', handleOrgUpdate);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [resolveAuthoritativeContext]);

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
    <OrganizationContext.Provider
      value={{
        user,
        organization,
        activeBranch,
        isLoading,
        isContextResolved,
        setOrganization,
        setActiveBranch,
        refreshOrganization: resolveAuthoritativeContext,
        logout,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export function useOrganization() {
  return useContext(OrganizationContext);
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const OrganizationContext = createContext({
  user: null,
  organization: null,
  activeBranch: null,
  isLoading: true,
  setOrganization: () => {},
  setActiveBranch: () => {},
  refreshOrganization: async () => {},
  logout: () => {},
});

export const OrganizationProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [activeBranch, setActiveBranch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentOrgState = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;

      let authUser = null;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.user) {
                authUser = parsed.user;
                break;
              }
            }
          }
        }
        if (!authUser) {
          const cached = localStorage.getItem('ralion_cached_user');
          if (cached) {
            authUser = JSON.parse(cached);
          }
        }
      } catch {
        // Fallback
      }

      const orgId = authUser?.user_metadata?.org_id ||
        authUser?.user_metadata?.organization_id ||
        (typeof window !== 'undefined' ? localStorage.getItem('ralion_active_workspace_id') : null) ||
        (typeof window !== 'undefined' ? localStorage.getItem('ralion_organization_id') : null);

      const orgName = authUser?.user_metadata?.org_name ||
        authUser?.user_metadata?.organization_name ||
        (typeof window !== 'undefined' ? localStorage.getItem('ralion_org_name') : null) ||
        'Organization';

      const userTier = authUser?.user_metadata?.tier ||
        (typeof window !== 'undefined' ? localStorage.getItem('ralion_user_tier') : null) ||
        'COMMUNITY';

      if (authUser || orgId) {
        const branch = {
          id: 'b-main',
          name: authUser?.user_metadata?.branch_name || 'Main HQ Branch',
          code: 'HQ-01',
          isMain: true,
        };

        const resolvedOrg = {
          id: orgId || authUser?.id || '',
          name: orgName,
          slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          ownerId: authUser?.id || 'u-auth',
          licenseTier: userTier,
          maxUsers: userTier === 'ENTERPRISE' ? 999 : userTier === 'PROFESSIONAL' ? 20 : 5,
          enabledModules: ['mari', 'crm', 'tasks', 'calendar', 'documents', 'workflows', 'billing', 'growth'],
          activeBranches: [branch],
          activeDepartments: [{ id: 'd-1', name: 'Operations', code: 'OPS' }],
          createdAt: authUser?.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const profile = {
          uid: authUser?.id || 'u-auth',
          email: authUser?.email || '',
          displayName: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'User',
          orgId: resolvedOrg.id,
          role: authUser?.user_metadata?.role || 'ORGANIZATION_OWNER',
          permissions: ['org:manage', 'billing:manage', 'crm:read', 'crm:write'],
          branchId: 'b-main',
          isActive: true,
          createdAt: authUser?.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setUser(profile);
        setOrganization(resolvedOrg);
        setActiveBranch(branch);
      } else {
        setUser(null);
        setOrganization(null);
        setActiveBranch(null);
      }
    } catch (err) {
      console.warn('[OrganizationContext] Failed to load org state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentOrgState();

    const handleOrgUpdate = () => {
      fetchCurrentOrgState();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('ralion_subscription_updated', handleOrgUpdate);
      window.addEventListener('ralion_organization_updated', handleOrgUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('ralion_subscription_updated', handleOrgUpdate);
        window.removeEventListener('ralion_organization_updated', handleOrgUpdate);
      }
    };
  }, [fetchCurrentOrgState]);

  const logout = () => {
    setUser(null);
    setOrganization(null);
    setActiveBranch(null);
    if (typeof window !== 'undefined') {
      try {
        const keysToPurge = Object.keys(localStorage).filter(
          k => k.startsWith('ralion_') || k.startsWith('sb-') || k.includes('auth') || k.includes('tenant')
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
        setOrganization,
        setActiveBranch,
        refreshOrganization: fetchCurrentOrgState,
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

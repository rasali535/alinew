import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Organization, Branch, LicenseTier } from './types';

export interface OrganizationContextType {
  user: UserProfile | null;
  organization: Organization | null;
  activeBranch: Branch | null;
  isLoading: boolean;
  setOrganization: (org: Organization) => void;
  setActiveBranch: (branch: Branch) => void;
  logout: () => void;
}

const defaultBranch: Branch = {
  id: 'b-main',
  name: 'Gaborone Main Branch',
  code: 'GBE-01',
  isMain: true
};

const defaultOrg: Organization = {
  id: 'org-demo',
  name: 'Ras Ali Enterprises',
  slug: 'ras-ali-enterprises',
  ownerId: 'u-101',
  licenseTier: 'PROFESSIONAL',
  maxUsers: 25,
  enabledModules: ['mari', 'crm', 'tasks', 'calendar', 'documents', 'workflows', 'billing', 'growth', 'health', 'funeral', 'logistics', 'trade'],
  activeBranches: [defaultBranch],
  activeDepartments: [{ id: 'd-1', name: 'Operations', code: 'OPS' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const defaultUser: UserProfile = {
  uid: 'u-101',
  email: 'admin@rasalilabs.com',
  displayName: 'Ras Ali Admin',
  orgId: 'org-demo',
  role: 'ORGANIZATION_OWNER',
  permissions: ['org:manage', 'users:manage', 'billing:manage', 'crm:read', 'crm:write'],
  branchId: 'b-main',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const OrganizationContext = createContext<OrganizationContextType>({
  user: defaultUser,
  organization: defaultOrg,
  activeBranch: defaultBranch,
  isLoading: false,
  setOrganization: () => {},
  setActiveBranch: () => {},
  logout: () => {}
});

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(defaultUser);
  const [organization, setOrganization] = useState<Organization | null>(defaultOrg);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(defaultBranch);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const logout = () => {
    setUser(null);
    setOrganization(null);
    setActiveBranch(null);
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
        logout
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export function useOrganization() {
  return useContext(OrganizationContext);
}

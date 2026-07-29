import React, { createContext, useContext, useState } from 'react';
const defaultBranch = {
    id: 'b-main',
    name: 'Gaborone Main Branch',
    code: 'GBE-01',
    isMain: true
};
const defaultOrg = {
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
const defaultUser = {
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
const OrganizationContext = createContext({
    user: defaultUser,
    organization: defaultOrg,
    activeBranch: defaultBranch,
    isLoading: false,
    setOrganization: () => { },
    setActiveBranch: () => { },
    logout: () => { }
});
export const OrganizationProvider = ({ children }) => {
    const [user, setUser] = useState(defaultUser);
    const [organization, setOrganization] = useState(defaultOrg);
    const [activeBranch, setActiveBranch] = useState(defaultBranch);
    const [isLoading, setIsLoading] = useState(false);
    const logout = () => {
        setUser(null);
        setOrganization(null);
        setActiveBranch(null);
    };
    return (<OrganizationContext.Provider value={{
            user,
            organization,
            activeBranch,
            isLoading,
            setOrganization,
            setActiveBranch,
            logout
        }}>
      {children}
    </OrganizationContext.Provider>);
};
export function useOrganization() {
    return useContext(OrganizationContext);
}

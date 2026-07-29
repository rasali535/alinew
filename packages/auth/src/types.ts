export type UserRole = 
  | 'PLATFORM_ADMIN'
  | 'ORGANIZATION_OWNER'
  | 'MANAGER'
  | 'EMPLOYEE'
  | 'CUSTOM';

export type Permission =
  | 'org:manage'
  | 'users:manage'
  | 'billing:manage'
  | 'crm:read'
  | 'crm:write'
  | 'tasks:read'
  | 'tasks:write'
  | 'documents:read'
  | 'documents:write'
  | 'workflows:manage'
  | 'growth:manage'
  | 'industry:health'
  | 'industry:funeral'
  | 'industry:logistics'
  | 'industry:trade'
  | 'mari:ai_chat'
  | 'mari:ai_actions'
  | 'mari:knowledge_base';

export type LicenseTier = 'COMMUNITY' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  orgId: string;
  role: UserRole;
  customRoleName?: string;
  permissions: Permission[];
  branchId?: string;
  departmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  licenseTier: LicenseTier;
  maxUsers: number;
  enabledModules: string[];
  activeBranches: Branch[];
  activeDepartments: Department[];
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string;
  isMain: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface RolePermissionsMap {
  [key: string]: Permission[];
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  PLATFORM_ADMIN: [
    'org:manage',
    'users:manage',
    'billing:manage',
    'crm:read',
    'crm:write',
    'tasks:read',
    'tasks:write',
    'documents:read',
    'documents:write',
    'workflows:manage',
    'growth:manage',
    'industry:health',
    'industry:funeral',
    'industry:logistics',
    'industry:trade',
    'mari:ai_chat',
    'mari:ai_actions',
    'mari:knowledge_base',
  ],
  ORGANIZATION_OWNER: [
    'org:manage',
    'users:manage',
    'billing:manage',
    'crm:read',
    'crm:write',
    'tasks:read',
    'tasks:write',
    'documents:read',
    'documents:write',
    'workflows:manage',
    'growth:manage',
    'industry:health',
    'industry:funeral',
    'industry:logistics',
    'industry:trade',
    'mari:ai_chat',
    'mari:ai_actions',
    'mari:knowledge_base',
  ],
  MANAGER: [
    'users:manage',
    'crm:read',
    'crm:write',
    'tasks:read',
    'tasks:write',
    'documents:read',
    'documents:write',
    'workflows:manage',
    'growth:manage',
    'mari:ai_chat',
    'mari:ai_actions',
  ],
  EMPLOYEE: [
    'crm:read',
    'crm:write',
    'tasks:read',
    'tasks:write',
    'documents:read',
    'mari:ai_chat',
  ],
  CUSTOM: [],
};

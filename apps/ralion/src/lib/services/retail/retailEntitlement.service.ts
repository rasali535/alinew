/**
 * Ralion OS — Ralion Retail Module Entitlement & Access Guard
 * Ras Ali Labs (Pty) Ltd
 *
 * Enforces exclusive tenant-scoped module entitlement for Ralion Retail.
 * Pilot Customer: Proinsight (Prolnsight Consultants)
 * Default Operating Currency: USD ($)
 */

import { RalionSessionContext } from '../../auth/serverAuth';
import { RetailCurrency, RetailRole } from '@ralion/database';

export const PROINSIGHT_ORGANIZATION_ID = '85ec9738-937a-41ee-b0df-ed752777447c';
export const PROINSIGHT_WORKSPACE_ID = '67074e47-76bb-40e1-ae05-362e9cae8798';
export const PROINSIGHT_OWNER_ID = '7f0c8f3f-4f97-42c3-adec-ad74b92792d2';

export interface RetailEntitlementCheck {
  isEntitled: boolean;
  status: 'ACTIVE' | 'NOT_ENTITLED' | 'SUSPENDED' | 'EXPIRED';
  tier: 'PILOT' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  defaultCurrency: RetailCurrency;
  effectiveRole: RetailRole;
  isPlatformAdmin: boolean;
  canManageSettings: boolean;
  canAccessPOS: boolean;
  canAccessInventory: boolean;
  canAccessQuotations: boolean;
  canAccessSales: boolean;
  canAccessExpenses: boolean;
  canAccessPayroll: boolean;
  canViewSalaries: boolean;
  reason?: string;
}

export class RetailEntitlementService {
  /**
   * Authoritative server-side entitlement check.
   * Retail is exclusively provisionable for entitled customer organizations/workspaces.
   */
  static verifyEntitlement(
    context: RalionSessionContext | null,
    requiredRole?: RetailRole
  ): RetailEntitlementCheck {
    if (!context || !context.workspace || !context.organization) {
      return {
        isEntitled: false,
        status: 'NOT_ENTITLED',
        tier: 'PILOT',
        defaultCurrency: 'USD',
        effectiveRole: 'CASHIER',
        isPlatformAdmin: false,
        canManageSettings: false,
        canAccessPOS: false,
        canAccessInventory: false,
        canAccessQuotations: false,
        canAccessSales: false,
        canAccessExpenses: false,
        canAccessPayroll: false,
        canViewSalaries: false,
        reason: 'Authentication and workspace context are required.',
      };
    }

    const { organization, workspace, membership, isPlatformAdmin, user } = context;

    // 1. Check if workspace or organization is authorized for Retail pilot
    const isProinsightOrg = organization.id === PROINSIGHT_ORGANIZATION_ID;
    const isProinsightWorkspace = workspace.id === PROINSIGHT_WORKSPACE_ID;
    const isExplicitlyEntitled = isProinsightOrg || isProinsightWorkspace || isPlatformAdmin;

    // Check workspace settings/metadata for dynamic entitlement flag if configured
    const workspaceMeta = (workspace as any).settings || (workspace as any).metadata || {};
    const hasDynamicEntitlement = Boolean(
      workspaceMeta.modules?.retail === true ||
      workspaceMeta.retailEntitled === true ||
      workspaceMeta.entitlements?.includes?.('retail')
    );

    if (!isExplicitlyEntitled && !hasDynamicEntitlement) {
      return {
        isEntitled: false,
        status: 'NOT_ENTITLED',
        tier: 'PILOT',
        defaultCurrency: 'USD',
        effectiveRole: 'CASHIER',
        isPlatformAdmin,
        canManageSettings: false,
        canAccessPOS: false,
        canAccessInventory: false,
        canAccessQuotations: false,
        canAccessSales: false,
        canAccessExpenses: false,
        canAccessPayroll: false,
        canViewSalaries: false,
        reason: 'This workspace is not entitled to access Ralion Retail OS.',
      };
    }

    // 2. Resolve Retail Role from workspace membership role or explicit retail_role
    let effectiveRole: RetailRole = 'CASHIER';

    if (isPlatformAdmin || membership.role === 'owner' || user.id === PROINSIGHT_OWNER_ID) {
      effectiveRole = 'STORE_OWNER';
    } else if (membership.role === 'admin') {
      effectiveRole = 'RETAIL_MANAGER';
    } else if ((membership as any).retailRole) {
      effectiveRole = (membership as any).retailRole as RetailRole;
    } else if (membership.role === 'member') {
      effectiveRole = 'CASHIER';
    }

    // 3. Compute granular capability flags
    const isOwner = effectiveRole === 'STORE_OWNER';
    const isManager = effectiveRole === 'RETAIL_MANAGER';
    const isCashier = effectiveRole === 'CASHIER';
    const isInventoryClerk = effectiveRole === 'INVENTORY_CLERK';
    const isPayrollManager = effectiveRole === 'PAYROLL_MANAGER';

    const canManageSettings = isOwner || isPlatformAdmin;
    const canAccessPOS = isOwner || isManager || isCashier;
    const canAccessInventory = isOwner || isManager || isInventoryClerk;
    const canAccessQuotations = isOwner || isManager || isCashier;
    const canAccessSales = isOwner || isManager || isCashier;
    const canAccessExpenses = isOwner || isManager;
    const canAccessPayroll = isOwner || isPayrollManager;
    const canViewSalaries = isOwner || isPayrollManager;

    // 4. Role validation check if a specific role is required
    let roleDenied = false;
    if (requiredRole) {
      if (requiredRole === 'STORE_OWNER' && !isOwner) roleDenied = true;
      if (requiredRole === 'PAYROLL_MANAGER' && !canAccessPayroll) roleDenied = true;
      if (requiredRole === 'RETAIL_MANAGER' && !isOwner && !isManager) roleDenied = true;
      if (requiredRole === 'INVENTORY_CLERK' && !canAccessInventory) roleDenied = true;
      if (requiredRole === 'CASHIER' && !canAccessPOS) roleDenied = true;
    }

    return {
      isEntitled: !roleDenied,
      status: 'ACTIVE',
      tier: 'PILOT',
      defaultCurrency: 'USD',
      effectiveRole,
      isPlatformAdmin,
      canManageSettings,
      canAccessPOS,
      canAccessInventory,
      canAccessQuotations,
      canAccessSales,
      canAccessExpenses,
      canAccessPayroll,
      canViewSalaries,
      reason: roleDenied
        ? `Insufficient permissions: '${requiredRole}' capability required.`
        : undefined,
    };
  }
}

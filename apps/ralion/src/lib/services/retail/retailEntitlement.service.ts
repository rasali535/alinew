/**
 * Ralion OS — Ralion Retail Module Entitlement & Access Guard
 * Ras Ali Labs (Pty) Ltd
 *
 * Enforces exclusive tenant-scoped module entitlement for Ralion Retail.
 * Pilot Customer: Proinsight (Prolnsight Consultants)
 * Default Operating Currency: USD ($)
 *
 * Requirements:
 * - Preserve exact Proinsight organization AND workspace ownership checks.
 * - Do NOT authorize access through organization OR workspace matching.
 * - Validated database-backed entitlement via public.tenant_module_entitlements.
 */

import { NextRequest } from 'next/server';
import { RalionSessionContext } from '../../auth/serverAuth';
import { RetailCurrency, RetailRole } from '@ralion/database';
import { getPrivilegedSupabase } from '../../supabase/server';
import {
  PreviewSessionService,
  INTERNAL_PREVIEW_ORGANIZATION_ID,
  INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID,
} from '../preview/previewSession.service';

export const PROINSIGHT_ORGANIZATION_ID = '85ec9738-937a-41ee-b0df-ed752777447c';
export const PROINSIGHT_WORKSPACE_ID = '67074e47-76bb-40e1-ae05-362e9cae8798';
export const PROINSIGHT_OWNER_ID = '7f0c8f3f-4f97-42c3-adec-ad74b92792d2';
export { INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID };

export interface RetailEntitlementCheck {
  isEntitled: boolean;
  status: 'ACTIVE' | 'NOT_ENTITLED' | 'SUSPENDED' | 'EXPIRED';
  tier: 'PILOT' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE' | 'TRIAL';
  defaultCurrency: RetailCurrency;
  effectiveRole: RetailRole;
  isPlatformAdmin: boolean;
  canManageSettings: boolean;
  canAccessPOS: boolean;
  canAccessInventory: boolean;
  canManageInventory: boolean;
  canManagePurchasing: boolean;
  canAccessQuotations: boolean;
  canAccessSales: boolean;
  canAccessExpenses: boolean;
  canAccessPayroll: boolean;
  canViewSalaries: boolean;
  reason?: string;
  source?: 'DATABASE_VERIFIED' | 'STRICT_PILOT_VERIFIED';
}

export class RetailEntitlementService {
  /**
   * Authoritative asynchronous entitlement check backed by database query
   * on public.tenant_module_entitlements.
   * Enforces exact Organization AND Workspace ownership.
   */
  static async verifyEntitlement(
    context: RalionSessionContext | null,
    requiredRole?: RetailRole,
    options?: { previewToken?: string }
  ): Promise<RetailEntitlementCheck> {
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
        canManageInventory: false,
        canManagePurchasing: false,
        canAccessQuotations: false,
        canAccessSales: false,
        canAccessExpenses: false,
        canAccessPayroll: false,
        canViewSalaries: false,
        reason: 'Authentication and workspace context are required.',
      };
    }

    const { organization, workspace, membership, isPlatformAdmin, user } = context;

    // Requirement 4: Verify that a user without an authorized workspace membership cannot gain
    // Retail access through a valid organization/workspace identifier alone.
    // Platform-administrator operations are separately authorized through existing trusted admin controls.
    const hasAuthorizedMembership = Boolean(
      membership &&
      membership.workspace_id === workspace.id &&
      membership.user_id === user.id
    );

    if (!isPlatformAdmin && !hasAuthorizedMembership) {
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
        canManageInventory: false,
        canManagePurchasing: false,
        canAccessQuotations: false,
        canAccessSales: false,
        canAccessExpenses: false,
        canAccessPayroll: false,
        canViewSalaries: false,
        reason: 'User lacks an authorized membership in the requested workspace.',
      };
    }

    // Requirement 3: Enforce strict preview session verification.
    // NEVER grant STORE_OWNER merely because workspace identifier matches a preview string.
    const isInternalPreview = workspace.id === INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID;

    if (isInternalPreview) {
      if (!isPlatformAdmin) {
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
          canManageInventory: false,
          canManagePurchasing: false,
          canAccessQuotations: false,
          canAccessSales: false,
          canAccessExpenses: false,
          canAccessPayroll: false,
          canViewSalaries: false,
          reason: 'Access to internal preview workspaces is strictly restricted to platform administrators.',
        };
      }

      const previewToken = options?.previewToken || (context as any).previewToken;
      const validation = await PreviewSessionService.validatePreviewSession(
        previewToken,
        workspace.id,
        user.id
      );

      if (!validation.valid) {
        return {
          isEntitled: false,
          status: validation.error === 'PREVIEW_SESSION_EXPIRED' ? 'EXPIRED' : 'NOT_ENTITLED',
          tier: 'PILOT',
          defaultCurrency: 'USD',
          effectiveRole: 'CASHIER',
          isPlatformAdmin: true,
          canManageSettings: false,
          canAccessPOS: false,
          canAccessInventory: false,
          canManageInventory: false,
          canManagePurchasing: false,
          canAccessQuotations: false,
          canAccessSales: false,
          canAccessExpenses: false,
          canAccessPayroll: false,
          canViewSalaries: false,
          reason: `Internal preview session rejected: ${validation.error || 'Server-authorized session required'}.`,
        };
      }

      // Anti-Cross-Product Bleed: Ensure preview session is explicitly for Retail OS
      if (validation.session?.product !== 'retail') {
        return {
          isEntitled: false,
          status: 'NOT_ENTITLED',
          tier: 'PILOT',
          defaultCurrency: 'USD',
          effectiveRole: 'CASHIER',
          isPlatformAdmin: true,
          canManageSettings: false,
          canAccessPOS: false,
          canAccessInventory: false,
          canManageInventory: false,
          canManagePurchasing: false,
          canAccessQuotations: false,
          canAccessSales: false,
          canAccessExpenses: false,
          canAccessPayroll: false,
          canViewSalaries: false,
          reason: `Retail OS preview rejected: Active preview session is for ${validation.session?.product || 'another product'}, not retail.`,
        };
      }

      // Check database entitlement for the internal preview workspace
      const supabase = getPrivilegedSupabase();
      const { data: entData, error: entError } = await supabase
        .from('tenant_module_entitlements')
        .select('status, tier, default_currency, expires_at')
        .eq('organization_id', INTERNAL_PREVIEW_ORGANIZATION_ID)
        .eq('workspace_id', INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID)
        .eq('module_key', 'retail')
        .maybeSingle();

      if (entError || !entData || entData.status !== 'ACTIVE') {
        return {
          isEntitled: false,
          status: 'NOT_ENTITLED',
          tier: 'PILOT',
          defaultCurrency: 'USD',
          effectiveRole: 'CASHIER',
          isPlatformAdmin: true,
          canManageSettings: false,
          canAccessPOS: false,
          canAccessInventory: false,
          canManageInventory: false,
          canManagePurchasing: false,
          canAccessQuotations: false,
          canAccessSales: false,
          canAccessExpenses: false,
          canAccessPayroll: false,
          canViewSalaries: false,
          reason: 'Internal preview workspace lacks an active database entitlement record.',
        };
      }

      return {
        isEntitled: true,
        status: 'ACTIVE',
        tier: 'PILOT',
        defaultCurrency: 'USD',
        effectiveRole: 'STORE_OWNER',
        isPlatformAdmin: true,
        canManageSettings: true,
        canAccessPOS: true,
        canAccessInventory: true,
        canManageInventory: true,
        canManagePurchasing: true,
        canAccessQuotations: true,
        canAccessSales: true,
        canAccessExpenses: true,
        canAccessPayroll: true,
        canViewSalaries: true,
        source: 'DATABASE_VERIFIED',
      };
    }

    const isExactProinsight =
      organization.id === PROINSIGHT_ORGANIZATION_ID &&
      workspace.id === PROINSIGHT_WORKSPACE_ID;

    // Requirements 1, 2, 3:
    // Require an active, database-verified Retail entitlement for Proinsight or entitled demo/trial workspaces.
    // Expired, suspended, missing or unreadable entitlement records all fail closed.
    // Database query exceptions must NEVER authorize Retail access based on hardcoded IDs or platform-admin status.
    let dbEntitled = false;
    let entitlementTier: 'PILOT' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE' | 'TRIAL' = 'PILOT';
    let entitlementStatus: 'ACTIVE' | 'NOT_ENTITLED' | 'SUSPENDED' | 'EXPIRED' = 'NOT_ENTITLED';
    let resolvedCurrency: RetailCurrency = 'USD';
    let failureReason: string | undefined;

    try {
      const supabase = getPrivilegedSupabase();
      const { data, error } = await supabase
        .from('tenant_module_entitlements')
        .select('status, tier, default_currency, organization_id, workspace_id, expires_at')
        .eq('organization_id', organization.id)
        .eq('workspace_id', workspace.id)
        .eq('module_key', 'retail')
        .maybeSingle();

      if (error) {
        // Unreadable query error -> fail closed
        dbEntitled = false;
        entitlementStatus = 'NOT_ENTITLED';
        failureReason = `Database error reading entitlement: ${error.message}`;
      } else if (!data) {
        // Missing entitlement record -> fail closed
        dbEntitled = false;
        entitlementStatus = 'NOT_ENTITLED';
        failureReason = isExactProinsight
          ? 'No active retail entitlement record found for Proinsight pilot workspace.'
          : 'This workspace is not entitled to access Ralion Retail OS. Redeem a valid demo access code or upgrade your plan.';
      } else if (data.status === 'EXPIRED') {
        dbEntitled = false;
        entitlementStatus = 'EXPIRED';
        failureReason = 'Retail module entitlement for this workspace has expired.';
      } else if (data.status === 'SUSPENDED') {
        dbEntitled = false;
        entitlementStatus = 'SUSPENDED';
        failureReason = 'Retail module entitlement for this workspace is suspended.';
      } else if (data.status === 'ACTIVE') {
        // Strict Fail-Closed Expiration Check: Expired trials are blocked at the server layer
        if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
          dbEntitled = false;
          entitlementStatus = 'EXPIRED';
          failureReason = 'Retail module trial access for this workspace has expired.';
        } else if (isExactProinsight || data.tier === 'TRIAL' || data.tier === 'STANDARD' || data.tier === 'PROFESSIONAL' || data.tier === 'ENTERPRISE') {
          dbEntitled = true;
          entitlementTier = data.tier as any;
          entitlementStatus = 'ACTIVE';
          resolvedCurrency = (data.default_currency as RetailCurrency) || 'USD';
        } else {
          dbEntitled = false;
          entitlementStatus = 'NOT_ENTITLED';
          failureReason = 'Tenant entitlement record is not recognized for this workspace.';
        }
      } else {
        dbEntitled = false;
        entitlementStatus = 'NOT_ENTITLED';
        failureReason = `Retail entitlement status is '${data.status}'.`;
      }
    } catch (dbErr: any) {
      // Database exception handler: STRICT FAIL CLOSED.
      // A failed entitlement query must NEVER authorize Retail access based solely on hardcoded IDs or platform-admin status.
      dbEntitled = false;
      entitlementStatus = 'NOT_ENTITLED';
      failureReason = `Failed to query retail entitlement from database: ${dbErr?.message || 'Database unavailable'}`;
    }

    // Require database-verified active entitlement
    if (!dbEntitled || entitlementStatus !== 'ACTIVE') {
      return {
        isEntitled: false,
        status: entitlementStatus,
        tier: entitlementTier,
        defaultCurrency: 'USD',
        effectiveRole: 'CASHIER',
        isPlatformAdmin,
        canManageSettings: false,
        canAccessPOS: false,
        canAccessInventory: false,
        canManageInventory: false,
        canManagePurchasing: false,
        canAccessQuotations: false,
        canAccessSales: false,
        canAccessExpenses: false,
        canAccessPayroll: false,
        canViewSalaries: false,
        reason: failureReason || 'Workspace does not possess an active database-verified retail entitlement.',
      };
    }

    // Resolve Retail Role from workspace membership role or explicit retailRole
    let effectiveRole: RetailRole = 'CASHIER';

    if (isPlatformAdmin) {
      effectiveRole = 'STORE_OWNER';
    } else if (membership?.role === 'owner' || user.id === PROINSIGHT_OWNER_ID) {
      effectiveRole = 'STORE_OWNER';
    } else if (membership?.role === 'admin') {
      effectiveRole = 'RETAIL_MANAGER';
    } else if ((membership as any)?.retailRole) {
      effectiveRole = (membership as any).retailRole as RetailRole;
    } else if (membership?.role === 'member') {
      effectiveRole = 'CASHIER';
    }

    // Compute granular capability flags
    const isOwner = effectiveRole === 'STORE_OWNER';
    const isManager = effectiveRole === 'RETAIL_MANAGER';
    const isCashier = effectiveRole === 'CASHIER';
    const isInventoryClerk = effectiveRole === 'INVENTORY_CLERK';
    const isPayrollManager = effectiveRole === 'PAYROLL_MANAGER';

    const canManageSettings = isOwner || isPlatformAdmin;
    const canAccessPOS = isOwner || isManager || isCashier;
    const canAccessInventory = isOwner || isManager || isInventoryClerk;
    const canManageInventory = isOwner || isManager;
    const canManagePurchasing = isOwner || isManager;
    const canAccessQuotations = isOwner || isManager || isCashier;
    const canAccessSales = isOwner || isManager || isCashier;
    const canAccessExpenses = isOwner || isManager;
    const canAccessPayroll = isOwner || isPayrollManager;
    const canViewSalaries = isOwner || isPayrollManager;

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
      tier: entitlementTier,
      defaultCurrency: resolvedCurrency,
      effectiveRole,
      isPlatformAdmin,
      canManageSettings,
      canAccessPOS,
      canAccessInventory,
      canManageInventory,
      canManagePurchasing,
      canAccessQuotations,
      canAccessSales,
      canAccessExpenses,
      canAccessPayroll,
      canViewSalaries,
      reason: roleDenied
        ? `Insufficient permissions: '${requiredRole}' capability required.`
        : undefined,
      source: 'DATABASE_VERIFIED',
    };
  }

  /**
   * Synchronous check fails closed because Retail OS strictly requires asynchronous database verification.
   */
  static verifyEntitlementSync(
    context: RalionSessionContext | null,
    requiredRole?: RetailRole
  ): RetailEntitlementCheck {
    return {
      isEntitled: false,
      status: 'NOT_ENTITLED',
      tier: 'PILOT',
      defaultCurrency: 'USD',
      effectiveRole: 'CASHIER',
      isPlatformAdmin: Boolean(context?.isPlatformAdmin),
      canManageSettings: false,
      canAccessPOS: false,
      canAccessInventory: false,
      canManageInventory: false,
      canManagePurchasing: false,
      canAccessQuotations: false,
      canAccessSales: false,
      canAccessExpenses: false,
      canAccessPayroll: false,
      canViewSalaries: false,
      reason: 'Retail OS access strictly requires asynchronous database verification via verifyEntitlement().',
    };
  }

  /**
   * Validates that any workspaceId or organizationId passed in client query or body
   * strictly matches the authenticated server-side context.
   * Prevents service-role bypass through client-controlled tenant identifiers.
   */
  static validateClientWorkspaceScope(
    request: NextRequest,
    context: RalionSessionContext,
    body?: any
  ): { valid: boolean; error?: string } {
    const queryWorkspace = request.nextUrl.searchParams.get('workspaceId');
    const queryOrg = request.nextUrl.searchParams.get('organizationId');

    if (queryWorkspace && queryWorkspace !== context.workspace.id) {
      return {
        valid: false,
        error: 'CROSS_WORKSPACE_REQUEST_DENIED: Client query workspaceId does not match authenticated workspace.',
      };
    }
    if (queryOrg && queryOrg !== context.organization.id) {
      return {
        valid: false,
        error: 'CROSS_ORGANIZATION_REQUEST_DENIED: Client query organizationId does not match authenticated organization.',
      };
    }
    if (body) {
      const bodyWorkspace = body.workspaceId || body.workspace_id;
      const bodyOrg = body.organizationId || body.organization_id;
      if (bodyWorkspace && bodyWorkspace !== context.workspace.id) {
        return {
          valid: false,
          error: 'CROSS_WORKSPACE_REQUEST_DENIED: Request payload workspaceId does not match authenticated workspace.',
        };
      }
      if (bodyOrg && bodyOrg !== context.organization.id) {
        return {
          valid: false,
          error: 'CROSS_ORGANIZATION_REQUEST_DENIED: Request payload organizationId does not match authenticated organization.',
        };
      }
    }
    return { valid: true };
  }
}


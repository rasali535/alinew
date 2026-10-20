/**
 * Ralion OS — Ralion Trade Module Entitlement & Access Guard
 * Ras Ali Labs (Pty) Ltd
 *
 * Enforces authoritative database-backed entitlement for Ralion Trade OS.
 * Supports:
 * - Platform Admin dedicated internal preview workspace ('ralion-internal-trade-preview-ws')
 * - Customer trial entitlements redeemed via Trial Access Manager
 * - Commercial customer entitlements
 * - Fail-closed expiration verification at server and DB layers
 */

import { NextRequest } from 'next/server';
import { RalionSessionContext } from '../../auth/serverAuth';
import { getPrivilegedSupabase } from '../../supabase/server';

export const INTERNAL_TRADE_PREVIEW_WORKSPACE_ID = 'ralion-internal-trade-preview-ws';

export type TradeRole =
  | 'TRADE_DIRECTOR'
  | 'PROCUREMENT_MANAGER'
  | 'SALES_REPRESENTATIVE'
  | 'WAREHOUSE_CLERK'
  | 'VIEWER';

export interface TradeEntitlementCheck {
  isEntitled: boolean;
  status: 'ACTIVE' | 'NOT_ENTITLED' | 'SUSPENDED' | 'EXPIRED';
  tier: 'TRIAL' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  defaultCurrency: string;
  effectiveRole: TradeRole;
  isPlatformAdmin: boolean;
  isInternalPreview?: boolean;
  canManageSuppliers: boolean;
  canCreatePurchaseOrders: boolean;
  canApprovePurchaseOrders: boolean;
  canManageQuotations: boolean;
  canManageOrders: boolean;
  canViewFinancials: boolean;
  reason?: string;
  source?: 'DATABASE_VERIFIED' | 'INTERNAL_PREVIEW';
}

export class TradeEntitlementService {
  /**
   * Authoritative asynchronous entitlement check backed by database query
   * on public.tenant_module_entitlements for module_key = 'trade'.
   */
  static async verifyEntitlement(
    context: RalionSessionContext | null,
    requiredRole?: TradeRole
  ): Promise<TradeEntitlementCheck> {
    if (!context || !context.workspace || !context.organization) {
      return {
        isEntitled: false,
        status: 'NOT_ENTITLED',
        tier: 'TRIAL',
        defaultCurrency: 'USD',
        effectiveRole: 'VIEWER',
        isPlatformAdmin: false,
        canManageSuppliers: false,
        canCreatePurchaseOrders: false,
        canApprovePurchaseOrders: false,
        canManageQuotations: false,
        canManageOrders: false,
        canViewFinancials: false,
        reason: 'Authentication and workspace context are required.',
      };
    }

    const { organization, workspace, membership, isPlatformAdmin, user } = context;

    // Internal preview workspace check for platform administrators
    const isInternalPreview = isPlatformAdmin && workspace.id === INTERNAL_TRADE_PREVIEW_WORKSPACE_ID;
    if (isInternalPreview) {
      return {
        isEntitled: true,
        status: 'ACTIVE',
        tier: 'TRIAL',
        defaultCurrency: 'USD',
        effectiveRole: 'TRADE_DIRECTOR',
        isPlatformAdmin: true,
        isInternalPreview: true,
        canManageSuppliers: true,
        canCreatePurchaseOrders: true,
        canApprovePurchaseOrders: true,
        canManageQuotations: true,
        canManageOrders: true,
        canViewFinancials: true,
        source: 'INTERNAL_PREVIEW',
      };
    }

    // Verify authorized membership in workspace
    const hasAuthorizedMembership = Boolean(
      membership &&
      membership.workspace_id === workspace.id &&
      membership.user_id === user.id
    );

    if (!isPlatformAdmin && !hasAuthorizedMembership) {
      return {
        isEntitled: false,
        status: 'NOT_ENTITLED',
        tier: 'TRIAL',
        defaultCurrency: 'USD',
        effectiveRole: 'VIEWER',
        isPlatformAdmin,
        canManageSuppliers: false,
        canCreatePurchaseOrders: false,
        canApprovePurchaseOrders: false,
        canManageQuotations: false,
        canManageOrders: false,
        canViewFinancials: false,
        reason: 'User lacks an authorized membership in the requested workspace.',
      };
    }

    // Query database-verified entitlement
    let dbEntitled = false;
    let entitlementTier: 'TRIAL' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE' = 'TRIAL';
    let entitlementStatus: 'ACTIVE' | 'NOT_ENTITLED' | 'SUSPENDED' | 'EXPIRED' = 'NOT_ENTITLED';
    let defaultCurrency = 'USD';
    let failureReason: string | undefined;

    try {
      const supabase = getPrivilegedSupabase();
      const { data, error } = await supabase
        .from('tenant_module_entitlements')
        .select('status, tier, default_currency, organization_id, workspace_id, expires_at')
        .eq('organization_id', organization.id)
        .eq('workspace_id', workspace.id)
        .eq('module_key', 'trade')
        .maybeSingle();

      if (error) {
        dbEntitled = false;
        entitlementStatus = 'NOT_ENTITLED';
        failureReason = `Database error reading Trade entitlement: ${error.message}`;
      } else if (!data) {
        dbEntitled = false;
        entitlementStatus = 'NOT_ENTITLED';
        failureReason = 'This workspace is not entitled to access Ralion Trade OS. Redeem a valid demo access code or upgrade your plan.';
      } else if (data.status === 'EXPIRED') {
        dbEntitled = false;
        entitlementStatus = 'EXPIRED';
        failureReason = 'Ralion Trade OS entitlement for this workspace has expired.';
      } else if (data.status === 'SUSPENDED') {
        dbEntitled = false;
        entitlementStatus = 'SUSPENDED';
        failureReason = 'Ralion Trade OS entitlement for this workspace is suspended.';
      } else if (data.status === 'ACTIVE') {
        // Strict Fail-Closed Expiration Check
        if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
          dbEntitled = false;
          entitlementStatus = 'EXPIRED';
          failureReason = 'Ralion Trade OS trial access for this workspace has expired.';
        } else {
          dbEntitled = true;
          entitlementTier = (data.tier as any) || 'TRIAL';
          entitlementStatus = 'ACTIVE';
          defaultCurrency = data.default_currency || 'USD';
        }
      } else {
        dbEntitled = false;
        entitlementStatus = 'NOT_ENTITLED';
        failureReason = `Trade entitlement status is '${data.status}'.`;
      }
    } catch (dbErr: any) {
      dbEntitled = false;
      entitlementStatus = 'NOT_ENTITLED';
      failureReason = `Failed to query Trade entitlement from database: ${dbErr?.message || 'Database unavailable'}`;
    }

    if (!dbEntitled || entitlementStatus !== 'ACTIVE') {
      return {
        isEntitled: false,
        status: entitlementStatus,
        tier: entitlementTier,
        defaultCurrency,
        effectiveRole: 'VIEWER',
        isPlatformAdmin,
        canManageSuppliers: false,
        canCreatePurchaseOrders: false,
        canApprovePurchaseOrders: false,
        canManageQuotations: false,
        canManageOrders: false,
        canViewFinancials: false,
        reason: failureReason || 'Workspace does not possess an active database-verified Trade entitlement.',
      };
    }

    // Role mapping
    let effectiveRole: TradeRole = 'VIEWER';
    if (isPlatformAdmin || membership?.role === 'owner') {
      effectiveRole = 'TRADE_DIRECTOR';
    } else if (membership?.role === 'admin') {
      effectiveRole = 'PROCUREMENT_MANAGER';
    } else if (membership?.role === 'member') {
      effectiveRole = 'SALES_REPRESENTATIVE';
    }

    const isDirector = effectiveRole === 'TRADE_DIRECTOR';
    const isProcurement = effectiveRole === 'PROCUREMENT_MANAGER' || isDirector;
    const isSales = effectiveRole === 'SALES_REPRESENTATIVE' || isDirector;

    let roleDenied = false;
    if (requiredRole) {
      if (requiredRole === 'TRADE_DIRECTOR' && !isDirector) roleDenied = true;
      if (requiredRole === 'PROCUREMENT_MANAGER' && !isProcurement) roleDenied = true;
      if (requiredRole === 'SALES_REPRESENTATIVE' && !isSales) roleDenied = true;
    }

    return {
      isEntitled: !roleDenied,
      status: 'ACTIVE',
      tier: entitlementTier,
      defaultCurrency,
      effectiveRole,
      isPlatformAdmin,
      canManageSuppliers: isProcurement,
      canCreatePurchaseOrders: isProcurement,
      canApprovePurchaseOrders: isDirector,
      canManageQuotations: isSales,
      canManageOrders: isSales || isProcurement,
      canViewFinancials: isDirector,
      reason: roleDenied ? `Insufficient role permissions: '${requiredRole}' required.` : undefined,
      source: 'DATABASE_VERIFIED',
    };
  }

  static verifyEntitlementSync(context: RalionSessionContext | null): TradeEntitlementCheck {
    return {
      isEntitled: false,
      status: 'NOT_ENTITLED',
      tier: 'TRIAL',
      defaultCurrency: 'USD',
      effectiveRole: 'VIEWER',
      isPlatformAdmin: Boolean(context?.isPlatformAdmin),
      canManageSuppliers: false,
      canCreatePurchaseOrders: false,
      canApprovePurchaseOrders: false,
      canManageQuotations: false,
      canManageOrders: false,
      canViewFinancials: false,
      reason: 'Trade OS access strictly requires asynchronous database verification via verifyEntitlement().',
    };
  }

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
      if (body.workspaceId && body.workspaceId !== context.workspace.id) {
        return {
          valid: false,
          error: 'CROSS_WORKSPACE_REQUEST_DENIED: Request payload workspaceId does not match authenticated workspace.',
        };
      }
      if (body.organizationId && body.organizationId !== context.organization.id) {
        return {
          valid: false,
          error: 'CROSS_ORGANIZATION_REQUEST_DENIED: Request payload organizationId does not match authenticated organization.',
        };
      }
    }
    return { valid: true };
  }
}

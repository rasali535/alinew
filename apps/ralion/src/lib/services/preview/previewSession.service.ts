/**
 * Ralion OS — Platform Administrator Secure Preview Session Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Implements server-authorized, short-lived, cryptographically secure preview sessions
 * for platform administrators inspecting Ralion Retail and Ralion Trade.
 *
 * Security Requirements:
 * - Real UUID-backed internal preview workspaces in database.
 * - Platform-admin identity verification & bound preview session ownership.
 * - Fail-closed session expiration and instant revocation.
 * - Anti-tampering: Prevent unauthorized workspace switching via query parameter manipulation.
 * - Dedicated internal preview organization (NEVER touch Proinsight).
 * - Full audit trail for preview generation, revocation, and inspection.
 */

import crypto from 'node:crypto';
import { getPrivilegedSupabase } from '../../supabase/server';
import { PlatformAdminService } from '@ralion/auth/server';

export const INTERNAL_PREVIEW_ORGANIZATION_ID = '10000000-0000-0000-0000-000000000001';
export const INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID = '20000000-0000-0000-0000-000000000001';
export const INTERNAL_TRADE_PREVIEW_WORKSPACE_ID = '20000000-0000-0000-0000-000000000002';

export const PREVIEW_SESSION_DURATION_MS = 60 * 60 * 1000; // 60 minutes

export interface CreatePreviewSessionParams {
  adminUserId: string;
  adminEmail: string;
  product: 'retail' | 'trade';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PreviewSessionValidationResult {
  valid: boolean;
  session?: {
    id: string;
    adminUserId: string;
    adminEmail: string;
    organizationId: string;
    workspaceId: string;
    product: 'retail' | 'trade';
    status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
    expiresAt: string;
  };
  error?: string;
}

export class PreviewSessionService {
  /**
   * Hashes a raw session token with SHA-256 for secure DB storage.
   */
  static hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  }

  /**
   * Verifies that a user is an active platform administrator.
   */
  static async verifyAdmin(adminUserId: string, supabase: any, adminEmail?: string): Promise<boolean> {
    if (adminEmail && PlatformAdminService.verifyAdminAuthorization(null, adminEmail, null)) {
      return true;
    }
    const { data: adminGrant } = await supabase
      .from('platform_admins')
      .select('user_id, status')
      .eq('user_id', adminUserId)
      .eq('role', 'PLATFORM_ADMIN')
      .eq('status', 'ACTIVE')
      .maybeSingle();

    return Boolean(adminGrant);
  }

  /**
   * Ensures the database-backed internal preview organization and workspaces exist,
   * with separate sample stock, quotations, orders, expenses, and financial records.
   * STRICT SAFETY: Never modifies Proinsight's organization or workspace.
   */
  static async ensureInternalPreviewWorkspaces(adminUserId: string, supabaseClient?: any) {
    const supabase = supabaseClient || getPrivilegedSupabase();

    // 1. Ensure Preview Organization
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', INTERNAL_PREVIEW_ORGANIZATION_ID)
      .maybeSingle();

    if (!existingOrg) {
      await supabase.from('organizations').insert({
        id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        name: 'Ralion Internal Preview Lab',
        slug: 'ralion-internal-preview-lab',
        owner_id: adminUserId,
      });
    }

    // 2. Ensure Retail Preview Workspace
    const { data: existingRetailWs } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID)
      .maybeSingle();

    if (!existingRetailWs) {
      await supabase.from('workspaces').insert({
        id: INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID,
        organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        name: 'Ralion Retail Internal Preview',
        slug: 'ralion-retail-internal-preview',
        owner_id: adminUserId,
      });
    }

    // Ensure Trade Preview Workspace
    const { data: existingTradeWs } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', INTERNAL_TRADE_PREVIEW_WORKSPACE_ID)
      .maybeSingle();

    if (!existingTradeWs) {
      await supabase.from('workspaces').insert({
        id: INTERNAL_TRADE_PREVIEW_WORKSPACE_ID,
        organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        name: 'Ralion Trade Internal Preview',
        slug: 'ralion-trade-internal-preview',
        owner_id: adminUserId,
      });
    }

    // 3. Ensure Workspace Membership for Admin
    const workspacesToMember = [INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID, INTERNAL_TRADE_PREVIEW_WORKSPACE_ID];
    for (const wsId of workspacesToMember) {
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', wsId)
        .eq('user_id', adminUserId)
        .maybeSingle();

      if (!existingMember) {
        await supabase.from('workspace_members').insert({
          workspace_id: wsId,
          user_id: adminUserId,
          role: 'admin',
        });
      }
    }

    // 4. Ensure Database Entitlements in tenant_module_entitlements
    await supabase.from('tenant_module_entitlements').upsert([
      {
        organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        workspace_id: INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID,
        module_key: 'retail',
        status: 'ACTIVE',
        tier: 'PILOT',
        default_currency: 'USD',
      },
      {
        organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        workspace_id: INTERNAL_TRADE_PREVIEW_WORKSPACE_ID,
        module_key: 'trade',
        status: 'ACTIVE',
        tier: 'TRIAL',
        default_currency: 'USD',
      },
    ], { onConflict: 'workspace_id,module_key' });

    // 5. Seed separate sample data for Retail Preview if none exists
    const { count: retailProductCount } = await supabase
      .from('retail_products')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID);

    if (!retailProductCount || retailProductCount === 0) {
      await supabase.from('retail_products').insert([
        {
          organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
          workspace_id: INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID,
          name: 'Internal Preview Drill Bit Set 10pc',
          sku: 'PREV-DRL-10',
          category: 'Power Tools',
          barcode: '600980001001',
          selling_price: 29.99,
          purchase_cost: 12.50,
          reorder_level: 10,
          unit_of_measure: 'EACH',
        },
        {
          organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
          workspace_id: INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID,
          name: 'Internal Preview 24oz Framing Hammer',
          sku: 'PREV-HMR-24',
          category: 'Hand Tools',
          barcode: '600980001002',
          selling_price: 34.50,
          purchase_cost: 15.00,
          reorder_level: 5,
          unit_of_measure: 'EACH',
        },
        {
          organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
          workspace_id: INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID,
          name: 'Internal Preview Heavy Duty Toolbag',
          sku: 'PREV-BAG-01',
          category: 'Storage',
          barcode: '600980001003',
          selling_price: 55.00,
          purchase_cost: 24.00,
          reorder_level: 4,
          unit_of_measure: 'EACH',
        },
      ]);

      // Seed sample completed sale
      await supabase.from('retail_sales').insert({
        organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        workspace_id: INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID,
        sale_number: 'SAL-PREV-001',
        total_amount: 84.49,
        subtotal: 73.47,
        tax_total: 11.02,
        payment_method: 'CASH',
        payment_status: 'PAID',
        cashier_user_id: adminUserId,
        status: 'COMPLETED',
      });

      // Seed sample expense
      await supabase.from('retail_expenses').insert({
        organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        workspace_id: INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID,
        expense_number: 'EXP-PREV-001',
        category: 'MAINTENANCE',
        payee: 'Apex Tool Maintenance Ltd',
        amount: 45.00,
        tax_amount: 0.00,
        currency: 'USD',
        payment_method: 'BANK_TRANSFER',
        notes: 'Internal preview testing facility maintenance',
      });
    }

    // 6. Seed separate sample data for Trade Preview if none exists
    const { count: tradeSupplierCount } = await supabase
      .from('trade_suppliers')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', INTERNAL_TRADE_PREVIEW_WORKSPACE_ID);

    if (!tradeSupplierCount || tradeSupplierCount === 0) {
      const { data: insertedSuppliers } = await supabase.from('trade_suppliers').insert([
        {
          organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
          workspace_id: INTERNAL_TRADE_PREVIEW_WORKSPACE_ID,
          name: 'National Timber & Steel Works',
          code: 'SUP-NTS-01',
          email: 'orders@nationaltimber.example.invalid',
          payment_terms: 'NET30',
          lead_time_days: 7,
        },
        {
          organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
          workspace_id: INTERNAL_TRADE_PREVIEW_WORKSPACE_ID,
          name: 'Global Fasteners & Hardware Ltd',
          code: 'SUP-GFH-02',
          email: 'wholesale@globalfasteners.example.invalid',
          payment_terms: 'NET15',
          lead_time_days: 4,
        },
      ]).select('id, name');

      const supplierId = insertedSuppliers?.[0]?.id || null;

      const { data: insertedTradeProducts } = await supabase.from('trade_products').insert([
        {
          organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
          workspace_id: INTERNAL_TRADE_PREVIEW_WORKSPACE_ID,
          supplier_id: supplierId,
          name: 'Wholesale Structural C24 Timber 47x100mm 4.8m',
          sku: 'WD-47100-48',
          cost_price: 14.50,
          wholesale_price: 21.00,
          minimum_order_quantity: 50,
        },
        {
          organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
          workspace_id: INTERNAL_TRADE_PREVIEW_WORKSPACE_ID,
          supplier_id: supplierId,
          name: 'High Tensile Structural Bolts M16x80 Grade 8.8 (Box of 50)',
          sku: 'BLT-M16-80',
          cost_price: 42.00,
          wholesale_price: 65.00,
          minimum_order_quantity: 10,
        },
      ]).select('id, name, sku, wholesale_price');

      // Sample Quotation
      const { data: quote } = await supabase.from('trade_quotations').insert({
        organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        workspace_id: INTERNAL_TRADE_PREVIEW_WORKSPACE_ID,
        quote_number: 'QTE-PREV-1001',
        buyer_name: 'Metro Construction Group',
        buyer_company: 'Metro Infra Corp',
        buyer_email: 'procurement@metroinfra.example.invalid',
        total_amount: 1700.00,
        currency: 'USD',
        status: 'ISSUED',
      }).select('id').single();

      if (quote && insertedTradeProducts?.[0]) {
        await supabase.from('trade_quote_items').insert({
          quotation_id: quote.id,
          product_id: insertedTradeProducts[0].id,
          product_name: insertedTradeProducts[0].name,
          sku: insertedTradeProducts[0].sku,
          quantity: 50,
          unit_price: 21.00,
          line_total: 1050.00,
        });
      }

      // Sample Purchase Order
      const { data: po } = await supabase.from('trade_purchase_orders').insert({
        organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        workspace_id: INTERNAL_TRADE_PREVIEW_WORKSPACE_ID,
        po_number: 'PO-PREV-2001',
        supplier_id: supplierId,
        supplier_name: 'National Timber & Steel Works',
        total_amount: 1450.00,
        currency: 'USD',
        status: 'ORDERED',
      }).select('id').single();

      if (po && insertedTradeProducts?.[0]) {
        await supabase.from('trade_po_items').insert({
          po_id: po.id,
          product_id: insertedTradeProducts[0].id,
          product_name: insertedTradeProducts[0].name,
          sku: insertedTradeProducts[0].sku,
          quantity: 100,
          unit_cost: 14.50,
          line_total: 1450.00,
        });
      }
    }
  }

  /**
   * Creates an audited, short-lived preview session bound to the authenticated platform admin.
   */
  static async createPreviewSession(params: CreatePreviewSessionParams, supabaseClient?: any) {
    const supabase = supabaseClient || getPrivilegedSupabase();

    // 1. Verify platform admin identity
    const isAdmin = await this.verifyAdmin(params.adminUserId, supabase, params.adminEmail);
    if (!isAdmin) {
      throw new Error('UNAUTHORIZED: Caller is not an authorized platform administrator.');
    }

    // 2. Ensure real internal preview workspaces exist in database
    await this.ensureInternalPreviewWorkspaces(params.adminUserId, supabase);

    const workspaceId = params.product === 'retail'
      ? INTERNAL_RETAIL_PREVIEW_WORKSPACE_ID
      : INTERNAL_TRADE_PREVIEW_WORKSPACE_ID;

    // 3. Generate cryptographically strong random token
    const rawSessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + PREVIEW_SESSION_DURATION_MS).toISOString();

    const justification = params.reason && params.reason.trim().length >= 5
      ? params.reason.trim()
      : `Platform administrator operational inspection for Ralion ${params.product}`;

    // 4. Insert preview session record
    const { data: session, error: sessionErr } = await supabase
      .from('admin_preview_sessions')
      .insert({
        session_token_hash: tokenHash,
        admin_user_id: params.adminUserId,
        admin_email: params.adminEmail,
        organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
        workspace_id: workspaceId,
        product: params.product,
        status: 'ACTIVE',
        expires_at: expiresAt,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      })
      .select('id')
      .single();

    if (sessionErr || !session) {
      throw new Error(`Failed to create preview session: ${sessionErr?.message || 'Unknown database error'}`);
    }

    // 5. Append immutable audit log strictly under the internal preview organization
    await supabase.from('audit_logs').insert({
      organization_id: INTERNAL_PREVIEW_ORGANIZATION_ID,
      user_id: params.adminUserId,
      action: `ADMIN_PREVIEW_SESSION_CREATED`,
      module: 'PLATFORM_ADMIN',
      metadata: {
        sessionId: session.id,
        product: params.product,
        workspaceId,
        organizationId: INTERNAL_PREVIEW_ORGANIZATION_ID,
        adminEmail: params.adminEmail,
        reason: justification,
        expiresAt,
        timestamp: new Date().toISOString(),
      },
    });

    const previewUrl = params.product === 'retail'
      ? `/ralion/retail?preview=internal&ws=${workspaceId}&token=${rawSessionToken}`
      : `/ralion/industry/trade?preview=internal&ws=${workspaceId}&token=${rawSessionToken}`;

    return {
      sessionId: session.id,
      sessionToken: rawSessionToken,
      workspaceId,
      organizationId: INTERNAL_PREVIEW_ORGANIZATION_ID,
      product: params.product,
      expiresAt,
      previewUrl,
    };
  }

  /**
   * Validates a preview session token against the requested workspace and admin user.
   * Enforces:
   * - Session exists and is ACTIVE
   * - Token is not expired or revoked
   * - Token is strictly bound to caller's admin user ID
   * - Token is strictly bound to requested workspace (anti-workspace-switching)
   * - Caller remains a platform administrator
   */
  static async validatePreviewSession(
    token: string | null | undefined,
    workspaceId: string,
    adminUserId: string,
    supabaseClient?: any
  ): Promise<PreviewSessionValidationResult> {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return { valid: false, error: 'MISSING_PREVIEW_TOKEN' };
    }

    const supabase = supabaseClient || getPrivilegedSupabase();
    const tokenHash = this.hashToken(token);

    const { data: session, error } = await supabase
      .from('admin_preview_sessions')
      .select('id, admin_user_id, admin_email, organization_id, workspace_id, product, status, expires_at, revoked_at')
      .eq('session_token_hash', tokenHash)
      .maybeSingle();

    if (error || !session) {
      return { valid: false, error: 'INVALID_PREVIEW_SESSION' };
    }

    // Check revocation
    if (session.status === 'REVOKED' || session.revoked_at !== null) {
      return { valid: false, error: 'PREVIEW_SESSION_REVOKED' };
    }

    // Check expiration
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      // Mark as expired in DB
      await supabase
        .from('admin_preview_sessions')
        .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
        .eq('id', session.id);
      return { valid: false, error: 'PREVIEW_SESSION_EXPIRED' };
    }

    if (session.status !== 'ACTIVE') {
      return { valid: false, error: `PREVIEW_SESSION_${session.status}` };
    }

    // Strict Anti-Tampering: Session workspace must match requested workspace
    if (session.workspace_id !== workspaceId) {
      return { valid: false, error: 'WORKSPACE_MISMATCH' };
    }

    // Strict Anti-Impersonation: Session admin user must match current caller
    if (session.admin_user_id !== adminUserId) {
      return { valid: false, error: 'ADMIN_IDENTITY_MISMATCH' };
    }

    // Verify platform admin status remains active
    const isAdmin = await this.verifyAdmin(adminUserId, supabase, session.admin_email);
    if (!isAdmin) {
      return { valid: false, error: 'ADMIN_PRIVILEGE_LOST' };
    }

    return {
      valid: true,
      session: {
        id: session.id,
        adminUserId: session.admin_user_id,
        adminEmail: session.admin_email,
        organizationId: session.organization_id,
        workspaceId: session.workspace_id,
        product: session.product as any,
        status: session.status as any,
        expiresAt: session.expires_at,
      },
    };
  }

  /**
   * Revokes an active preview session immediately.
   */
  static async revokePreviewSession(sessionId: string, adminUserId: string, reason: string, supabaseClient?: any) {
    const supabase = supabaseClient || getPrivilegedSupabase();

    const { data: session } = await supabase
      .from('admin_preview_sessions')
      .select('id, workspace_id, product, organization_id')
      .eq('id', sessionId)
      .maybeSingle();

    if (!session) {
      throw new Error('Preview session not found.');
    }

    await supabase
      .from('admin_preview_sessions')
      .update({
        status: 'REVOKED',
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Audit log
    await supabase.from('audit_logs').insert({
      organization_id: session.organization_id,
      user_id: adminUserId,
      action: 'ADMIN_PREVIEW_SESSION_REVOKED',
      module: 'PLATFORM_ADMIN',
      metadata: {
        sessionId,
        workspaceId: session.workspace_id,
        product: session.product,
        reason,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true, revokedId: sessionId };
  }
}

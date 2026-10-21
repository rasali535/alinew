/**
 * Ralion OS — Trial Access Manager & Entitlement Engine Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Implements cryptographically secure demo access codes, atomic redemptions,
 * isolation safeguards, demo data seeding, and trial-to-commercial conversions.
 */

import crypto from 'node:crypto';
import { getPrivilegedSupabase } from '../../supabase/server';
import { PROINSIGHT_ORGANIZATION_ID, PROINSIGHT_WORKSPACE_ID } from '../retail/retailEntitlement.service';

import { RetailDemoDataService } from '../retail/retailDemoData.service';
import { RetailCurrency } from '@ralion/database';

export interface GenerateTrialCodeParams {
  eligibleProducts: Array<'retail' | 'trade'>;
  durationDays?: number;
  maxRedemptions?: number;
  workspaceMode?: 'DEMO_DATA' | 'CLEAN_WORKSPACE';
  restrictedEmail?: string;
  restrictedOrganizationId?: string;
  restrictedWorkspaceId?: string;
  expiresAt?: string | Date;
  notes?: string;
  createdByUserId?: string;
  adminEmail?: string;
}

export interface GrantWorkspaceTrialParams {
  organizationId: string;
  workspaceId: string;
  eligibleProducts?: Array<'retail' | 'trade'>;
  durationDays?: number;
  currency?: RetailCurrency;
  workspaceMode?: 'DEMO_DATA' | 'CLEAN_WORKSPACE';
  notes?: string;
  reason: string;
  adminUserId: string;
  adminEmail: string;
}

export interface RedeemTrialCodeParams {
  rawCode: string;
  userId: string;
  organizationId: string;
  workspaceId: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ExtendTrialParams {
  workspaceId?: string;
  codeId?: string;
  additionalDays: number;
  adminUserId: string;
  adminEmail: string;
  reason: string;
}

export interface RevokeTrialParams {
  codeId?: string;
  workspaceId?: string;
  adminUserId: string;
  adminEmail: string;
  reason: string;
}

export interface ConvertTrialParams {
  organizationId?: string;
  workspaceId?: string;
  codeId?: string;
  moduleKey?: 'retail' | 'trade' | 'both';
  targetTier?: 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  adminUserId: string;
  adminEmail: string;
  notes?: string;
}

export class TrialRateLimiter {
  private static redemptionAttempts: Map<string, { count: number; resetAt: number }> = new Map();
  private static creationAttempts: Map<string, { count: number; resetAt: number }> = new Map();

  static checkRedemptionLimit(key: string, maxAttempts = 5, windowMs = 60000): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const entry = this.redemptionAttempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.redemptionAttempts.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterMs: 0 };
    }
    if (entry.count >= maxAttempts) {
      return { allowed: false, retryAfterMs: entry.resetAt - now };
    }
    entry.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  static checkCreationLimit(key: string, maxAttempts = 10, windowMs = 60000): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const entry = this.creationAttempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.creationAttempts.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterMs: 0 };
    }
    if (entry.count >= maxAttempts) {
      return { allowed: false, retryAfterMs: entry.resetAt - now };
    }
    entry.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  static reset() {
    this.redemptionAttempts.clear();
    this.creationAttempts.clear();
  }
}

export class TrialAccessService {
  /**
   * Generates a cryptographically random access code format: RT-XXXX-XXXX-XXXX
   * Codes use Crockford-like base32 chars (excluding 0, O, 1, I for human clarity).
   */
  static generateRandomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const generateSegment = (length: number) => {
      const bytes = crypto.randomBytes(length);
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
      }
      return result;
    };
    return `RT-${generateSegment(4)}-${generateSegment(4)}-${generateSegment(4)}`;
  }

  static hashCode(rawCode: string): string {
    return crypto
      .createHash('sha256')
      .update(rawCode.trim().toUpperCase())
      .digest('hex');
  }

  static getCodePrefix(rawCode: string): string {
    const parts = rawCode.trim().toUpperCase().split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}-****-****`;
    }
    return 'RT-DEMO-****';
  }

  /**
   * Direct Workspace Trial Grant (Platform Administrator Command Centre).
   * Grants Retail (and/or Trade) demo access directly to an eligible customer workspace
   * without requiring an access voucher code.
   *
   * Safeguards:
   * 1. Preserves Proinsight data and entitlements.
   * 2. NEVER overwrites an active paid commercial subscription (STANDARD, PROFESSIONAL, ENTERPRISE).
   * 3. Validates mandatory audit justification (reason >= 5 chars).
   * 4. Enforces CLEAN_WORKSPACE as default; if DEMO_DATA is selected, seeds with deterministic UUIDs and configured currency.
   * 5. Atomically registers entitlement in tenant_module_entitlements and records redemption/grant in trial_code_redemptions.
   * 6. Appends immutable audit log entry.
   */
  static async grantWorkspaceTrialDirectly(params: GrantWorkspaceTrialParams) {
    const supabase = getPrivilegedSupabase();

    // 1. Parameter Validation
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('INVALID_ARGUMENT: A mandatory audit justification of at least 5 characters is required.');
    }
    if (!params.organizationId || !params.workspaceId) {
      throw new Error('INVALID_ARGUMENT: Both organizationId and workspaceId are required for direct demo grants.');
    }

    const durationDays = params.durationDays && params.durationDays > 0 ? Number(params.durationDays) : 14;
    if (durationDays < 1 || durationDays > 365) {
      throw new Error('INVALID_ARGUMENT: Trial duration must be between 1 and 365 days.');
    }

    const eligibleProducts = (params.eligibleProducts && params.eligibleProducts.length > 0)
      ? params.eligibleProducts
      : ['retail' as const];

    for (const p of eligibleProducts) {
      if (!['retail', 'trade'].includes(p)) {
        throw new Error(`INVALID_ARGUMENT: Unsupported product module key '${p}'.`);
      }
    }

    const currency: RetailCurrency = params.currency || 'USD';
    const allowedCurrencies = ['USD', 'BWP', 'ZAR', 'EUR', 'GBP'];
    if (!allowedCurrencies.includes(currency)) {
      throw new Error(`INVALID_ARGUMENT: Unsupported currency '${currency}'.`);
    }

    const workspaceMode = params.workspaceMode === 'DEMO_DATA' ? 'DEMO_DATA' : 'CLEAN_WORKSPACE';
    const now = Date.now();
    const expiresAt = new Date(now + durationDays * 86400000).toISOString();

    // 2. Tenancy Validation: Verify workspace belongs to organization (strictly reject cross-tenant)
    const { data: workspaceRecord, error: wsError } = await supabase
      .from('workspaces')
      .select('id, organization_id, name')
      .eq('id', params.workspaceId)
      .maybeSingle();

    if (wsError) {
      throw new Error(`DATABASE_ERROR: Failed to query workspace record: ${wsError.message}`);
    }
    if (!workspaceRecord) {
      throw new Error(`INVALID_WORKSPACE: Target workspace ${params.workspaceId} does not exist.`);
    }
    if (workspaceRecord.organization_id !== params.organizationId) {
      throw new Error(
        `CROSS_TENANT_REJECTED: Workspace ${params.workspaceId} does not belong to organization ${params.organizationId}. Cross-tenant grants are strictly forbidden.`
      );
    }

    // 3. Safeguard: Check if workspace currently has an active paid or PILOT plan
    const { data: existingEntitlements, error: entCheckError } = await supabase
      .from('tenant_module_entitlements')
      .select('id, module_key, tier, status, expires_at')
      .eq('workspace_id', params.workspaceId);

    if (entCheckError) {
      throw new Error(`DATABASE_ERROR: Failed to verify workspace entitlement status: ${entCheckError.message}`);
    }

    for (const ent of existingEntitlements || []) {
      const isPaidOrPilot = ['PILOT', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE'].includes(ent.tier);
      const isUnexpired = !ent.expires_at || new Date(ent.expires_at).getTime() > now;
      if (isPaidOrPilot && ent.status === 'ACTIVE' && isUnexpired && eligibleProducts.includes(ent.module_key as any)) {
        throw new Error(
          `SAFEGUARD_BLOCKED: Workspace already possesses an active ${ent.tier} commercial entitlement for module '${ent.module_key}'. Active paid/pilot subscriptions cannot be downgraded or overwritten with a demo trial.`
        );
      }
    }

    // 4. Demo Data Live Business Record Safeguard
    if (workspaceMode === 'DEMO_DATA') {
      const { data: liveProducts, error: prodErr } = await supabase
        .from('retail_products')
        .select('id, is_pilot_demo')
        .eq('workspace_id', params.workspaceId)
        .limit(10);

      if (!prodErr && liveProducts && liveProducts.some((p: any) => !p.is_pilot_demo)) {
        throw new Error(
          `SAFEGUARD_BLOCKED: Destination workspace contains live customer products. Seeding demo data into an active business workspace is prohibited.`
        );
      }
    }

    // 5. ATOMIC EXECUTION: Try atomic database RPC function first
    let rpcExecuted = false;
    let redemptionId: string | null = null;

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('grant_workspace_trial_access', {
        p_organization_id: params.organizationId,
        p_workspace_id: params.workspaceId,
        p_eligible_products: eligibleProducts,
        p_duration_days: durationDays,
        p_currency: currency,
        p_workspace_mode: workspaceMode,
        p_reason: params.reason.trim(),
        p_admin_user_id: params.adminUserId || null,
        p_admin_email: params.adminEmail || null,
        p_notes: params.notes || null,
      });

      if (!rpcError && rpcData) {
        rpcExecuted = true;
        redemptionId = rpcData.redemptionId || null;
      } else if (rpcError) {
        const msg = rpcError.message || '';
        if (
          msg.includes('SAFEGUARD_BLOCKED') ||
          msg.includes('CROSS_TENANT_REJECTED') ||
          msg.includes('INVALID_WORKSPACE') ||
          msg.includes('INVALID_ARGUMENT')
        ) {
          throw new Error(msg);
        }
        console.warn('[TrialAccessService] grant_workspace_trial_access RPC unavailable, attempting server-level atomic orchestration:', msg);
      }
    } catch (rpcCallErr: any) {
      if (
        rpcCallErr.message?.includes('SAFEGUARD_BLOCKED') ||
        rpcCallErr.message?.includes('CROSS_TENANT_REJECTED') ||
        rpcCallErr.message?.includes('INVALID_WORKSPACE') ||
        rpcCallErr.message?.includes('INVALID_ARGUMENT')
      ) {
        throw rpcCallErr;
      }
      console.warn('[TrialAccessService] RPC invocation exception, falling back to server orchestration:', rpcCallErr.message);
    }

    // 6. Application-level atomic orchestration (zero partial writes tolerated)
    if (!rpcExecuted) {
      // Step A: Attempt redemption insertion FIRST
      // If trial_code_redemptions fails (e.g. code_id NOT NULL or missing columns before migration),
      // fail closed immediately WITHOUT touching tenant_module_entitlements!
      const redemptionInsert = {
        code_id: null,
        user_id: params.adminUserId || '00000000-0000-0000-0000-000000000000',
        organization_id: params.organizationId,
        workspace_id: params.workspaceId,
        status: 'ACTIVE',
        trial_starts_at: new Date().toISOString(),
        trial_expires_at: expiresAt,
        grant_type: 'ADMIN_DIRECT',
        granted_by_user_id: params.adminUserId || null,
        reason: params.reason.trim(),
        redeemed_at: new Date().toISOString(),
      };

      const { data: redemptionData, error: redemptionError } = await supabase
        .from('trial_code_redemptions')
        .insert(redemptionInsert)
        .select()
        .single();

      if (redemptionError) {
        console.error('[TrialAccessService] trial_code_redemptions insert failed:', redemptionError);
        throw new Error(
          `PERSISTENCE_FAILED: Unable to record trial redemption audit record (${redemptionError.message}). ` +
          `Database migration '20261024000000_harden_trial_redemption_and_workspace_grants.sql' must be applied. ` +
          `Zero entitlements were modified.`
        );
      }

      redemptionId = redemptionData.id;

      // Step B: Upsert entitlements using the CORRECT unique constraint (workspace_id, module_key)
      try {
        for (const moduleKey of eligibleProducts) {
          const { error: upsertError } = await supabase
            .from('tenant_module_entitlements')
            .upsert(
              {
                organization_id: params.organizationId,
                workspace_id: params.workspaceId,
                module_key: moduleKey,
                tier: 'TRIAL',
                status: 'ACTIVE',
                expires_at: expiresAt,
                default_currency: currency,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'workspace_id,module_key' }
            );

          if (upsertError) {
            throw new Error(`Failed to grant entitlement for ${moduleKey}: ${upsertError.message}`);
          }
        }
      } catch (upsertFailure: any) {
        // Rollback redemption record to guarantee atomic consistency
        console.error('[TrialAccessService] Entitlement upsert failed, rolling back redemption record:', upsertFailure);
        await supabase.from('trial_code_redemptions').delete().eq('id', redemptionId);
        throw new Error(`PERSISTENCE_FAILED: Entitlement upsert failed (${upsertFailure.message}). Rolled back redemption record.`);
      }

      // Step C: Append immutable audit log entry
      const { error: auditError } = await supabase.from('audit_logs').insert({
        organization_id: params.organizationId,
        user_id: params.adminUserId,
        action: 'WORKSPACE_TRIAL_GRANTED',
        module: 'TRIAL_ACCESS_MANAGER',
        metadata: {
          workspaceId: params.workspaceId,
          organizationId: params.organizationId,
          eligibleProducts,
          durationDays,
          currency,
          workspaceMode,
          reason: params.reason.trim(),
          notes: params.notes || null,
          adminEmail: params.adminEmail,
          trialExpiresAt: expiresAt,
          redemptionId,
          timestamp: new Date().toISOString(),
        },
      });

      if (auditError) {
        console.warn('[TrialAccessService] audit_log insert failed (non-blocking for grant completion):', auditError.message);
      }
    }

    // 7. Seed demonstration records if DEMO_DATA selected
    let demoDataLoaded = false;
    if (workspaceMode === 'DEMO_DATA') {
      if (eligibleProducts.includes('retail')) {
        await RetailDemoDataService.loadHardwareStoreDemoData(
          params.organizationId,
          params.workspaceId,
          params.adminUserId,
          { currency, force: false }
        );
        demoDataLoaded = true;
      }
      if (eligibleProducts.includes('trade')) {
        await this.seedDemoWorkspaceData(params.organizationId, params.workspaceId, ['trade']);
      }
    }

    return {
      success: true,
      message: `Retail demo access granted successfully to workspace for ${durationDays} days (${currency}).`,
      workspaceId: params.workspaceId,
      organizationId: params.organizationId,
      eligibleProducts,
      durationDays,
      currency,
      workspaceMode,
      expiresAt,
      redemptionId,
      demoDataLoaded,
    };
  }

  /**
   * Generates and registers a new cryptographically secure trial access code.
   */
  static async createTrialCode(params: GenerateTrialCodeParams) {
    const supabase = getPrivilegedSupabase();
    const rawCode = this.generateRandomCode();
    const codeHash = this.hashCode(rawCode);
    const codePrefix = this.getCodePrefix(rawCode);

    const eligibleProducts = params.eligibleProducts.length > 0 ? params.eligibleProducts : ['retail'];
    const durationDays = params.durationDays && params.durationDays > 0 ? params.durationDays : 14;
    const maxRedemptions = params.maxRedemptions && params.maxRedemptions > 0 ? params.maxRedemptions : 1;
    const workspaceMode = params.workspaceMode || 'DEMO_DATA';

    const insertPayload: any = {
      code_hash: codeHash,
      code_prefix: codePrefix,
      eligible_products: eligibleProducts,
      duration_days: durationDays,
      max_redemptions: maxRedemptions,
      redemption_count: 0,
      workspace_mode: workspaceMode,
      restricted_email: params.restrictedEmail ? params.restrictedEmail.trim().toLowerCase() : null,
      restricted_organization_id: params.restrictedOrganizationId || null,
      restricted_workspace_id: params.restrictedWorkspaceId || null,
      status: 'ACTIVE',
      expires_at: params.expiresAt ? new Date(params.expiresAt).toISOString() : null,
      created_by_user_id: params.createdByUserId || null,
      notes: params.notes || null,
    };

    const { data, error } = await supabase
      .from('trial_access_codes')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to generate trial access code: ${error.message}`);
    }

    // Record audit event
    await supabase.from('audit_logs').insert({
      organization_id: params.restrictedOrganizationId || PROINSIGHT_ORGANIZATION_ID,
      user_id: params.createdByUserId || '00000000-0000-0000-0000-000000000000',
      action: 'TRIAL_CODE_GENERATED',
      module: 'TRIAL_ACCESS_MANAGER',
      metadata: {
        codeId: data.id,
        codePrefix,
        eligibleProducts,
        durationDays,
        maxRedemptions,
        workspaceMode,
        restrictedEmail: params.restrictedEmail || null,
        adminEmail: params.adminEmail || 'admin',
        timestamp: new Date().toISOString(),
      },
    });

    return {
      ...data,
      rawCode, // Returned ONLY at creation time for admin clipboard/display
    };
  }

  /**
   * Redeems a trial code atomically using stored procedure public.redeem_trial_access_code().
   * Handles row-level lock, quota decrement, entitlement upsert, and demo data seeding.
   */
  static async redeemTrialCode(params: RedeemTrialCodeParams) {
    const supabase = getPrivilegedSupabase();
    const codeHash = this.hashCode(params.rawCode);

    // Call atomic stored procedure
    const { data, error } = await supabase.rpc('redeem_trial_access_code', {
      p_code_hash: codeHash,
      p_user_id: params.userId,
      p_organization_id: params.organizationId,
      p_workspace_id: params.workspaceId,
      p_ip: params.ipAddress || null,
      p_user_agent: params.userAgent || null,
    });

    if (error) {
      throw new Error(error.message);
    }

    const result = data as {
      success: boolean;
      redemption_id: string;
      code_id: string;
      eligible_products: string[];
      workspace_mode: 'DEMO_DATA' | 'CLEAN_WORKSPACE';
      duration_days: number;
      trial_expires_at: string;
    };

    // If workspaceMode is DEMO_DATA, seed sample data into the isolated workspace
    if (result.workspace_mode === 'DEMO_DATA') {
      await this.seedDemoWorkspaceData(params.organizationId, params.workspaceId, result.eligible_products);
    }

    // Append to audit log
    await supabase.from('audit_logs').insert({
      organization_id: params.organizationId,
      user_id: params.userId,
      action: 'TRIAL_CODE_REDEEMED',
      module: 'TRIAL_ACCESS_MANAGER',
      metadata: {
        codeId: result.code_id,
        redemptionId: result.redemption_id,
        workspaceId: params.workspaceId,
        eligibleProducts: result.eligible_products,
        workspaceMode: result.workspace_mode,
        trialExpiresAt: result.trial_expires_at,
        userEmail: params.userEmail,
        timestamp: new Date().toISOString(),
      },
    });

    return result;
  }

  /**
   * Seeds realistic demo records into the customer's dedicated workspace.
   * STRICT SAFETY: Never writes to Proinsight workspace.
   */
  static async seedDemoWorkspaceData(
    organizationId: string,
    workspaceId: string,
    eligibleProducts: string[]
  ) {
    if (workspaceId === PROINSIGHT_WORKSPACE_ID) {
      throw new Error('SAFETY_VIOLATION: Demo data seeding strictly denied for Proinsight live workspace.');
    }

    const supabase = getPrivilegedSupabase();

    // 1. Seed Trade Data if Trade is eligible
    if (eligibleProducts.includes('trade')) {
      const suppliers = [
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'Apex Industrial Timber & Steel',
          code: 'SUP-APEX-01',
          email: 'orders@apexindustrial.example.invalid',
          phone: '+1 555-019-2831',
          payment_terms: 'NET30',
          lead_time_days: 5,
        },
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'Pacific Hardware Distribution',
          code: 'SUP-PACIFIC-02',
          email: 'sales@pacifichardware.example.invalid',
          phone: '+1 555-019-4829',
          payment_terms: 'NET15',
          lead_time_days: 3,
        },
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'Titan Fasteners & Heavy Tools',
          code: 'SUP-TITAN-03',
          email: 'wholesale@titanfasteners.example.invalid',
          phone: '+1 555-019-8812',
          payment_terms: 'NET60',
          lead_time_days: 10,
        },
      ];

      const { data: insertedSuppliers } = await supabase
        .from('trade_suppliers')
        .insert(suppliers)
        .select();

      const sup1 = insertedSuppliers?.[0]?.id;

      // Seed trade products
      const tradeProducts = [
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'Structural Treated Timber 50x100mm (3.6m)',
          sku: 'TRD-TMB-50100',
          category: 'Timber & Lumber',
          unit: 'piece',
          cost_price: 14.50,
          wholesale_price: 22.00,
          minimum_order_quantity: 20,
        },
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'High-Tensile Galvanized Hex Bolts M12 (Box 100)',
          sku: 'TRD-FST-M12HEX',
          category: 'Fasteners',
          unit: 'box',
          cost_price: 28.00,
          wholesale_price: 42.50,
          minimum_order_quantity: 5,
        },
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'Portland Commercial Cement 42.5N (50kg Bag)',
          sku: 'TRD-CEM-50KG',
          category: 'Masonry & Concrete',
          unit: 'bag',
          cost_price: 7.20,
          wholesale_price: 11.80,
          minimum_order_quantity: 40,
        },
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'Diamond Tipped Angle Grinder Blade 230mm',
          sku: 'TRD-TLS-GRN230',
          category: 'Power Tool Accessories',
          unit: 'piece',
          cost_price: 18.00,
          wholesale_price: 29.90,
          minimum_order_quantity: 10,
        },
      ];

      const { data: insertedProducts } = await supabase
        .from('trade_products')
        .insert(tradeProducts)
        .select();

      // Seed sample Purchase Order
      if (insertedSuppliers && insertedSuppliers.length > 0) {
        const po = {
          organization_id: organizationId,
          workspace_id: workspaceId,
          po_number: 'PO-DEMO-1001',
          supplier_id: sup1,
          supplier_name: 'Apex Industrial Timber & Steel',
          total_amount: 1450.00,
          currency: 'USD',
          status: 'ORDERED',
          order_date: new Date().toISOString().split('T')[0],
          notes: 'Standard replenishment batch for wholesale yard.',
        };
        const { data: insertedPo } = await supabase.from('trade_purchase_orders').insert(po).select().single();
        if (insertedPo && insertedProducts && insertedProducts[0]) {
          await supabase.from('trade_po_items').insert({
            po_id: insertedPo.id,
            product_id: insertedProducts[0].id,
            product_name: insertedProducts[0].name,
            sku: insertedProducts[0].sku,
            quantity: 100,
            unit_cost: 14.50,
            line_total: 1450.00,
          });
        }
      }

      // Seed sample Wholesale Quotation
      const quotation = {
        organization_id: organizationId,
        workspace_id: workspaceId,
        quote_number: 'QT-DEMO-2001',
        buyer_name: 'David Vance',
        buyer_company: 'Vance Commercial Contractors LLC',
        buyer_email: 'dvance@vancecontractors.example.invalid',
        total_amount: 2200.00,
        currency: 'USD',
        status: 'ISSUED',
        valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        notes: 'Special project contractor volume quotation.',
      };
      const { data: insertedQuote } = await supabase.from('trade_quotations').insert(quotation).select().single();
      if (insertedQuote && insertedProducts && insertedProducts[0]) {
        await supabase.from('trade_quote_items').insert({
          quotation_id: insertedQuote.id,
          product_id: insertedProducts[0].id,
          product_name: insertedProducts[0].name,
          sku: insertedProducts[0].sku,
          quantity: 100,
          unit_price: 22.00,
          line_total: 2200.00,
        });
      }
    }

    // 2. Seed Retail sample products if Retail is eligible
    if (eligibleProducts.includes('retail')) {
      await RetailDemoDataService.loadHardwareStoreDemoData(
        organizationId,
        workspaceId,
        '00000000-0000-0000-0000-000000000000',
        { currency: 'USD', force: false }
      );
    }
  }

  /**
   * Extends an active or expired trial by additional days.
   * Supports either workspaceId directly, or codeId (extending all workspaces redeemed under that code).
   */
  static async extendTrial(params: ExtendTrialParams) {
    if (params.additionalDays <= 0) {
      throw new Error('Additional trial days must be greater than zero.');
    }
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('A justification reason of at least 5 characters is required for the audit trail.');
    }

    const supabase = getPrivilegedSupabase();
    const targetWorkspaceIds: string[] = [];

    if (params.workspaceId) {
      targetWorkspaceIds.push(params.workspaceId);
    }

    if (params.codeId) {
      // Find all redemptions under this code
      const { data: redemptions } = await supabase
        .from('trial_code_redemptions')
        .select('workspace_id')
        .eq('code_id', params.codeId);

      for (const r of redemptions || []) {
        if (r.workspace_id && !targetWorkspaceIds.includes(r.workspace_id)) {
          targetWorkspaceIds.push(r.workspace_id);
        }
      }

      // Also extend code's expires_at if set
      const { data: codeData } = await supabase
        .from('trial_access_codes')
        .select('expires_at')
        .eq('id', params.codeId)
        .maybeSingle();

      if (codeData?.expires_at) {
        const curExp = new Date(codeData.expires_at).getTime();
        const base = curExp > Date.now() ? curExp : Date.now();
        await supabase
          .from('trial_access_codes')
          .update({
            expires_at: new Date(base + params.additionalDays * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', params.codeId);
      }
    }

    if (targetWorkspaceIds.length === 0 && !params.codeId) {
      throw new Error('Either workspaceId or codeId must be provided to extend trial access.');
    }

    const now = Date.now();
    for (const wsId of targetWorkspaceIds) {
      const { data: entitlements } = await supabase
        .from('tenant_module_entitlements')
        .select('*')
        .eq('workspace_id', wsId);

      for (const ent of entitlements || []) {
        const currentExpiry = ent.expires_at ? new Date(ent.expires_at).getTime() : now;
        const baseTime = currentExpiry > now ? currentExpiry : now;
        const newExpiry = new Date(baseTime + params.additionalDays * 86400000).toISOString();

        await supabase
          .from('tenant_module_entitlements')
          .update({
            status: 'ACTIVE',
            expires_at: newExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ent.id);
      }

      // Update redemption records
      await supabase
        .from('trial_code_redemptions')
        .update({
          status: 'ACTIVE',
          trial_expires_at: new Date(now + params.additionalDays * 86400000).toISOString(),
        })
        .eq('workspace_id', wsId);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      organization_id: PROINSIGHT_ORGANIZATION_ID,
      user_id: params.adminUserId,
      action: 'TRIAL_EXTENDED',
      module: 'TRIAL_ACCESS_MANAGER',
      metadata: {
        workspaceId: params.workspaceId || null,
        codeId: params.codeId || null,
        extendedWorkspaces: targetWorkspaceIds,
        additionalDays: params.additionalDays,
        reason: params.reason,
        adminEmail: params.adminEmail,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: `Trial extended by ${params.additionalDays} days for ${targetWorkspaceIds.length > 0 ? targetWorkspaceIds.length + ' workspace(s)' : 'code'}.`,
    };
  }

  /**
   * Revokes trial access for a code or workspace.
   * Code revocation GUARANTEES that previously redeemed workspace entitlements are revoked/suspended.
   */
  static async revokeTrial(params: RevokeTrialParams) {
    if (!params.reason || params.reason.trim().length < 5) {
      throw new Error('A justification reason of at least 5 characters is required for the audit trail.');
    }

    const supabase = getPrivilegedSupabase();
    const affectedWorkspaceIds: string[] = [];

    if (params.codeId) {
      await supabase
        .from('trial_access_codes')
        .update({
          status: 'REVOKED',
          revoked_by_user_id: params.adminUserId,
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.codeId);

      // Cascade to all redemptions under this code
      const { data: redemptions } = await supabase
        .from('trial_code_redemptions')
        .select('workspace_id')
        .eq('code_id', params.codeId);

      for (const r of redemptions || []) {
        if (r.workspace_id && !affectedWorkspaceIds.includes(r.workspace_id)) {
          affectedWorkspaceIds.push(r.workspace_id);
        }
      }

      await supabase
        .from('trial_code_redemptions')
        .update({ status: 'REVOKED' })
        .eq('code_id', params.codeId);
    }

    if (params.workspaceId && !affectedWorkspaceIds.includes(params.workspaceId)) {
      affectedWorkspaceIds.push(params.workspaceId);
    }

    // Suspend trial entitlements for all affected workspaces
    for (const wsId of affectedWorkspaceIds) {
      await supabase
        .from('tenant_module_entitlements')
        .update({
          status: 'SUSPENDED',
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', wsId)
        .eq('tier', 'TRIAL');

      await supabase
        .from('trial_code_redemptions')
        .update({ status: 'REVOKED' })
        .eq('workspace_id', wsId);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      organization_id: PROINSIGHT_ORGANIZATION_ID,
      user_id: params.adminUserId,
      action: 'TRIAL_REVOKED',
      module: 'TRIAL_ACCESS_MANAGER',
      metadata: {
        codeId: params.codeId || null,
        workspaceId: params.workspaceId || null,
        revokedWorkspaces: affectedWorkspaceIds,
        reason: params.reason,
        adminEmail: params.adminEmail,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true, message: 'Trial access revoked and associated workspace entitlements suspended.' };
  }

  /**
   * Converts an active or completed trial into a paid commercial subscription.
   * Customer records are NEVER destroyed or mutated.
   * Supports workspaceId or codeId.
   */
  static async convertTrialToPaid(params: ConvertTrialParams) {
    const supabase = getPrivilegedSupabase();
    let workspaceId = params.workspaceId;
    let organizationId = params.organizationId;

    if (!workspaceId && params.codeId) {
      // Find redemption by code_id
      const { data: redemption } = await supabase
        .from('trial_code_redemptions')
        .select('workspace_id, organization_id')
        .eq('code_id', params.codeId)
        .order('redeemed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (redemption) {
        workspaceId = redemption.workspace_id;
        organizationId = redemption.organization_id;
      }
    }

    if (!workspaceId) {
      throw new Error('Workspace ID is required for commercial plan conversion.');
    }

    const targetTier = params.targetTier || 'STANDARD';

    // Upgrade entitlements
    const { data: updatedEntitlements, error } = await supabase
      .from('tenant_module_entitlements')
      .update({
        tier: targetTier,
        status: 'ACTIVE',
        expires_at: null, // Indefinite or managed by recurring billing engine
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId)
      .select();

    if (error) {
      throw new Error(`Failed to convert trial: ${error.message}`);
    }

    // Update redemption status to CONVERTED
    await supabase
      .from('trial_code_redemptions')
      .update({
        status: 'CONVERTED',
        converted_at: new Date().toISOString(),
      })
      .eq('workspace_id', workspaceId);

    // Audit log
    await supabase.from('audit_logs').insert({
      organization_id: organizationId || PROINSIGHT_ORGANIZATION_ID,
      user_id: params.adminUserId,
      action: 'TRIAL_CONVERTED_TO_COMMERCIAL',
      module: 'TRIAL_ACCESS_MANAGER',
      metadata: {
        workspaceId,
        organizationId: organizationId || null,
        codeId: params.codeId || null,
        targetTier,
        notes: params.notes || 'Commercial conversion from Command Centre',
        adminEmail: params.adminEmail,
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: `Workspace successfully converted to ${targetTier} commercial plan. All customer data preserved.`,
      entitlements: updatedEntitlements,
    };
  }

  /**
   * Data Portability: Exports authorized trial data for a customer workspace.
   */
  static async exportTrialData(workspaceId: string) {
    const supabase = getPrivilegedSupabase();

    const [suppliers, tradeProducts, pos, quotes, retailProducts, retailSales] = await Promise.all([
      supabase.from('trade_suppliers').select('*').eq('workspace_id', workspaceId),
      supabase.from('trade_products').select('*').eq('workspace_id', workspaceId),
      supabase.from('trade_purchase_orders').select('*, trade_po_items(*)').eq('workspace_id', workspaceId),
      supabase.from('trade_quotations').select('*, trade_quote_items(*)').eq('workspace_id', workspaceId),
      supabase.from('retail_products').select('*').eq('workspace_id', workspaceId),
      supabase.from('retail_sales').select('*, retail_sale_items(*)').eq('workspace_id', workspaceId),
    ]);

    return {
      exportTimestamp: new Date().toISOString(),
      workspaceId,
      data: {
        tradeSuppliers: suppliers.data || [],
        tradeProducts: tradeProducts.data || [],
        tradePurchaseOrders: pos.data || [],
        tradeQuotations: quotes.data || [],
        retailProducts: retailProducts.data || [],
        retailSales: retailSales.data || [],
      },
    };
  }

  /**
   * Retrieves trial telemetry metrics for the Admin Command Centre.
   */
  static async getTrialMetrics() {
    const supabase = getPrivilegedSupabase();

    const [codesRes, redemptionsRes] = await Promise.all([
      supabase.from('trial_access_codes').select('*').order('created_at', { ascending: false }),
      supabase
        .from('trial_code_redemptions')
        .select('*, workspaces(name, slug), organizations(name)')
        .order('redeemed_at', { ascending: false }),
    ]);

    const codes = codesRes.data || [];
    const redemptions = redemptionsRes.data || [];

    const now = Date.now();
    const soonWindow = 48 * 3600 * 1000; // 48 hours

    const activeTrials = redemptions.filter(
      r => r.status === 'ACTIVE' && new Date(r.trial_expires_at).getTime() > now
    );

    const expiringSoon = activeTrials.filter(
      r => new Date(r.trial_expires_at).getTime() - now <= soonWindow
    );

    const expiredTrials = redemptions.filter(
      r => r.status === 'EXPIRED' || (r.status === 'ACTIVE' && new Date(r.trial_expires_at).getTime() <= now)
    );

    const convertedTrials = redemptions.filter(r => r.status === 'CONVERTED');

    // Count by product
    const retailCount = codes.filter(c => c.eligible_products.includes('retail')).length;
    const tradeCount = codes.filter(c => c.eligible_products.includes('trade')).length;
    const bothCount = codes.filter(
      c => c.eligible_products.includes('retail') && c.eligible_products.includes('trade')
    ).length;

    return {
      totalCodes: codes.length,
      activeCodes: codes.filter(c => c.status === 'ACTIVE').length,
      totalRedemptions: redemptions.length,
      activeTrials: activeTrials.length,
      expiringSoon: expiringSoon.length,
      expiredTrials: expiredTrials.length,
      convertedTrials: convertedTrials.length,
      products: {
        retail: retailCount,
        trade: tradeCount,
        both: bothCount,
      },
      codes,
      recentCodes: codes,
      redemptions,
      revokedTrials: codes.filter(c => c.status === 'REVOKED').length,
    };
  }
}

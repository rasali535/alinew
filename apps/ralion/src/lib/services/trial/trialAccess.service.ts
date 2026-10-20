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
  workspaceId: string;
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
  organizationId: string;
  workspaceId: string;
  moduleKey?: 'retail' | 'trade' | 'both';
  targetTier?: 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  adminUserId: string;
  adminEmail: string;
  notes?: string;
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
      const sup2 = insertedSuppliers?.[1]?.id;

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
      const retailProducts = [
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'DeWalt 20V Cordless Brushless Drill Kit',
          sku: 'RET-PWR-DCD777',
          barcode: '885911478123',
          category: 'Power Tools',
          selling_price: 159.00,
          purchase_cost: 98.00,
          unit_of_measure: 'EACH',
          is_pilot_demo: true,
        },
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'Stanley FatMax 8m/26ft Tape Measure',
          sku: 'RET-HND-FM8M',
          barcode: '076174338921',
          category: 'Hand Tools',
          selling_price: 24.50,
          purchase_cost: 12.00,
          unit_of_measure: 'EACH',
          is_pilot_demo: true,
        },
        {
          organization_id: organizationId,
          workspace_id: workspaceId,
          name: 'Dulux Weatherguard Exterior Paint 5L (Pure Brilliant White)',
          sku: 'RET-PNT-WG5L',
          barcode: '501021255410',
          category: 'Paint & Decorating',
          selling_price: 49.99,
          purchase_cost: 29.50,
          unit_of_measure: 'EACH',
          is_pilot_demo: true,
        },
      ];

      await supabase.from('retail_products').insert(retailProducts);
    }
  }

  /**
   * Extends an active or expired trial by additional days.
   */
  static async extendTrial(params: ExtendTrialParams) {
    if (params.additionalDays <= 0) {
      throw new Error('Additional trial days must be greater than zero.');
    }

    const supabase = getPrivilegedSupabase();

    // Fetch current entitlements for this workspace
    const { data: entitlements, error } = await supabase
      .from('tenant_module_entitlements')
      .select('*')
      .eq('workspace_id', params.workspaceId);

    if (error || !entitlements || entitlements.length === 0) {
      throw new Error('No entitlement records found for this workspace.');
    }

    const now = Date.now();
    for (const ent of entitlements) {
      // Calculate new expiration: if already expired, extend from now; if active, extend from current expires_at
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
      .eq('workspace_id', params.workspaceId);

    // Audit log
    await supabase.from('audit_logs').insert({
      organization_id: entitlements[0].organization_id,
      user_id: params.adminUserId,
      action: 'TRIAL_EXTENDED',
      module: 'TRIAL_ACCESS_MANAGER',
      metadata: {
        workspaceId: params.workspaceId,
        additionalDays: params.additionalDays,
        reason: params.reason,
        adminEmail: params.adminEmail,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true, message: `Trial extended by ${params.additionalDays} days.` };
  }

  /**
   * Revokes trial access for a code or workspace.
   */
  static async revokeTrial(params: RevokeTrialParams) {
    const supabase = getPrivilegedSupabase();

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
    }

    if (params.workspaceId) {
      await supabase
        .from('tenant_module_entitlements')
        .update({
          status: 'SUSPENDED',
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', params.workspaceId)
        .eq('tier', 'TRIAL');

      await supabase
        .from('trial_code_redemptions')
        .update({
          status: 'REVOKED',
        })
        .eq('workspace_id', params.workspaceId);
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
        reason: params.reason,
        adminEmail: params.adminEmail,
        timestamp: new Date().toISOString(),
      },
    });

    return { success: true, message: 'Trial access revoked.' };
  }

  /**
   * Converts an active or completed trial into a paid commercial subscription.
   * Customer records are NEVER destroyed or mutated.
   */
  static async convertTrialToPaid(params: ConvertTrialParams) {
    const supabase = getPrivilegedSupabase();
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
      .eq('workspace_id', params.workspaceId)
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
      .eq('workspace_id', params.workspaceId);

    // Audit log
    await supabase.from('audit_logs').insert({
      organization_id: params.organizationId,
      user_id: params.adminUserId,
      action: 'TRIAL_CONVERTED_TO_COMMERCIAL',
      module: 'TRIAL_ACCESS_MANAGER',
      metadata: {
        workspaceId: params.workspaceId,
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
      redemptions,
    };
  }
}

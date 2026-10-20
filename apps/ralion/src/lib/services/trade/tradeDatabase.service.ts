/**
 * Ralion OS — Ralion Trade Database Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Provides transactional access and queries for:
 * - Trade Suppliers
 * - Procurement & Purchase Orders
 * - Wholesale Quotations
 * - Wholesale Orders
 */

import { getPrivilegedSupabase } from '../../supabase/server';
import { INTERNAL_TRADE_PREVIEW_WORKSPACE_ID } from './tradeEntitlement.service';

export interface TradeSupplierInput {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  payment_terms?: string;
  lead_time_days?: number;
}

export interface TradePurchaseOrderInput {
  po_number?: string;
  supplier_id?: string;
  supplier_name: string;
  total_amount: number;
  currency?: string;
  expected_delivery_date?: string;
  notes?: string;
  items: Array<{
    product_id?: string;
    product_name: string;
    sku?: string;
    quantity: number;
    unit_cost: number;
  }>;
}

export interface TradeQuotationInput {
  quote_number?: string;
  buyer_name: string;
  buyer_company?: string;
  buyer_email?: string;
  total_amount: number;
  currency?: string;
  valid_until?: string;
  notes?: string;
  items: Array<{
    product_id?: string;
    product_name: string;
    sku?: string;
    quantity: number;
    unit_price: number;
  }>;
}

export class TradeDatabaseService {
  /**
   * Computes high-level overview metrics for Trade OS.
   */
  static async getOverview(workspaceId: string) {
    const supabase = getPrivilegedSupabase();

    // If internal preview workspace, return rich preview sample data
    if (workspaceId === INTERNAL_TRADE_PREVIEW_WORKSPACE_ID) {
      return this.getMockPreviewOverview();
    }

    const [suppliersRes, posRes, quotesRes, ordersRes] = await Promise.all([
      supabase.from('trade_suppliers').select('id', { count: 'exact' }).eq('workspace_id', workspaceId),
      supabase.from('trade_purchase_orders').select('id, total_amount, status').eq('workspace_id', workspaceId),
      supabase.from('trade_quotations').select('id, total_amount, status').eq('workspace_id', workspaceId),
      supabase.from('trade_orders').select('id, total_amount, status, payment_status').eq('workspace_id', workspaceId),
    ]);

    const pos = posRes.data || [];
    const quotes = quotesRes.data || [];
    const orders = ordersRes.data || [];

    const totalPoSpend = pos
      .filter(p => p.status !== 'CANCELLED')
      .reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    const totalQuotedValue = quotes
      .filter(q => q.status !== 'REJECTED')
      .reduce((sum, q) => sum + Number(q.total_amount || 0), 0);

    const totalOrderRevenue = orders
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    return {
      totalSuppliers: suppliersRes.count || 0,
      totalPurchaseOrders: pos.length,
      pendingPOs: pos.filter(p => p.status === 'ORDERED' || p.status === 'DRAFT').length,
      totalPoSpend,
      totalQuotations: quotes.length,
      activeQuotations: quotes.filter(q => q.status === 'ISSUED').length,
      totalQuotedValue,
      totalOrders: orders.length,
      totalOrderRevenue,
    };
  }

  static async getSuppliers(workspaceId: string) {
    if (workspaceId === INTERNAL_TRADE_PREVIEW_WORKSPACE_ID) {
      return this.getMockSuppliers();
    }
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('trade_suppliers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async createSupplier(workspaceId: string, organizationId: string, input: TradeSupplierInput) {
    const supabase = getPrivilegedSupabase();
    const code = input.code || `SUP-${Date.now().toString().slice(-4)}`;
    const { data, error } = await supabase
      .from('trade_suppliers')
      .insert({
        workspace_id: workspaceId,
        organization_id: organizationId,
        name: input.name,
        code,
        email: input.email || null,
        phone: input.phone || null,
        payment_terms: input.payment_terms || 'NET30',
        lead_time_days: input.lead_time_days || 7,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  static async getPurchaseOrders(workspaceId: string) {
    if (workspaceId === INTERNAL_TRADE_PREVIEW_WORKSPACE_ID) {
      return this.getMockPurchaseOrders();
    }
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('trade_purchase_orders')
      .select('*, trade_po_items(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async createPurchaseOrder(
    workspaceId: string,
    organizationId: string,
    input: TradePurchaseOrderInput
  ) {
    const supabase = getPrivilegedSupabase();
    const poNumber = input.po_number || `PO-${Date.now().toString().slice(-6)}`;

    const { data: po, error: poErr } = await supabase
      .from('trade_purchase_orders')
      .insert({
        workspace_id: workspaceId,
        organization_id: organizationId,
        po_number: poNumber,
        supplier_id: input.supplier_id || null,
        supplier_name: input.supplier_name,
        total_amount: input.total_amount,
        currency: input.currency || 'USD',
        status: 'ORDERED',
        expected_delivery_date: input.expected_delivery_date || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (poErr) throw new Error(poErr.message);

    if (input.items && input.items.length > 0) {
      const itemsPayload = input.items.map(item => ({
        po_id: po.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        line_total: Number((item.quantity * item.unit_cost).toFixed(2)),
      }));

      const { error: itemsErr } = await supabase.from('trade_po_items').insert(itemsPayload);
      if (itemsErr) console.warn('[TradePO] Failed to insert line items:', itemsErr.message);
    }

    return po;
  }

  static async getQuotations(workspaceId: string) {
    if (workspaceId === INTERNAL_TRADE_PREVIEW_WORKSPACE_ID) {
      return this.getMockQuotations();
    }
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('trade_quotations')
      .select('*, trade_quote_items(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async createQuotation(
    workspaceId: string,
    organizationId: string,
    input: TradeQuotationInput
  ) {
    const supabase = getPrivilegedSupabase();
    const quoteNumber = input.quote_number || `QT-${Date.now().toString().slice(-6)}`;

    const { data: quote, error: quoteErr } = await supabase
      .from('trade_quotations')
      .insert({
        workspace_id: workspaceId,
        organization_id: organizationId,
        quote_number: quoteNumber,
        buyer_name: input.buyer_name,
        buyer_company: input.buyer_company || null,
        buyer_email: input.buyer_email || null,
        total_amount: input.total_amount,
        currency: input.currency || 'USD',
        status: 'ISSUED',
        valid_until: input.valid_until || null,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (quoteErr) throw new Error(quoteErr.message);

    if (input.items && input.items.length > 0) {
      const itemsPayload = input.items.map(item => ({
        quotation_id: quote.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: Number((item.quantity * item.unit_price).toFixed(2)),
      }));

      const { error: itemsErr } = await supabase.from('trade_quote_items').insert(itemsPayload);
      if (itemsErr) console.warn('[TradeQuote] Failed to insert line items:', itemsErr.message);
    }

    return quote;
  }

  static async getOrders(workspaceId: string) {
    if (workspaceId === INTERNAL_TRADE_PREVIEW_WORKSPACE_ID) {
      return this.getMockOrders();
    }
    const supabase = getPrivilegedSupabase();
    const { data, error } = await supabase
      .from('trade_orders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  // Sample mock data for Internal Preview Mode
  static getMockPreviewOverview() {
    return {
      totalSuppliers: 4,
      totalPurchaseOrders: 6,
      pendingPOs: 2,
      totalPoSpend: 18450.00,
      totalQuotations: 8,
      activeQuotations: 3,
      totalQuotedValue: 34200.00,
      totalOrders: 12,
      totalOrderRevenue: 62800.00,
    };
  }

  static getMockSuppliers() {
    return [
      {
        id: 'mock-sup-1',
        name: 'Apex Industrial Timber & Structural Steel',
        code: 'SUP-APEX-01',
        email: 'orders@apexindustrial.example.invalid',
        phone: '+1 555-019-2831',
        payment_terms: 'NET30',
        lead_time_days: 5,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: 'mock-sup-2',
        name: 'Pacific Wholesale Hardware Group',
        code: 'SUP-PACIFIC-02',
        email: 'sales@pacifichardware.example.invalid',
        phone: '+1 555-019-4829',
        payment_terms: 'NET15',
        lead_time_days: 3,
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      },
      {
        id: 'mock-sup-3',
        name: 'Titan Fasteners & Construction Tools',
        code: 'SUP-TITAN-03',
        email: 'wholesale@titanfasteners.example.invalid',
        phone: '+1 555-019-8812',
        payment_terms: 'NET60',
        lead_time_days: 10,
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: 'mock-sup-4',
        name: 'Continental Cement & Aggregate Mills',
        code: 'SUP-CONT-04',
        email: 'dispatch@continentalmills.example.invalid',
        phone: '+1 555-019-9943',
        payment_terms: 'NET30',
        lead_time_days: 7,
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
    ];
  }

  static getMockPurchaseOrders() {
    return [
      {
        id: 'mock-po-1',
        po_number: 'PO-2026-8812',
        supplier_name: 'Apex Industrial Timber & Structural Steel',
        total_amount: 8400.00,
        currency: 'USD',
        status: 'ORDERED',
        order_date: '2026-10-18',
        expected_delivery_date: '2026-10-23',
        notes: 'Replenishment for wholesale distribution yard.',
        trade_po_items: [
          { product_name: 'Structural Treated Timber 50x100mm (3.6m)', quantity: 200, unit_cost: 14.50, line_total: 2900.00 },
          { product_name: 'Structural Steel I-Beam 150mm (6m)', quantity: 10, unit_cost: 550.00, line_total: 5500.00 },
        ],
      },
      {
        id: 'mock-po-2',
        po_number: 'PO-2026-8811',
        supplier_name: 'Continental Cement & Aggregate Mills',
        total_amount: 4500.00,
        currency: 'USD',
        status: 'RECEIVED',
        order_date: '2026-10-10',
        expected_delivery_date: '2026-10-15',
        notes: 'Bulk Portland cement pallet delivery.',
        trade_po_items: [
          { product_name: 'Portland Commercial Cement 42.5N (50kg)', quantity: 600, unit_cost: 7.50, line_total: 4500.00 },
        ],
      },
      {
        id: 'mock-po-3',
        po_number: 'PO-2026-8810',
        supplier_name: 'Titan Fasteners & Construction Tools',
        total_amount: 5550.00,
        currency: 'USD',
        status: 'DRAFT',
        order_date: '2026-10-19',
        expected_delivery_date: '2026-10-29',
        notes: 'Preparing monthly fastener stocking order.',
        trade_po_items: [
          { product_name: 'High-Tensile Hex Bolts M12 (Box 100)', quantity: 150, unit_cost: 28.00, line_total: 4200.00 },
          { product_name: 'Framing Collated Nails 75mm (Box 3000)', quantity: 30, unit_cost: 45.00, line_total: 1350.00 },
        ],
      },
    ];
  }

  static getMockQuotations() {
    return [
      {
        id: 'mock-qt-1',
        quote_number: 'QT-2026-3041',
        buyer_name: 'Marcus Brody',
        buyer_company: 'Brody Commercial Developments Ltd',
        buyer_email: 'mbrody@brodydev.example.invalid',
        total_amount: 14200.00,
        currency: 'USD',
        status: 'ISSUED',
        valid_until: '2026-11-05',
        notes: 'Special contractor volume quote for Warehouse 4 project.',
        trade_quote_items: [
          { product_name: 'Structural Treated Timber 50x100mm (3.6m)', quantity: 400, unit_price: 22.00, line_total: 8800.00 },
          { product_name: 'Portland Commercial Cement 42.5N (50kg)', quantity: 450, unit_price: 12.00, line_total: 5400.00 },
        ],
      },
      {
        id: 'mock-qt-2',
        quote_number: 'QT-2026-3040',
        buyer_name: 'Sarah Sterling',
        buyer_company: 'Sterling Civil Contracting',
        buyer_email: 'ssterling@sterlingcivil.example.invalid',
        total_amount: 11500.00,
        currency: 'USD',
        status: 'ACCEPTED',
        valid_until: '2026-10-31',
        notes: 'Foundation phase contractor quote.',
        trade_quote_items: [
          { product_name: 'High-Tensile Hex Bolts M12 (Box 100)', quantity: 200, unit_price: 42.50, line_total: 8500.00 },
          { product_name: 'Diamond Tipped Grinder Blade 230mm', quantity: 100, unit_price: 30.00, line_total: 3000.00 },
        ],
      },
      {
        id: 'mock-qt-3',
        quote_number: 'QT-2026-3039',
        buyer_name: 'Arthur Pendelton',
        buyer_company: 'Apex Builders Consortium',
        buyer_email: 'apendelton@apexbuilders.example.invalid',
        total_amount: 8500.00,
        currency: 'USD',
        status: 'CONVERTED',
        valid_until: '2026-10-15',
        notes: 'Converted to wholesale sales order #SO-9921.',
        trade_quote_items: [
          { product_name: 'Structural Steel I-Beam 150mm (6m)', quantity: 10, unit_price: 850.00, line_total: 8500.00 },
        ],
      },
    ];
  }

  static getMockOrders() {
    return [
      {
        id: 'mock-ord-1',
        order_number: 'SO-9921',
        buyer_name: 'Arthur Pendelton (Apex Builders)',
        total_amount: 8500.00,
        currency: 'USD',
        status: 'PROCESSING',
        payment_status: 'PAID',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: 'mock-ord-2',
        order_number: 'SO-9920',
        buyer_name: 'Vance Commercial Contractors',
        total_amount: 22000.00,
        currency: 'USD',
        status: 'FULFILLED',
        payment_status: 'PAID',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: 'mock-ord-3',
        order_number: 'SO-9919',
        buyer_name: 'Harbor City Infrastructure',
        total_amount: 32300.00,
        currency: 'USD',
        status: 'DELIVERED',
        payment_status: 'PAID',
        created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
    ];
  }
}

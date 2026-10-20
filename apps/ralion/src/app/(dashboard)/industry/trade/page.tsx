'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  FileText,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Truck,
  DollarSign,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type TradeTab = 'overview' | 'suppliers' | 'procurement' | 'quotations' | 'orders';

export default function TradeInternalPreviewPage() {
  const [tab, setTab] = useState<TradeTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [overview, setOverview] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Modals
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    payment_terms: 'NET30',
    lead_time_days: 7,
  });

  const [showPoModal, setShowPoModal] = useState(false);
  const [newPo, setNewPo] = useState({
    supplier_name: '',
    total_amount: 0,
    expected_delivery_date: '',
    notes: '',
    item_name: 'Structural Treated Timber 50x100mm (3.6m)',
    item_quantity: 100,
    item_cost: 14.50,
  });

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [newQuote, setNewQuote] = useState({
    buyer_name: '',
    buyer_company: '',
    buyer_email: '',
    valid_days: 14,
    notes: '',
    item_name: 'Portland Commercial Cement 42.5N (50kg)',
    item_quantity: 50,
    item_price: 12.00,
  });

  const json = async (res: Response) => {
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) throw new Error(`Expected JSON, received HTTP ${res.status}.`);
    return JSON.parse(text);
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, supRes, poRes, qtRes, ordRes] = await Promise.all([
        authFetch('/api/trade/overview').catch(() => null),
        authFetch('/api/trade/suppliers').catch(() => null),
        authFetch('/api/trade/purchase-orders').catch(() => null),
        authFetch('/api/trade/quotations').catch(() => null),
        authFetch('/api/trade/orders').catch(() => null),
      ]);

      if (ovRes && ovRes.ok) {
        const body = await json(ovRes);
        setOverview(body.overview);
      }
      if (supRes && supRes.ok) {
        const body = await json(supRes);
        setSuppliers(body.suppliers || []);
      }
      if (poRes && poRes.ok) {
        const body = await json(poRes);
        setPurchaseOrders(body.purchaseOrders || []);
      }
      if (qtRes && qtRes.ok) {
        const body = await json(qtRes);
        setQuotations(body.quotations || []);
      }
      if (ordRes && ordRes.ok) {
        const body = await json(ordRes);
        setOrders(body.orders || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading Trade data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/trade/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to create supplier');
      setMessage(`Supplier '${newSupplier.name}' added successfully.`);
      setShowSupplierModal(false);
      setNewSupplier({ name: '', code: '', email: '', phone: '', payment_terms: 'NET30', lead_time_days: 7 });
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error creating supplier');
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalAmount = Number((newPo.item_quantity * newPo.item_cost).toFixed(2));
      const res = await authFetch('/api/trade/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_name: newPo.supplier_name,
          total_amount: totalAmount,
          currency: 'USD',
          expected_delivery_date: newPo.expected_delivery_date || null,
          notes: newPo.notes || null,
          items: [
            {
              product_name: newPo.item_name,
              quantity: newPo.item_quantity,
              unit_cost: newPo.item_cost,
            },
          ],
        }),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to create purchase order');
      setMessage(`Purchase order created successfully.`);
      setShowPoModal(false);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error creating purchase order');
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalAmount = Number((newQuote.item_quantity * newQuote.item_price).toFixed(2));
      const validUntil = new Date(Date.now() + newQuote.valid_days * 86400000).toISOString().split('T')[0];
      const res = await authFetch('/api/trade/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: newQuote.buyer_name,
          buyer_company: newQuote.buyer_company || null,
          buyer_email: newQuote.buyer_email || null,
          total_amount: totalAmount,
          currency: 'USD',
          valid_until: validUntil,
          notes: newQuote.notes || null,
          items: [
            {
              product_name: newQuote.item_name,
              quantity: newQuote.item_quantity,
              unit_price: newQuote.item_price,
            },
          ],
        }),
      });
      const body = await json(res);
      if (!res.ok) throw new Error(body.error || 'Failed to create quotation');
      setMessage(`Quotation issued successfully.`);
      setShowQuoteModal(false);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Error creating quotation');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6 max-w-7xl mx-auto">
      {/* Internal Preview Banner */}
      <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                Functional Internal Preview
              </span>
              <span className="font-semibold text-white">Not Production Ready • Simulated Trading OS</span>
            </div>
            <p className="text-[11px] text-amber-200/80 mt-1">
              Supplier management, procurement purchase orders, wholesale quotations and order execution. Real payment processing and live external disbursements are disabled in preview mode.
            </p>
          </div>
        </div>
        <button
          onClick={() => void loadAll()}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-amber-500/30 text-amber-300 hover:bg-zinc-800 text-xs flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-black">Ralion Trade OS</h1>
            <span className="px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] font-bold">
              B2B Wholesale & Procurement
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Supplier catalogues, automated purchase order procurement, contractor volume quotes, and wholesale order fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold flex items-center gap-2"
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            + Add Supplier
          </button>
          <button
            onClick={() => setShowPoModal(true)}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold flex items-center gap-2"
          >
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            + New PO
          </button>
          <button
            onClick={() => setShowQuoteModal(true)}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            + Issue Quotation
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      {message && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & Pipeline', icon: TrendingUp },
          { id: 'suppliers', label: `Suppliers (${suppliers.length})`, icon: Building2 },
          { id: 'procurement', label: `Purchase Orders (${purchaseOrders.length})`, icon: Truck },
          { id: 'quotations', label: `Wholesale Quotes (${quotations.length})`, icon: FileText },
          { id: 'orders', label: `Wholesale Orders (${orders.length})`, icon: ShoppingBag },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id as TradeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                tab === item.id ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <div className="text-zinc-400 text-xs">Active Suppliers</div>
              <div className="text-2xl font-black text-white mt-1">{overview?.totalSuppliers || suppliers.length}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Verified wholesale vendor accounts</div>
            </div>
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <div className="text-zinc-400 text-xs">Procurement PO Spend</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                ${Number(overview?.totalPoSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">{overview?.pendingPOs || 0} pending fulfillment</div>
            </div>
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <div className="text-zinc-400 text-xs">Quotation Pipeline</div>
              <div className="text-2xl font-black text-indigo-400 mt-1">
                ${Number(overview?.totalQuotedValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">{overview?.activeQuotations || 0} active proposals</div>
            </div>
            <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <div className="text-zinc-400 text-xs">Wholesale Revenue</div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                ${Number(overview?.totalOrderRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">{overview?.totalOrders || orders.length} closed contracts</div>
            </div>
          </div>

          {/* Quick Inspection Summary */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                Recent Purchase Orders (Procurement)
              </h3>
              <div className="divide-y divide-zinc-800">
                {purchaseOrders.slice(0, 3).map(po => (
                  <div key={po.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{po.supplier_name}</div>
                      <div className="text-[10px] text-zinc-500">{po.po_number} • {po.order_date}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-white">${Number(po.total_amount).toLocaleString()}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">{po.status}</span>
                    </div>
                  </div>
                ))}
                {!purchaseOrders.length && <div className="text-xs text-zinc-500 py-4">No purchase orders found.</div>}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Active Wholesale Quotations
              </h3>
              <div className="divide-y divide-zinc-800">
                {quotations.slice(0, 3).map(q => (
                  <div key={q.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{q.buyer_name}</div>
                      <div className="text-[10px] text-zinc-500">{q.buyer_company || 'Contractor'} • {q.quote_number}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400">${Number(q.total_amount).toLocaleString()}</div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">{q.status}</span>
                    </div>
                  </div>
                ))}
                {!quotations.length && <div className="text-xs text-zinc-500 py-4">No quotations found.</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPLIERS */}
      {tab === 'suppliers' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Supplier Name</th>
                  <th className="p-3 text-left">Contact Email</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Payment Terms</th>
                  <th className="p-3 text-left">Lead Time</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {suppliers.map(sup => (
                  <tr key={sup.id} className="bg-zinc-950/40 hover:bg-zinc-900/40">
                    <td className="p-3 font-mono text-zinc-400">{sup.code || 'SUP-000'}</td>
                    <td className="p-3 font-semibold text-white">{sup.name}</td>
                    <td className="p-3 text-zinc-300">{sup.email || '—'}</td>
                    <td className="p-3 text-zinc-300">{sup.phone || '—'}</td>
                    <td className="p-3 font-mono text-indigo-300">{sup.payment_terms || 'NET30'}</td>
                    <td className="p-3 text-zinc-300">{sup.lead_time_days || 7} days</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
                {!suppliers.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No suppliers registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PROCUREMENT (PURCHASE ORDERS) */}
      {tab === 'procurement' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="p-3 text-left">PO Number</th>
                  <th className="p-3 text-left">Supplier</th>
                  <th className="p-3 text-left">Order Date</th>
                  <th className="p-3 text-left">Expected Delivery</th>
                  <th className="p-3 text-left">Items Breakdown</th>
                  <th className="p-3 text-right">Total (USD)</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="bg-zinc-950/40 hover:bg-zinc-900/40">
                    <td className="p-3 font-mono text-indigo-400 font-bold">{po.po_number}</td>
                    <td className="p-3 font-semibold text-white">{po.supplier_name}</td>
                    <td className="p-3 text-zinc-400">{po.order_date}</td>
                    <td className="p-3 text-zinc-400">{po.expected_delivery_date || 'Standard Lead'}</td>
                    <td className="p-3 text-zinc-300">
                      {(po.trade_po_items || []).map((it: any, idx: number) => (
                        <div key={idx} className="text-[11px]">
                          {it.quantity}x {it.product_name} (@${Number(it.unit_cost).toFixed(2)})
                        </div>
                      ))}
                      {!po.trade_po_items?.length && <span className="text-zinc-500">Direct Batch</span>}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      ${Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          po.status === 'RECEIVED'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : po.status === 'ORDERED'
                            ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!purchaseOrders.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No purchase orders recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: WHOLESALE QUOTATIONS */}
      {tab === 'quotations' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="p-3 text-left">Quote #</th>
                  <th className="p-3 text-left">Buyer / Contractor</th>
                  <th className="p-3 text-left">Company</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Valid Until</th>
                  <th className="p-3 text-right">Total (USD)</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {quotations.map(q => (
                  <tr key={q.id} className="bg-zinc-950/40 hover:bg-zinc-900/40">
                    <td className="p-3 font-mono text-indigo-400 font-bold">{q.quote_number}</td>
                    <td className="p-3 font-semibold text-white">{q.buyer_name}</td>
                    <td className="p-3 text-zinc-300">{q.buyer_company || 'Independent'}</td>
                    <td className="p-3 text-zinc-400">{q.buyer_email || '—'}</td>
                    <td className="p-3 text-zinc-400">{q.valid_until || '14 Days'}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      ${Number(q.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                          q.status === 'CONVERTED'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : q.status === 'ACCEPTED'
                            ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                            : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!quotations.length && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No quotations issued yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: WHOLESALE ORDERS */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="w-full text-xs">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="p-3 text-left">Order #</th>
                  <th className="p-3 text-left">Buyer</th>
                  <th className="p-3 text-left">Created Date</th>
                  <th className="p-3 text-right">Total (USD)</th>
                  <th className="p-3 text-center">Payment</th>
                  <th className="p-3 text-right">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orders.map(ord => (
                  <tr key={ord.id} className="bg-zinc-950/40 hover:bg-zinc-900/40">
                    <td className="p-3 font-mono text-zinc-300">{ord.order_number || ord.id.slice(0, 8)}</td>
                    <td className="p-3 font-semibold text-white">{ord.buyer_name || 'Commercial Customer'}</td>
                    <td className="p-3 text-zinc-400">{ord.created_at ? new Date(ord.created_at).toLocaleDateString() : '—'}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      ${Number(ord.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                        {ord.payment_status || 'PAID'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      No wholesale orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Register New Trade Supplier
            </h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Supplier Company Name</label>
                <input
                  type="text"
                  required
                  value={newSupplier.name}
                  onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  placeholder="e.g. Apex Industrial Steel Corp"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="sales@apex.example"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="+1 555-019-2831"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Payment Terms</label>
                  <select
                    value={newSupplier.payment_terms}
                    onChange={e => setNewSupplier({ ...newSupplier, payment_terms: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  >
                    <option value="NET15">NET 15</option>
                    <option value="NET30">NET 30</option>
                    <option value="NET60">NET 60</option>
                    <option value="COD">Cash on Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={newSupplier.lead_time_days}
                    onChange={e => setNewSupplier({ ...newSupplier, lead_time_days: parseInt(e.target.value) || 7 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PO */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              Create Procurement Purchase Order
            </h3>
            <form onSubmit={handleCreatePo} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  value={newPo.supplier_name}
                  onChange={e => setNewPo({ ...newPo, supplier_name: e.target.value })}
                  placeholder="e.g. Apex Industrial Steel Corp"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                />
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Product Description</label>
                <input
                  type="text"
                  required
                  value={newPo.item_name}
                  onChange={e => setNewPo({ ...newPo, item_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPo.item_quantity}
                    onChange={e => setNewPo({ ...newPo, item_quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newPo.item_cost}
                    onChange={e => setNewPo({ ...newPo, item_cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex justify-between font-bold">
                <span className="text-zinc-400">Total Purchase Value:</span>
                <span className="text-emerald-400">
                  ${(newPo.item_quantity * newPo.item_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE QUOTATION */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              Issue Wholesale Customer Quotation
            </h3>
            <form onSubmit={handleCreateQuote} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1">Buyer / Contractor Name</label>
                <input
                  type="text"
                  required
                  value={newQuote.buyer_name}
                  onChange={e => setNewQuote({ ...newQuote, buyer_name: e.target.value })}
                  placeholder="e.g. David Vance"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Company</label>
                  <input
                    type="text"
                    value={newQuote.buyer_company}
                    onChange={e => setNewQuote({ ...newQuote, buyer_company: e.target.value })}
                    placeholder="Vance Contracting LLC"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newQuote.buyer_email}
                    onChange={e => setNewQuote({ ...newQuote, buyer_email: e.target.value })}
                    placeholder="dvance@contracting.example"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-zinc-400 block mb-1">Quoted Product / Line</label>
                <input
                  type="text"
                  required
                  value={newQuote.item_name}
                  onChange={e => setNewQuote({ ...newQuote, item_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newQuote.item_quantity}
                    onChange={e => setNewQuote({ ...newQuote, item_quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Wholesale Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={newQuote.item_price}
                    onChange={e => setNewQuote({ ...newQuote, item_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex justify-between font-bold">
                <span className="text-zinc-400">Total Quoted Value:</span>
                <span className="text-indigo-400">
                  ${(newQuote.item_quantity * newQuote.item_price).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Issue Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

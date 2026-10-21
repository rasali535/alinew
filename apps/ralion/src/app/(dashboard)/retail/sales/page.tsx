'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Printer,
  X,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Banknote,
  RotateCcw,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from '../components/RetailAccessErrorCard';
import { authFetch } from '@/lib/api-config';
import {
  normalizeSales,
  NormalizedRetailSale,
  formatPrice,
  safeLowerCase,
  safeReplace,
} from '@/lib/retail/adapters';

export default function RetailSalesPage() {
  const [sales, setSales] = useState<NormalizedRetailSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const [selectedSale, setSelectedSale] = useState<NormalizedRetailSale | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('customer_return');
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const res = await authFetch('/api/retail/sales');
      if (!res.ok) {
        let errJson: any = null;
        try { errJson = await res.json(); } catch {}
        setErrorState({
          status: res.status,
          code: errJson?.code || errJson?.error || (res.status === 401 ? 'AUTH_TOKEN_MISSING' : 'FETCH_ERROR'),
          message: errJson?.message || errJson?.error || `Failed to load sales register: HTTP ${res.status}`,
        });
        return;
      }
      const data = await res.json();
      if (data.success) {
        setSales(normalizeSales(data.sales || []));
      } else {
        setErrorState({
          status: 400,
          code: data.error || 'LOAD_SALES_FAILED',
          message: data.message || data.error || 'Failed to load sales.',
        });
      }
    } catch (e: any) {
      console.error('Failed to fetch sales', e);
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: e.message || 'Error connecting to retail sales services.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const totalRevenue = sales
    .filter((s) => s.payment_status === 'paid' || s.paymentStatus === 'paid')
    .reduce((acc, s) => acc + (s.totalAmount ?? s.grand_total ?? 0), 0);

  const cashRevenue = sales
    .filter((s) => (s.payment_status === 'paid' || s.paymentStatus === 'paid') && (s.payment_method === 'cash' || s.paymentMethod === 'cash'))
    .reduce((acc, s) => acc + (s.totalAmount ?? s.grand_total ?? 0), 0);

  const cardRevenue = sales
    .filter((s) => (s.payment_status === 'paid' || s.paymentStatus === 'paid') && (s.payment_method === 'card' || s.paymentMethod === 'card'))
    .reduce((acc, s) => acc + (s.totalAmount ?? s.grand_total ?? 0), 0);

  const filteredSales = sales.filter((s) => {
    const saleNum = safeLowerCase(s.sale_number || s.saleNumber);
    const custName = safeLowerCase(s.customer_name || s.customerName);
    const q = safeLowerCase(search);
    const matchesSearch = !q || saleNum.includes(q) || custName.includes(q);
    const matchesStatus =
      statusFilter === 'all' ||
      s.payment_status === statusFilter ||
      s.paymentStatus === statusFilter;
    const matchesPayment =
      paymentFilter === 'all' ||
      s.payment_method === paymentFilter ||
      s.paymentMethod === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const handlePrint = () => {
    window.print();
  };

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <RetailNavHeader onRefresh={fetchSales} />
        <RetailAccessErrorCard error={errorState} onRetry={fetchSales} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <RetailNavHeader onRefresh={fetchSales} />

      <div role="region" aria-label="Sales and Invoice Register" className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {notification && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              Sales & Invoice Register
            </h2>
            <p className="text-sm text-zinc-400">
              Authoritative transaction audit journal, customer invoices, payment breakdowns, and receipt reprints in USD ($).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSales}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl">
            <div className="text-xs text-zinc-400 mb-1">Total Paid Revenue</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatPrice(totalRevenue)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">USD • Historical posted</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl">
            <div className="text-xs text-zinc-400 mb-1">Invoices Recorded</div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{sales.length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Authoritative receipts</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl">
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              Cash Collected
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-200">
              {formatPrice(cashRevenue)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Cash drawer verified</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl">
            <div className="text-xs text-zinc-400 mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-400" />
              Card / Electronic
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-200">
              {formatPrice(cardRevenue)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Settled transactions</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice number or customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="refunded">Refunded</option>
              <option value="voided">Voided</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card / POS</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit">Store Credit</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Total Amount (USD)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                      Loading sales ledger...
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      No sales records found.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                        {s.sale_number || s.saleNumber || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-400">
                        {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-zinc-200">
                        {s.customer_name || s.customerName || 'Walk-in Retail Customer'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-mono text-xs px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-300">
                          {safeReplace(s.payment_method || s.paymentMethod || 'cash', '_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            (s.payment_status || s.paymentStatus) === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : (s.payment_status || s.paymentStatus) === 'refunded'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {s.payment_status || s.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100">
                        {formatPrice(s.grand_total ?? s.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedSale(s);
                            setShowDetailModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition"
                        >
                          Invoice Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* INVOICE DETAIL & REPRINT MODAL */}
        {showDetailModal && selectedSale && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 font-mono flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    Tax Invoice #{selectedSale.sale_number || selectedSale.saleNumber || '—'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Date: {selectedSale.created_at ? new Date(selectedSale.created_at).toLocaleString() : '—'} • Currency: USD ($)
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-3 font-mono text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Customer: <strong className="text-zinc-200">{selectedSale.customer_name || selectedSale.customerName || 'Walk-in'}</strong></span>
                  <span>Payment: <strong className="text-zinc-200 capitalize">{safeReplace(selectedSale.payment_method || selectedSale.paymentMethod, '_', ' ')}</strong></span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Status: <strong className="text-emerald-400 uppercase">{selectedSale.payment_status || selectedSale.paymentStatus}</strong></span>
                  <span>Currency: <strong className="text-emerald-400">USD ($)</strong></span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden flex-1 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800">
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {selectedSale.items && selectedSale.items.length > 0 ? (
                      selectedSale.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/20">
                          <td className="p-2.5 font-medium text-zinc-200">{item.product_name || item.productName || 'Hardware Item'}</td>
                          <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono">{formatPrice(item.unit_price ?? item.unitPrice)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                            {formatPrice(item.line_total ?? item.lineTotal)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-zinc-500">
                          Summary transaction (items preserved on ledger).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal:</span>
                    <span>{formatPrice(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-zinc-100 pt-1 border-t border-zinc-800">
                    <span>Grand Total:</span>
                    <span className="text-emerald-400">{formatPrice(selectedSale.grand_total ?? selectedSale.totalAmount)} USD</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  Print Official Receipt
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

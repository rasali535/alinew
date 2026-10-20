'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  X,
  ArrowRight,
  Printer,
  Calendar,
  User,
  DollarSign,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from '../components/RetailAccessErrorCard';
import { authFetch } from '@/lib/api-config';

interface QuotationItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  line_total: number;
}

interface Quotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  currency: string;
  status: 'draft' | 'sent' | 'accepted' | 'converted' | 'expired' | 'rejected';
  valid_until: string;
  notes?: string;
  created_at: string;
  converted_sale_id?: string;
  items?: QuotationItem[];
}

interface Product {
  id: string;
  name: string;
  sku: string;
  selling_price: number;
  current_stock: number;
  unit_of_measure: string;
}

export default function RetailQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // New Quote Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [validDays, setValidDays] = useState(14);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuotationItem[]>([]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const res = await authFetch('/api/retail/quotations');
      if (!res.ok) {
        let errJson: any = null;
        try { errJson = await res.json(); } catch {}
        setErrorState({
          status: res.status,
          code: errJson?.code || errJson?.error || (res.status === 401 ? 'AUTH_TOKEN_MISSING' : 'FETCH_ERROR'),
          message: errJson?.message || errJson?.error || `Failed to load quotations: HTTP ${res.status}`,
        });
        return;
      }
      const data = await res.json();
      if (data.success) {
        setQuotations(data.quotations || []);
      } else {
        setErrorState({
          status: 400,
          code: data.error || 'LOAD_QUOTATIONS_FAILED',
          message: data.message || data.error || 'Failed to load quotations.',
        });
      }
    } catch (e: any) {
      console.error('Failed to fetch quotations', e);
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: e.message || 'Error connecting to retail quotations services.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await authFetch('/api/retail/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (e) {
      console.error('Failed to fetch products', e);
    }
  };

  useEffect(() => {
    fetchQuotations();
    fetchProducts();
  }, []);

  const handleAddItem = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const existing = quoteItems.find((item) => item.product_id === prod.id);
    if (existing) {
      setQuoteItems(
        quoteItems.map((item) =>
          item.product_id === prod.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                line_total: (item.quantity + 1) * item.unit_price,
              }
            : item
        )
      );
    } else {
      setQuoteItems([
        ...quoteItems,
        {
          product_id: prod.id,
          product_name: prod.name,
          quantity: 1,
          unit_price: prod.selling_price,
          discount_amount: 0,
          tax_rate: 0,
          line_total: prod.selling_price,
        },
      ]);
    }
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const updated = [...quoteItems];
    if (quantity <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = quantity;
      updated[index].line_total =
        quantity * updated[index].unit_price - updated[index].discount_amount;
    }
    setQuoteItems(updated);
  };

  const updateItemPrice = (index: number, price: number) => {
    const updated = [...quoteItems];
    updated[index].unit_price = price;
    updated[index].line_total =
      updated[index].quantity * price - updated[index].discount_amount;
    setQuoteItems(updated);
  };

  // Totals
  const subtotal = quoteItems.reduce((acc, item) => acc + item.line_total, 0);
  const grandTotal = subtotal; // tax included / exempt in demo

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quoteItems.length === 0) {
      alert('Please add at least one line item to the quotation.');
      return;
    }

    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);

      const res = await authFetch('/api/retail/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          valid_until: validUntil.toISOString(),
          notes: quoteNotes,
          items: quoteItems,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setNotification(`Quotation ${data.quotation?.quotation_number || ''} created successfully in USD.`);
        setTimeout(() => setNotification(null), 4000);
        // Reset form
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setQuoteNotes('');
        setQuoteItems([]);
        fetchQuotations();
      } else {
        alert(data.error || 'Failed to create quotation');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating quotation');
    }
  };

  const handleConvertToSale = async (quoteId: string) => {
    if (!confirm('Convert this quotation to an active sale and deduct inventory?')) return;
    try {
      setConvertingId(quoteId);
      const res = await authFetch(`/api/retail/quotations/${quoteId}/convert`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setNotification(`Quotation converted to Sale #${data.sale?.sale_number || ''} with atomic inventory deduction!`);
        setTimeout(() => setNotification(null), 5000);
        if (showDetailModal) setShowDetailModal(false);
        fetchQuotations();
      } else {
        alert(data.error || 'Conversion failed');
      }
    } catch (e: any) {
      alert(e.message || 'Error converting quotation');
    } finally {
      setConvertingId(null);
    }
  };

  const filteredQuotes = quotations.filter((q) => {
    const matchesSearch =
      q.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      q.quotation_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <RetailNavHeader onRefresh={fetchQuotations} />
        <RetailAccessErrorCard error={errorState} onRetry={fetchQuotations} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <RetailNavHeader onRefresh={fetchQuotations} />

      <div role="region" aria-label="Quotations Management" className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {notification && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Contractor & Customer Quotations
            </h2>
            <p className="text-sm text-zinc-400">
              Generate binding building-material quotes, estimate contractor packages, and convert directly to sales in USD ($).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchQuotations}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Quotation
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by quote # or customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="converted">Converted to Sale</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                  <th className="py-3.5 px-4">Quote #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-right">Grand Total (USD)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Valid Until</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                      Loading quotations...
                    </td>
                  </tr>
                ) : filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      No quotations recorded. Click "New Quotation" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                        {q.quotation_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-zinc-100">{q.customer_name}</div>
                        {q.customer_phone && (
                          <div className="text-xs text-zinc-400">{q.customer_phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100">
                        ${q.grand_total.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            q.status === 'converted'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : q.status === 'accepted'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : q.status === 'expired'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-400">
                        {new Date(q.valid_until).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedQuote(q);
                              setShowDetailModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition"
                          >
                            View
                          </button>
                          {q.status !== 'converted' && (
                            <button
                              onClick={() => handleConvertToSale(q.id)}
                              disabled={convertingId === q.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              {convertingId === q.id ? 'Converting...' : 'Convert to Sale'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CREATE QUOTE MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Create Quotation (USD)
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateQuotation} className="space-y-4 flex-1 overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Customer / Contractor Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Apex Builders Ltd"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 019-2831"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Validity (Days)</label>
                    <input
                      type="number"
                      min="1"
                      value={validDays}
                      onChange={(e) => setValidDays(parseInt(e.target.value) || 14)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Add Item Selector */}
                <div className="bg-zinc-950/60 border border-zinc-800/80 p-3 rounded-xl space-y-2">
                  <div className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span>Add Hardware Products to Quote</span>
                    <span className="text-zinc-500 font-mono">Catalog: {products.length} items</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {products.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddItem(p.id)}
                        className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-left text-xs transition group"
                      >
                        <div className="font-medium text-zinc-200 group-hover:text-emerald-300 truncate">
                          {p.name}
                        </div>
                        <div className="text-zinc-500 font-mono mt-0.5 flex justify-between">
                          <span>${p.selling_price.toFixed(2)}</span>
                          <span>Stock: {p.current_stock}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Items List */}
                <div className="border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800">
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-center w-24">Qty</th>
                        <th className="p-2.5 text-right w-28">Price ($)</th>
                        <th className="p-2.5 text-right w-28">Total ($)</th>
                        <th className="p-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {quoteItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-zinc-500">
                            No items added yet. Click items above to add to this quote.
                          </td>
                        </tr>
                      ) : (
                        quoteItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-800/20">
                            <td className="p-2.5 font-medium text-zinc-200">{item.product_name}</td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(idx, parseInt(e.target.value) || 0)}
                                className="w-16 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-center font-mono text-zinc-100"
                              />
                            </td>
                            <td className="p-2.5 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-20 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-right font-mono text-zinc-100"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                              ${item.line_total.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(idx, 0)}
                                className="text-zinc-500 hover:text-rose-400 p-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Subtotal summary */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-zinc-100 pt-1 border-t border-zinc-800">
                      <span>Grand Total:</span>
                      <span className="text-emerald-400">${grandTotal.toFixed(2)} USD</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                  >
                    Generate Quotation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QUOTE DETAIL MODAL */}
        {showDetailModal && selectedQuote && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 font-mono">
                    Quotation #{selectedQuote.quotation_number}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Customer: <span className="text-zinc-200">{selectedQuote.customer_name}</span>
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
                <div className="grid grid-cols-2 gap-2 text-zinc-400">
                  <div>Status: <span className="text-emerald-400 uppercase font-bold">{selectedQuote.status}</span></div>
                  <div>Valid Until: {new Date(selectedQuote.valid_until).toLocaleDateString()}</div>
                </div>
                <div className="pt-2 border-t border-zinc-800 flex justify-between text-base font-bold text-zinc-100">
                  <span>Total Amount (USD):</span>
                  <span className="text-emerald-400">${selectedQuote.grand_total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Pro-Forma
                </button>

                {selectedQuote.status !== 'converted' && (
                  <button
                    onClick={() => handleConvertToSale(selectedQuote.id)}
                    disabled={convertingId === selectedQuote.id}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {convertingId === selectedQuote.id ? 'Converting...' : 'Convert to Active Sale'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

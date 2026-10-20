'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  History,
  SlidersHorizontal,
  RefreshCw,
  CheckCircle2,
  X,
  ArrowUpDown,
  Tag,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from '../components/RetailAccessErrorCard';
import { authFetch } from '@/lib/api-config';

interface RetailProduct {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  unit_of_measure: string;
  unit_cost: number;
  selling_price: number;
  tax_rate: number;
  current_stock: number;
  min_stock_level: number;
  is_active: boolean;
}

interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity_change: number;
  quantity_after: number;
  unit_cost_at_time: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export default function RetailInventoryPage() {
  const [products, setProducts] = useState<RetailProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<RetailProduct | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Form states
  const [newProduct, setNewProduct] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'Building Materials',
    unit_of_measure: 'pcs',
    unit_cost: 0,
    selling_price: 0,
    min_stock_level: 10,
    initial_stock: 0,
  });

  const [adjustment, setAdjustment] = useState({
    quantity_change: 0,
    reason: 'physical_count',
    notes: '',
  });

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const res = await authFetch('/api/retail/products');
      if (!res.ok) {
        let errJson: any = null;
        try { errJson = await res.json(); } catch {}
        setErrorState({
          status: res.status,
          code: errJson?.code || errJson?.error || (res.status === 401 ? 'AUTH_TOKEN_MISSING' : 'FETCH_ERROR'),
          message: errJson?.message || errJson?.error || `Failed to load inventory: HTTP ${res.status}`,
        });
        return;
      }
      const data = await res.json();
      if (data.success && data.products) {
        setProducts(data.products);
      } else {
        setErrorState({
          status: 400,
          code: data.error || 'LOAD_PRODUCTS_FAILED',
          message: data.message || data.error || 'Failed to load products.',
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch products', err);
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: err.message || 'Error connecting to retail inventory services.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openHistory = async (product: RetailProduct) => {
    setSelectedProduct(product);
    setShowHistoryModal(true);
    setLoadingMovements(true);
    try {
      const res = await authFetch(`/api/retail/inventory/movements?productId=${product.id}`);
      const data = await res.json();
      if (data.success) {
        setMovements(data.movements || []);
      }
    } catch (e) {
      console.error('Failed to load movements', e);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/retail/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setActionSuccess(`Product "${newProduct.name}" created successfully in USD.`);
        setTimeout(() => setActionSuccess(null), 3000);
        fetchProducts();
        setNewProduct({
          sku: '',
          barcode: '',
          name: '',
          category: 'Building Materials',
          unit_of_measure: 'pcs',
          unit_cost: 0,
          selling_price: 0,
          min_stock_level: 10,
          initial_stock: 0,
        });
      } else {
        alert(data.error || 'Failed to create product');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating product');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await authFetch('/api/retail/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantityDelta: Number(adjustment.quantity_change),
          reason: adjustment.reason,
          notes: adjustment.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAdjustModal(false);
        setActionSuccess(`Stock for ${selectedProduct.name} updated.`);
        setTimeout(() => setActionSuccess(null), 3000);
        fetchProducts();
      } else {
        alert(data.error || 'Stock adjustment failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error adjusting stock');
    }
  };

  // Filtered products
  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesLowStock = !filterLowStock || p.current_stock <= p.min_stock_level;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <RetailNavHeader onRefresh={fetchProducts} />
        <RetailAccessErrorCard error={errorState} onRetry={fetchProducts} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <RetailNavHeader onRefresh={fetchProducts} />

      <div role="region" aria-label="Retail Inventory" className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Banner notification */}
        {actionSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-sm animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              Stock & Inventory Catalogue
            </h2>
            <p className="text-sm text-zinc-400">
              Hardware inventory ledger with real-time stock levels, weighted valuation, and movement audits in USD ($).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProducts}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Hardware Item
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU, barcode, or product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1.5 transition border ${
                filterLowStock
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Low Stock Only
            </button>
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                  <th className="py-3.5 px-4">Product / SKU</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-right">Unit Cost</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-right">Margin</th>
                  <th className="py-3.5 px-4 text-center">Stock Level</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                      Loading inventory items...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      No hardware items found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const margin =
                      p.selling_price > 0
                        ? (((p.selling_price - p.unit_cost) / p.selling_price) * 100).toFixed(1)
                        : '0';
                    const isLowStock = p.current_stock <= p.min_stock_level;

                    return (
                      <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-100">{p.name}</div>
                          <div className="text-xs text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                            <span>SKU: {p.sku}</span>
                            {p.barcode && <span>• Barcode: {p.barcode}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          ${p.unit_cost.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-emerald-400">
                          ${p.selling_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-zinc-400">
                          {margin}%
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 font-mono">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                isLowStock
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}
                            >
                              {p.current_stock} {p.unit_of_measure}
                            </span>
                            {isLowStock && (
                              <span title="Low stock alert">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedProduct(p);
                                setAdjustment({ quantity_change: 0, reason: 'physical_count', notes: '' });
                                setShowAdjustModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition"
                            >
                              Adjust Stock
                            </button>
                            <button
                              onClick={() => openHistory(p)}
                              className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                              title="Audit Movement History"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADD PRODUCT MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Add Hardware Catalogue Item (USD)
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Product Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Portland Cement 50kg"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Category *</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Building Materials">Building Materials</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Paint & Finishes">Paint & Finishes</option>
                      <option value="Tools & Hardware">Tools & Hardware</option>
                      <option value="Fasteners & Fixings">Fasteners & Fixings</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">SKU / Code *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. CEM-001"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Barcode (EAN/UPC)</label>
                    <input
                      type="text"
                      placeholder="e.g. 600123456789"
                      value={newProduct.barcode}
                      onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Cost Price ($) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProduct.unit_cost}
                      onChange={(e) => setNewProduct({ ...newProduct, unit_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Selling Price ($) *</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProduct.selling_price}
                      onChange={(e) => setNewProduct({ ...newProduct, selling_price: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Unit of Measure</label>
                    <input
                      type="text"
                      placeholder="pcs, kg, m, roll"
                      value={newProduct.unit_of_measure}
                      onChange={(e) => setNewProduct({ ...newProduct, unit_of_measure: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Initial Stock Count</label>
                    <input
                      type="number"
                      min="0"
                      value={newProduct.initial_stock}
                      onChange={(e) => setNewProduct({ ...newProduct, initial_stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Min Stock Alert Level</label>
                    <input
                      type="number"
                      min="0"
                      value={newProduct.min_stock_level}
                      onChange={(e) => setNewProduct({ ...newProduct, min_stock_level: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                  >
                    Save Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADJUST STOCK MODAL */}
        {showAdjustModal && selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-emerald-400" />
                  Adjust Stock: {selectedProduct.name}
                </h3>
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 text-xs flex justify-between items-center font-mono">
                <span className="text-zinc-400">Current Authoritative Stock:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {selectedProduct.current_stock} {selectedProduct.unit_of_measure}
                </span>
              </div>

              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">
                    Quantity Adjustment Delta (+ to add, - to subtract) *
                  </label>
                  <input
                    required
                    type="number"
                    value={adjustment.quantity_change}
                    onChange={(e) => setAdjustment({ ...adjustment, quantity_change: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    New total will be: {selectedProduct.current_stock + Number(adjustment.quantity_change)} {selectedProduct.unit_of_measure}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Reason for Adjustment *</label>
                  <select
                    value={adjustment.reason}
                    onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="physical_count">Physical Stock Count / Audit</option>
                    <option value="damaged">Damaged Goods / Breakage</option>
                    <option value="expired">Expired / Degraded</option>
                    <option value="correction">Data Entry Correction</option>
                    <option value="supplier_return">Returned to Supplier</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Audit Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Provide context or authorization reference..."
                    value={adjustment.notes}
                    onChange={(e) => setAdjustment({ ...adjustment, notes: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                  >
                    Post Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AUDIT HISTORY MODAL */}
        {showHistoryModal && selectedProduct && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-400" />
                    Stock Movement Audit Trail
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedProduct.name} (SKU: {selectedProduct.sku})
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingMovements ? (
                  <div className="py-12 text-center text-zinc-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading audit trail...
                  </div>
                ) : movements.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500">
                    No movements recorded for this item yet.
                  </div>
                ) : (
                  movements.map((m) => (
                    <div
                      key={m.id}
                      className="bg-zinc-950/70 border border-zinc-850 p-3 rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.quantity_change > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {m.movement_type.replace('_', ' ')}
                          </span>
                          <span className="text-zinc-400">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                        {m.notes && <p className="text-zinc-400 font-sans mt-1">{m.notes}</p>}
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-bold ${
                            m.quantity_change > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                        </div>
                        <div className="text-zinc-500 text-[10px]">
                          Balance: {m.quantity_after}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

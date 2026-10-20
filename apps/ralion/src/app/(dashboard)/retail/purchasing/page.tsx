'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  X,
  PackageCheck,
  Building2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from '../components/RetailAccessErrorCard';
import { authFetch } from '@/lib/api-config';

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: string;
  lead_time_days?: number;
  is_active: boolean;
}

interface PurchaseOrderItem {
  product_id: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  line_total: number;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  total_cost: number;
  currency: string;
  status: 'draft' | 'ordered' | 'received' | 'partially_received' | 'cancelled';
  expected_delivery?: string;
  created_at: string;
  items?: PurchaseOrderItem[];
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit_cost: number;
  unit_of_measure: string;
  current_stock: number;
}

export default function RetailPurchasingPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [receivingItems, setReceivingItems] = useState<{ [productId: string]: number }>({});
  const [receivingLoading, setReceivingLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Forms
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    payment_terms: 'Net 30',
    lead_time_days: 7,
  });

  const [newPO, setNewPO] = useState<{
    supplier_id: string;
    expected_delivery: string;
    items: { product_id: string; product_name: string; quantity: number; unit_cost: number }[];
  }>({
    supplier_id: '',
    expected_delivery: '',
    items: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const [resOrders, resSuppliers, resProducts] = await Promise.all([
        authFetch('/api/retail/purchasing/orders'),
        authFetch('/api/retail/suppliers'),
        authFetch('/api/retail/products'),
      ]);

      if (!resOrders.ok) {
        let errJson: any = null;
        try { errJson = await resOrders.json(); } catch {}
        setErrorState({
          status: resOrders.status,
          code: errJson?.code || errJson?.error || (resOrders.status === 401 ? 'AUTH_TOKEN_MISSING' : 'FETCH_ERROR'),
          message: errJson?.message || errJson?.error || `Failed to load purchasing orders: HTTP ${resOrders.status}`,
        });
        return;
      }

      const dataOrders = await resOrders.json();
      const dataSuppliers = await resSuppliers.json();
      const dataProducts = await resProducts.json();

      if (dataOrders.success) setOrders(dataOrders.orders || []);
      if (dataSuppliers.success) setSuppliers(dataSuppliers.suppliers || []);
      if (dataProducts.success) setProducts(dataProducts.products || []);
    } catch (e: any) {
      console.error('Failed to fetch purchasing data', e);
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: e.message || 'Error connecting to retail purchasing services.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/retail/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddSupplierModal(false);
        setNotification(`Supplier "${newSupplier.name}" added successfully.`);
        setTimeout(() => setNotification(null), 3500);
        setNewSupplier({
          name: '',
          contact_person: '',
          phone: '',
          email: '',
          payment_terms: 'Net 30',
          lead_time_days: 7,
        });
        fetchData();
      } else {
        alert(data.error || 'Failed to add supplier');
      }
    } catch (e: any) {
      alert(e.message || 'Error adding supplier');
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPO.supplier_id) {
      alert('Please select a supplier.');
      return;
    }
    if (newPO.items.length === 0) {
      alert('Please add at least one item to purchase.');
      return;
    }

    try {
      const res = await authFetch('/api/retail/purchasing/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPO),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreatePOModal(false);
        setNotification(`Purchase Order #${data.order?.order_number || ''} created in USD ($).`);
        setTimeout(() => setNotification(null), 4000);
        setNewPO({ supplier_id: '', expected_delivery: '', items: [] });
        fetchData();
      } else {
        alert(data.error || 'Failed to create PO');
      }
    } catch (e: any) {
      alert(e.message || 'Error creating PO');
    }
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const initialMap: { [productId: string]: number } = {};
    if (po.items) {
      po.items.forEach((item) => {
        initialMap[item.product_id] = item.quantity_ordered - (item.quantity_received || 0);
      });
    }
    setReceivingItems(initialMap);
    setShowReceiveModal(true);
  };

  const handlePostReceiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    try {
      setReceivingLoading(true);
      const itemsToReceive = Object.entries(receivingItems)
        .filter(([_, qty]) => qty > 0)
        .map(([productId, qty]) => ({
          productId,
          quantityReceived: qty,
        }));

      if (itemsToReceive.length === 0) {
        alert('Please specify quantity received for at least one item.');
        setReceivingLoading(false);
        return;
      }

      const res = await authFetch('/api/retail/purchasing/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedPO.id,
          receivedItems: itemsToReceive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowReceiveModal(false);
        setNotification('Goods received! Inventory stock and balance sheet asset capitalized in USD.');
        setTimeout(() => setNotification(null), 4500);
        fetchData();
      } else {
        alert(data.error || 'Failed to post receiving');
      }
    } catch (e: any) {
      alert(e.message || 'Error receiving goods');
    } finally {
      setReceivingLoading(false);
    }
  };

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <RetailNavHeader onRefresh={fetchData} />
        <RetailAccessErrorCard error={errorState} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <RetailNavHeader onRefresh={fetchData} />

      <div role="region" aria-label="Purchasing and Supplier Management" className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {notification && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              Purchasing & Supplier Management
            </h2>
            <p className="text-sm text-zinc-400">
              Procure stock from manufacturers, track lead times, and post atomic goods receipt in USD ($).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {activeTab === 'orders' ? (
              <button
                onClick={() => setShowCreatePOModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Purchase Order
              </button>
            ) : (
              <button
                onClick={() => setShowAddSupplierModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            )}
          </div>
        </div>

        {/* Tab Switching */}
        <div className="flex border-b border-zinc-800 gap-6 text-sm">
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === 'orders'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Purchase Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition ${
              activeTab === 'suppliers'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Suppliers Directory ({suppliers.length})
          </button>
        </div>

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-950/40">
                    <th className="py-3.5 px-4">PO Number</th>
                    <th className="py-3.5 px-4">Supplier</th>
                    <th className="py-3.5 px-4 text-right">Total Cost (USD)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                        Loading purchase orders...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        No purchase orders recorded yet.
                      </td>
                    </tr>
                  ) : (
                    orders.map((po) => (
                      <tr key={po.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                          {po.order_number}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-zinc-100">
                          {po.supplier_name || 'Hardware Distributor'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100">
                          ${po.total_cost.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                              po.status === 'received'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : po.status === 'ordered'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-400">
                          {new Date(po.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {po.status !== 'received' && (
                            <button
                              onClick={() => openReceiveModal(po)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition flex items-center gap-1.5 ml-auto"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Receive Goods
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUPPLIERS TAB */}
        {activeTab === 'suppliers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl space-y-3 backdrop-blur-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-zinc-100 text-base">{s.name}</h4>
                    {s.contact_person && (
                      <p className="text-xs text-zinc-400 mt-0.5">Attn: {s.contact_person}</p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-300 font-mono">
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{s.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Lead Time: {s.lead_time_days || 7} days</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 flex justify-between items-center">
                  <span>Terms: <strong>{s.payment_terms || 'Net 30'}</strong></span>
                  <span className="text-emerald-400 font-mono font-bold">USD Account</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RECEIVE GOODS MODAL */}
        {showReceiveModal && selectedPO && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-emerald-400" />
                    Receive Inventory: PO #{selectedPO.order_number}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Supplier: {selectedPO.supplier_name} • Capitalize inventory asset (USD)
                  </p>
                </div>
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-300">
                <strong>Accounting Rule:</strong> Receiving goods updates physical stock and balance sheet inventory valuation. It does NOT generate an operating expense.
              </div>

              <form onSubmit={handlePostReceiving} className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedPO.items && selectedPO.items.length > 0 ? (
                    selectedPO.items.map((item) => (
                      <div
                        key={item.product_id}
                        className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-medium text-zinc-200">{item.product_name}</div>
                          <div className="text-zinc-500 font-mono">
                            Ordered: {item.quantity_ordered} • Unit Cost: ${item.unit_cost.toFixed(2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-zinc-400 text-xs">Qty Received:</label>
                          <input
                            type="number"
                            min="1"
                            max={item.quantity_ordered}
                            value={receivingItems[item.product_id] || item.quantity_ordered}
                            onChange={(e) =>
                              setReceivingItems({
                                ...receivingItems,
                                [item.product_id]: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-center font-mono text-zinc-100"
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-zinc-500">
                      Standard hardware shipment receiving.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowReceiveModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={receivingLoading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition disabled:opacity-50"
                  >
                    {receivingLoading ? 'Posting Goods...' : 'Confirm Goods Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD SUPPLIER MODAL */}
        {showAddSupplierModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  Add Hardware Supplier
                </h3>
                <button
                  onClick={() => setShowAddSupplierModal(false)}
                  className="text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSupplier} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Company / Supplier Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. National Cement Mills"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={newSupplier.contact_person}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 123-4567"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Lead Time (Days)</label>
                    <input
                      type="number"
                      value={newSupplier.lead_time_days}
                      onChange={(e) => setNewSupplier({ ...newSupplier, lead_time_days: parseInt(e.target.value) || 7 })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                  >
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

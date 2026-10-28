'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Building2,
  PackageCheck,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Layers,
  FileText,
  Send,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from '../components/RetailAccessErrorCard';
import { authFetch } from '@/lib/api-config';
import {
  RetailLocation,
  RetailStockTransfer,
  RetailStockRequest,
  RetailTransferDiscrepancy,
  RetailStockLevel,
} from '@ralion/database';
import { TransferDocumentationModal } from '@/components/retail/TransferDocumentationModal';
import { TransferReceiveModal } from '@/components/retail/TransferReceiveModal';
import { NewStockRequestModal } from '@/components/retail/NewStockRequestModal';
import { NewStockTransferModal } from '@/components/retail/NewStockTransferModal';

export default function RetailTransfersPage() {
  const [activeTab, setActiveTab] = useState<'TRANSFERS' | 'REQUESTS' | 'LOCATIONS' | 'DISCREPANCIES'>('TRANSFERS');

  const [transfers, setTransfers] = useState<RetailStockTransfer[]>([]);
  const [requests, setRequests] = useState<RetailStockRequest[]>([]);
  const [locations, setLocations] = useState<RetailLocation[]>([]);
  const [stockLevels, setStockLevels] = useState<RetailStockLevel[]>([]);
  const [discrepancies, setDiscrepancies] = useState<RetailTransferDiscrepancy[]>([]);
  const [catalogueProducts, setCatalogueProducts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [showDocumentationModal, setShowDocumentationModal] = useState(false);
  const [selectedTransferForDoc, setSelectedTransferForDoc] = useState<RetailStockTransfer | null>(null);

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<RetailStockTransfer | null>(null);

  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showNewTransferModal, setShowNewTransferModal] = useState(false);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorState(null);

      const [transfersRes, requestsRes, locationsRes, discrepanciesRes, catRes] = await Promise.all([
        authFetch('/api/retail/transfers'),
        authFetch('/api/retail/transfers/requests'),
        authFetch('/api/retail/locations'),
        authFetch('/api/retail/transfers/discrepancies'),
        authFetch('/api/retail/catalogue/search?channel=PURCHASE&limit=100'),
      ]);

      if (!transfersRes.ok) {
        let errJson: any = null;
        try { errJson = await transfersRes.json(); } catch {}
        setErrorState({
          status: transfersRes.status,
          code: errJson?.code || errJson?.error || (transfersRes.status === 401 ? 'AUTH_TOKEN_MISSING' : 'FETCH_ERROR'),
          message: errJson?.message || errJson?.error || `Failed to load stock transfers: HTTP ${transfersRes.status}`,
        });
        return;
      }

      const transfersData = await transfersRes.json();
      const requestsData = requestsRes.ok ? await requestsRes.json() : { requests: [] };
      const locationsData = locationsRes.ok ? await locationsRes.json() : { locations: [] };
      const discData = discrepanciesRes.ok ? await discrepanciesRes.json() : { discrepancies: [] };
      const catData = catRes.ok ? await catRes.json() : { products: [] };

      setTransfers(transfersData.transfers || []);
      setRequests(requestsData.requests || []);
      setLocations(locationsData.locations || []);
      setDiscrepancies(discData.discrepancies || []);
      setCatalogueProducts(catData.products || []);
    } catch (err: any) {
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: err.message || 'Failed to connect to retail transfers service.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDispatch = async (transferId: string) => {
    if (!confirm('Are you sure you want to dispatch this stock transfer? Stock will be atomically deducted from the source warehouse and marked IN_TRANSIT.')) {
      return;
    }

    try {
      const res = await authFetch(`/api/retail/transfers/${transferId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to dispatch transfer.');
        return;
      }

      setActionSuccess('Stock transfer successfully dispatched! Goods are now in transit.');
      setTimeout(() => setActionSuccess(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error dispatching transfer.');
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const res = await authFetch(`/api/retail/transfers/requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to approve request.');
        return;
      }

      setActionSuccess('Stock request approved! Ready for warehouse picking and dispatch.');
      setTimeout(() => setActionSuccess(null), 4000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error approving request.');
    }
  };

  // Metrics
  const inTransitCount = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'REQUESTED').length;
  const totalWarehouses = locations.filter((l) => l.locationType === 'WAREHOUSE').length;
  const totalBranches = locations.filter((l) => l.locationType === 'RETAIL_BRANCH').length;
  const totalDamagedItems = discrepancies.filter((d) => d.discrepancyType === 'DAMAGED').reduce((acc, d) => acc + d.quantity, 0);

  // Filtered transfers
  const filteredTransfers = transfers.filter((t) => {
    const matchesSearch =
      t.transferNumber.toLowerCase().includes(search.toLowerCase()) ||
      (t.sourceLocationName || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.destinationLocationName || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      <RetailNavHeader storeName="Frosthub Hardware & Retail" onRefresh={loadData} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {errorState && <RetailAccessErrorCard error={errorState} onRetry={loadData} />}

        {actionSuccess && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 shadow-lg">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <p>{actionSuccess}</p>
          </div>
        )}

        {/* Page Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Truck className="h-6 w-6 text-blue-400" />
              Multi-Branch Stock Distribution & Transfers
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Central warehouse replenishment, goods-in-transit tracking, and branch receiving verification
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNewRequestModal(true)}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 shadow-sm hover:bg-zinc-800 transition"
            >
              <Send className="h-4 w-4 text-blue-400" />
              Request Stock (Branch)
            </button>

            <button
              type="button"
              onClick={() => setShowNewTransferModal(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-950/50 hover:bg-blue-500 transition"
            >
              <Plus className="h-4 w-4" />
              New Stock Transfer
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Goods In Transit</span>
              <Truck className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2">{inTransitCount}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Active warehouse dispatches</p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Branch Requests</span>
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-blue-400 mt-2">{pendingRequestsCount}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Awaiting warehouse approval</p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Network Locations</span>
              <Layers className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white mt-2">
              {totalWarehouses} <span className="text-sm font-normal text-zinc-500">WH /</span> {totalBranches} <span className="text-sm font-normal text-zinc-500">Branches</span>
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Partitioned stock ledgers</p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Quarantine Damages</span>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2">{totalDamagedItems}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Non-sellable transit write-offs</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('TRANSFERS')}
            className={`border-b-2 px-5 py-3 transition ${
              activeTab === 'TRANSFERS'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Active Transfers & In-Transit ({transfers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            className={`border-b-2 px-5 py-3 transition ${
              activeTab === 'REQUESTS'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Replenishment Requests ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LOCATIONS')}
            className={`border-b-2 px-5 py-3 transition ${
              activeTab === 'LOCATIONS'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Warehouses & Branches ({locations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DISCREPANCIES')}
            className={`border-b-2 px-5 py-3 transition ${
              activeTab === 'DISCREPANCIES'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Discrepancies & Quarantine ({discrepancies.length})
          </button>
        </div>

        {/* Tab 1: Transfers List */}
        {activeTab === 'TRANSFERS' && (
          <div className="space-y-4">
            {/* Filter Ribbon */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transfers..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                {['ALL', 'DRAFT', 'IN_TRANSIT', 'RECEIVED', 'PARTIALLY_RECEIVED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      filterStatus === st
                        ? 'bg-blue-600 text-white'
                        : 'border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Transfers Table */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-4 py-3.5">Transfer №</th>
                    <th className="px-4 py-3.5">Route</th>
                    <th className="px-4 py-3.5">Lines / Qty</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Dispatched / Carrier</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredTransfers.length > 0 ? (
                    filteredTransfers.map((t) => {
                      const isInTransit = t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED';
                      const isDraft = t.status === 'DRAFT' || t.status === 'APPROVED';
                      const isReceived = t.status === 'RECEIVED' || t.status === 'PARTIALLY_RECEIVED';

                      return (
                        <tr key={t.id} className="hover:bg-zinc-800/30 transition">
                          <td className="px-4 py-3 font-mono font-bold text-white">
                            {t.transferNumber}
                            <span className="block text-[10px] font-normal text-zinc-500 font-sans">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                              <span>{t.sourceLocationName || 'Warehouse'}</span>
                              <ArrowRight className="h-3 w-3 text-zinc-500" />
                              <span className="text-blue-400">{t.destinationLocationName || 'Branch'}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500">{t.transferType.replace(/_/g, ' ')}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-zinc-200">{t.totalUnitsDispatched} base units</span>
                            <span className="block text-[10px] text-zinc-500">{t.totalLines || t.items?.length || 0} line items</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                t.status === 'IN_TRANSIT'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : t.status === 'RECEIVED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : t.status === 'PARTIALLY_RECEIVED'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                              }`}
                            >
                              {t.status === 'IN_TRANSIT' && <Truck className="h-3 w-3" />}
                              {t.status === 'RECEIVED' && <CheckCircle2 className="h-3 w-3" />}
                              {t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {t.dispatchedByName ? (
                              <>
                                <p className="text-zinc-200 font-medium">{t.dispatchedByName}</p>
                                <p className="text-[10px] text-zinc-500">{t.carrierName || 'Fleet'} {t.vehicleRegistration ? `(${t.vehicleRegistration})` : ''}</p>
                              </>
                            ) : (
                              <span className="text-zinc-600">Pending dispatch</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTransferForDoc(t);
                                  setShowDocumentationModal(true);
                                }}
                                className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
                                title="Print Delivery Note"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Manifest
                              </button>

                              {isDraft && (
                                <button
                                  type="button"
                                  onClick={() => handleDispatch(t.id)}
                                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                  Dispatch
                                </button>
                              )}

                              {isInTransit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTransferForReceive(t);
                                    setShowReceiveModal(true);
                                  }}
                                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                                >
                                  <PackageCheck className="h-3.5 w-3.5" />
                                  Receive
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No stock transfers found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Requests List */}
        {activeTab === 'REQUESTS' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-4 py-3.5">Request №</th>
                    <th className="px-4 py-3.5">Branch / Destination</th>
                    <th className="px-4 py-3.5">Source Warehouse</th>
                    <th className="px-4 py-3.5">Priority</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Requester</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {requests.length > 0 ? (
                    requests.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-800/30 transition">
                        <td className="px-4 py-3 font-mono font-bold text-white">
                          {r.requestNumber}
                          <span className="block text-[10px] font-normal text-zinc-500 font-sans">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-100">{r.destinationLocationName || 'Branch'}</td>
                        <td className="px-4 py-3 text-zinc-300">{r.sourceLocationName || 'Warehouse'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              r.priority === 'URGENT'
                                ? 'bg-rose-500/20 text-rose-300'
                                : r.priority === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {r.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              r.status === 'APPROVED'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : r.status === 'FULFILLED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{r.requestedByName || 'Staff'}</td>
                        <td className="px-4 py-3 text-right">
                          {r.status === 'REQUESTED' && (
                            <button
                              type="button"
                              onClick={() => handleApproveRequest(r.id)}
                              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        No replenishment requests found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Locations List */}
        {activeTab === 'LOCATIONS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div key={loc.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        loc.locationType === 'WAREHOUSE' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {loc.locationType === 'WAREHOUSE' ? <Building2 className="h-5 w-5" /> : <Layers className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100">{loc.name}</h3>
                      <p className="text-xs text-zinc-400 font-mono">Code: {loc.code}</p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      loc.locationType === 'WAREHOUSE' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {loc.locationType}
                  </span>
                </div>

                <div className="text-xs text-zinc-400 space-y-1">
                  {loc.address && <p>Address: {loc.address}</p>}
                  {loc.phone && <p>Phone: {loc.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Discrepancies List */}
        {activeTab === 'DISCREPANCIES' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-4 py-3.5">Product</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Quantity</th>
                    <th className="px-4 py-3.5">Action Taken</th>
                    <th className="px-4 py-3.5">Inspection Notes</th>
                    <th className="px-4 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {discrepancies.length > 0 ? (
                    discrepancies.map((d) => (
                      <tr key={d.id} className="hover:bg-zinc-800/30 transition">
                        <td className="px-4 py-3 font-semibold text-zinc-100">{d.productName || 'Product'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              d.discrepancyType === 'DAMAGED'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {d.discrepancyType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white">{d.quantity} units</td>
                        <td className="px-4 py-3 text-emerald-400 font-medium">{d.resolutionAction}</td>
                        <td className="px-4 py-3 text-zinc-400">{d.resolutionNotes || '—'}</td>
                        <td className="px-4 py-3 text-zinc-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        Zero discrepancies recorded. All transfer manifests balanced 100%.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showDocumentationModal && (
        <TransferDocumentationModal
          transfer={selectedTransferForDoc}
          storeName="Frosthub Hardware & Retail"
          onClose={() => {
            setShowDocumentationModal(false);
            setSelectedTransferForDoc(null);
          }}
        />
      )}

      {showReceiveModal && (
        <TransferReceiveModal
          transfer={selectedTransferForReceive}
          onClose={() => {
            setShowReceiveModal(false);
            setSelectedTransferForReceive(null);
          }}
          onSuccess={() => {
            setActionSuccess('Destination receiving posted! Sellable branch inventory incremented.');
            setTimeout(() => setActionSuccess(null), 4000);
            loadData();
          }}
        />
      )}

      {showNewRequestModal && (
        <NewStockRequestModal
          locations={locations}
          products={catalogueProducts}
          onClose={() => setShowNewRequestModal(false)}
          onSuccess={() => {
            setActionSuccess('Stock replenishment request submitted to warehouse!');
            setTimeout(() => setActionSuccess(null), 4000);
            loadData();
          }}
        />
      )}

      {showNewTransferModal && (
        <NewStockTransferModal
          locations={locations}
          products={catalogueProducts}
          onClose={() => setShowNewTransferModal(false)}
          onSuccess={() => {
            setActionSuccess('Stock transfer draft created!');
            setTimeout(() => setActionSuccess(null), 4000);
            loadData();
          }}
        />
      )}
    </div>
  );
}

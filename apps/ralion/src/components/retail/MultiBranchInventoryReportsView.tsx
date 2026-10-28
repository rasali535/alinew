'use client';

import React, { useState, useEffect } from 'react';
import {
  Building,
  Truck,
  Package,
  AlertTriangle,
  RefreshCw,
  Download,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';
import {
  RetailLocation,
  RetailStockTransfer,
  RetailTransferDiscrepancy,
  RetailStockRequest,
} from '@ralion/database';

export function MultiBranchInventoryReportsView() {
  const [locations, setLocations] = useState<RetailLocation[]>([]);
  const [transfers, setTransfers] = useState<RetailStockTransfer[]>([]);
  const [discrepancies, setDiscrepancies] = useState<RetailTransferDiscrepancy[]>([]);
  const [requests, setRequests] = useState<RetailStockRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBranchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const [locRes, transferRes, discRes, reqRes] = await Promise.all([
        authFetch('/api/retail/locations'),
        authFetch('/api/retail/transfers'),
        authFetch('/api/retail/transfers/discrepancies'),
        authFetch('/api/retail/transfers/requests'),
      ]);

      if (locRes.ok) {
        const d = await locRes.json();
        if (d.success) setLocations(d.locations || []);
      }
      if (transferRes.ok) {
        const d = await transferRes.json();
        if (d.success) setTransfers(d.transfers || []);
      }
      if (discRes.ok) {
        const d = await discRes.json();
        if (d.success) setDiscrepancies(d.discrepancies || []);
      }
      if (reqRes.ok) {
        const d = await reqRes.json();
        if (d.success) setRequests(d.requests || []);
      }
    } catch (err: any) {
      console.error('Failed to load multi-branch inventory reporting:', err);
      setError(err.message || 'Error fetching branch inventory metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchReports();
  }, []);

  // Aggregated KPIs
  const warehouseCount = locations.filter((l) => l.locationType === 'WAREHOUSE').length;
  const branchCount = locations.filter((l) => l.locationType === 'RETAIL_BRANCH').length;

  const inTransitTransfers = transfers.filter((t) => t.status === 'IN_TRANSIT');
  const inTransitUnits = inTransitTransfers.reduce((acc, t) => {
    const items = t.items || [];
    return acc + items.reduce((sum, item) => sum + (item.quantityDispatched - (item.quantityReceived || 0)), 0);
  }, 0);

  const totalDamagedUnits = discrepancies
    .filter((d) => d.discrepancyType === 'DAMAGED')
    .reduce((sum, d) => sum + d.quantity, 0);

  const totalShortageUnits = discrepancies
    .filter((d) => d.discrepancyType === 'SHORTAGE')
    .reduce((sum, d) => sum + d.quantity, 0);

  const pendingRequestsCount = requests.filter(
    (r) => r.status === 'REQUESTED' || r.status === 'DRAFT'
  ).length;

  const handleExportCSV = () => {
    const rows = [
      ['Ralion Retail OS - Multi-Branch Inventory & Transfer Audit Report'],
      ['Generated At', new Date().toISOString()],
      [],
      ['=== LOCATIONS INVENTORY SUMMARY ==='],
      ['Location Name', 'Code', 'Type', 'Manager', 'Status'],
      ...locations.map((loc) => [
        loc.name,
        loc.code,
        loc.locationType || 'RETAIL_BRANCH',
        loc.managerName || 'Unassigned',
        loc.isActive ? 'Active' : 'Inactive',
      ]),
      [],
      ['=== GOODS-IN-TRANSIT & TRANSFERS AUDIT ==='],
      ['Transfer Number', 'Source Location', 'Destination Location', 'Status', 'Dispatched At', 'Received At', 'Items Count'],
      ...transfers.map((t) => [
        t.transferNumber,
        locations.find((l) => l.id === t.sourceLocationId)?.name || t.sourceLocationId,
        locations.find((l) => l.id === t.destinationLocationId)?.name || t.destinationLocationId,
        t.status,
        t.dispatchedAt || 'Not Dispatched',
        t.receivedAt || 'Pending Receipt',
        (t.items?.length || 0).toString(),
      ]),
      [],
      ['=== TRANSIT DAMAGE & SHORTAGE DISCREPANCIES ==='],
      ['Date', 'Transfer ID', 'Product ID', 'Type', 'Quantity', 'Resolution Action', 'Notes'],
      ...discrepancies.map((d) => [
        d.createdAt,
        d.transferId,
        d.productId,
        d.discrepancyType,
        d.quantity.toString(),
        d.resolutionAction,
        d.resolutionNotes || '',
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ralion-multi-branch-distribution-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-zinc-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
        <p className="text-sm">Aggregating multi-branch stock balances and transit ledgers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-2xl text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-sm text-red-200">{error}</p>
        <button
          onClick={fetchBranchReports}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            Multi-Branch Distribution & Inventory BI
          </h2>
          <p className="text-sm text-zinc-400">
            Real-time warehouse-to-branch stock allocation, in-transit manifests, and damage discrepancy audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBranchReports}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center gap-2 transition border border-zinc-700/60 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export Branch BI (CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Network Sites */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Distribution Network</span>
            <Building className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {locations.length} <span className="text-xs text-zinc-400 font-normal">Sites</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="text-blue-400 font-semibold">{warehouseCount}</span> Warehouses
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{branchCount}</span> Retail Branches
          </div>
        </div>

        {/* Goods In Transit */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Goods in Transit</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {inTransitUnits}{' '}
            <span className="text-xs text-zinc-400 font-normal">Units</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            Across <strong className="text-zinc-200">{inTransitTransfers.length}</strong> active dispatches
          </div>
        </div>

        {/* Quarantine & Damage */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Transit Damaged (Quarantine)</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">
            {totalDamagedUnits}{' '}
            <span className="text-xs text-zinc-400 font-normal">Units</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            + <strong className="text-amber-400">{totalShortageUnits}</strong> units shortage logged
          </div>
        </div>

        {/* Replenishment Demand */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Replenishment Requests</span>
            <Package className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {pendingRequestsCount}{' '}
            <span className="text-xs text-zinc-400 font-normal">Pending</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            Awaiting central warehouse approval
          </div>
        </div>
      </div>

      {/* Network Sites Breakdown */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Location Distribution Network</h3>
          </div>
          <span className="text-xs text-zinc-400">{locations.length} Registered Locations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/50 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Site Name & Code</th>
                <th className="px-4 py-3">Location Type</th>
                <th className="px-4 py-3">Site Manager</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Operating Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {locations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500">
                    No locations configured.
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-zinc-400" />
                        <div>
                          <div>{loc.name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">{loc.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          loc.locationType === 'WAREHOUSE'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {loc.locationType === 'WAREHOUSE' ? 'Central Warehouse' : 'Retail Branch'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {loc.managerName || 'Store Manager'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                      {loc.phone || loc.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          loc.isActive
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${loc.isActive ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                        {loc.isActive ? 'Operational' : 'Disabled'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Stock Transfers & Manifest Ledger */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Stock Transfer & Goods-In-Transit Ledger</h3>
          </div>
          <span className="text-xs text-zinc-400">{transfers.length} Transfers Audited</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/50 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Transfer #</th>
                <th className="px-4 py-3">Route (From → To)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dispatched</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Manifest Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No stock transfers recorded.
                  </td>
                </tr>
              ) : (
                transfers.slice(0, 10).map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-4 py-3 font-mono font-medium text-emerald-400">
                      {t.transferNumber}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{locations.find((l) => l.id === t.sourceLocationId)?.name || 'Central Warehouse'}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-500" />
                        <span>{locations.find((l) => l.id === t.destinationLocationId)?.name || 'Retail Branch'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.status === 'RECEIVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : t.status === 'IN_TRANSIT'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : t.status === 'DISPATCHED'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                      {t.dispatchedAt ? new Date(t.dispatchedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono text-[11px]">
                      {t.receivedAt ? new Date(t.receivedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-mono">
                      {t.items?.length || 0} line item(s)
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Damage & Discrepancies Quarantine Audit */}
      {discrepancies.length > 0 && (
        <div className="bg-zinc-900 border border-red-900/40 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-red-950/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-red-200">Transit Discrepancies & Quarantine Audit</h3>
            </div>
            <span className="text-xs text-red-300 font-medium">{discrepancies.length} Incidents Logged</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/50 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Logged Date</th>
                  <th className="px-4 py-3">Discrepancy Type</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Notes & Reason</th>
                  <th className="px-4 py-3">Quarantine Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {discrepancies.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-800/30 transition">
                    <td className="px-4 py-3 font-mono text-zinc-400 text-[11px]">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.discrepancyType === 'DAMAGED'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : d.discrepancyType === 'SHORTAGE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {d.discrepancyType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-zinc-200 font-mono">
                      {d.quantity} unit(s)
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {d.resolutionNotes || 'No notes specified.'}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {d.discrepancyType === 'DAMAGED' ? (
                        <span className="text-red-400 text-[11px]">Quarantined (Excluded from sellable stock)</span>
                      ) : (
                        <span className="text-amber-400 text-[11px]">Shortage written off</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

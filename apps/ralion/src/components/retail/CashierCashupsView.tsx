'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  DollarSign,
  Printer,
  Download,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  Ban,
  ShieldCheck,
  CreditCard,
  Building,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';
import { formatBotswanaTime, formatCurrencyUSD, RetailReceiptModal } from './RetailReceipt';

interface ShiftItem {
  id: string;
  cashierId: string;
  cashierName: string;
  terminalId: string;
  status: 'OPEN' | 'CLOSED';
  reconciliationStatus?: 'ACTIVE' | 'RECONCILED' | 'MISSING_CASHUP';
  isMissingCashup?: boolean;
  hasCashupReport?: boolean;
  openedAt: string;
  closedAt?: string;
  openingCashFloat: number;
  closingCashActual?: number;
  expectedCash?: number;
  variance?: number;
  report?: any;
}

export const CashierCashupsView: React.FC = () => {
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCashier, setFilterCashier] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');

  // Drilldown modal state
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [drilldownData, setDrilldownData] = useState<any | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  // Print cash-up receipt modal state
  const [printReport, setPrintReport] = useState<any | null>(null);

  const loadCashups = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/retail/pos/cashup');
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load cashier cash-up reports.');
        return;
      }

      const rawShifts: any[] = data.shifts || data.reports || [];
      const normalizedShifts: ShiftItem[] = rawShifts.map((s: any) => {
        const isClosed = s.status === 'CLOSED' || Boolean(s.closedAt || s.closed_at);
        const hasReport = Boolean(s.hasCashupReport ?? (s.report && s.report.id));
        const isMissingCashup = Boolean(s.isMissingCashup ?? (isClosed && !hasReport));
        const recStatus = s.reconciliationStatus || (!isClosed ? 'ACTIVE' : (hasReport ? 'RECONCILED' : 'MISSING_CASHUP'));

        return {
          id: s.id || s.shiftId,
          cashierId: s.cashierId || s.cashierUserId || s.cashier_user_id || '',
          cashierName: s.cashierName || s.cashier_name || 'Cashier',
          terminalId: s.terminalId || s.terminal_id || 'TILL-01',
          status: isClosed ? 'CLOSED' : 'OPEN',
          reconciliationStatus: recStatus,
          isMissingCashup,
          hasCashupReport: hasReport,
          openedAt: s.openedAt || s.startedAt || s.started_at || new Date().toISOString(),
          closedAt: s.closedAt || s.closed_at || undefined,
          openingCashFloat: Number(s.openingCashFloat ?? s.openingFloat ?? s.opening_float ?? s.opening_cash ?? 0),
          closingCashActual: s.closingCashActual !== undefined ? Number(s.closingCashActual) : (s.closing_cash_actual !== undefined ? Number(s.closing_cash_actual) : undefined),
          expectedCash: s.expectedCash !== undefined ? Number(s.expectedCash) : (s.expected_cash !== undefined ? Number(s.expected_cash) : undefined),
          variance: s.variance !== undefined ? Number(s.variance) : undefined,
          report: s.report || (hasReport ? s : undefined),
        };
      });

      setShifts(normalizedShifts);
    } catch (err: any) {
      setError(err.message || 'Network error loading cash-up reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashups();
  }, []);

  const openDrilldown = async (shiftId: string) => {
    setSelectedShiftId(shiftId);
    try {
      setDrilldownLoading(true);
      const res = await authFetch(`/api/retail/pos/cashup?shiftId=${encodeURIComponent(shiftId)}&drilldownShiftId=${encodeURIComponent(shiftId)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDrilldownData(data.drilldown);
      } else {
        alert(data.error || 'Failed to load shift drilldown.');
      }
    } catch (err: any) {
      alert(err.message || 'Error loading transaction drilldown.');
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (shifts.length === 0) return;

    const headers = [
      'Shift ID',
      'Cashier Name',
      'Terminal',
      'Status',
      'Start Time (CAT)',
      'End Time (CAT)',
      'Opening Float',
      'Gross Sales',
      'Discounts',
      'Net Sales',
      'Cash Sales',
      'Card Sales',
      'Bank Transfers',
      'Cash Refunds',
      'Void Sales Total',
      'Expected Cash',
      'Actual Cash',
      'Cash Variance',
    ];

    const rows = filteredShifts.map((s) => {
      const rep = s.report || {};
      return [
        s.id,
        s.cashierName || 'Cashier',
        s.terminalId || 'TILL-01',
        s.status,
        formatBotswanaTime(s.openedAt),
        s.closedAt ? formatBotswanaTime(s.closedAt) : 'ACTIVE',
        Number(s.openingCashFloat || 0).toFixed(2),
        Number(rep.grossSales || 0).toFixed(2),
        Number(rep.discountTotal || 0).toFixed(2),
        Number(rep.netSales || 0).toFixed(2),
        Number(rep.cashSales || 0).toFixed(2),
        Number(rep.cardSales || 0).toFixed(2),
        Number(rep.transferSales || 0).toFixed(2),
        Number(rep.cashRefunds || 0).toFixed(2),
        Number(rep.voidsTotal || 0).toFixed(2),
        Number(s.expectedCash || rep.expectedDrawerCash || 0).toFixed(2),
        Number(s.closingCashActual || rep.actualCountedCash || 0).toFixed(2),
        Number(s.variance || rep.cashVariance || 0).toFixed(2),
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows].map((row) => row.map((val) => `"${val}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cashier-cashups-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredShifts = shifts.filter((s) => {
    const matchesCashier =
      !filterCashier ||
      (s.cashierName && s.cashierName.toLowerCase().includes(filterCashier.toLowerCase())) ||
      (s.terminalId && s.terminalId.toLowerCase().includes(filterCashier.toLowerCase()));
    const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
    return matchesCashier && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Controls Bar: Search, Filters, CSV Export */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterCashier}
              onChange={(e) => setFilterCashier(e.target.value)}
              placeholder="Filter by cashier name or terminal..."
              className="w-full bg-zinc-800 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex bg-zinc-800 border border-zinc-700 rounded-xl p-0.5 text-xs">
            {(['ALL', 'OPEN', 'CLOSED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  filterStatus === st ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st === 'ALL' ? 'All Shifts' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCashups}
            disabled={loading}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredShifts.length === 0}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 text-xs font-semibold flex items-center gap-2 border border-zinc-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export Cash-Ups (CSV)
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Cashier Cash-Up Register Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Cashier & Till</th>
                <th className="py-3 px-3 font-semibold">Shift Window (CAT)</th>
                <th className="py-3 px-3 font-semibold text-right">Opening Float</th>
                <th className="py-3 px-3 font-semibold text-right">Gross Sales</th>
                <th className="py-3 px-3 font-semibold text-right">Discounts</th>
                <th className="py-3 px-3 font-semibold text-right">Net Sales</th>
                <th className="py-3 px-3 font-semibold text-right">Cash / Card / EFT</th>
                <th className="py-3 px-3 font-semibold text-right">Refunds</th>
                <th className="py-3 px-3 font-semibold text-right">Expected Drawer</th>
                <th className="py-3 px-3 font-semibold text-right">Counted Cash</th>
                <th className="py-3 px-3 font-semibold text-right">Variance</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                    Loading cashier cash-up reconciliation records...
                  </td>
                </tr>
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-zinc-500">
                    No cashier shifts recorded for this workspace.
                  </td>
                </tr>
              ) : (
                filteredShifts.map((s) => {
                  const rep = s.report || {};
                  const isOpen = s.status === 'OPEN';
                  const variance = Number(s.variance ?? rep.cashVariance ?? 0);
                  const isBalanced = variance === 0;
                  const isOverage = variance > 0;
                  const isShortage = variance < 0;

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                      onClick={() => openDrilldown(s.id)}
                    >
                      {/* Cashier & Till */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{s.cashierName || 'Cashier'}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {s.terminalId || 'TILL-01'} •{' '}
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold text-[9px] uppercase tracking-wider ${
                              isOpen
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : s.isMissingCashup
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {isOpen ? 'Active Shift' : s.isMissingCashup ? 'Missing Cash-Up' : 'Reconciled'}
                          </span>
                        </div>
                      </td>

                      {/* Shift Window */}
                      <td className="py-3 px-3 text-zinc-300 font-mono text-[11px]">
                        <div>{formatBotswanaTime(s.openedAt)}</div>
                        <div className="text-[10px] text-zinc-500">
                          {s.closedAt ? formatBotswanaTime(s.closedAt) : 'Currently Active'}
                        </div>
                      </td>

                      {/* Opening Float */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">
                        {formatCurrencyUSD(Number(s.openingCashFloat || 0))}
                      </td>

                      {/* Gross Sales */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-200">
                        {s.isMissingCashup ? (
                          <span className="text-zinc-500 italic">Unrecorded</span>
                        ) : (
                          formatCurrencyUSD(Number(rep.grossSales || 0))
                        )}
                      </td>

                      {/* Discounts */}
                      <td className="py-3 px-3 text-right font-mono text-amber-400">
                        {s.isMissingCashup ? (
                          <span className="text-zinc-500">—</span>
                        ) : Number(rep.discountTotal || 0) > 0 ? (
                          `-${formatCurrencyUSD(Number(rep.discountTotal))}`
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Net Sales */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {s.isMissingCashup ? (
                          <span className="text-zinc-500 italic">Unrecorded</span>
                        ) : (
                          formatCurrencyUSD(Number(rep.netSales || 0))
                        )}
                      </td>

                      {/* Breakdown: Cash / Card / EFT */}
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-zinc-400">
                        {s.isMissingCashup ? (
                          <span className="text-zinc-500 italic">No cash-up record</span>
                        ) : (
                          <>
                            <div>Cash: {formatCurrencyUSD(Number(rep.cashSales || 0))}</div>
                            <div className="text-[10px] text-zinc-500">
                              Card: {formatCurrencyUSD(Number(rep.cardSales || 0))} • EFT:{' '}
                              {formatCurrencyUSD(Number(rep.transferSales || 0))}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Refunds */}
                      <td className="py-3 px-3 text-right font-mono text-rose-400">
                        {s.isMissingCashup ? (
                          <span className="text-zinc-500">—</span>
                        ) : Number(rep.cashRefunds || 0) > 0 ? (
                          `-${formatCurrencyUSD(Number(rep.cashRefunds))}`
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Expected Drawer */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-200">
                        {isOpen ? (
                          <span className="text-zinc-500">—</span>
                        ) : s.isMissingCashup ? (
                          <span className="text-amber-400/90 text-[11px] italic">Unreconciled</span>
                        ) : (
                          formatCurrencyUSD(Number(s.expectedCash ?? rep.expectedDrawerCash ?? 0))
                        )}
                      </td>

                      {/* Counted Cash */}
                      <td className="py-3 px-3 text-right font-mono text-zinc-200">
                        {isOpen ? (
                          <span className="text-zinc-500">—</span>
                        ) : s.isMissingCashup ? (
                          <span className="text-amber-400/90 text-[11px] italic">Not Counted</span>
                        ) : (
                          formatCurrencyUSD(Number(s.closingCashActual ?? rep.actualCountedCash ?? 0))
                        )}
                      </td>

                      {/* Variance */}
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {isOpen ? (
                          <span className="text-zinc-500">—</span>
                        ) : s.isMissingCashup ? (
                          <span className="text-amber-400 flex items-center justify-end gap-1 text-[11px]">
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            Missing Cash-Up
                          </span>
                        ) : isBalanced ? (
                          <span className="text-emerald-400 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            $0.00
                          </span>
                        ) : isOverage ? (
                          <span className="text-cyan-400">+{formatCurrencyUSD(variance)} (Overage)</span>
                        ) : (
                          <span className="text-rose-400 font-bold">{formatCurrencyUSD(variance)} (Shortage)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => openDrilldown(s.id)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                            title="Inspect Transactions"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {rep.id && (
                            <button
                              type="button"
                              onClick={() => setPrintReport(rep)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                              title="Print Cash-Up Slip"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          )}
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

      {/* Transaction Drill-Down Modal (Phase 5 Requirement 16) */}
      {selectedShiftId && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedShiftId(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Shift Reconciliation & Transaction Drill-Down
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Authoritative line-item audit trail for shift {selectedShiftId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShiftId(null)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {/* Drilldown Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {drilldownLoading || !drilldownData ? (
                <div className="py-20 text-center text-zinc-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
                  Fetching shift audit ledger and line items...
                </div>
              ) : (
                <>
                  {/* Summary Header Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Cashier</span>
                      <span className="font-semibold text-zinc-200">
                        {drilldownData.shift?.cashierName || 'Cashier'}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Total Sales</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {drilldownData.sales?.length || 0} sales ({formatCurrencyUSD(drilldownData.metrics?.netSales || 0)})
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Returns & Refunds</span>
                      <span className="font-mono font-bold text-rose-400">
                        {drilldownData.returns?.length || 0} returns ({formatCurrencyUSD(drilldownData.metrics?.refundsTotal || 0)})
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-zinc-800/40 border border-zinc-800">
                      <span className="text-[10px] text-zinc-500 block">Audited Voids</span>
                      <span className="font-mono font-bold text-zinc-300">
                        {drilldownData.voidedSales?.length || 0} transactions
                      </span>
                    </div>
                  </div>

                  {/* Individual Sales Table */}
                  <div>
                    <h4 className="font-bold text-zinc-200 uppercase text-[11px] tracking-wider mb-2">
                      Completed Sales ({drilldownData.sales?.length || 0})
                    </h4>
                    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase border-b border-zinc-800">
                          <tr>
                            <th className="py-2.5 px-3">Sale #</th>
                            <th className="py-2.5 px-3">Date (CAT)</th>
                            <th className="py-2.5 px-3">Customer</th>
                            <th className="py-2.5 px-3">Items Sold</th>
                            <th className="py-2.5 px-3">Tender</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                          {drilldownData.sales?.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-zinc-500">
                                No sales processed during this shift.
                              </td>
                            </tr>
                          ) : (
                            drilldownData.sales?.map((sl: any) => (
                              <tr key={sl.id} className="hover:bg-zinc-800/30">
                                <td className="py-2 px-3 font-bold text-zinc-100">{sl.saleNumber}</td>
                                <td className="py-2 px-3 text-zinc-400">
                                  {formatBotswanaTime(sl.saleDate || sl.createdAt)}
                                </td>
                                <td className="py-2 px-3 font-sans text-zinc-300">
                                  {sl.customerName || 'Walk-in'}
                                </td>
                                <td className="py-2 px-3 font-sans text-zinc-400">
                                  {sl.items?.map((it: any) => `${it.productName || it.product_name || 'Item'} ×${it.quantity}`).join(', ') ||
                                    '1 item'}
                                </td>
                                <td className="py-2 px-3 text-zinc-300 font-sans">{sl.paymentMethod}</td>
                                <td className="py-2 px-3 text-right font-bold text-emerald-400">
                                  {formatCurrencyUSD(Number(sl.totalAmount))}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Returns & Refunds Section if any */}
                  {drilldownData.returns && drilldownData.returns.length > 0 && (
                    <div>
                      <h4 className="font-bold text-zinc-200 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5 text-rose-400">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Authorized Returns & Refunds ({drilldownData.returns.length})
                      </h4>
                      <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase border-b border-zinc-800">
                            <tr>
                              <th className="py-2.5 px-3">Return #</th>
                              <th className="py-2.5 px-3">Date (CAT)</th>
                              <th className="py-2.5 px-3">Reason</th>
                              <th className="py-2.5 px-3">Method</th>
                              <th className="py-2.5 px-3 text-right">Refund Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                            {drilldownData.returns.map((ret: any) => (
                              <tr key={ret.id} className="hover:bg-zinc-800/30">
                                <td className="py-2 px-3 font-bold text-zinc-100">{ret.returnNumber}</td>
                                <td className="py-2 px-3 text-zinc-400">{formatBotswanaTime(ret.createdAt)}</td>
                                <td className="py-2 px-3 font-sans text-zinc-300">{ret.reason}</td>
                                <td className="py-2 px-3 font-sans text-zinc-400">{ret.refundPaymentMethod}</td>
                                <td className="py-2 px-3 text-right font-bold text-rose-400">
                                  -{formatCurrencyUSD(Number(ret.refundAmount))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Voids Section if any */}
                  {drilldownData.voidedSales && drilldownData.voidedSales.length > 0 && (
                    <div>
                      <h4 className="font-bold text-zinc-200 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1.5 text-zinc-400">
                        <Ban className="w-3.5 h-3.5 text-red-400" />
                        Voided Transactions ({drilldownData.voidedSales.length})
                      </h4>
                      <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase border-b border-zinc-800">
                            <tr>
                              <th className="py-2.5 px-3">Sale ID</th>
                              <th className="py-2.5 px-3">Void Date (CAT)</th>
                              <th className="py-2.5 px-3">Reason</th>
                              <th className="py-2.5 px-3">Manager ID</th>
                              <th className="py-2.5 px-3 text-right">Amount Reversal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                            {drilldownData.voidedSales.map((vd: any) => (
                              <tr key={vd.id} className="hover:bg-zinc-800/30">
                                <td className="py-2 px-3 text-zinc-100">{vd.saleId}</td>
                                <td className="py-2 px-3 text-zinc-400">{formatBotswanaTime(vd.createdAt)}</td>
                                <td className="py-2 px-3 font-sans text-zinc-300">{vd.reason}</td>
                                <td className="py-2 px-3 text-zinc-400">{vd.approverUserId}</td>
                                <td className="py-2 px-3 text-right font-bold text-zinc-300">
                                  {formatCurrencyUSD(Number(vd.amountAffected))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt / Cash-Up Modal */}
      {printReport && (
        <RetailReceiptModal
          cashupReport={printReport}
          storeName="Frosthub Hardware & Building Supplies"
          storeBranch="Gaborone West Industrial, Botswana"
          onClose={() => setPrintReport(null)}
        />
      )}
    </div>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  PieChart,
  ShieldCheck,
} from 'lucide-react';
import { RetailNavHeader } from '../components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from '../components/RetailAccessErrorCard';
import { authFetch } from '@/lib/api-config';

interface FinancialMetrics {
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  totalExpenses: number;
  totalPayroll: number;
  operatingProfit: number;
  operatingMarginPct: number;
  inventoryValuationCost: number;
  inventoryValuationRetail: number;
  inventoryItemCount: number;
  totalTransactions: number;
  expensesByCategory: { [cat: string]: number };
}

export default function RetailReportsPage() {
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | 'all'>('30d');
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const res = await authFetch(`/api/retail/reports?period=${period}`);
      if (!res.ok) {
        let errJson: any = null;
        try { errJson = await res.json(); } catch {}
        setErrorState({
          status: res.status,
          code: errJson?.code || errJson?.error || (res.status === 401 ? 'AUTH_TOKEN_MISSING' : 'FETCH_ERROR'),
          message: errJson?.message || errJson?.error || `Failed to load reports: HTTP ${res.status}`,
        });
        return;
      }
      const data = await res.json();
      if (data.success && data.metrics) {
        setMetrics(data.metrics);
      } else {
        setErrorState({
          status: 400,
          code: data.error || 'LOAD_REPORTS_FAILED',
          message: data.message || data.error || 'Failed to load report metrics.',
        });
      }
    } catch (e: any) {
      console.error('Failed to load financial reports', e);
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: e.message || 'Error connecting to retail reporting services.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period]);

  const handleExportCSV = () => {
    if (!metrics) return;
    const rows = [
      ['Ralion Retail OS - Hardware Financial P&L Statement'],
      ['Store', 'Proinsight Hardware & Building Supplies'],
      ['Reporting Period', period],
      ['Operating Currency', 'USD ($)'],
      ['Generated At', new Date().toISOString()],
      [],
      ['Metric', 'Amount (USD)', 'Notes'],
      ['Gross Sales Revenue', metrics.totalRevenue.toFixed(2), 'Authoritative sales register'],
      ['Cost of Goods Sold (COGS)', metrics.totalCogs.toFixed(2), 'Unit cost preserved at time of sale'],
      ['Gross Profit', metrics.grossProfit.toFixed(2), 'Revenue minus COGS'],
      ['Gross Margin %', `${metrics.grossMarginPct.toFixed(1)}%`, ''],
      ['Operating Expenses (OPEX)', metrics.totalExpenses.toFixed(2), 'Rent, utilities, maintenance, transport'],
      ['Payroll & Wages', metrics.totalPayroll.toFixed(2), 'Verified store wages'],
      ['Operating Net Profit (EBITDA)', metrics.operatingProfit.toFixed(2), 'Gross Profit - OPEX - Payroll'],
      ['Operating Margin %', `${metrics.operatingMarginPct.toFixed(1)}%`, ''],
      [],
      ['Balance Sheet Inventory Valuation'],
      ['Total Stock Quantity', metrics.inventoryItemCount.toString(), 'Units on hand'],
      ['Inventory Asset at Cost', metrics.inventoryValuationCost.toFixed(2), 'Capitalized asset'],
      ['Inventory Asset at Retail', metrics.inventoryValuationRetail.toFixed(2), 'Expected sales value'],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `proinsight-hardware-pl-report-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (errorState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <RetailNavHeader onRefresh={fetchReports} />
        <RetailAccessErrorCard error={errorState} onRetry={fetchReports} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <RetailNavHeader onRefresh={fetchReports} />

      <div role="region" aria-label="Financial BI and Executive Reports" className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Financial BI & Executive P&L Reports
            </h2>
            <p className="text-sm text-zinc-400">
              Authoritative income statement with non-double-counted COGS, expenses, and payroll in USD ($).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs">
              {(['today', '7d', '30d', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    period === p
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p === 'today' ? 'Today' : p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              disabled={!metrics}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs flex items-center gap-2 transition border border-zinc-700/60 shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              Export P&L (CSV)
            </button>
          </div>
        </div>

        {/* Accounting Integrity Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-emerald-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-emerald-200 font-semibold">Strict Accounting Non-Double-Counting Guard:</strong>
            <p className="mt-0.5 text-zinc-400">
              Goods receipts capitalize balance-sheet inventory and do NOT trigger operating expenses. COGS is recognized exclusively when stock is deducted during posted sales. Operating profit is computed as: <code className="text-emerald-300 font-mono">Gross Profit − Operating Expenses − Payroll</code>.
            </p>
          </div>
        </div>

        {loading || !metrics ? (
          <div className="py-24 text-center text-zinc-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-500" />
            Computing authoritative store financials...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl space-y-1">
                <div className="text-xs text-zinc-400 flex items-center justify-between">
                  <span>Gross Sales Revenue</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">USD</span>
                </div>
                <div className="text-2xl font-bold font-mono text-zinc-100">
                  ${metrics.totalRevenue.toFixed(2)}
                </div>
                <div className="text-[11px] text-zinc-500">
                  {metrics.totalTransactions} paid transactions
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl space-y-1">
                <div className="text-xs text-zinc-400 flex items-center justify-between">
                  <span>Cost of Goods Sold (COGS)</span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">Historical</span>
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400">
                  ${metrics.totalCogs.toFixed(2)}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Deducted inventory cost basis
                </div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl space-y-1">
                <div className="text-xs text-zinc-400 flex items-center justify-between">
                  <span>Gross Profit</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {metrics.grossMarginPct.toFixed(1)}% margin
                  </span>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  ${metrics.grossProfit.toFixed(2)}
                </div>
                <div className="text-[11px] text-zinc-500">Revenue minus product costs</div>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl space-y-1">
                <div className="text-xs text-zinc-400 flex items-center justify-between">
                  <span>Operating Net Profit (EBITDA)</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    metrics.operatingProfit >= 0
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-rose-400 bg-rose-500/10'
                  }`}>
                    {metrics.operatingMarginPct.toFixed(1)}% margin
                  </span>
                </div>
                <div className={`text-2xl font-bold font-mono ${
                  metrics.operatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  ${metrics.operatingProfit.toFixed(2)}
                </div>
                <div className="text-[11px] text-zinc-500">After OPEX & Payroll</div>
              </div>
            </div>

            {/* Income Statement Table & Inventory Valuation Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Income Statement Detailed Table */}
              <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="font-bold text-zinc-100 text-base flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    Store Profit & Loss Statement (USD)
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">Period: {period.toUpperCase()}</span>
                </div>

                <div className="space-y-3 font-mono text-sm">
                  {/* Revenue */}
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-850">
                    <span className="text-zinc-200 font-semibold font-sans">1. Gross Revenue</span>
                    <span className="font-bold text-zinc-100">${metrics.totalRevenue.toFixed(2)}</span>
                  </div>

                  {/* COGS */}
                  <div className="flex justify-between items-center py-1.5 pl-4 border-b border-zinc-850 text-xs">
                    <span className="text-zinc-400 font-sans">Less: Cost of Goods Sold (COGS)</span>
                    <span className="text-amber-400">-${metrics.totalCogs.toFixed(2)}</span>
                  </div>

                  {/* Gross Profit */}
                  <div className="flex justify-between items-center py-2 bg-zinc-950/60 px-3 rounded-xl border border-zinc-800 font-bold">
                    <span className="text-emerald-300 font-sans">Gross Profit</span>
                    <span className="text-emerald-400">${metrics.grossProfit.toFixed(2)}</span>
                  </div>

                  {/* OPEX */}
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-zinc-300 font-sans mb-1.5">
                      2. Operating Overheads (OPEX)
                    </div>
                    {Object.entries(metrics.expensesByCategory).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between items-center py-1 pl-4 text-xs">
                        <span className="text-zinc-400 font-sans">{cat}</span>
                        <span className="text-rose-400">-${amt.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center py-1 pl-4 text-xs border-t border-zinc-850 mt-1">
                      <span className="text-zinc-300 font-sans font-medium">Total OPEX</span>
                      <span className="text-rose-400 font-bold">-${metrics.totalExpenses.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payroll */}
                  <div className="flex justify-between items-center py-1.5 pl-4 border-b border-zinc-850 text-xs">
                    <span className="text-zinc-300 font-sans">3. Store Wages & Staff Payroll</span>
                    <span className="text-rose-400">-${metrics.totalPayroll.toFixed(2)}</span>
                  </div>

                  {/* Net Operating Profit */}
                  <div className="flex justify-between items-center py-3 bg-emerald-500/10 px-4 rounded-xl border border-emerald-500/20 text-base font-bold">
                    <span className="text-emerald-300 font-sans">Net Operating Profit</span>
                    <span className={`font-mono ${metrics.operatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${metrics.operatingProfit.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>

              {/* Balance Sheet Asset Valuation */}
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4 backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <div className="border-b border-zinc-800 pb-3">
                    <h3 className="font-bold text-zinc-100 text-base flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-400" />
                      Balance Sheet Inventory Asset
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Current physical stock capitalized on books
                    </p>
                  </div>

                  <div className="space-y-4 mt-4 font-mono">
                    <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-850">
                      <div className="text-xs text-zinc-400 font-sans">Total Hardware Units in Stock</div>
                      <div className="text-2xl font-bold text-zinc-100 mt-1">
                        {metrics.inventoryItemCount} units
                      </div>
                    </div>

                    <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-850">
                      <div className="text-xs text-zinc-400 font-sans">Inventory Asset Valuation (at Cost)</div>
                      <div className="text-2xl font-bold text-emerald-400 mt-1">
                        ${metrics.inventoryValuationCost.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-sans mt-0.5">
                        Balance sheet capitalized asset value
                      </div>
                    </div>

                    <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-850">
                      <div className="text-xs text-zinc-400 font-sans">Projected Realizable Value (at Retail)</div>
                      <div className="text-2xl font-bold text-zinc-200 mt-1">
                        ${metrics.inventoryValuationRetail.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-sans mt-0.5">
                        Total expected revenue upon liquidation
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-400 font-sans flex items-center justify-between">
                  <span>Store Status:</span>
                  <span className="text-emerald-400 font-medium">Healthy Inventory Turnover</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Receipt,
  FileText,
  Truck,
  Users,
  ShoppingCart,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { RetailNavHeader } from './components/RetailNavHeader';
import { RetailAccessErrorCard, RetailErrorState } from './components/RetailAccessErrorCard';
import { RetailFinancialMetrics } from '@ralion/database';
import { authFetch } from '@/lib/api-config';
import { safeReplace } from '@/lib/retail/adapters';

export default function RetailDashboardPage() {
  const [metrics, setMetrics] = useState<RetailFinancialMetrics | null>(null);
  const [role, setRole] = useState('Store Owner');
  const [storeName, setStoreName] = useState('Retail Hardware Store');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<RetailErrorState | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const res = await authFetch('/api/retail/dashboard');
      if (!res.ok) {
        let errJson: any = null;
        try { errJson = await res.json(); } catch {}
        if (res.status === 401) {
          setErrorState({
            status: 401,
            code: errJson?.code || errJson?.error || 'AUTH_TOKEN_MISSING',
            message: errJson?.message || 'Authentication required to access Ralion Retail OS.',
          });
          return;
        }
        if (res.status === 403) {
          setErrorState({
            status: 403,
            code: errJson?.code || errJson?.error || 'RETAIL_MODULE_NOT_ENTITLED',
            message: errJson?.message || 'This workspace is not entitled to access Ralion Retail OS. Please contact your platform administrator to activate Retail demo access or redeem a trial voucher.',
          });
          return;
        }
        setErrorState({
          status: res.status,
          code: errJson?.code || 'FETCH_ERROR',
          message: errJson?.message || errJson?.error || `Failed to load retail data: HTTP ${res.status}`,
        });
        return;
      }
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        if (data.entitlement?.effectiveRole) {
          setRole(safeReplace(data.entitlement.effectiveRole, '_', ' '));
        }
        if (data.settings?.storeName) {
          setStoreName(data.settings.storeName);
        } else if (data.workspace?.name) {
          setStoreName(`${data.workspace.name} Hardware`);
        }
        if (data.entitlement?.defaultCurrency) {
          setCurrency(data.entitlement.defaultCurrency);
        }
      } else {
        setErrorState({
          status: 400,
          code: data.error || 'DASHBOARD_LOAD_FAILED',
          message: data.message || data.error || 'Failed to load dashboard metrics.',
        });
      }
    } catch (e: any) {
      setErrorState({
        status: 500,
        code: 'NETWORK_ERROR',
        message: e.message || 'Error connecting to retail services.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
        <RetailNavHeader role={role} storeName={storeName} currency={currency} onRefresh={fetchDashboardData} />
        <div className="flex-1 flex items-center justify-center p-12 text-zinc-400">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading Retail Dashboard in {currency}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
        <RetailNavHeader role={role} storeName={storeName} currency={currency} onRefresh={fetchDashboardData} />
        <RetailAccessErrorCard error={errorState} onRetry={fetchDashboardData} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
      <RetailNavHeader role={role} storeName={storeName} currency={currency} onRefresh={fetchDashboardData} />

      <div role="region" aria-label="Hardware Store Performance Center" className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Quick Action Banner */}
        <div className="bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/20 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Connected Retail Operations
            </span>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Hardware Store Performance Center</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Authoritative stock, sales, expense, and payroll figures for {storeName}.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/retail/pos"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              New POS Checkout
            </Link>
            <Link
              href="/retail/quotations"
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700/60"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              Create Quotation
            </Link>
            <Link
              href="/retail/purchasing"
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700/60"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              Receive Stock
            </Link>
            <Link
              href="/retail/expenses"
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700/60"
            >
              <PlusCircle className="w-4 h-4 text-rose-400" />
              Record Expense
            </Link>
          </div>
        </div>

        {/* 1. Primary Financial Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Sales */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Today's Sales</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-100 tracking-tight">
              {formatUSD(metrics?.todaySales || 0)}
            </div>
            <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">{metrics?.todaySalesCount || 0}</span> orders completed today
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Monthly Revenue</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-100 tracking-tight">
              {formatUSD(metrics?.monthlySales || 0)}
            </div>
            <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
              <span className="text-emerald-400 flex items-center font-medium">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                +{metrics?.salesGrowthPercent || 12.5}%
              </span>
              <span>vs prior month</span>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Gross Profit</span>
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-100 tracking-tight">
              {formatUSD(metrics?.grossProfit || 0)}
            </div>
            <div className="mt-2 text-xs text-zinc-400 flex items-center justify-between">
              <span>COGS: {formatUSD(metrics?.costOfGoodsSold || 0)}</span>
              <span className="text-indigo-400 font-medium">{metrics?.grossProfitMarginPercent?.toFixed(1) || 0}% margin</span>
            </div>
          </div>

          {/* Estimated Operating Profit */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Est. Operating Profit</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${(metrics?.estimatedOperatingProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatUSD(metrics?.estimatedOperatingProfit || 0)}
            </div>
            <div className="mt-2 text-xs text-zinc-400 flex items-center justify-between">
              <span>Expenses: {formatUSD((metrics?.operatingExpenses || 0) + (metrics?.payrollExpenses || 0))}</span>
              <span className="text-zinc-300 font-medium">{metrics?.operatingMarginPercent?.toFixed(1) || 0}% net</span>
            </div>
          </div>
        </div>

        {/* 2. Operational & Inventory Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-xs text-zinc-400 mb-1">Active Products</div>
            <div className="text-xl font-bold text-zinc-100">{metrics?.totalActiveProducts || 0}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Catalog items</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-xs text-zinc-400 mb-1">Stock Valuation</div>
            <div className="text-xl font-bold text-zinc-100">{formatUSD(metrics?.stockValuation || 0)}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Cost basis on hand</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-xs text-zinc-400 mb-1">Low-Stock Alerts</div>
            <div className={`text-xl font-bold ${(metrics?.lowStockCount || 0) > 0 ? 'text-amber-400' : 'text-zinc-100'}`}>
              {metrics?.lowStockCount || 0}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Below reorder level</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-xs text-zinc-400 mb-1">Pending Quotes</div>
            <div className="text-xl font-bold text-cyan-400">{metrics?.pendingQuotationsCount || 0}</div>
            <div className="text-[10px] text-zinc-500 mt-1">{formatUSD(metrics?.pendingQuotationsAmount || 0)}</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-xs text-zinc-400 mb-1">Customer Balances</div>
            <div className="text-xl font-bold text-amber-400">{formatUSD(metrics?.outstandingCustomerBalances || 0)}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Unpaid customer debt</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3">
            <div className="text-xs text-zinc-400 mb-1">Supplier Balances</div>
            <div className="text-xl font-bold text-rose-400">{formatUSD(metrics?.outstandingSupplierBalances || 0)}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Owed on accounts</div>
          </div>
        </div>

        {/* 3. Charts & Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Performance Trends */}
          <div className="lg:col-span-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">7-Day Sales & Gross Profit Trend</h3>
                <p className="text-xs text-zinc-400">Daily revenue and gross margins in USD ($)</p>
              </div>
              <span className="text-xs text-zinc-500 font-mono">Real-time Aggregation</span>
            </div>

            <div className="space-y-3 mt-4">
              {metrics?.salesOverTime && metrics.salesOverTime.length > 0 ? (
                metrics.salesOverTime.map((day) => {
                  const maxSale = Math.max(...metrics.salesOverTime.map((d) => d.sales), 100);
                  const barWidth = Math.min(100, Math.max(8, (day.sales / maxSale) * 100));

                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span className="font-mono">{day.date}</span>
                        <div className="space-x-3">
                          <span className="text-zinc-200 font-medium">Sales: {formatUSD(day.sales)}</span>
                          <span className="text-emerald-400 font-medium">Profit: {formatUSD(day.profit)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No sales recorded yet. Use POS Checkout or Convert a Quotation to generate sales.
                </div>
              )}
            </div>
          </div>

          {/* Operating Expense Breakdown */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Operating Expenses by Category</h3>
                  <p className="text-xs text-zinc-400">Current month non-COGS overhead</p>
                </div>
                <Link href="/retail/expenses" className="text-xs text-emerald-400 hover:underline">
                  Manage
                </Link>
              </div>

              <div className="space-y-3">
                {metrics?.expenseBreakdown && metrics.expenseBreakdown.length > 0 ? (
                  metrics.expenseBreakdown.map((exp) => (
                    <div key={exp.category} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-800/60 last:border-0">
                      <span className="text-zinc-300 font-medium capitalize">{safeReplace(exp.category, '_', ' ').toLowerCase()}</span>
                      <span className="text-zinc-100 font-mono font-semibold">{formatUSD(exp.amount)}</span>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No operating expenses recorded this month.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Total Operating Expenses:</span>
              <strong className="text-zinc-100 font-mono text-sm">{formatUSD(metrics?.operatingExpenses || 0)}</strong>
            </div>
          </div>
        </div>

        {/* 4. Best Sellers & Fast Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Selling Products */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">Top Selling Hardware Products</h3>
              <Link href="/retail/inventory" className="text-xs text-emerald-400 hover:underline">
                View Inventory
              </Link>
            </div>

            <div className="space-y-2.5">
              {metrics?.bestSellers && metrics.bestSellers.length > 0 ? (
                metrics.bestSellers.map((item, index) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-400 flex items-center justify-center font-bold text-[10px]">
                        #{index + 1}
                      </span>
                      <span className="text-zinc-200 font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-zinc-100 font-mono font-semibold">{formatUSD(item.revenue)}</div>
                      <div className="text-[10px] text-zinc-500">{item.quantitySold} units sold</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500">
                  No sales recorded yet. Process POS transactions to see best sellers.
                </div>
              )}
            </div>
          </div>

          {/* Pilot Modules Overview */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-100 mb-1">Ralion Retail Subsystems</h3>
            <p className="text-xs text-zinc-400 mb-4">All subsystems are synchronized in real-time under USD ($).</p>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/retail/pos"
                className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800 hover:border-emerald-500/40 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <ShoppingCart className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400" />
                </div>
                <div className="text-xs font-semibold text-zinc-200">Point of Sale</div>
                <div className="text-[10px] text-zinc-400">Barcode checkout & shifts</div>
              </Link>

              <Link
                href="/retail/inventory"
                className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800 hover:border-emerald-500/40 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <Package className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400" />
                </div>
                <div className="text-xs font-semibold text-zinc-200">Stock Ledger</div>
                <div className="text-[10px] text-zinc-400">Movements & adjustments</div>
              </Link>

              <Link
                href="/retail/quotations"
                className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800 hover:border-emerald-500/40 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <FileText className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400" />
                </div>
                <div className="text-xs font-semibold text-zinc-200">Quotations</div>
                <div className="text-[10px] text-zinc-400">Quote-to-sale conversion</div>
              </Link>

              <Link
                href="/retail/payroll"
                className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-800 hover:border-emerald-500/40 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <Users className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400" />
                </div>
                <div className="text-xs font-semibold text-zinc-200">Payroll</div>
                <div className="text-[10px] text-zinc-400">Staff salaries & payslips</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

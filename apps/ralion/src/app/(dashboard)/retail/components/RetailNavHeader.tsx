'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Receipt,
  Truck,
  TrendingDown,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { authFetch } from '@/lib/api-config';

interface RetailNavHeaderProps {
  role?: string;
  storeName?: string;
  currency?: string;
  onRefresh?: () => void;
}

export const RetailNavHeader: React.FC<RetailNavHeaderProps> = ({
  role = 'Store Owner',
  storeName = 'Retail Hardware Store',
  currency = 'USD',
  onRefresh,
}) => {
  const pathname = usePathname();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [isAdminInspection, setIsAdminInspection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const isParam = urlParams.get('admin_inspect') === 'true' || urlParams.get('preview') === 'internal';
      const isCookie = document.cookie.includes('ralion_admin_retail_inspect=true') || document.cookie.includes('ralion_preview_session');
      setIsAdminInspection(isParam || isCookie);
      if (window.location.search) {
        setSearchQuery(window.location.search);
      }
    }
  }, []);

  // Standalone cashier machine: do not show admin navigation or demo-data seeding.
  // Operational permissions remain enforced by server-side Retail APIs.
  const cleanPath = (pathname || '').replace(/\/+$/, '');
  const isCashierTerminal = cleanPath === '/cashier' || cleanPath === '/ralion/cashier';
  if (isCashierTerminal) {
    return (
      <header className="sticky top-0 z-30 border-b border-emerald-500/20 bg-zinc-900 px-5 py-3 text-zinc-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">Ralion Retail • Cashier Terminal</h1>
            <p className="text-xs text-zinc-400">Dedicated checkout workstation</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-lg border border-zinc-700 px-3 py-2">POS</span>
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-zinc-800 px-3 py-2 hover:bg-zinc-700">Refresh</button>
          </div>
        </div>
      </header>
    );
  }

  const navLinks = [
    { label: 'Overview', href: '/retail', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Point of Sale (POS)', href: '/retail/pos', icon: <ShoppingCart className="w-4 h-4" /> },
    { label: 'Products & Stock', href: '/retail/inventory', icon: <Package className="w-4 h-4" /> },
    { label: 'Quotations', href: '/retail/quotations', icon: <FileText className="w-4 h-4" /> },
    { label: 'Sales & Invoices', href: '/retail/sales', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Purchasing & Suppliers', href: '/retail/purchasing', icon: <Truck className="w-4 h-4" /> },
    { label: 'Expenses', href: '/retail/expenses', icon: <TrendingDown className="w-4 h-4" /> },
    { label: 'Employees & Payroll', href: '/retail/payroll', icon: <Users className="w-4 h-4" /> },
    { label: 'Reports & BI', href: '/retail/reports', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const handleLoadDemoData = async () => {
    try {
      setLoadingDemo(true);
      const res = await authFetch('/api/retail/demo-data', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDemoMessage('Hardware pilot demo dataset loaded in USD ($)!');
        setTimeout(() => setDemoMessage(null), 4000);
        if (onRefresh) onRefresh();
      } else {
        alert(data.error || 'Failed to load demo data.');
      }
    } catch (e: any) {
      alert(e.message || 'Error loading demo data.');
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="bg-zinc-900/90 border-b border-zinc-800 sticky top-0 z-30 backdrop-blur-md">
      {/* Platform Administrator Inspection Banner */}
      {isAdminInspection && (
        <div className="bg-indigo-950/95 border-b border-indigo-700/60 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 text-[10px]">
              🛡️ PLATFORM ADMIN INSPECTION
            </span>
            <span>
              Audited operational inspection session for {storeName} (Immutable audit logging active).
            </span>
          </div>
          <Link
            href="/admin"
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] transition-colors"
          >
            Exit Inspection → Admin Command Centre
          </Link>
        </div>
      )}

      {/* Top Bar */}
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-sm">
            🛒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-zinc-100 tracking-tight">{storeName}</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {storeName.includes('Proinsight') ? 'Proinsight Pilot' : 'Retail Demo'}
              </span>
            </div>
            <p className="text-xs text-zinc-400">Ralion Retail OS • Hardware & Building Materials Management</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Currency Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center gap-1.5 text-xs text-zinc-300 font-mono">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Currency:</span>
            <strong className="text-emerald-400">
              {currency === 'BWP' ? 'BWP (P)' : currency === 'ZAR' ? 'ZAR (R)' : `${currency || 'USD'} ($)`}
            </strong>
          </div>

          {/* Role Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs text-zinc-300">
            Role: <strong className="text-zinc-100">{role}</strong>
          </div>

          {/* Demo Data Seeder */}
          <button
            onClick={handleLoadDemoData}
            disabled={loadingDemo}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {loadingDemo ? 'Loading...' : 'Load Hardware Demo Data'}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {demoMessage && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>{demoMessage}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-6 flex items-center gap-1 overflow-x-auto scrollbar-none py-1.5">
        {navLinks.map((tab) => {
          const cleanCurrent = (pathname || '').replace(/\/+$/, '');
          const cleanTab = tab.href.replace(/\/+$/, '');
          const isActive =
            cleanCurrent === cleanTab ||
            cleanCurrent === `/ralion${cleanTab}` ||
            cleanCurrent.replace('/ralion', '') === cleanTab;

          const targetHref = searchQuery ? `${tab.href}${searchQuery}` : tab.href;

          return (
            <Link
              key={tab.href}
              href={targetHref}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

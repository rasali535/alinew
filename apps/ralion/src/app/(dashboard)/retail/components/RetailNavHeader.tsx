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

interface RetailNavHeaderProps {
  role?: string;
  storeName?: string;
  onRefresh?: () => void;
}

export const RetailNavHeader: React.FC<RetailNavHeaderProps> = ({
  role = 'Store Owner',
  storeName = 'Proinsight Hardware & Building Supplies',
  onRefresh,
}) => {
  const pathname = usePathname();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  const navLinks = [
    { label: 'Overview', href: '/ralion/retail', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Point of Sale (POS)', href: '/ralion/retail/pos', icon: <ShoppingCart className="w-4 h-4" /> },
    { label: 'Products & Stock', href: '/ralion/retail/inventory', icon: <Package className="w-4 h-4" /> },
    { label: 'Quotations', href: '/ralion/retail/quotations', icon: <FileText className="w-4 h-4" /> },
    { label: 'Sales & Invoices', href: '/ralion/retail/sales', icon: <Receipt className="w-4 h-4" /> },
    { label: 'Purchasing & Suppliers', href: '/ralion/retail/purchasing', icon: <Truck className="w-4 h-4" /> },
    { label: 'Expenses', href: '/ralion/retail/expenses', icon: <TrendingDown className="w-4 h-4" /> },
    { label: 'Employees & Payroll', href: '/ralion/retail/payroll', icon: <Users className="w-4 h-4" /> },
    { label: 'Reports & BI', href: '/ralion/retail/reports', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  const handleLoadDemoData = async () => {
    try {
      setLoadingDemo(true);
      const res = await fetch('/api/retail/demo-data', { method: 'POST' });
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
                Proinsight Pilot
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
            <strong className="text-emerald-400">USD ($)</strong>
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
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
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

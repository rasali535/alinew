'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, LogIn, AlertTriangle, RefreshCw, ArrowRight, Building2 } from 'lucide-react';

export interface RetailErrorState {
  status: number;
  message: string;
  code?: string;
}

interface RetailAccessErrorCardProps {
  error: RetailErrorState;
  onRetry?: () => void;
}

export const RetailAccessErrorCard: React.FC<RetailAccessErrorCardProps> = ({ error, onRetry }) => {
  const is401 = error.status === 401 || error.code === 'AUTH_TOKEN_MISSING' || error.code === 'AUTH_TOKEN_INVALID' || error.code === 'AUTH_SESSION_EXPIRED';
  const is403 = error.status === 403 || error.code === 'RETAIL_MODULE_NOT_ENTITLED' || error.code === 'WORKSPACE_ACCESS_DENIED';

  const currentHref = typeof window !== 'undefined' ? window.location.href : '/ralion/retail';
  const loginUrl = `/ralion/login?redirect=${encodeURIComponent(currentHref)}`;

  if (is401) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-zinc-900 border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Session Expired</h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Your authenticated Ralion session is missing or has expired. Please sign in again to resume managing your store and hardware inventory.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={loginUrl}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Ralion</span>
            </a>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (is403) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-zinc-900 border border-rose-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Retail Access Restricted</h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            This workspace is not entitled to access Ralion Retail OS. Exclusive pilot access is reserved for Proinsight Hardware &amp; Building Supplies.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/workspace"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Switch Workspace</span>
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <span>Main Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100 mb-2">Unable to Connect</h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          {error.message || 'An unexpected error occurred while communicating with retail services.'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        )}
      </div>
    </div>
  );
};

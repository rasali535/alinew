'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Building2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';

export default function DemoCodeRedeemPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length < 6) {
      setError('Please enter a valid Ralion access code.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await authFetch('/api/trial/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned unexpected response (HTTP ${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to redeem trial access code.');
      }

      setSuccess(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to redeem code. Please verify the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/10">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Redeem Product Demo Access</h1>
          <p className="text-xs text-zinc-400">
            Enter your time-limited demo access code to unlock Retail and Trade trial entitlements.
          </p>
        </div>

        {/* Card */}
        <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl space-y-5">
          {error && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                <div>
                  <div className="font-bold text-sm">Entitlements Activated!</div>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    Your {success.redemption?.duration_days}-day demo access has been provisioned.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2 text-xs">
                <div className="text-zinc-400 font-semibold">Unlocked Products:</div>
                <div className="flex flex-wrap gap-2">
                  {(success.redemption?.eligible_products || []).map((p: string) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-bold uppercase text-[10px] flex items-center gap-1.5"
                    >
                      {p === 'retail' ? <ShoppingBag className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      Ralion {p}
                    </span>
                  ))}
                </div>
                <div className="text-[11px] text-zinc-500 pt-1">
                  Expires:{' '}
                  <span className="text-zinc-300 font-mono">
                    {new Date(success.redemption?.trial_expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push(success.redirectUrl || '/ralion/retail')}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
              >
                Launch Product Workspace <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Demo Access Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="RT-XXXX-XXXX-XXXX"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono tracking-wider text-white placeholder-zinc-600 outline-none transition-all"
                />
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Format: RT-XXXX-XXXX-XXXX • Case-insensitive
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>Verifying & Provisioning…</>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Redeem Access Code
                  </>
                )}
              </button>
            </form>
          )}

          <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-zinc-600" /> Isolated Workspace
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Time-Limited Demo
            </span>
          </div>
        </div>

        <div className="text-center text-[11px] text-zinc-600">
          Powered by Ras Ali Labs Ralion Identity & Entitlement Engine.
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Clock3,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type MariApiScope = 'intelligence:read' | 'knowledge:read' | 'analysis:run';

type MariApiKey = {
  id: string;
  organizationId: string;
  workspaceId: string;
  createdBy: string | null;
  name: string;
  keyPrefix: string;
  scopes: MariApiScope[];
  status: 'ACTIVE' | 'REVOKED';
  monthlyRequestLimit: number;
  monthlyCreditLimit: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  requestCount: number;
  createdAt: string;
};

const SCOPE_OPTIONS: Array<{ value: MariApiScope; label: string; help: string }> = [
  { value: 'intelligence:read', label: 'Intelligence', help: 'Ask Mari for tenant-scoped business reasoning.' },
  { value: 'knowledge:read', label: 'Knowledge', help: 'Allow approved Ralion knowledge retrieval when available.' },
  { value: 'analysis:run', label: 'Analysis', help: 'Reserved for deeper analysis endpoints as they are enabled.' },
];

function displayStatus(key: MariApiKey): 'ACTIVE' | 'EXPIRED' | 'REVOKED' {
  if (key.status === 'REVOKED') return 'REVOKED';
  if (key.expiresAt && Date.parse(key.expiresAt) <= Date.now()) return 'EXPIRED';
  return 'ACTIVE';
}

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-BW', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function DeveloperPlatformPage() {
  const [keys, setKeys] = useState<MariApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('Production backend');
  const [expiry, setExpiry] = useState('90');
  const [scopes, setScopes] = useState<MariApiScope[]>(['intelligence:read', 'knowledge:read']);
  const [revealedSecret, setRevealedSecret] = useState<{ name: string; secret: string; warning: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const activeCount = useMemo(() => keys.filter((key) => displayStatus(key) === 'ACTIVE').length, [keys]);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch('/api/mari/api-keys');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to load Mari API keys.');
      setKeys(Array.isArray(payload?.keys) ? payload.keys : []);
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load Mari API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  function toggleScope(scope: MariApiScope) {
    setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]);
  }

  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return setError('Give this key a name so you know which application uses it.');
    if (scopes.length === 0) return setError('Select at least one API scope.');

    setCreating(true);
    setError(null);
    try {
      const expiresAt = expiry === 'never'
        ? null
        : new Date(Date.now() + Number(expiry) * 86_400_000).toISOString();
      const response = await authFetch('/api/mari/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), scopes, expiresAt }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to create Mari API key.');
      setRevealedSecret({ name: payload.key?.name || name.trim(), secret: payload.apiKey, warning: payload.warning });
      await loadKeys();
    } catch (createError: any) {
      setError(createError?.message || 'Unable to create Mari API key.');
    } finally {
      setCreating(false);
    }
  }

  async function rotateKey(key: MariApiKey) {
    if (!window.confirm(`Rotate “${key.name}”? The current secret will stop working immediately.`)) return;
    setBusyKeyId(key.id);
    setError(null);
    try {
      const response = await authFetch('/api/mari/api-keys', {
        method: 'PATCH',
        body: JSON.stringify({ keyId: key.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to rotate API key.');
      setRevealedSecret({ name: payload.key?.name || key.name, secret: payload.apiKey, warning: payload.warning });
      await loadKeys();
    } catch (rotateError: any) {
      setError(rotateError?.message || 'Unable to rotate API key.');
    } finally {
      setBusyKeyId(null);
    }
  }

  async function revokeKey(key: MariApiKey) {
    if (!window.confirm(`Revoke “${key.name}”? Applications using it will stop authenticating.`)) return;
    setBusyKeyId(key.id);
    setError(null);
    try {
      const response = await authFetch(`/api/mari/api-keys?keyId=${encodeURIComponent(key.id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to revoke API key.');
      await loadKeys();
    } catch (revokeError: any) {
      setError(revokeError?.message || 'Unable to revoke API key.');
    } finally {
      setBusyKeyId(null);
    }
  }

  async function copySecret() {
    if (!revealedSecret) return;
    try {
      await navigator.clipboard.writeText(revealedSecret.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Clipboard access failed. Select and copy the secret manually.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 md:px-6 md:py-9">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-300">
            <KeyRound className="h-3.5 w-3.5" /> Mari API Access
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Customer API Keys</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
            Create secure, workspace-bound credentials for applications that will use Mari. Ralion stores only a one-way hash; the complete secret is revealed once when created or rotated.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="text-xs font-bold text-white">{activeCount}/10 active keys</div>
            <div className="text-[11px] text-slate-500">Tenant-scoped • hashed at rest</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {revealedSecret && (
        <section className="mb-7 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-purple-500/5 p-5 md:p-6">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-200">
            <AlertTriangle className="h-4 w-4" /> Save {revealedSecret.name} now
          </div>
          <p className="mb-4 text-xs leading-5 text-slate-300">{revealedSecret.warning}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <code className="min-w-0 flex-1 select-all overflow-x-auto rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white">
              {revealedSecret.secret}
            </code>
            <button onClick={() => void copySecret()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-slate-950 hover:bg-slate-200">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy key'}
            </button>
          </div>
          <button onClick={() => setRevealedSecret(null)} className="mt-4 text-xs font-semibold text-slate-400 hover:text-white">I have saved this key</button>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="h-fit rounded-3xl border border-white/10 bg-[#101827] p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300"><Plus className="h-5 w-5" /></div>
            <div><h2 className="text-sm font-bold text-white">Create API key</h2><p className="text-xs text-slate-500">Owners and admins only</p></div>
          </div>

          <form onSubmit={createKey} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Key name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-purple-400/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Expiry</label>
              <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#0c1421] px-3 py-2.5 text-sm text-white outline-none">
                <option value="30">30 days</option><option value="90">90 days</option><option value="365">1 year</option><option value="never">No expiry</option>
              </select>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-slate-300">Scopes</div>
              <div className="space-y-2">
                {SCOPE_OPTIONS.map((scope) => (
                  <label key={scope.value} className="flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                    <input type="checkbox" checked={scopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} className="mt-0.5" />
                    <span><span className="block text-xs font-bold text-white">{scope.label} <code className="ml-1 text-[10px] text-purple-300">{scope.value}</code></span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{scope.help}</span></span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={creating || activeCount >= 10} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Generate API key
            </button>
          </form>
          <p className="mt-5 border-t border-white/10 pt-5 text-[11px] leading-5 text-slate-500">Keep API keys on servers you control. Never embed them in browser JavaScript, mobile application bundles or public repositories.</p>
        </section>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#101827]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
              <div><h2 className="text-sm font-bold text-white">Workspace keys</h2><p className="mt-0.5 text-xs text-slate-500">Only the safe key prefix remains visible after creation.</p></div>
              <button onClick={() => void loadKeys()} disabled={loading} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white"><RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>

            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading keys…</div>
            ) : keys.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center"><KeyRound className="mb-3 h-8 w-8 text-slate-600" /><div className="text-sm font-semibold text-slate-300">No API keys yet</div><p className="mt-1 text-xs text-slate-500">Create your first Mari customer key on the left.</p></div>
            ) : (
              <div className="divide-y divide-white/10">
                {keys.map((key) => {
                  const status = displayStatus(key);
                  const busy = busyKeyId === key.id;
                  return (
                    <div key={key.id} className="p-5 md:p-6">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-white">{key.name}</h3><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${status === 'ACTIVE' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : status === 'EXPIRED' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>{status}</span></div>
                          <code className="mt-2 block text-xs text-purple-300">{key.keyPrefix}••••••••••••</code>
                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-slate-500">
                            <span>{key.requestCount.toLocaleString()} lifetime requests</span><span>Last used: {formatDate(key.lastUsedAt)}</span><span>Expires: {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">{key.scopes.map((scope) => <code key={scope} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-400">{scope}</code>)}</div>
                          <div className="mt-3 text-[11px] text-slate-500">Per-key ceiling: {key.monthlyRequestLimit.toLocaleString()} requests / {key.monthlyCreditLimit.toLocaleString()} credits monthly</div>
                        </div>
                        {status === 'ACTIVE' && (
                          <div className="flex shrink-0 gap-2">
                            <button disabled={busy} onClick={() => void rotateKey(key)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.07] hover:text-white disabled:opacity-50"><RotateCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Rotate</button>
                            <button disabled={busy} onClick={() => void revokeKey(key)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Revoke</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-brand-gold/20 bg-gradient-to-br from-brand-gold/[0.07] to-purple-500/[0.04] p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gold/10 text-brand-gold"><Sparkles className="h-5 w-5" /></div>
              <div>
                <div className="mb-1 flex items-center gap-2"><h2 className="text-sm font-bold text-white">Public Mari API is next</h2><span className="rounded-full border border-brand-gold/20 bg-brand-gold/10 px-2 py-0.5 text-[10px] font-bold text-brand-gold">NOT YET ENABLED</span></div>
                <p className="text-xs leading-5 text-slate-400">These customer credentials are being established first. The public endpoint will be enabled after its requests are bound to Ralion’s durable tenant credit wallet, idempotency and production verification. This prevents a second billing path from drifting away from Mari credits.</p>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-slate-500"><Clock3 className="h-3.5 w-3.5" /> Next phase: authenticated Mari chat API + wallet-backed usage</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

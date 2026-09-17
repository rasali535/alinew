'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type ApiKeyStatus = 'active' | 'expired' | 'revoked';

type ApiKeyRecord = {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  environment: 'live';
  rateLimitPerMinute: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  rotatedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  status: ApiKeyStatus;
};

type RevealedSecret = {
  name: string;
  secret: string;
  message: string;
};

const PUBLIC_MARI_ENDPOINT = 'https://rasalilabs.com/ralion/api/v1/mari/chat';
const CURL_EXAMPLE = `curl -X POST ${PUBLIC_MARI_ENDPOINT} \\
  -H "Authorization: Bearer $RALION_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: customer-request-001" \\
  -d '{"message":"What should we focus our marketing on this month?"}'`;

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-BW', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function statusClasses(status: ApiKeyStatus): string {
  if (status === 'active') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (status === 'expired') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

export default function DeveloperPlatformPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('90');
  const [revealedSecret, setRevealedSecret] = useState<RevealedSecret | null>(null);
  const [copied, setCopied] = useState<'secret' | 'curl' | 'endpoint' | null>(null);

  const activeKeys = useMemo(
    () => apiKeys.filter((key) => key.status === 'active').length,
    [apiKeys]
  );

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch('/api/developer/api-keys');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || 'Unable to load API keys.');
      setApiKeys(Array.isArray(data?.apiKeys) ? data.apiKeys : []);
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function createApiKey(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Give the key a name so you can identify where it is being used.');
      return;
    }

    setCreating(true);
    setError(null);
    setCopied(null);
    try {
      const response = await authFetch('/api/developer/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: trimmedName,
          expiresInDays: expiresInDays === 'never' ? null : Number(expiresInDays),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || data?.error || 'Unable to create API key.');

      setRevealedSecret({
        name: data.apiKey?.name || trimmedName,
        secret: data.secret,
        message: data.warning || 'Copy this key now. It will not be shown again.',
      });
      setName('');
      await loadKeys();
    } catch (createError: any) {
      setError(createError?.message || 'Unable to create API key.');
    } finally {
      setCreating(false);
    }
  }

  async function revokeApiKey(apiKey: ApiKeyRecord) {
    if (apiKey.status === 'revoked') return;
    if (!window.confirm(`Revoke “${apiKey.name}”? Any application using this key will stop authenticating.`)) return;

    setBusyKeyId(apiKey.id);
    setError(null);
    try {
      const response = await authFetch(`/api/developer/api-keys/${apiKey.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || 'Unable to revoke API key.');
      await loadKeys();
    } catch (revokeError: any) {
      setError(revokeError?.message || 'Unable to revoke API key.');
    } finally {
      setBusyKeyId(null);
    }
  }

  async function rotateApiKey(apiKey: ApiKeyRecord) {
    if (apiKey.status !== 'active') return;
    if (!window.confirm(`Rotate “${apiKey.name}”? The current secret will stop working immediately.`)) return;

    setBusyKeyId(apiKey.id);
    setError(null);
    setCopied(null);
    try {
      const response = await authFetch(`/api/developer/api-keys/${apiKey.id}/rotate`, { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || 'Unable to rotate API key.');

      setRevealedSecret({
        name: data.apiKey?.name || apiKey.name,
        secret: data.secret,
        message: data.warning || 'The previous secret is invalid. Copy this replacement key now.',
      });
      await loadKeys();
    } catch (rotateError: any) {
      setError(rotateError?.message || 'Unable to rotate API key.');
    } finally {
      setBusyKeyId(null);
    }
  }

  async function copyValue(kind: 'secret' | 'curl' | 'endpoint', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setError('Clipboard access failed. Select the value and copy it manually.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
            <KeyRound className="h-3.5 w-3.5" /> Mari API Access
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Customer API Keys</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
            Create workspace-bound credentials for server-side applications using Mari. Ralion stores only a one-way hash; the full secret is shown once when created or rotated.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <div>
            <div className="text-xs font-semibold text-white">{activeKeys}/10 active keys</div>
            <div className="text-[11px] text-slate-500">Scope: mari:chat • 60 req/min</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {revealedSecret && (
        <div className="mb-8 rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-purple-500/5 p-5 md:p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-200">
            <AlertTriangle className="h-4 w-4" /> Save {revealedSecret.name} now
          </div>
          <p className="mb-4 text-xs leading-5 text-slate-300">{revealedSecret.message}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <code className="min-w-0 flex-1 select-all overflow-x-auto rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white">
              {revealedSecret.secret}
            </code>
            <button
              type="button"
              onClick={() => void copyValue('secret', revealedSecret.secret)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-slate-950 transition hover:bg-slate-200"
            >
              {copied === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === 'secret' ? 'Copied' : 'Copy key'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRevealedSecret(null)}
            className="mt-4 text-xs font-semibold text-slate-400 hover:text-white"
          >
            I have saved this key
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="h-fit rounded-3xl border border-white/10 bg-[#101827] p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create a Mari API key</h2>
              <p className="text-xs text-slate-500">Owners and admins only</p>
            </div>
          </div>

          <form onSubmit={createApiKey} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Key name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="e.g. Production backend"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Expires</label>
              <select
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0c1421] px-3 py-2.5 text-sm text-white outline-none focus:border-purple-400/50"
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="never">No expiry</option>
              </select>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Permission</div>
              <div className="flex items-center justify-between gap-3">
                <code className="text-xs text-purple-300">mari:chat</code>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Read-only AI</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || activeKeys >= 10}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Generate API key
            </button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-5 text-[11px] leading-5 text-slate-500">
            Never put a Ralion API secret in browser JavaScript, mobile bundles or public repositories. Call Mari from a backend you control.
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#101827]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
            <div>
              <h2 className="text-sm font-bold text-white">Workspace keys</h2>
              <p className="mt-0.5 text-xs text-slate-500">Only the safe prefix remains visible after creation.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadKeys()}
              disabled={loading}
              className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              aria-label="Refresh API keys"
            >
              <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading API keys…
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <KeyRound className="mb-3 h-8 w-8 text-slate-600" />
              <div className="text-sm font-semibold text-slate-300">No API keys yet</div>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Create a key on the left, save the secret once, then use it from your server.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {apiKeys.map((apiKey) => {
                const busy = busyKeyId === apiKey.id;
                return (
                  <div key={apiKey.id} className="p-5 md:p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-bold text-white">{apiKey.name}</h3>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusClasses(apiKey.status)}`}>
                            {apiKey.status}
                          </span>
                        </div>
                        <code className="text-xs text-slate-400">{apiKey.keyPrefix}••••••••••••••••</code>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
                          <span>Created {formatDate(apiKey.createdAt)}</span>
                          <span>Last used {formatDate(apiKey.lastUsedAt)}</span>
                          <span>{apiKey.expiresAt ? `Expires ${formatDate(apiKey.expiresAt)}` : 'No expiry'}</span>
                          <span>{apiKey.rateLimitPerMinute} req/min</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => void rotateApiKey(apiKey)}
                          disabled={busy || apiKey.status !== 'active'}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                          Rotate
                        </button>
                        <button
                          type="button"
                          onClick={() => void revokeApiKey(apiKey)}
                          disabled={busy || apiKey.status === 'revoked'}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Revoke
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/[0.08] to-cyan-500/[0.03] p-5 md:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-purple-300">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-white">Public Mari API v1</h2>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">mari:chat</span>
            </div>
            <p className="max-w-3xl text-xs leading-5 text-slate-400">
              Text reasoning is read-only in v1. Your key supplies the workspace identity automatically; do not send organization or workspace IDs. Each successful model response uses the same Mari credit wallet as the Ralion app.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Endpoint</span>
              <button
                type="button"
                onClick={() => void copyValue('endpoint', PUBLIC_MARI_ENDPOINT)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 hover:text-purple-200"
              >
                {copied === 'endpoint' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === 'endpoint' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <code className="block overflow-x-auto rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-xs text-emerald-200">
              POST {PUBLIC_MARI_ENDPOINT}
            </code>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">cURL</span>
              <button
                type="button"
                onClick={() => void copyValue('curl', CURL_EXAMPLE)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-300 hover:text-purple-200"
              >
                {copied === 'curl' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === 'curl' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre rounded-xl border border-white/10 bg-black/25 p-4 font-mono text-[11px] leading-5 text-slate-300">{CURL_EXAMPLE}</pre>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Authentication</div>
              <div className="mt-1 text-xs text-white">Bearer key or x-api-key</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Rate limit</div>
              <div className="mt-1 text-xs text-white">60 requests / minute / key</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Billing</div>
              <div className="mt-1 text-xs text-white">Mari credits on model success</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

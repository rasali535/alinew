'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bot,
  Check,
  Code2,
  Copy,
  Globe2,
  Loader2,
  Pause,
  Play,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type MariWidget = {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  publicToken: string;
  allowedDomains: string[];
  assistantName: string;
  welcomeMessage: string;
  accentColor: string;
  position: 'bottom-right' | 'bottom-left';
  status: 'ACTIVE' | 'PAUSED' | 'REVOKED';
  monthlyRequestLimit: number;
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
};

const EMBED_SRC = 'https://rasalilabs.com/ralion/api/mari/widget/embed';

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-BW', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function embedSnippet(widget: MariWidget): string {
  return `<script async src="${EMBED_SRC}" data-widget="${widget.publicToken}"></script>`;
}

export default function MariWidgetsPage() {
  const [widgets, setWidgets] = useState<MariWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [name, setName] = useState('Website assistant');
  const [domains, setDomains] = useState('');
  const [assistantName, setAssistantName] = useState('Mari');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! I’m Mari. How can I help?');
  const [accentColor, setAccentColor] = useState('#7c3aed');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');

  const activeCount = useMemo(() => widgets.filter((widget) => widget.status === 'ACTIVE').length, [widgets]);

  const loadWidgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch('/api/mari/widgets');
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to load website widgets.');
      setWidgets(Array.isArray(payload?.widgets) ? payload.widgets : []);
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load website widgets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWidgets();
  }, [loadWidgets]);

  async function createWidget(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const allowedDomains = domains.split(/[\n,]/g).map((item) => item.trim()).filter(Boolean);
      const response = await authFetch('/api/mari/widgets', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          allowedDomains,
          assistantName: assistantName.trim(),
          welcomeMessage: welcomeMessage.trim(),
          accentColor,
          position,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to create website widget.');
      setDomains('');
      await loadWidgets();
    } catch (createError: any) {
      setError(createError?.message || 'Unable to create website widget.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(widget: MariWidget) {
    if (widget.status === 'REVOKED') return;
    setBusyId(widget.id);
    setError(null);
    try {
      const response = await authFetch('/api/mari/widgets', {
        method: 'PATCH',
        body: JSON.stringify({ widgetId: widget.id, status: widget.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to update widget.');
      await loadWidgets();
    } catch (updateError: any) {
      setError(updateError?.message || 'Unable to update widget.');
    } finally {
      setBusyId(null);
    }
  }

  async function revokeWidget(widget: MariWidget) {
    if (widget.status === 'REVOKED') return;
    if (!window.confirm(`Revoke “${widget.name}”? The embed will stop creating new Mari sessions immediately.`)) return;
    setBusyId(widget.id);
    setError(null);
    try {
      const response = await authFetch(`/api/mari/widgets?widgetId=${encodeURIComponent(widget.id)}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Unable to revoke widget.');
      await loadWidgets();
    } catch (revokeError: any) {
      setError(revokeError?.message || 'Unable to revoke widget.');
    } finally {
      setBusyId(null);
    }
  }

  async function copySnippet(widget: MariWidget) {
    try {
      await navigator.clipboard.writeText(embedSnippet(widget));
      setCopiedId(widget.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setError('Clipboard access failed. Select and copy the embed code manually.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 md:px-6 md:py-9">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300">
              <Globe2 className="h-3.5 w-3.5" /> Website Widget
            </span>
            <Link href="/developer" className="text-xs font-semibold text-slate-500 hover:text-white">← API keys</Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Embed Mari on a website</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
            Create a domain-bound Mari assistant and paste one script tag into the customer website. The browser never receives a <code className="text-purple-300">mari_live_...</code> secret.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <div><div className="text-xs font-bold text-white">{activeCount} active widgets</div><div className="text-[11px] text-slate-500">Domain allowlist • short-lived sessions</div></div>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
        <section className="h-fit rounded-3xl border border-white/10 bg-[#101827] p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300"><Plus className="h-5 w-5" /></div>
            <div><h2 className="text-sm font-bold text-white">Create website widget</h2><p className="text-xs text-slate-500">No secret API key is exposed</p></div>
          </div>

          <form onSubmit={createWidget} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Widget name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Approved website domains</label>
              <textarea value={domains} onChange={(event) => setDomains(event.target.value)} rows={3} placeholder="example.com\nwww.example.com" className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50" />
              <p className="mt-1.5 text-[10px] leading-4 text-slate-500">One per line or comma separated. Use <code>*.example.com</code> only when you intentionally want all subdomains.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Assistant name</label>
                <input value={assistantName} onChange={(event) => setAssistantName(event.target.value)} maxLength={40} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Accent</label>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-1.5">
                  <input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="h-8 w-10 cursor-pointer border-0 bg-transparent" />
                  <code className="text-xs text-slate-400">{accentColor}</code>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Welcome message</label>
              <textarea value={welcomeMessage} onChange={(event) => setWelcomeMessage(event.target.value)} maxLength={240} rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-300">Position</label>
              <select value={position} onChange={(event) => setPosition(event.target.value as 'bottom-right' | 'bottom-left')} className="w-full rounded-xl border border-white/10 bg-[#0c1421] px-3 py-2.5 text-sm text-white outline-none">
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </div>
            <button type="submit" disabled={creating || !domains.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />} Create widget
            </button>
          </form>
        </section>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#101827]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-6">
              <div><h2 className="text-sm font-bold text-white">Website assistants</h2><p className="mt-0.5 text-xs text-slate-500">Copy the embed snippet into the approved site.</p></div>
              <button type="button" onClick={() => void loadWidgets()} disabled={loading} className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white"><RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>

            {loading ? (
              <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading widgets…</div>
            ) : widgets.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center"><Globe2 className="mb-3 h-8 w-8 text-slate-600" /><div className="text-sm font-semibold text-slate-300">No website widgets yet</div><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Create one, approve the website domain and paste the generated script before the closing <code>&lt;/body&gt;</code> tag.</p></div>
            ) : (
              <div className="divide-y divide-white/10">
                {widgets.map((widget) => {
                  const busy = busyId === widget.id;
                  const snippet = embedSnippet(widget);
                  return (
                    <div key={widget.id} className="p-5 md:p-6">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-white">{widget.name}</h3>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${widget.status === 'ACTIVE' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300' : widget.status === 'PAUSED' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'border-red-500/25 bg-red-500/10 text-red-300'}`}>{widget.status}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                            <span>{widget.assistantName}</span><span>{widget.position.replace('-', ' ')}</span><span>{widget.requestCount.toLocaleString()} lifetime requests</span><span>Last used {formatDate(widget.lastUsedAt)}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {widget.allowedDomains.map((domain) => <span key={domain} className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-300">{domain}</span>)}
                          </div>

                          {widget.status !== 'REVOKED' && (
                            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Code2 className="h-3.5 w-3.5" /> Embed code</div>
                                <button type="button" onClick={() => void copySnippet(widget)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 hover:text-cyan-200">{copiedId === widget.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copiedId === widget.id ? 'Copied' : 'Copy'}</button>
                              </div>
                              <code className="block overflow-x-auto whitespace-nowrap text-[10px] leading-5 text-slate-300">{snippet}</code>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          {widget.status !== 'REVOKED' && (
                            <button type="button" onClick={() => void toggleStatus(widget)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 disabled:opacity-40">
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : widget.status === 'ACTIVE' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{widget.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                            </button>
                          )}
                          <button type="button" onClick={() => void revokeWidget(widget)} disabled={busy || widget.status === 'REVOKED'} className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /> Revoke</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.05] p-5 md:p-6">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div><h2 className="text-sm font-bold text-white">Safe for browser embedding</h2><p className="mt-1 text-xs leading-5 text-slate-400">The snippet contains a public widget identifier, not the customer’s Mari API secret. Ralion validates the website domain, creates a short-lived session, rate-limits visitors and charges successful model reasoning against the organisation’s existing Mari credit wallet. Public widgets also exclude CRM and private-document context.</p></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

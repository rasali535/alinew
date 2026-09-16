'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button } from '@ralion/ui';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { authFetch } from '@/lib/api-config';

type CompetitorWatchlistItem = {
  id: string;
  name: string;
  websiteUrl: string;
  metaAdLibraryUrl: string | null;
  googleBusinessUrl: string | null;
  notes: string | null;
  status: 'ACTIVE' | 'PAUSED';
  scanFrequency: 'WEEKLY' | 'ON_DEMAND';
  lastScannedAt: string | null;
  nextScanAt: string | null;
  lastScanStatus: string | null;
  lastScanError: string | null;
};

type CompetitorObservation = {
  id: string;
  competitorId: string;
  competitorName?: string;
  sourceType: string;
  sourceUrl: string;
  observationType: string;
  title: string;
  summary: string;
  evidenceExcerpt: string | null;
  confidence: number;
  isInference: boolean;
  observedAt: string;
};

type CompetitiveBriefing = {
  id: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  marketMoves: string[];
  marketGaps: string[];
  recommendedActions: string[];
  sourceObservationIds: string[];
  createdAt: string;
};

type CompetitiveSnapshot = {
  version: '1.0';
  generatedAt: string;
  watchlist: CompetitorWatchlistItem[];
  recentObservations: CompetitorObservation[];
  latestBriefing: CompetitiveBriefing | null;
  rules: {
    publicSourcesOnly: true;
    copyCompetitorCreative: false;
    strategiesAreInferenceOnly: true;
    automaticPublishing: false;
  };
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  code?: string;
  error?: string;
};

function safeDate(value?: string | null): string {
  if (!value) return 'Not yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not yet';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function confidenceLabel(value: number): string {
  if (value >= 0.8) return 'High';
  if (value >= 0.6) return 'Moderate';
  return 'Early';
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = await response.json().catch(() => ({}));
  return payload as ApiEnvelope<T>;
}

export function CompetitiveIntelligencePanel() {
  const [snapshot, setSnapshot] = useState<CompetitiveSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    websiteUrl: '',
    metaAdLibraryUrl: '',
    googleBusinessUrl: '',
    notes: '',
  });

  const loadSnapshot = useCallback(async () => {
    setError(null);
    try {
      const response = await authFetch('/api/mari/competitive-intelligence');
      const payload = await readEnvelope<CompetitiveSnapshot>(response);
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || 'Competitive intelligence could not be loaded.');
      }
      setSnapshot(payload.data);
      if ((payload.data.watchlist || []).length === 0) setShowAdd(true);
    } catch (err: any) {
      setError(err?.message || 'Competitive intelligence could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const postAction = useCallback(async <T,>(body: Record<string, unknown>): Promise<T> => {
    const response = await authFetch('/api/mari/competitive-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await readEnvelope<T>(response);
    if (!response.ok || !payload.success || payload.data === undefined) {
      const coded = payload.code ? `${payload.error || 'Request failed'} (${payload.code})` : payload.error;
      throw new Error(coded || 'Competitive intelligence request failed.');
    }
    return payload.data;
  }, []);

  const handleAdd = useCallback(async () => {
    const name = form.name.trim();
    const websiteUrl = form.websiteUrl.trim();
    if (!name || !websiteUrl) {
      setError('Enter the competitor name and a public website URL.');
      return;
    }

    setBusy('add');
    setError(null);
    setNotice(null);
    try {
      const competitor = await postAction<CompetitorWatchlistItem>({
        action: 'ADD_COMPETITOR',
        name,
        websiteUrl,
        metaAdLibraryUrl: form.metaAdLibraryUrl.trim() || undefined,
        googleBusinessUrl: form.googleBusinessUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
        scanFrequency: 'WEEKLY',
      });

      let scanWarning: string | null = null;
      try {
        await postAction({ action: 'SCAN_COMPETITOR', competitorId: competitor.id });
        try {
          await postAction({ action: 'GENERATE_BRIEFING', days: 30 });
        } catch {
          // A first briefing may legitimately have too little evidence. The watchlist is still valid.
        }
      } catch (scanErr: any) {
        scanWarning = scanErr?.message || 'The competitor was added, but the first public-source scan could not complete.';
      }

      setForm({ name: '', websiteUrl: '', metaAdLibraryUrl: '', googleBusinessUrl: '', notes: '' });
      setShowAdd(false);
      setNotice(scanWarning || `${competitor.name} was added and the first public-source scan completed.`);
      await loadSnapshot();
    } catch (err: any) {
      setError(err?.message || 'Could not add that competitor.');
    } finally {
      setBusy(null);
    }
  }, [form, loadSnapshot, postAction]);

  const handleScan = useCallback(async (competitor: CompetitorWatchlistItem) => {
    setBusy(`scan:${competitor.id}`);
    setError(null);
    setNotice(null);
    try {
      await postAction({ action: 'SCAN_COMPETITOR', competitorId: competitor.id });
      try {
        await postAction({ action: 'GENERATE_BRIEFING', days: 30 });
      } catch {
        // Keep the successful scan even if there is not enough evidence for a briefing yet.
      }
      setNotice(`${competitor.name} was scanned from eligible public sources.`);
      await loadSnapshot();
    } catch (err: any) {
      setError(err?.message || `Could not scan ${competitor.name}.`);
    } finally {
      setBusy(null);
    }
  }, [loadSnapshot, postAction]);

  const handleScanDue = useCallback(async () => {
    setBusy('scan-due');
    setError(null);
    setNotice(null);
    try {
      await postAction({ action: 'SCAN_DUE' });
      try {
        await postAction({ action: 'GENERATE_BRIEFING', days: 30 });
      } catch {
        // The refresh can succeed before enough evidence exists for a briefing.
      }
      setNotice('Due competitors were checked and the evidence ledger was refreshed.');
      await loadSnapshot();
    } catch (err: any) {
      setError(err?.message || 'Could not refresh due competitors.');
    } finally {
      setBusy(null);
    }
  }, [loadSnapshot, postAction]);

  const handleBriefing = useCallback(async () => {
    setBusy('briefing');
    setError(null);
    setNotice(null);
    try {
      await postAction({ action: 'GENERATE_BRIEFING', days: 30 });
      setNotice('Mari generated a fresh evidence-backed market briefing.');
      await loadSnapshot();
    } catch (err: any) {
      setError(err?.message || 'Mari could not generate a briefing from the available evidence yet.');
    } finally {
      setBusy(null);
    }
  }, [loadSnapshot, postAction]);

  const handleRemove = useCallback(async (competitor: CompetitorWatchlistItem) => {
    if (typeof window !== 'undefined' && !window.confirm(`Remove ${competitor.name} from the competitor watchlist?`)) return;
    setBusy(`remove:${competitor.id}`);
    setError(null);
    setNotice(null);
    try {
      const response = await authFetch(`/api/mari/competitive-intelligence?competitorId=${encodeURIComponent(competitor.id)}`, {
        method: 'DELETE',
      });
      const payload = await readEnvelope<unknown>(response);
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not remove competitor.');
      setNotice(`${competitor.name} was removed from the watchlist.`);
      await loadSnapshot();
    } catch (err: any) {
      setError(err?.message || `Could not remove ${competitor.name}.`);
    } finally {
      setBusy(null);
    }
  }, [loadSnapshot]);

  const observationsByCompetitor = useMemo(() => {
    const map = new Map<string, CompetitorObservation[]>();
    for (const observation of snapshot?.recentObservations || []) {
      const rows = map.get(observation.competitorId) || [];
      rows.push(observation);
      map.set(observation.competitorId, rows);
    }
    return map;
  }, [snapshot]);

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-center gap-3 text-sm text-zinc-300">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Loading evidence-backed market intelligence…
      </div>
    );
  }

  const watchlist = snapshot?.watchlist || [];
  const observations = snapshot?.recentObservations || [];
  const briefing = snapshot?.latestBriefing || null;

  return (
    <div className="flex flex-col gap-6">
      <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Globe className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-black text-white">Market Research & Competitive Intelligence</h3>
              <Badge variant="success" className="text-[10px] font-bold">PUBLIC EVIDENCE ONLY</Badge>
            </div>
            <p className="text-xs text-zinc-300 mt-2 leading-relaxed max-w-3xl">
              Mari observes approved public sources, records the evidence and separates observed facts from inference. Competitor wording, creative and brand identity are never copied.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-zinc-500 font-mono">
              <span>{watchlist.length}/5 competitors</span>
              <span>{observations.length} observations (30 days)</span>
              <span>Updated {safeDate(snapshot?.generatedAt)}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdd((value) => !value)} className="text-xs border-emerald-500/40 text-emerald-300">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Competitor
            </Button>
            {watchlist.length > 0 && (
              <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={handleScanDue} className="text-xs border-zinc-700 text-zinc-200">
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${busy === 'scan-due' ? 'animate-spin' : ''}`} /> Refresh Due
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-950/30 flex items-start gap-3 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div><strong className="text-red-100">Competitive intelligence notice:</strong> {error}</div>
        </div>
      )}
      {notice && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex items-start gap-3 text-xs text-emerald-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {notice}
        </div>
      )}

      {(showAdd || watchlist.length === 0) && (
        <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Search className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{watchlist.length === 0 ? 'Add your first competitor' : 'Add another competitor'}</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                Add a competitor you genuinely want to benchmark. Mari will only collect publicly accessible information and will respect robots rules and access restrictions.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-zinc-400">
              Competitor name *
              <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Example Business" className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="text-xs text-zinc-400">
              Public website *
              <input value={form.websiteUrl} onChange={(event) => setForm((prev) => ({ ...prev, websiteUrl: event.target.value }))} placeholder="https://example.com" className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="text-xs text-zinc-400">
              Meta Ad Library URL (optional)
              <input value={form.metaAdLibraryUrl} onChange={(event) => setForm((prev) => ({ ...prev, metaAdLibraryUrl: event.target.value }))} placeholder="https://www.facebook.com/ads/library/..." className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="text-xs text-zinc-400">
              Google Business URL (optional)
              <input value={form.googleBusinessUrl} onChange={(event) => setForm((prev) => ({ ...prev, googleBusinessUrl: event.target.value }))} placeholder="Public Google Business link" className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500" />
            </label>
          </div>
          <label className="block text-xs text-zinc-400 mt-3">
            Notes (optional)
            <textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Why this competitor matters, market segment, products to watch…" rows={2} className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 resize-y" />
          </label>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Button variant="primary" size="sm" disabled={busy === 'add' || watchlist.length >= 5} onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
              {busy === 'add' ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Add & Scan Public Sources
            </Button>
            {watchlist.length > 0 && <button type="button" onClick={() => setShowAdd(false)} className="text-xs text-zinc-500 hover:text-white">Cancel</button>}
            <span className="text-[10px] text-zinc-600">Max 5 active competitors in V1.</span>
          </div>
        </div>
      )}

      {watchlist.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {watchlist.map((competitor) => {
            const competitorObservations = observationsByCompetitor.get(competitor.id) || [];
            return (
              <div key={competitor.id} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white truncate">{competitor.name}</h4>
                      <Badge variant={competitor.status === 'ACTIVE' ? 'success' : 'default'} className="text-[9px]">{competitor.status}</Badge>
                    </div>
                    <a href={competitor.websiteUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 max-w-full truncate">
                      {competitor.websiteUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                  <button type="button" title="Remove competitor" disabled={Boolean(busy)} onClick={() => handleRemove(competitor)} className="p-2 rounded-lg text-zinc-500 hover:text-red-300 hover:bg-red-950/30 disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-[10px]">
                  <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <p className="text-zinc-500 uppercase font-bold">Last scan</p>
                    <p className="text-zinc-200 mt-1">{safeDate(competitor.lastScannedAt)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
                    <p className="text-zinc-500 uppercase font-bold">Evidence</p>
                    <p className="text-zinc-200 mt-1">{competitorObservations.length} recent observations</p>
                  </div>
                </div>
                {competitor.lastScanError && <p className="mt-3 text-[10px] text-amber-300">Last scan: {competitor.lastScanError}</p>}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => handleScan(competitor)} className="text-xs border-zinc-700 text-zinc-200">
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${busy === `scan:${competitor.id}` ? 'animate-spin' : ''}`} /> Scan Public Sources
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {watchlist.length > 0 && (
        <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> Mari Market Briefing</h4>
              <p className="text-xs text-zinc-500 mt-1">Synthesized only from the evidence ledger below; strategies remain inference, not competitor facts.</p>
            </div>
            <Button variant="outline" size="sm" disabled={Boolean(busy) || observations.length === 0} onClick={handleBriefing} className="text-xs border-purple-500/30 text-purple-300">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> {briefing ? 'Regenerate Briefing' : 'Generate Briefing'}
            </Button>
          </div>
          {briefing ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20">
                <p className="text-sm text-zinc-200 leading-relaxed">{briefing.summary}</p>
                <p className="text-[10px] text-zinc-500 mt-2">Evidence period {safeDate(briefing.periodStart)} → {safeDate(briefing.periodEnd)}</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <BriefList title="Observed market moves" items={briefing.marketMoves} tone="emerald" />
                <BriefList title="Potential market gaps" items={briefing.marketGaps} tone="amber" />
                <BriefList title="Original tests to consider" items={briefing.recommendedActions} tone="purple" />
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
              {observations.length > 0 ? 'Evidence is available. Generate a briefing to turn observations into market gaps and original experiments.' : 'Scan at least one competitor to collect public evidence before generating a briefing.'}
            </div>
          )}
        </div>
      )}

      {watchlist.length > 0 && (
        <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-bold text-white">Public Evidence Ledger</h4>
              <p className="text-xs text-zinc-500 mt-1">Every insight stays traceable to a source, date and confidence level.</p>
            </div>
            <Badge variant="default" className="text-[9px]">{observations.length} OBSERVATIONS</Badge>
          </div>
          {observations.length === 0 ? (
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">No evidence has been collected yet. Use “Scan Public Sources” on a competitor above.</div>
          ) : (
            <div className="space-y-3">
              {observations.slice(0, 30).map((observation) => (
                <div key={observation.id} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <Badge variant="default" className="text-[9px]">{observation.observationType.replaceAll('_', ' ')}</Badge>
                        <span className="text-[10px] font-bold text-zinc-400">{observation.competitorName || 'Competitor'}</span>
                        {observation.isInference && <span className="text-[9px] text-amber-300 border border-amber-500/20 rounded px-1.5 py-0.5">INFERENCE</span>}
                      </div>
                      <h5 className="text-sm font-semibold text-white">{observation.title}</h5>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{observation.summary}</p>
                      {observation.evidenceExcerpt && <p className="text-[11px] text-zinc-500 mt-2 italic line-clamp-3">“{observation.evidenceExcerpt}”</p>}
                    </div>
                    <div className="shrink-0 md:text-right">
                      <p className="text-[10px] text-zinc-500">{confidenceLabel(observation.confidence)} confidence · {Math.round(observation.confidence * 100)}%</p>
                      <p className="text-[10px] text-zinc-600 mt-1">{safeDate(observation.observedAt)}</p>
                      <a href={observation.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300">
                        View public source <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Ralion Competitive Intelligence uses eligible public information only. Mari will not bypass authentication or access controls, will not claim private competitor strategy, and will not copy competitor creative. Recommendations are original hypotheses for your business to test.
        </p>
      </div>
    </div>
  );
}

function BriefList({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'amber' | 'purple' }) {
  const toneClasses = tone === 'emerald'
    ? 'border-emerald-500/20 bg-emerald-950/10'
    : tone === 'amber'
      ? 'border-amber-500/20 bg-amber-950/10'
      : 'border-purple-500/20 bg-purple-950/10';
  return (
    <div className={`p-4 rounded-2xl border ${toneClasses}`}>
      <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-2">{title}</p>
      {items?.length ? (
        <ul className="space-y-2">
          {items.map((item, index) => <li key={`${title}-${index}`} className="text-xs text-zinc-300 leading-relaxed">• {item}</li>)}
        </ul>
      ) : <p className="text-xs text-zinc-600">No supported item yet.</p>}
    </div>
  );
}

export default CompetitiveIntelligencePanel;

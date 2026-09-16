import 'server-only';

import { createHash } from 'crypto';
import { WebsiteCrawlerService } from '@ralion/ai/server';
import { getPrivilegedSupabase } from '../../supabase/server';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const ROBOTS_TIMEOUT_MS = 4_000;
const MAX_HTML_BYTES = 1_000_000;
const USER_AGENT = 'RalionMarketBot/1.0 (+https://rasalilabs.com/ralion)';
const ROBOTS_PRODUCT_TOKEN = 'RalionMarketBot';

export type CompetitorSourceType =
  | 'WEBSITE'
  | 'META_AD_LIBRARY'
  | 'GOOGLE_BUSINESS'
  | 'FACEBOOK_PUBLIC'
  | 'INSTAGRAM_PUBLIC'
  | 'OTHER_PUBLIC';

export type CompetitorObservationType =
  | 'PAGE_SNAPSHOT'
  | 'POSITIONING'
  | 'PRICING'
  | 'OFFER'
  | 'SERVICE'
  | 'PROMOTION'
  | 'CONTENT_THEME'
  | 'CTA'
  | 'CHANGE'
  | 'OTHER';

export interface CompetitorWatchlistItem {
  id: string;
  organizationId: string;
  workspaceId: string;
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
}

export interface CompetitorObservation {
  id: string;
  competitorId: string;
  competitorName?: string;
  sourceType: CompetitorSourceType;
  sourceUrl: string;
  observationType: CompetitorObservationType;
  title: string;
  summary: string;
  evidenceExcerpt: string | null;
  contentHash: string;
  confidence: number;
  isInference: boolean;
  observedAt: string;
}

export interface CompetitiveBriefing {
  id: string;
  periodStart: string;
  periodEnd: string;
  summary: string;
  marketMoves: string[];
  marketGaps: string[];
  recommendedActions: string[];
  sourceObservationIds: string[];
  createdAt: string;
}

export interface CompetitiveIntelligenceSnapshot {
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
}

interface TenantParams {
  organizationId: string;
  workspaceId: string;
  userId: string;
}

interface PublicWebsiteEvidence {
  sourceUrl: string;
  fetchedAt: string;
  contentHash: string;
  title: string;
  description: string;
  headings: string[];
  priceSignals: string[];
  ctaSignals: string[];
  serviceSignals: string[];
  offerSignals: string[];
  themeSignals: string[];
  excerpt: string;
}

function canonicalUuid(value: string, field: string): string {
  const clean = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean)) {
    throw new Error(`${field} must be a canonical UUID.`);
  }
  return clean;
}

function cleanText(value: unknown, max = 500): string {
  if (value == null) return '';
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function unique(values: string[], max = 12): string[] {
  return Array.from(new Set(values.map((value) => cleanText(value, 220)).filter(Boolean))).slice(0, max);
}

function toWatchlist(row: any): CompetitorWatchlistItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
    name: row.name,
    websiteUrl: row.website_url,
    metaAdLibraryUrl: row.meta_ad_library_url || null,
    googleBusinessUrl: row.google_business_url || null,
    notes: row.notes || null,
    status: row.status,
    scanFrequency: row.scan_frequency,
    lastScannedAt: row.last_scanned_at || null,
    nextScanAt: row.next_scan_at || null,
    lastScanStatus: row.last_scan_status || null,
    lastScanError: row.last_scan_error || null,
  };
}

function toObservation(row: any, competitorName?: string): CompetitorObservation {
  return {
    id: row.id,
    competitorId: row.competitor_id,
    competitorName,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    observationType: row.observation_type,
    title: row.title,
    summary: row.summary,
    evidenceExcerpt: row.evidence_excerpt || null,
    contentHash: row.content_hash,
    confidence: Number(row.confidence),
    isInference: Boolean(row.is_inference),
    observedAt: row.observed_at,
  };
}

function normalizePlanUrl(rawUrl?: string | null): string | null {
  if (!rawUrl?.trim()) return null;
  const normalized = WebsiteCrawlerService.normalizeUrl(rawUrl);
  const parsed = new URL(normalized);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only public HTTP/HTTPS URLs are supported.');
  if (parsed.username || parsed.password) throw new Error('URLs containing embedded credentials are not allowed.');
  return normalized;
}

function parseRobotsGroups(text: string): Array<{ agents: string[]; rules: Array<{ type: 'allow' | 'disallow'; pattern: string }> }> {
  const groups: Array<{ agents: string[]; rules: Array<{ type: 'allow' | 'disallow'; pattern: string }> }> = [];
  let agents: string[] = [];
  let rules: Array<{ type: 'allow' | 'disallow'; pattern: string }> = [];
  let sawRule = false;

  const flush = () => {
    if (agents.length > 0) groups.push({ agents: [...agents], rules: [...rules] });
    agents = [];
    rules = [];
    sawRule = false;
  };

  for (const rawLine of text.slice(0, 512 * 1024).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === 'user-agent') {
      if (sawRule) flush();
      agents.push(value.toLowerCase());
      continue;
    }
    if ((key === 'allow' || key === 'disallow') && agents.length > 0) {
      sawRule = true;
      rules.push({ type: key, pattern: value });
    }
  }
  flush();
  return groups;
}

function robotsPatternMatches(pattern: string, path: string): boolean {
  if (!pattern) return false;
  const anchored = pattern.endsWith('$');
  const raw = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const expression = new RegExp(`^${escaped}${anchored ? '$' : ''}`);
  return expression.test(path);
}

function isRobotsAllowed(robotsText: string, targetUrl: string): boolean {
  const groups = parseRobotsGroups(robotsText);
  const exact = groups.filter((group) => group.agents.includes(ROBOTS_PRODUCT_TOKEN.toLowerCase()));
  const applicable = exact.length > 0 ? exact : groups.filter((group) => group.agents.includes('*'));
  if (applicable.length === 0) return true;

  const parsed = new URL(targetUrl);
  const path = `${parsed.pathname || '/'}${parsed.search || ''}`;
  const matching = applicable.flatMap((group) => group.rules).filter((rule) => robotsPatternMatches(rule.pattern, path));
  if (matching.length === 0) return true;

  matching.sort((a, b) => {
    const lengthDiff = b.pattern.replace(/\$$/, '').length - a.pattern.replace(/\$$/, '').length;
    if (lengthDiff !== 0) return lengthDiff;
    return a.type === 'allow' ? -1 : 1;
  });
  return matching[0].type === 'allow';
}

async function safeFetch(url: string, timeoutMs: number, accept: string): Promise<Response> {
  let current = url;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const safety = await WebsiteCrawlerService.verifyUrlSafety(current);
    if (!safety.safe) throw new Error(`PUBLIC_SOURCE_REJECTED: ${safety.reason || 'Unsafe target'}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(current, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, Accept: accept },
        redirect: 'manual',
        signal: controller.signal,
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) return response;
        current = new URL(location, current).toString();
        continue;
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('PUBLIC_SOURCE_REJECTED: Too many redirects.');
}

async function verifyRobotsAccess(targetUrl: string): Promise<void> {
  const parsed = new URL(targetUrl);
  const robotsUrl = `${parsed.origin}/robots.txt`;
  let response: Response;
  try {
    response = await safeFetch(robotsUrl, ROBOTS_TIMEOUT_MS, 'text/plain,*/*;q=0.2');
  } catch (error: any) {
    throw new Error(`ROBOTS_UNREACHABLE: ${error?.message || 'Unable to verify robots policy.'}`);
  }

  if (response.status >= 500) {
    throw new Error(`ROBOTS_UNREACHABLE: robots.txt returned HTTP ${response.status}.`);
  }
  if (response.status >= 400) return; // RFC 9309: unavailable 4xx permits access.
  if (!response.ok) throw new Error(`ROBOTS_UNREACHABLE: robots.txt returned HTTP ${response.status}.`);

  const robotsText = (await response.text()).slice(0, 512 * 1024);
  if (!isRobotsAllowed(robotsText, targetUrl)) {
    throw new Error('ROBOTS_DISALLOWED: The website has asked this crawler not to access this path.');
  }
}

function extractWebsiteEvidence(html: string, sourceUrl: string): PublicWebsiteEvidence {
  const title = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || new URL(sourceUrl).hostname, 180);
  const description = cleanText(
    html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i)?.[1]
      || '',
    500
  );

  const headings = unique(Array.from(html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)).map((match) => cleanText(match[1], 180)), 12);
  const paragraphs = unique(Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((match) => cleanText(match[1], 300)).filter((text) => text.length >= 20), 12);
  const anchorsAndButtons = unique([
    ...Array.from(html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)).map((match) => cleanText(match[1], 100)),
    ...Array.from(html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)).map((match) => cleanText(match[1], 100)),
  ], 30);

  const visibleText = cleanText(`${headings.join(' | ')} ${paragraphs.join(' | ')} ${anchorsAndButtons.join(' | ')}`, 15_000);
  const priceSignals = unique(
    Array.from(visibleText.matchAll(/(?:BWP|P|USD|US\$|\$|ZAR|R)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:\/|per)\s?(?:month|mo|year|yr|day|hour))?/gi)).map((match) => match[0]),
    8
  );
  const ctaSignals = anchorsAndButtons.filter((text) => /\b(book|buy|shop|order|contact|get started|learn more|request|quote|demo|sign up|subscribe|apply|call|whatsapp|enquire|inquire)\b/i.test(text)).slice(0, 8);
  const serviceSignals = headings.filter((text) => /\b(service|solution|product|package|plan|development|consult|production|automation|marketing|design|software|video|audio|support)\b/i.test(text)).slice(0, 8);
  const offerSignals = unique([...headings, ...paragraphs].filter((text) => /\b(special|offer|discount|save|free|trial|promotion|promo|package|from\s+(?:BWP|P|USD|\$|R)|limited)\b/i.test(text)), 6);

  const stopWords = new Set(['about','after','also','and','are','been','business','can','company','for','from','get','have','into','more','our','services','that','the','their','this','with','your','you','www','com']);
  const counts = new Map<string, number>();
  visibleText.toLowerCase().split(/[^a-z0-9]+/).forEach((word) => {
    if (word.length < 4 || stopWords.has(word) || /^\d+$/.test(word)) return;
    counts.set(word, (counts.get(word) || 0) + 1);
  });
  const themeSignals = Array.from(counts.entries()).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([word]) => word);

  const excerpt = cleanText(paragraphs.slice(0, 3).join(' ' ) || description || headings.slice(0, 4).join(' | '), 700);
  const normalizedEvidence = JSON.stringify({ title, description, headings, priceSignals, ctaSignals, serviceSignals, offerSignals, themeSignals, excerpt });

  return {
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    contentHash: hashText(normalizedEvidence),
    title,
    description,
    headings,
    priceSignals,
    ctaSignals,
    serviceSignals,
    offerSignals,
    themeSignals,
    excerpt,
  };
}

async function fetchPublicWebsiteEvidence(rawUrl: string): Promise<PublicWebsiteEvidence> {
  const sourceUrl = normalizePlanUrl(rawUrl);
  if (!sourceUrl) throw new Error('A public website URL is required.');
  await verifyRobotsAccess(sourceUrl);

  const response = await safeFetch(sourceUrl, FETCH_TIMEOUT_MS, 'text/html,application/xhtml+xml,text/plain;q=0.8');
  if (response.status === 401 || response.status === 403) throw new Error(`ACCESS_RESTRICTED: Website returned HTTP ${response.status}.`);
  if (!response.ok) throw new Error(`PUBLIC_FETCH_FAILED: Website returned HTTP ${response.status}.`);

  const contentType = response.headers.get('content-type') || '';
  if (!/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) {
    throw new Error(`UNSUPPORTED_PUBLIC_CONTENT: ${contentType || 'unknown content type'}.`);
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_HTML_BYTES) throw new Error('PUBLIC_SOURCE_TOO_LARGE: Response exceeds collection limit.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_HTML_BYTES) throw new Error('PUBLIC_SOURCE_TOO_LARGE: Response exceeds collection limit.');
  const html = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  return extractWebsiteEvidence(html, sourceUrl);
}

function buildObservationRows(params: TenantParams, competitor: any, evidence: PublicWebsiteEvidence, previousHash?: string | null): any[] {
  const base = {
    organization_id: params.organizationId,
    workspace_id: params.workspaceId,
    competitor_id: competitor.id,
    source_type: 'WEBSITE' as const,
    source_url: evidence.sourceUrl,
    content_hash: evidence.contentHash,
    observed_at: evidence.fetchedAt,
  };
  const rows: any[] = [{
    ...base,
    observation_type: 'PAGE_SNAPSHOT',
    title: `${competitor.name} public website snapshot`,
    summary: `Public website snapshot collected for ${competitor.name}.`,
    evidence_excerpt: evidence.excerpt || null,
    confidence: 1,
    is_inference: false,
    raw_payload: {
      title: evidence.title,
      description: evidence.description,
      headings: evidence.headings,
      prices: evidence.priceSignals,
      callsToAction: evidence.ctaSignals,
      services: evidence.serviceSignals,
      offers: evidence.offerSignals,
      themes: evidence.themeSignals,
    },
  }];

  if (evidence.title || evidence.description) rows.push({
    ...base,
    observation_type: 'POSITIONING',
    title: `${competitor.name} public positioning`,
    summary: cleanText([evidence.title, evidence.description].filter(Boolean).join(' — '), 360),
    evidence_excerpt: evidence.description || evidence.title || null,
    confidence: 0.95,
    is_inference: false,
    raw_payload: {},
  });
  if (evidence.priceSignals.length > 0) rows.push({
    ...base,
    observation_type: 'PRICING',
    title: `${competitor.name} public pricing references`,
    summary: `Public pricing references detected: ${evidence.priceSignals.join(', ')}.`,
    evidence_excerpt: evidence.priceSignals.join(' | '),
    confidence: 0.95,
    is_inference: false,
    raw_payload: { prices: evidence.priceSignals },
  });
  if (evidence.serviceSignals.length > 0) rows.push({
    ...base,
    observation_type: 'SERVICE',
    title: `${competitor.name} public services`,
    summary: `Public service or solution headings include: ${evidence.serviceSignals.join('; ')}.`,
    evidence_excerpt: evidence.serviceSignals.join(' | '),
    confidence: 0.9,
    is_inference: false,
    raw_payload: { services: evidence.serviceSignals },
  });
  if (evidence.offerSignals.length > 0) rows.push({
    ...base,
    observation_type: 'OFFER',
    title: `${competitor.name} public offers`,
    summary: `Offer or promotion language is publicly visible on the source page.`,
    evidence_excerpt: evidence.offerSignals.join(' | ').slice(0, 700),
    confidence: 0.85,
    is_inference: false,
    raw_payload: { offers: evidence.offerSignals },
  });
  if (evidence.ctaSignals.length > 0) rows.push({
    ...base,
    observation_type: 'CTA',
    title: `${competitor.name} calls to action`,
    summary: `Observed public calls-to-action: ${evidence.ctaSignals.join(', ')}.`,
    evidence_excerpt: evidence.ctaSignals.join(' | '),
    confidence: 0.9,
    is_inference: false,
    raw_payload: { callsToAction: evidence.ctaSignals },
  });
  if (evidence.themeSignals.length > 0) rows.push({
    ...base,
    observation_type: 'CONTENT_THEME',
    title: `${competitor.name} inferred public content themes`,
    summary: `Inferred themes from repeated public page language: ${evidence.themeSignals.join(', ')}.`,
    evidence_excerpt: null,
    confidence: 0.65,
    is_inference: true,
    raw_payload: { themes: evidence.themeSignals, method: 'DETERMINISTIC_TERM_FREQUENCY' },
  });
  if (previousHash && previousHash !== evidence.contentHash) rows.push({
    ...base,
    observation_type: 'CHANGE',
    title: `${competitor.name} public website changed`,
    summary: 'The normalized public website evidence changed since the previous successful scan.',
    evidence_excerpt: null,
    confidence: 1,
    is_inference: false,
    raw_payload: { previousContentHash: previousHash, currentContentHash: evidence.contentHash },
  });

  return rows;
}

export class MariCompetitiveIntelligenceService {
  static async listWatchlist(params: TenantParams): Promise<CompetitorWatchlistItem[]> {
    const organizationId = canonicalUuid(params.organizationId, 'organizationId');
    const workspaceId = canonicalUuid(params.workspaceId, 'workspaceId');
    const db = getPrivilegedSupabase();
    const { data, error } = await db.from('mari_competitor_watchlist').select('*').eq('organization_id', organizationId).eq('workspace_id', workspaceId).order('created_at', { ascending: true });
    if (error) throw new Error(`[MariCompetitiveIntelligence] Watchlist read failed: ${error.code}`);
    return (data || []).map(toWatchlist);
  }

  static async upsertCompetitor(params: TenantParams & {
    name: string;
    websiteUrl: string;
    metaAdLibraryUrl?: string | null;
    googleBusinessUrl?: string | null;
    notes?: string | null;
    scanFrequency?: 'WEEKLY' | 'ON_DEMAND';
  }): Promise<CompetitorWatchlistItem> {
    const organizationId = canonicalUuid(params.organizationId, 'organizationId');
    const workspaceId = canonicalUuid(params.workspaceId, 'workspaceId');
    const userId = canonicalUuid(params.userId, 'userId');
    const websiteUrl = normalizePlanUrl(params.websiteUrl);
    if (!websiteUrl) throw new Error('A public competitor website URL is required for v1.');
    const name = cleanText(params.name, 160);
    if (name.length < 2) throw new Error('Competitor name is required.');

    const db = getPrivilegedSupabase();
    const payload = {
      organization_id: organizationId,
      workspace_id: workspaceId,
      created_by: userId,
      name,
      website_url: websiteUrl,
      meta_ad_library_url: normalizePlanUrl(params.metaAdLibraryUrl),
      google_business_url: normalizePlanUrl(params.googleBusinessUrl),
      notes: params.notes ? cleanText(params.notes, 1000) : null,
      scan_frequency: params.scanFrequency || 'WEEKLY',
      status: 'ACTIVE',
      next_scan_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await db.from('mari_competitor_watchlist').upsert(payload, { onConflict: 'organization_id,website_url' }).select('*').single();
    if (error) throw new Error(`[MariCompetitiveIntelligence] Watchlist write failed: ${error.code}`);
    return toWatchlist(data);
  }

  static async removeCompetitor(params: TenantParams & { competitorId: string }): Promise<void> {
    const organizationId = canonicalUuid(params.organizationId, 'organizationId');
    const workspaceId = canonicalUuid(params.workspaceId, 'workspaceId');
    const competitorId = canonicalUuid(params.competitorId, 'competitorId');
    const db = getPrivilegedSupabase();
    const { error } = await db.from('mari_competitor_watchlist').delete().eq('id', competitorId).eq('organization_id', organizationId).eq('workspace_id', workspaceId);
    if (error) throw new Error(`[MariCompetitiveIntelligence] Watchlist delete failed: ${error.code}`);
  }

  static async scanCompetitor(params: TenantParams & { competitorId: string; bypassThrottle?: boolean }): Promise<{ competitor: CompetitorWatchlistItem; observations: CompetitorObservation[]; unchanged: boolean }> {
    const organizationId = canonicalUuid(params.organizationId, 'organizationId');
    const workspaceId = canonicalUuid(params.workspaceId, 'workspaceId');
    canonicalUuid(params.userId, 'userId');
    const competitorId = canonicalUuid(params.competitorId, 'competitorId');
    const db = getPrivilegedSupabase();

    const { data: competitor, error: competitorError } = await db.from('mari_competitor_watchlist').select('*').eq('id', competitorId).eq('organization_id', organizationId).eq('workspace_id', workspaceId).maybeSingle();
    if (competitorError) throw new Error(`[MariCompetitiveIntelligence] Competitor lookup failed: ${competitorError.code}`);
    if (!competitor) throw new Error('COMPETITOR_NOT_FOUND');
    if (competitor.status !== 'ACTIVE') throw new Error('COMPETITOR_PAUSED');

    if (!params.bypassThrottle && competitor.last_scanned_at) {
      const last = Date.parse(competitor.last_scanned_at);
      if (Number.isFinite(last) && Date.now() - last < MIN_SCAN_INTERVAL_MS) {
        throw new Error('SCAN_THROTTLED: This competitor was scanned within the last 6 hours.');
      }
    }

    try {
      const evidence = await fetchPublicWebsiteEvidence(competitor.website_url);
      const { data: previousSnapshot } = await db.from('mari_competitor_observations').select('content_hash').eq('organization_id', organizationId).eq('workspace_id', workspaceId).eq('competitor_id', competitorId).eq('source_type', 'WEBSITE').eq('observation_type', 'PAGE_SNAPSHOT').order('observed_at', { ascending: false }).limit(1).maybeSingle();
      const previousHash = previousSnapshot?.content_hash || null;
      const unchanged = previousHash === evidence.contentHash;

      let inserted: any[] = [];
      if (!unchanged) {
        const rows = buildObservationRows({ organizationId, workspaceId, userId: params.userId }, competitor, evidence, previousHash);
        const { data, error } = await db.from('mari_competitor_observations').upsert(rows, { onConflict: 'competitor_id,source_type,observation_type,content_hash', ignoreDuplicates: true }).select('*');
        if (error) throw new Error(`[MariCompetitiveIntelligence] Observation write failed: ${error.code}`);
        inserted = data || [];
      }

      const nextScanAt = competitor.scan_frequency === 'WEEKLY' ? new Date(Date.now() + 7 * DAY_MS).toISOString() : null;
      const { data: updated, error: updateError } = await db.from('mari_competitor_watchlist').update({
        last_scanned_at: evidence.fetchedAt,
        next_scan_at: nextScanAt,
        last_scan_status: unchanged ? 'UNCHANGED' : 'SUCCESS',
        last_scan_error: null,
        updated_at: new Date().toISOString(),
      }).eq('id', competitorId).eq('organization_id', organizationId).eq('workspace_id', workspaceId).select('*').single();
      if (updateError) throw new Error(`[MariCompetitiveIntelligence] Scan state update failed: ${updateError.code}`);

      return { competitor: toWatchlist(updated), observations: inserted.map((row) => toObservation(row, competitor.name)), unchanged };
    } catch (error: any) {
      await db.from('mari_competitor_watchlist').update({
        last_scanned_at: new Date().toISOString(),
        last_scan_status: 'FAILED',
        last_scan_error: cleanText(error?.message || 'Public scan failed', 500),
        next_scan_at: competitor.scan_frequency === 'WEEKLY' ? new Date(Date.now() + DAY_MS).toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', competitorId).eq('organization_id', organizationId).eq('workspace_id', workspaceId);
      throw error;
    }
  }

  static async scanDueCompetitors(params: TenantParams, max = 5): Promise<Array<{ competitorId: string; success: boolean; error?: string }>> {
    const organizationId = canonicalUuid(params.organizationId, 'organizationId');
    const workspaceId = canonicalUuid(params.workspaceId, 'workspaceId');
    const db = getPrivilegedSupabase();
    const { data, error } = await db.from('mari_competitor_watchlist').select('id').eq('organization_id', organizationId).eq('workspace_id', workspaceId).eq('status', 'ACTIVE').eq('scan_frequency', 'WEEKLY').lte('next_scan_at', new Date().toISOString()).order('next_scan_at', { ascending: true }).limit(Math.max(1, Math.min(max, 10)));
    if (error) throw new Error(`[MariCompetitiveIntelligence] Due scan lookup failed: ${error.code}`);

    const results: Array<{ competitorId: string; success: boolean; error?: string }> = [];
    for (const item of data || []) {
      try {
        await this.scanCompetitor({ ...params, competitorId: item.id, bypassThrottle: true });
        results.push({ competitorId: item.id, success: true });
      } catch (scanError: any) {
        results.push({ competitorId: item.id, success: false, error: cleanText(scanError?.message || 'Scan failed', 240) });
      }
    }
    return results;
  }

  static async getRecentObservations(params: TenantParams & { days?: number; limit?: number }): Promise<CompetitorObservation[]> {
    const organizationId = canonicalUuid(params.organizationId, 'organizationId');
    const workspaceId = canonicalUuid(params.workspaceId, 'workspaceId');
    const days = Math.max(1, Math.min(params.days || 30, 90));
    const limit = Math.max(1, Math.min(params.limit || 60, 120));
    const db = getPrivilegedSupabase();
    const since = new Date(Date.now() - days * DAY_MS).toISOString();
    const { data, error } = await db.from('mari_competitor_observations').select('*, mari_competitor_watchlist(name)').eq('organization_id', organizationId).eq('workspace_id', workspaceId).gte('observed_at', since).order('observed_at', { ascending: false }).limit(limit);
    if (error) throw new Error(`[MariCompetitiveIntelligence] Observation read failed: ${error.code}`);
    return (data || []).map((row: any) => toObservation(row, row.mari_competitor_watchlist?.name));
  }

  static async generateBriefing(params: TenantParams & { days?: number }): Promise<CompetitiveBriefing> {
    const organizationId = canonicalUuid(params.organizationId, 'organizationId');
    const workspaceId = canonicalUuid(params.workspaceId, 'workspaceId');
    const userId = canonicalUuid(params.userId, 'userId');
    const days = Math.max(1, Math.min(params.days || 7, 30));
    const observations = await this.getRecentObservations({ ...params, days, limit: 100 });
    const material = observations.filter((item) => item.observationType !== 'PAGE_SNAPSHOT');

    const marketMoves = material.filter((item) => ['CHANGE', 'PRICING', 'OFFER', 'PROMOTION', 'SERVICE', 'POSITIONING'].includes(item.observationType)).slice(0, 12).map((item) => `${item.competitorName || 'Competitor'}: ${item.summary} Source: ${item.sourceUrl}`);
    const themeCounts = new Map<string, number>();
    material.filter((item) => item.observationType === 'CONTENT_THEME').forEach((item) => {
      String(item.summary).replace(/^.*?:\s*/, '').split(',').map((value) => value.replace(/\.$/, '').trim()).filter(Boolean).forEach((theme) => themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1));
    });
    const commonThemes = Array.from(themeCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([theme]) => theme);

    const marketGaps: string[] = [];
    if (commonThemes.length > 0) marketGaps.push(`Common competitor language clusters around ${commonThemes.join(', ')}. Treat these as crowded themes and test a differentiated customer outcome rather than mirroring their wording.`);
    if (!material.some((item) => item.observationType === 'PRICING')) marketGaps.push('No reliable public pricing signal was captured in the current evidence window; avoid price-comparison claims until evidence exists.');
    if (material.filter((item) => item.observationType === 'CTA').length > 0) marketGaps.push('Competitor calls-to-action are visible. Test a distinct action path or proof point instead of copying their CTA wording.');
    if (marketMoves.length === 0) marketGaps.push('No material public market move was detected in the selected period. Continue monitoring before making a strong competitive claim.');

    const recommendedActions = [
      'Use competitor observations as market signals only; create original copy, visuals, offers and campaign structure.',
      'Select one evidence-backed gap and run a small controlled Growth Studio campaign before scaling it.',
      'When Mari describes competitor strategy, label it explicitly as an inference from public evidence.',
    ];
    if (material.some((item) => item.observationType === 'PRICING')) recommendedActions.unshift('Review public price references against your own value proposition; differentiate on outcome, scope or service experience rather than copying the competitor package.');

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - days * DAY_MS);
    const summary = observations.length > 0
      ? `${observations.length} public-source competitor observations reviewed across ${new Set(observations.map((item) => item.competitorId)).size} competitors for the last ${days} days.`
      : `No public-source competitor observations are available for the last ${days} days.`;

    const db = getPrivilegedSupabase();
    const { data, error } = await db.from('mari_competitor_briefings').insert({
      organization_id: organizationId,
      workspace_id: workspaceId,
      created_by: userId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      summary,
      market_moves: marketMoves,
      market_gaps: marketGaps,
      recommended_actions: recommendedActions,
      source_observation_ids: observations.map((item) => item.id),
    }).select('*').single();
    if (error) throw new Error(`[MariCompetitiveIntelligence] Briefing write failed: ${error.code}`);

    return {
      id: data.id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      summary: data.summary,
      marketMoves: data.market_moves || [],
      marketGaps: data.market_gaps || [],
      recommendedActions: data.recommended_actions || [],
      sourceObservationIds: data.source_observation_ids || [],
      createdAt: data.created_at,
    };
  }

  static async getLatestBriefing(params: TenantParams): Promise<CompetitiveBriefing | null> {
    const organizationId = canonicalUuid(params.organizationId, 'organizationId');
    const workspaceId = canonicalUuid(params.workspaceId, 'workspaceId');
    const db = getPrivilegedSupabase();
    const { data, error } = await db.from('mari_competitor_briefings').select('*').eq('organization_id', organizationId).eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`[MariCompetitiveIntelligence] Briefing read failed: ${error.code}`);
    if (!data) return null;
    return {
      id: data.id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      summary: data.summary,
      marketMoves: data.market_moves || [],
      marketGaps: data.market_gaps || [],
      recommendedActions: data.recommended_actions || [],
      sourceObservationIds: data.source_observation_ids || [],
      createdAt: data.created_at,
    };
  }

  static async getSnapshot(params: TenantParams): Promise<CompetitiveIntelligenceSnapshot> {
    const [watchlist, recentObservations, latestBriefing] = await Promise.all([
      this.listWatchlist(params),
      this.getRecentObservations({ ...params, days: 30, limit: 60 }),
      this.getLatestBriefing(params),
    ]);
    return {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      watchlist,
      recentObservations,
      latestBriefing,
      rules: {
        publicSourcesOnly: true,
        copyCompetitorCreative: false,
        strategiesAreInferenceOnly: true,
        automaticPublishing: false,
      },
    };
  }

  static toPromptContext(snapshot: CompetitiveIntelligenceSnapshot): string {
    const watchlist = snapshot.watchlist.map((item) => `${item.name} (${item.websiteUrl})`).join('; ') || 'No competitors configured';
    const observations = snapshot.recentObservations.slice(0, 18).map((item) => {
      const inference = item.isInference ? 'INFERENCE' : 'OBSERVED';
      return `- [${inference}; confidence ${item.confidence}] ${item.competitorName || 'Competitor'} — ${item.observationType}: ${item.summary} Source: ${item.sourceUrl} Observed: ${item.observedAt}`;
    }).join('\n') || '- No stored public observations yet.';
    const briefing = snapshot.latestBriefing
      ? `Latest briefing: ${snapshot.latestBriefing.summary}\nMarket gaps: ${snapshot.latestBriefing.marketGaps.join(' | ')}\nRecommended original tests: ${snapshot.latestBriefing.recommendedActions.join(' | ')}`
      : 'No competitive briefing has been generated yet.';

    return `[TENANT COMPETITIVE INTELLIGENCE — PUBLIC EVIDENCE ONLY]\nWatchlist: ${watchlist}\n${observations}\n${briefing}\nRules: Never claim access to private competitor strategy. Treat inferred strategy/themes as inference only. Never copy competitor wording, designs, images, videos, campaign structure or brand identity. Use the evidence to identify gaps and propose original experiments. Do not publish anything without tenant approval.`;
  }
}

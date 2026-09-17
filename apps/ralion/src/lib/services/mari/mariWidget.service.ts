import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { getPrivilegedSupabase } from '@/lib/supabase/server';

export type MariWidgetStatus = 'ACTIVE' | 'PAUSED' | 'REVOKED';
export type MariWidgetPosition = 'bottom-right' | 'bottom-left';

export interface MariWidgetRecord {
  id: string;
  organizationId: string;
  workspaceId: string;
  createdBy: string | null;
  name: string;
  publicToken: string;
  allowedDomains: string[];
  assistantName: string;
  welcomeMessage: string;
  accentColor: string;
  position: MariWidgetPosition;
  status: MariWidgetStatus;
  monthlyRequestLimit: number;
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface MariWidgetSessionContext {
  sessionId: string;
  sessionFingerprint: string;
  widget: MariWidgetRecord;
  origin: string;
  monthlyRequestsUsed: number;
  monthlyRequestsRemaining: number;
}

const DEFAULT_MONTHLY_REQUEST_LIMIT = Math.max(1, Number(process.env.MARI_WIDGET_MONTHLY_REQUEST_LIMIT || 1000));
const SESSION_TTL_MINUTES = Math.max(5, Number(process.env.MARI_WIDGET_SESSION_TTL_MINUTES || 30));
const SESSION_REQUESTS_PER_MINUTE = Math.max(1, Number(process.env.MARI_WIDGET_SESSION_REQUESTS_PER_MINUTE || 12));
const WIDGET_REQUESTS_PER_MINUTE = Math.max(1, Number(process.env.MARI_WIDGET_REQUESTS_PER_MINUTE || 120));
const MAX_WIDGETS_PER_WORKSPACE = Math.max(1, Number(process.env.MARI_WIDGET_MAX_PER_WORKSPACE || 10));

function codedError(code: string, message: string): Error {
  const error = new Error(message);
  (error as any).code = code;
  return error;
}

function hashValue(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function generatePublicToken(): string {
  return `mw_public_${randomBytes(18).toString('base64url')}`;
}

function generateSessionToken(): string {
  return `mws_live_${randomBytes(32).toString('base64url')}`;
}

function normalizeDomain(value: unknown): string | null {
  const rawInput = String(value || '').trim().toLowerCase();
  if (!rawInput) return null;

  const wildcard = rawInput.startsWith('*.');
  const withoutWildcard = wildcard ? rawInput.slice(2) : rawInput;

  try {
    const parsed = new URL(withoutWildcard.includes('://') ? withoutWildcard : `https://${withoutWildcard}`);
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
    if (!hostname || hostname.includes(' ')) return null;
    return wildcard ? `*.${hostname}` : hostname;
  } catch {
    return null;
  }
}

function normalizeDomains(values: unknown): string[] {
  const raw = Array.isArray(values)
    ? values
    : String(values || '').split(/[\n,]/g);

  const normalized = raw
    .map(normalizeDomain)
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(normalized)).slice(0, 20);
}

function hostnameFromOrigin(origin: string): string | null {
  try {
    return new URL(origin).hostname.toLowerCase().replace(/\.$/, '');
  } catch {
    return null;
  }
}

function domainMatches(hostname: string, allowedDomain: string): boolean {
  if (allowedDomain.startsWith('*.')) {
    const root = allowedDomain.slice(2);
    return hostname !== root && hostname.endsWith(`.${root}`);
  }
  return hostname === allowedDomain;
}

function isOriginAllowed(origin: string, allowedDomains: string[]): boolean {
  const hostname = hostnameFromOrigin(origin);
  if (!hostname) return false;
  return allowedDomains.some((domain) => domainMatches(hostname, domain));
}

function normalizeAccentColor(value: unknown): string {
  const candidate = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : '#7c3aed';
}

function normalizePosition(value: unknown): MariWidgetPosition {
  return value === 'bottom-left' ? 'bottom-left' : 'bottom-right';
}

function mapWidget(row: any): MariWidgetRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by || null,
    name: row.name,
    publicToken: row.public_token,
    allowedDomains: Array.isArray(row.allowed_domains) ? row.allowed_domains : [],
    assistantName: row.assistant_name || 'Mari',
    welcomeMessage: row.welcome_message || 'Hi! I’m Mari. How can I help?',
    accentColor: row.accent_color || '#7c3aed',
    position: normalizePosition(row.position),
    status: row.status,
    monthlyRequestLimit: Number(row.monthly_request_limit || 0),
    requestCount: Number(row.request_count || 0),
    lastUsedAt: row.last_used_at || null,
    createdAt: row.created_at,
  };
}

export class MariWidgetService {
  static normalizeDomains(values: unknown): string[] {
    return normalizeDomains(values);
  }

  static async list(params: { organizationId: string; workspaceId: string }): Promise<MariWidgetRecord[]> {
    const db = getPrivilegedSupabase();
    const { data, error } = await db
      .from('mari_embed_widgets')
      .select('*')
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapWidget);
  }

  static async create(params: {
    organizationId: string;
    workspaceId: string;
    createdBy: string;
    name: string;
    allowedDomains: unknown;
    assistantName?: string;
    welcomeMessage?: string;
    accentColor?: string;
    position?: MariWidgetPosition;
  }): Promise<MariWidgetRecord> {
    const db = getPrivilegedSupabase();
    const domains = normalizeDomains(params.allowedDomains);
    if (!domains.length) throw codedError('MARI_WIDGET_DOMAIN_REQUIRED', 'Add at least one website domain before creating a widget.');

    const name = String(params.name || '').trim().slice(0, 120);
    if (!name) throw codedError('MARI_WIDGET_NAME_REQUIRED', 'Widget name is required.');

    const { count, error: countError } = await db
      .from('mari_embed_widgets')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .neq('status', 'REVOKED');

    if (countError) throw new Error(countError.message);
    if ((count || 0) >= MAX_WIDGETS_PER_WORKSPACE) {
      throw codedError('MARI_WIDGET_LIMIT_REACHED', `This workspace can have up to ${MAX_WIDGETS_PER_WORKSPACE} active or paused widgets.`);
    }

    const row = {
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      created_by: params.createdBy,
      name,
      public_token: generatePublicToken(),
      allowed_domains: domains,
      assistant_name: String(params.assistantName || 'Mari').trim().slice(0, 40) || 'Mari',
      welcome_message: String(params.welcomeMessage || 'Hi! I’m Mari. How can I help?').trim().slice(0, 240),
      accent_color: normalizeAccentColor(params.accentColor),
      position: normalizePosition(params.position),
      status: 'ACTIVE',
      monthly_request_limit: DEFAULT_MONTHLY_REQUEST_LIMIT,
    };

    const { data, error } = await db
      .from('mari_embed_widgets')
      .insert(row)
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create Mari widget.');
    return mapWidget(data);
  }

  static async update(params: {
    widgetId: string;
    organizationId: string;
    workspaceId: string;
    allowedDomains?: unknown;
    assistantName?: string;
    welcomeMessage?: string;
    accentColor?: string;
    position?: MariWidgetPosition;
    status?: 'ACTIVE' | 'PAUSED';
  }): Promise<MariWidgetRecord> {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (params.allowedDomains !== undefined) {
      const domains = normalizeDomains(params.allowedDomains);
      if (!domains.length) throw codedError('MARI_WIDGET_DOMAIN_REQUIRED', 'A widget must have at least one approved website domain.');
      patch.allowed_domains = domains;
    }
    if (params.assistantName !== undefined) patch.assistant_name = String(params.assistantName || 'Mari').trim().slice(0, 40) || 'Mari';
    if (params.welcomeMessage !== undefined) patch.welcome_message = String(params.welcomeMessage || '').trim().slice(0, 240);
    if (params.accentColor !== undefined) patch.accent_color = normalizeAccentColor(params.accentColor);
    if (params.position !== undefined) patch.position = normalizePosition(params.position);
    if (params.status === 'ACTIVE' || params.status === 'PAUSED') patch.status = params.status;

    const db = getPrivilegedSupabase();
    const { data, error } = await db
      .from('mari_embed_widgets')
      .update(patch)
      .eq('id', params.widgetId)
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .neq('status', 'REVOKED')
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw codedError('MARI_WIDGET_NOT_FOUND', 'Mari widget was not found in this workspace.');
    return mapWidget(data);
  }

  static async revoke(params: { widgetId: string; organizationId: string; workspaceId: string }): Promise<void> {
    const db = getPrivilegedSupabase();
    const { data, error } = await db
      .from('mari_embed_widgets')
      .update({ status: 'REVOKED', updated_at: new Date().toISOString() })
      .eq('id', params.widgetId)
      .eq('organization_id', params.organizationId)
      .eq('workspace_id', params.workspaceId)
      .neq('status', 'REVOKED')
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw codedError('MARI_WIDGET_NOT_FOUND', 'Mari widget was not found in this workspace.');
  }

  static async createSession(publicToken: string, origin: string): Promise<{
    sessionToken: string;
    expiresAt: string;
    widget: MariWidgetRecord;
  }> {
    if (!publicToken.startsWith('mw_public_')) throw codedError('MARI_WIDGET_INVALID', 'Invalid widget identifier.');
    const db = getPrivilegedSupabase();
    const { data, error } = await db
      .from('mari_embed_widgets')
      .select('*')
      .eq('public_token', publicToken)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error || !data) throw codedError('MARI_WIDGET_INVALID', 'Widget is unavailable.');
    const widget = mapWidget(data);
    if (!isOriginAllowed(origin, widget.allowedDomains)) {
      throw codedError('MARI_WIDGET_DOMAIN_DENIED', 'This website is not approved to load the Mari widget.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MINUTES * 60_000).toISOString();
    const sessionToken = generateSessionToken();

    await db
      .from('mari_widget_sessions')
      .delete()
      .eq('widget_id', widget.id)
      .lt('expires_at', now.toISOString());

    const { error: insertError } = await db.from('mari_widget_sessions').insert({
      widget_id: widget.id,
      organization_id: widget.organizationId,
      workspace_id: widget.workspaceId,
      token_hash: hashValue(sessionToken),
      origin,
      expires_at: expiresAt,
    });

    if (insertError) throw new Error(insertError.message);
    return { sessionToken, expiresAt, widget };
  }

  static async authenticateSession(rawSessionToken: string): Promise<MariWidgetSessionContext> {
    if (!rawSessionToken || !rawSessionToken.startsWith('mws_live_')) {
      throw codedError('MARI_WIDGET_SESSION_INVALID', 'Widget session is invalid.');
    }

    const db = getPrivilegedSupabase();
    const { data: session, error: sessionError } = await db
      .from('mari_widget_sessions')
      .select('*')
      .eq('token_hash', hashValue(rawSessionToken))
      .maybeSingle();

    if (sessionError || !session) throw codedError('MARI_WIDGET_SESSION_INVALID', 'Widget session is invalid.');
    if (Date.parse(session.expires_at) <= Date.now()) {
      throw codedError('MARI_WIDGET_SESSION_EXPIRED', 'Widget session expired. Refresh the page to reconnect.');
    }

    const { data: widgetRow, error: widgetError } = await db
      .from('mari_embed_widgets')
      .select('*')
      .eq('id', session.widget_id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (widgetError || !widgetRow) throw codedError('MARI_WIDGET_UNAVAILABLE', 'Widget is unavailable.');
    const widget = mapWidget(widgetRow);
    if (!isOriginAllowed(session.origin, widget.allowedDomains)) {
      throw codedError('MARI_WIDGET_DOMAIN_DENIED', 'This widget session is no longer approved for the website.');
    }

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const minuteStart = new Date(Date.now() - 60_000).toISOString();
    const sessionFingerprint = hashValue(session.id).slice(0, 24);

    const [monthlyResult, sessionBurstResult, widgetBurstResult] = await Promise.all([
      db
        .from('mari_widget_usage')
        .select('id', { count: 'exact', head: true })
        .eq('widget_id', widget.id)
        .gte('created_at', monthStart.toISOString()),
      db
        .from('mari_widget_usage')
        .select('id', { count: 'exact', head: true })
        .eq('session_fingerprint', sessionFingerprint)
        .gte('created_at', minuteStart),
      db
        .from('mari_widget_usage')
        .select('id', { count: 'exact', head: true })
        .eq('widget_id', widget.id)
        .gte('created_at', minuteStart),
    ]);

    if (monthlyResult.error) throw new Error(monthlyResult.error.message);
    if (sessionBurstResult.error) throw new Error(sessionBurstResult.error.message);
    if (widgetBurstResult.error) throw new Error(widgetBurstResult.error.message);

    const monthlyRequestsUsed = monthlyResult.count || 0;
    if (monthlyRequestsUsed >= widget.monthlyRequestLimit) {
      throw codedError('MARI_WIDGET_MONTHLY_LIMIT_REACHED', 'This widget has reached its monthly request limit.');
    }
    if ((sessionBurstResult.count || 0) >= SESSION_REQUESTS_PER_MINUTE) {
      throw codedError('MARI_WIDGET_RATE_LIMITED', 'Too many messages from this visitor. Please retry shortly.');
    }
    if ((widgetBurstResult.count || 0) >= WIDGET_REQUESTS_PER_MINUTE) {
      throw codedError('MARI_WIDGET_RATE_LIMITED', 'This widget is receiving too many requests. Please retry shortly.');
    }

    const nowIso = new Date().toISOString();
    await Promise.all([
      db
        .from('mari_widget_sessions')
        .update({ last_used_at: nowIso, request_count: Number(session.request_count || 0) + 1 })
        .eq('id', session.id),
      db
        .from('mari_embed_widgets')
        .update({ last_used_at: nowIso, request_count: Number(widgetRow.request_count || 0) + 1, updated_at: nowIso })
        .eq('id', widget.id),
    ]);

    return {
      sessionId: session.id,
      sessionFingerprint,
      widget,
      origin: session.origin,
      monthlyRequestsUsed,
      monthlyRequestsRemaining: Math.max(0, widget.monthlyRequestLimit - monthlyRequestsUsed),
    };
  }

  static async recordUsage(params: {
    widgetId: string;
    organizationId: string;
    workspaceId: string;
    requestId: string;
    sessionFingerprint: string;
    statusCode: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    creditsUsed?: number;
    model?: string | null;
    latencyMs?: number;
  }): Promise<void> {
    const db = getPrivilegedSupabase();
    const { error } = await db.from('mari_widget_usage').upsert({
      widget_id: params.widgetId,
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      request_id: params.requestId,
      session_fingerprint: params.sessionFingerprint,
      status_code: params.statusCode,
      prompt_tokens: Math.max(0, Number(params.promptTokens || 0)),
      completion_tokens: Math.max(0, Number(params.completionTokens || 0)),
      total_tokens: Math.max(0, Number(params.totalTokens || 0)),
      credits_used: Math.max(0, Number(params.creditsUsed || 0)),
      model: params.model || null,
      latency_ms: Math.max(0, Number(params.latencyMs || 0)),
    }, { onConflict: 'widget_id,request_id' });

    if (error) throw new Error(error.message);
  }
}

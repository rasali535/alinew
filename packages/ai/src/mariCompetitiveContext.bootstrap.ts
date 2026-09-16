import 'server-only';

import { MariUniversalCore, type MariQueryRequest } from './mariUniversalCore';

const globalState = globalThis as unknown as { __ralionCompetitiveContextPatched?: boolean };

function canonicalUuid(value?: string): string | null {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean) ? clean : null;
}

function shouldLoadCompetitiveContext(prompt: string): boolean {
  return /\b(competitor|competitors|competition|competitive|market landscape|market moves|benchmark|rival|rivals|alternative providers|what are others doing|industry offers|competitor pricing|market gap|market gaps)\b/i.test(prompt || '');
}

async function loadCompetitiveContext(request: MariQueryRequest): Promise<string | null> {
  const organizationId = canonicalUuid(request.organizationId);
  const workspaceId = canonicalUuid(request.workspaceId);
  if (!organizationId || !workspaceId) return null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: watchlist, error: watchError }, { data: observations, error: obsError }, { data: briefing, error: briefingError }] = await Promise.all([
      db.from('mari_competitor_watchlist')
        .select('id,name,website_url,status,last_scanned_at')
        .eq('organization_id', organizationId)
        .eq('workspace_id', workspaceId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: true })
        .limit(5),
      db.from('mari_competitor_observations')
        .select('competitor_id,source_type,source_url,observation_type,summary,confidence,is_inference,observed_at,mari_competitor_watchlist(name)')
        .eq('organization_id', organizationId)
        .eq('workspace_id', workspaceId)
        .gte('observed_at', since)
        .order('observed_at', { ascending: false })
        .limit(24),
      db.from('mari_competitor_briefings')
        .select('summary,market_moves,market_gaps,recommended_actions,created_at')
        .eq('organization_id', organizationId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (watchError || obsError || briefingError) return null;
    if (!(watchlist || []).length && !(observations || []).length) {
      return `[TENANT COMPETITIVE INTELLIGENCE — PUBLIC EVIDENCE ONLY]\nNo competitor watchlist evidence has been collected for this workspace yet. If the user asks for competitor-specific facts, state that evidence is not available yet rather than inventing it.`;
    }

    const watchText = (watchlist || [])
      .map((item: any) => `- ${item.name}: ${item.website_url}; last scan ${item.last_scanned_at || 'not scanned yet'}`)
      .join('\n');
    const observationText = (observations || [])
      .map((item: any) => {
        const name = item.mari_competitor_watchlist?.name || 'Competitor';
        const evidenceClass = item.is_inference ? 'INFERENCE' : 'OBSERVED';
        return `- [${evidenceClass}; confidence ${Number(item.confidence).toFixed(2)}] ${name} — ${item.observation_type}: ${item.summary} Source: ${item.source_url} Observed: ${item.observed_at}`;
      })
      .join('\n');

    const briefingText = briefing
      ? `Latest briefing (${briefing.created_at}): ${briefing.summary}\nMarket moves: ${(briefing.market_moves || []).join(' | ')}\nMarket gaps: ${(briefing.market_gaps || []).join(' | ')}\nRecommended original tests: ${(briefing.recommended_actions || []).join(' | ')}`
      : 'No weekly briefing has been generated yet.';

    return `[TENANT COMPETITIVE INTELLIGENCE — PUBLIC EVIDENCE ONLY]\nActive watchlist:\n${watchText || '- None'}\nRecent evidence:\n${observationText || '- No observations yet'}\n${briefingText}\nSTRICT RULES:\n- Never claim access to a competitor's private plans, analytics, accounts or internal strategy.\n- Any strategy/theme interpretation must be explicitly described as an inference from public evidence.\n- Never copy competitor wording, designs, images, videos, campaign structure or brand identity.\n- Use evidence to identify gaps and recommend original experiments for the tenant.\n- Preserve source URLs, observation dates and confidence when making factual competitor claims.\n- Never automatically publish a response campaign; tenant approval is required.`;
  } catch {
    return null;
  }
}

if (!globalState.__ralionCompetitiveContextPatched) {
  globalState.__ralionCompetitiveContextPatched = true;
  const originalProcessQuery = MariUniversalCore.processQuery.bind(MariUniversalCore);

  MariUniversalCore.processQuery = async function competitiveAwareProcessQuery(request: MariQueryRequest) {
    const originalPrompt = String(request.originalUserPrompt || request.prompt || '').trim();
    if (!shouldLoadCompetitiveContext(originalPrompt)) {
      return originalProcessQuery(request);
    }

    const competitiveContext = await loadCompetitiveContext(request);
    if (!competitiveContext) return originalProcessQuery(request);

    const existing = String(request.contextualPrompt || '').trim();
    return originalProcessQuery({
      ...request,
      contextualPrompt: existing ? `${existing}\n\n${competitiveContext}` : competitiveContext,
    });
  };
}

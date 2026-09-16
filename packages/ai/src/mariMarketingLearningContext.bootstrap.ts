import 'server-only';

import { MariUniversalCore, type MariQueryRequest } from './mariUniversalCore';

const globalState = globalThis as unknown as { __ralionMarketingLearningContextPatched?: boolean };

function canonicalUuid(value?: string): string | null {
  const clean = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean) ? clean : null;
}

function shouldLoadLearningContext(prompt: string): boolean {
  return /\b(perform|performance|performed|working|worked|results?|engagement|reach|reactions?|comments?|shares?|best content|top content|what should (?:i|we) post|what works|learn|learning|history|historical|improve|optimi[sz]e|strategy|campaign|content type|video|image|post again|next test|experiment)\b/i.test(prompt || '');
}

async function loadMarketingLearningContext(request: MariQueryRequest): Promise<string | null> {
  const organizationId = canonicalUuid(request.organizationId);
  const workspaceId = canonicalUuid(request.workspaceId);
  if (!organizationId || !workspaceId) return null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return null;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await db.from('mari_marketing_learnings')
      .select('category,claim,evidence_summary,confidence,evidence_count,status,updated_at')
      .eq('organization_id', organizationId)
      .eq('workspace_id', workspaceId)
      .neq('status', 'STALE')
      .order('confidence', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(10);
    if (error) return null;
    if (!(data || []).length) return '[TENANT MARKETING LEARNING]\nNo evidence-backed historical marketing learnings exist for this workspace yet. Do not invent performance patterns. Recommend a measurable test when useful.';

    const rows = (data || []).map((item: any) => `- [${item.status}; confidence ${Number(item.confidence).toFixed(2)}; n=${Number(item.evidence_count)}; ${item.category}] ${item.claim} Evidence: ${item.evidence_summary} Updated: ${item.updated_at}`).join('\n');
    return `[TENANT MARKETING LEARNING — EVIDENCE BACKED]\n${rows}\nSTRICT RULES:\n- These are tenant-specific associations, not universal truths or proof of causation.\n- Preserve uncertainty and distinguish evidence from interpretation.\n- Low-confidence or contested learning should lead to a test, not a strong claim.\n- Never fabricate metrics or historical results.\n- Recommend original next experiments; never automatically publish.`;
  } catch {
    return null;
  }
}

if (!globalState.__ralionMarketingLearningContextPatched) {
  globalState.__ralionMarketingLearningContextPatched = true;
  const originalProcessQuery = MariUniversalCore.processQuery.bind(MariUniversalCore);
  MariUniversalCore.processQuery = async function marketingLearningAwareProcessQuery(request: MariQueryRequest) {
    const prompt = String(request.originalUserPrompt || request.prompt || '').trim();
    if (!shouldLoadLearningContext(prompt)) return originalProcessQuery(request);
    const learningContext = await loadMarketingLearningContext(request);
    if (!learningContext) return originalProcessQuery(request);
    const existing = String(request.contextualPrompt || '').trim();
    return originalProcessQuery({ ...request, contextualPrompt: existing ? `${existing}\n\n${learningContext}` : learningContext });
  };
}

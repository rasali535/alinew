import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { getServiceSupabase, requireRalionContext } from '../../../../lib/auth/serverAuth';
import { writeOperationalAudit } from '@/lib/operations/audit';
import { executeWorkflowsForEvent } from '@/lib/operations/workflowEngine';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

const ALLOWED_STAGES = new Set(['LEAD', 'CONTACTED', 'PROSPECT', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST', 'CLOSED_WON', 'CLOSED_LOST']);
const ALLOWED_TYPES = new Set(['LEAD', 'CUSTOMER', 'SUPPLIER', 'PARTNER']);

function normalizeStage(value: unknown): string {
  const stage = cleanText(value, 40).toUpperCase();
  return ALLOWED_STAGES.has(stage) ? stage : 'LEAD';
}

function normalizeType(value: unknown): string {
  const type = cleanText(value, 40).toUpperCase();
  return ALLOWED_TYPES.has(type) ? type : 'LEAD';
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const workspaceId = required.context.workspace.id;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('deals').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return corsJsonResponse({ success: true, deals: data || [] }, undefined, request);
  } catch (error: any) {
    console.error('[CRM Deals API] GET failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to load deals.' }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const body = await request.json().catch(() => ({}));
    const contactName = cleanText(body.name || body.contactName, 160);
    const title = cleanText(body.title, 240) || (contactName ? `${contactName} opportunity` : 'New opportunity');
    const value = Number(body.dealValue ?? body.value ?? 0);
    if (!contactName) return corsJsonResponse({ success: false, error: 'Contact name is required.' }, { status: 400 }, request);

    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('deals').insert({
      workspace_id: ctx.workspace.id,
      customer_id: cleanText(body.customerId, 80) || null,
      title,
      contact_name: contactName,
      company_name: cleanText(body.company, 200) || null,
      email: cleanText(body.email, 320).toLowerCase() || null,
      phone: cleanText(body.phone, 80) || null,
      value: Number.isFinite(value) ? value : 0,
      stage: normalizeStage(body.stage),
      probability: Number.isFinite(Number(body.probability)) ? Math.max(0, Math.min(100, Number(body.probability))) : null,
      expected_close_date: cleanText(body.expectedCloseDate, 20) || null,
      assigned_to: cleanText(body.assignedTo, 160) || ctx.profile.fullName || ctx.user.email,
      deal_type: normalizeType(body.type || body.dealType),
      tags: Array.isArray(body.tags) ? body.tags.map((tag: unknown) => cleanText(tag, 80)).filter(Boolean).slice(0, 20) : ['New Lead'],
      ai_score: Number.isFinite(Number(body.aiLeadScore)) ? Math.max(0, Math.min(100, Math.round(Number(body.aiLeadScore)))) : 50,
      notes: cleanText(body.notes, 4000) || null,
      updated_at: new Date().toISOString(),
    }).select('*').single();
    if (error) throw new Error(error.message);

    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'DEAL_CREATED',
      'CRM',
      { dealId: data.id, stage: data.stage, value: data.value }
    );
    return corsJsonResponse({ success: true, deal: data }, { status: 201 }, request);
  } catch (error: any) {
    console.error('[CRM Deals API] POST failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to create deal.' }, { status: 500 }, request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const workspaceId = ctx.workspace.id;
    const body = await request.json().catch(() => ({}));
    const id = cleanText(body.id, 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Deal id is required.' }, { status: 400 }, request);

    const supabase = getServiceSupabase();
    const { data: before } = await supabase.from('deals').select('id,stage').eq('id', id).eq('workspace_id', workspaceId).maybeSingle();
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = cleanText(body.title, 240);
    if (body.name !== undefined || body.contactName !== undefined) patch.contact_name = cleanText(body.name || body.contactName, 160);
    if (body.company !== undefined) patch.company_name = cleanText(body.company, 200) || null;
    if (body.email !== undefined) patch.email = cleanText(body.email, 320).toLowerCase() || null;
    if (body.phone !== undefined) patch.phone = cleanText(body.phone, 80) || null;
    if (body.dealValue !== undefined || body.value !== undefined) {
      const value = Number(body.dealValue ?? body.value);
      patch.value = Number.isFinite(value) ? value : 0;
    }
    if (body.stage !== undefined) patch.stage = normalizeStage(body.stage);
    if (body.probability !== undefined) patch.probability = Math.max(0, Math.min(100, Number(body.probability) || 0));
    if (body.expectedCloseDate !== undefined) patch.expected_close_date = cleanText(body.expectedCloseDate, 20) || null;
    if (body.assignedTo !== undefined) patch.assigned_to = cleanText(body.assignedTo, 160) || null;
    if (body.type !== undefined || body.dealType !== undefined) patch.deal_type = normalizeType(body.type || body.dealType);
    if (body.tags !== undefined) patch.tags = Array.isArray(body.tags) ? body.tags.map((tag: unknown) => cleanText(tag, 80)).filter(Boolean).slice(0, 20) : [];
    if (body.aiLeadScore !== undefined) patch.ai_score = Math.max(0, Math.min(100, Math.round(Number(body.aiLeadScore) || 0)));
    if (body.notes !== undefined) patch.notes = cleanText(body.notes, 4000) || null;

    const { data, error } = await supabase.from('deals').update(patch).eq('id', id).eq('workspace_id', workspaceId).select('*').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Deal not found.' }, { status: 404 }, request);

    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId, userId: ctx.user.id },
      'DEAL_UPDATED',
      'CRM',
      { dealId: data.id, previousStage: before?.stage || null, stage: data.stage }
    );

    if (patch.stage && before?.stage !== data.stage) {
      try {
        await executeWorkflowsForEvent({
          workspaceId,
          organizationId: ctx.organization?.id,
          userId: ctx.user.id,
          triggerEvent: 'DEAL_STAGE_CHANGED',
          input: { deal: data, previousStage: before?.stage || null },
        });
      } catch (workflowError: any) {
        console.warn('[CRM Deals API] workflow trigger failed:', workflowError?.message);
      }
    }

    return corsJsonResponse({ success: true, deal: data }, undefined, request);
  } catch (error: any) {
    console.error('[CRM Deals API] PATCH failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to update deal.' }, { status: 500 }, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const workspaceId = ctx.workspace.id;
    const id = cleanText(new URL(request.url).searchParams.get('id'), 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Deal id is required.' }, { status: 400 }, request);
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('deals').delete().eq('id', id).eq('workspace_id', workspaceId).select('id,title').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Deal not found.' }, { status: 404 }, request);
    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId, userId: ctx.user.id },
      'DEAL_DELETED',
      'CRM',
      { dealId: data.id, title: data.title }
    );
    return corsJsonResponse({ success: true, id: data.id }, undefined, request);
  } catch (error: any) {
    console.error('[CRM Deals API] DELETE failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to delete deal.' }, { status: 500 }, request);
  }
}

import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '@/lib/cors';
import { getServiceSupabase, requireRalionContext } from '@/lib/auth/serverAuth';
import { writeOperationalAudit } from '@/lib/operations/audit';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeCategory(value: unknown) {
  const v = cleanText(value, 30).toUpperCase();
  return ['MEETING', 'APPOINTMENT', 'REMINDER', 'DISPATCH', 'DEADLINE', 'OTHER'].includes(v) ? v : null;
}

function normalizeAttendees(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => cleanText(v, 200)).filter(Boolean).slice(0, 50);
  if (typeof value === 'string') return value.split(',').map(v => cleanText(v, 200)).filter(Boolean).slice(0, 50);
  return [];
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const workspaceId = required.context.workspace.id;
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const supabase = getServiceSupabase();
    let query = supabase.from('calendar_events').select('*').eq('workspace_id', workspaceId);
    if (from) query = query.gte('start_at', from);
    if (to) query = query.lte('start_at', to);
    const { data, error } = await query.order('start_at', { ascending: true }).limit(500);
    if (error) throw new Error(error.message);
    return corsJsonResponse({ success: true, events: data || [] }, undefined, request);
  } catch (error: any) {
    console.error('[Calendar API] GET failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to load calendar events.' }, { status: 500 }, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const body = await request.json().catch(() => ({}));
    const title = cleanText(body.title, 180);
    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;
    if (!title || !startAt || Number.isNaN(startAt.getTime())) {
      return corsJsonResponse({ success: false, error: 'Event title and valid start time are required.' }, { status: 400 }, request);
    }
    if (endAt && (Number.isNaN(endAt.getTime()) || endAt < startAt)) {
      return corsJsonResponse({ success: false, error: 'End time must be after the start time.' }, { status: 400 }, request);
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        workspace_id: ctx.workspace.id,
        organization_id: ctx.organization?.id || null,
        title,
        start_at: startAt.toISOString(),
        end_at: endAt ? endAt.toISOString() : null,
        category: normalizeCategory(body.category) || 'MEETING',
        attendees: normalizeAttendees(body.attendees),
        location: cleanText(body.location, 500) || null,
        notes: cleanText(body.notes, 4000) || null,
        related_customer_id: cleanText(body.relatedCustomerId, 80) || null,
        related_deal_id: cleanText(body.relatedDealId, 80) || null,
        related_task_id: cleanText(body.relatedTaskId, 80) || null,
        reminder_minutes: Number.isFinite(Number(body.reminderMinutes)) ? Math.max(0, Number(body.reminderMinutes)) : null,
        created_by: ctx.user.id,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'CALENDAR_EVENT_CREATED',
      'CALENDAR',
      { eventId: data.id, title: data.title, startAt: data.start_at }
    );
    return corsJsonResponse({ success: true, event: data }, { status: 201 }, request);
  } catch (error: any) {
    console.error('[Calendar API] POST failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to schedule event.' }, { status: 500 }, request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const body = await request.json().catch(() => ({}));
    const id = cleanText(body.id, 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Event id is required.' }, { status: 400 }, request);
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = cleanText(body.title, 180);
    if (body.startAt !== undefined) {
      const d = new Date(body.startAt);
      if (Number.isNaN(d.getTime())) return corsJsonResponse({ success: false, error: 'Invalid start time.' }, { status: 400 }, request);
      patch.start_at = d.toISOString();
    }
    if (body.endAt !== undefined) {
      if (!body.endAt) patch.end_at = null;
      else {
        const d = new Date(body.endAt);
        if (Number.isNaN(d.getTime())) return corsJsonResponse({ success: false, error: 'Invalid end time.' }, { status: 400 }, request);
        patch.end_at = d.toISOString();
      }
    }
    if (body.category !== undefined) patch.category = normalizeCategory(body.category) || 'OTHER';
    if (body.attendees !== undefined) patch.attendees = normalizeAttendees(body.attendees);
    if (body.location !== undefined) patch.location = cleanText(body.location, 500) || null;
    if (body.notes !== undefined) patch.notes = cleanText(body.notes, 4000) || null;
    if (body.reminderMinutes !== undefined) patch.reminder_minutes = body.reminderMinutes === null ? null : Math.max(0, Number(body.reminderMinutes) || 0);

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('calendar_events')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Event not found.' }, { status: 404 }, request);
    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'CALENDAR_EVENT_UPDATED',
      'CALENDAR',
      { eventId: data.id }
    );
    return corsJsonResponse({ success: true, event: data }, undefined, request);
  } catch (error: any) {
    console.error('[Calendar API] PATCH failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to update event.' }, { status: 500 }, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const ctx = required.context;
    const id = cleanText(new URL(request.url).searchParams.get('id'), 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Event id is required.' }, { status: 400 }, request);
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('workspace_id', ctx.workspace.id)
      .select('id,title')
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Event not found.' }, { status: 404 }, request);
    await writeOperationalAudit(
      { organizationId: ctx.organization?.id, workspaceId: ctx.workspace.id, userId: ctx.user.id },
      'CALENDAR_EVENT_DELETED',
      'CALENDAR',
      { eventId: data.id, title: data.title }
    );
    return corsJsonResponse({ success: true, id: data.id }, undefined, request);
  } catch (error: any) {
    console.error('[Calendar API] DELETE failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to delete event.' }, { status: 500 }, request);
  }
}

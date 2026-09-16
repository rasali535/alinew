import { NextRequest } from 'next/server';
import { corsJsonResponse, handleCorsPreflight } from '../../../../lib/cors';
import { getServiceSupabase, requireRalionContext } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

export async function GET(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const workspaceId = required.context.workspace.id;
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return corsJsonResponse({ success: true, customers: data || [] }, undefined, request);
  } catch (error: any) {
    console.error('[CRM Customers API] GET failed:', error?.message);
    return corsJsonResponse(
      { success: false, error: 'Failed to load customers.' },
      { status: 500 },
      request
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const serverCtx = required.context;
    const body = await request.json().catch(() => ({}));

    const name = cleanText(body.name, 160);
    const email = cleanText(body.email, 320).toLowerCase();
    if (!name || !email) {
      return corsJsonResponse(
        { success: false, error: 'Customer name and email are required.' },
        { status: 400 },
        request
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('customers')
      .insert({
        workspace_id: serverCtx.workspace.id,
        name,
        company: cleanText(body.company, 200) || null,
        email,
        phone: cleanText(body.phone, 80) || null,
        address: cleanText(body.address, 500) || null,
        category: cleanText(body.category, 40) || 'SMB',
        deal_value: Number.isFinite(Number(body.dealValue)) ? Number(body.dealValue) : null,
        notes: cleanText(body.notes, 4000) || null,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return corsJsonResponse({ success: true, customer: data }, { status: 201 }, request);
  } catch (error: any) {
    console.error('[CRM Customers API] POST failed:', error?.message);
    return corsJsonResponse(
      { success: false, error: 'Failed to create customer.' },
      { status: 500 },
      request
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const workspaceId = required.context.workspace.id;
    const body = await request.json().catch(() => ({}));
    const id = cleanText(body.id, 80);
    if (!id) {
      return corsJsonResponse({ success: false, error: 'Customer id is required.' }, { status: 400 }, request);
    }

    const patch: Record<string, any> = {};
    if (body.name !== undefined) patch.name = cleanText(body.name, 160);
    if (body.company !== undefined) patch.company = cleanText(body.company, 200) || null;
    if (body.email !== undefined) patch.email = cleanText(body.email, 320).toLowerCase();
    if (body.phone !== undefined) patch.phone = cleanText(body.phone, 80) || null;
    if (body.address !== undefined) patch.address = cleanText(body.address, 500) || null;
    if (body.category !== undefined) patch.category = cleanText(body.category, 40) || 'SMB';
    if (body.dealValue !== undefined) patch.deal_value = Number.isFinite(Number(body.dealValue)) ? Number(body.dealValue) : null;
    if (body.notes !== undefined) patch.notes = cleanText(body.notes, 4000) || null;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('customers')
      .update(patch)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Customer not found.' }, { status: 404 }, request);
    return corsJsonResponse({ success: true, customer: data }, undefined, request);
  } catch (error: any) {
    console.error('[CRM Customers API] PATCH failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to update customer.' }, { status: 500 }, request);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const required = await requireRalionContext(request);
    if (required.response) return required.response;
    const workspaceId = required.context.workspace.id;
    const id = cleanText(new URL(request.url).searchParams.get('id'), 80);
    if (!id) return corsJsonResponse({ success: false, error: 'Customer id is required.' }, { status: 400 }, request);

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return corsJsonResponse({ success: false, error: 'Customer not found.' }, { status: 404 }, request);
    return corsJsonResponse({ success: true, id: data.id }, undefined, request);
  } catch (error: any) {
    console.error('[CRM Customers API] DELETE failed:', error?.message);
    return corsJsonResponse({ success: false, error: 'Failed to delete customer.' }, { status: 500 }, request);
  }
}

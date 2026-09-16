import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { getSocialConnectionCapabilities } from '@ralion/integrations';
import { isActiveFacebookConnection } from '@/lib/services/social/socialConnectionStatus';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode || 403 });

  const { id: organizationId } = await context.params;
  const { searchParams } = new URL(request.url);
  const reason = (searchParams.get('reason') || request.headers.get('x-audit-reason') || '').trim();
  if (reason.length < 5) return NextResponse.json({ success: false, error: 'A tenant inspection reason of at least 5 characters is required.' }, { status: 400 });

  try {
    const supabase = getPrivilegedSupabase();
    const { data: organization, error: orgError } = await supabase.from('organizations').select('*').eq('id', organizationId).maybeSingle();
    if (orgError) throw new Error(orgError.message);
    if (!organization) return NextResponse.json({ success: false, error: 'Organization not found.' }, { status: 404 });

    const { error: auditInsertError } = await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: auth.user!.id,
      action: 'CUSTOMER_INSPECT',
      module: 'PLATFORM_ADMIN',
      metadata: {
        targetType: 'ORGANIZATION', targetId: organizationId, result: 'SUCCESS', reason,
        adminEmail: auth.user!.email, inspectedAt: new Date().toISOString(),
      },
    });
    if (auditInsertError) throw new Error(`Audit logging failed: ${auditInsertError.message}`);

    const [workspacesRes, stateRes, subsRes, walletRes, ledgerRes, paymentsRes, socialRes, businessRes, knowledgeRes, reservationsRes, auditRes, tasksRes, dealsRes, docsRes, workflowsRes] = await Promise.all([
      supabase.from('workspaces').select('*').eq('organization_id', organizationId).order('created_at', { ascending: true }),
      supabase.from('tenant_admin_state').select('*').eq('organization_id', organizationId).maybeSingle(),
      supabase.from('subscriptions').select('*,subscription_plans(name,slug,price,currency,features,limits)').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('tenant_credit_wallets').select('*').eq('organization_id', organizationId).maybeSingle(),
      supabase.from('tenant_credit_ledger').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200),
      supabase.from('payments').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(100),
      supabase.from('social_connections').select('id,organization_id,workspace_id,user_id,provider,provider_account_id,account_name,username,account_type,connection_status,token_status,followers_count,metadata,last_sync_at,connected_at,created_at').eq('organization_id', organizationId),
      supabase.from('business_profiles').select('*').in('workspace_id', (await supabase.from('workspaces').select('id').eq('organization_id', organizationId)).data?.map((w: any) => w.id) || []),
      supabase.from('mari_knowledge').select('id,source_type,source_id,title,created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(100),
      supabase.from('tenant_credit_reservations').select('id,status,source_feature,provider,model,amount,reason,metadata,created_at,finalized_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200),
      supabase.from('audit_logs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(200),
      supabase.from('tasks').select('id,workspace_id,title,status,priority,due_date,created_at').in('workspace_id', (await supabase.from('workspaces').select('id').eq('organization_id', organizationId)).data?.map((w: any) => w.id) || []).limit(100),
      supabase.from('deals').select('id,workspace_id,title,stage,value,created_at').in('workspace_id', (await supabase.from('workspaces').select('id').eq('organization_id', organizationId)).data?.map((w: any) => w.id) || []).limit(100),
      supabase.from('documents').select('id,workspace_id,name,category,rag_status,size_bytes,created_at').eq('organization_id', organizationId).limit(100),
      supabase.from('workflows').select('id,workspace_id,name,trigger_event,is_active,executions_count,last_executed_at').eq('organization_id', organizationId).limit(100),
    ]);

    for (const [name, result] of Object.entries({ workspaces: workspacesRes, state: stateRes, subscription: subsRes, wallet: walletRes, ledger: ledgerRes, payments: paymentsRes, social: socialRes, business: businessRes, knowledge: knowledgeRes, reservations: reservationsRes, audit: auditRes, tasks: tasksRes, deals: dealsRes, documents: docsRes, workflows: workflowsRes })) {
      if ((result as any).error) throw new Error(`${name}: ${(result as any).error.message}`);
    }

    const workspaces = workspacesRes.data || [];
    const businessProfiles = businessRes.data || [];
    const profile = businessProfiles[0] || null;
    const socialRows = socialRes.data || [];
    const activeFacebookConnections = socialRows.filter(isActiveFacebookConnection);
    const preferredPage: any = activeFacebookConnections.find((c: any) => getSocialConnectionCapabilities(c).isBusinessPage) || activeFacebookConnections[0];

    const socialConnections = socialRows.map((connection: any) => {
      const caps = getSocialConnectionCapabilities(connection);
      return {
        id: connection.id,
        provider: connection.provider,
        provider_account_id: connection.provider_account_id,
        account_name: connection.account_name,
        username: connection.username,
        account_type: caps.classification,
        account_type_label: caps.accountTypeLabel,
        is_business_page: caps.isBusinessPage,
        is_personal_profile: caps.isPersonalProfile,
        connection_status: connection.connection_status,
        token_status: connection.token_status,
        followers_count: connection.followers_count,
        last_sync_at: connection.last_sync_at,
        created_at: connection.created_at,
      };
    });

    const reservations = reservationsRes.data || [];
    const assets = reservations
      .filter((row: any) => /creative|image|video|flux|cogvideo/i.test(String(row.source_feature || '')))
      .map((row: any) => ({
        id: row.id,
        type: /video|cogvideo/i.test(String(row.source_feature || '')) ? 'VIDEO_REEL' : 'POSTER_IMAGE',
        status: row.status,
        provider: row.provider,
        model: row.model,
        createdAt: row.created_at,
        finalizedAt: row.finalized_at,
        metadata: row.metadata || {},
      }));

    const activityStream = (auditRes.data || [])
      .filter((row: any) => /MARI|AI|GROWTH|CREATIVE/i.test(`${row.module} ${row.action}`))
      .map((row: any) => ({ id: row.id, action: row.action, module: row.module, timestamp: row.created_at, details: row.metadata || {} }));

    const auditHistory = (auditRes.data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      action: row.action,
      module: row.module,
      targetType: row.metadata?.targetType || (row.workspace_id ? 'WORKSPACE' : 'ORGANIZATION'),
      targetId: row.metadata?.targetId || row.workspace_id || row.organization_id,
      result: row.metadata?.result || 'SUCCESS',
      reason: row.metadata?.reason || '',
      details: row.metadata || {},
    }));

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        organization,
        workspaces,
        status: stateRes.data?.status || 'ACTIVE',
        adminState: stateRes.data || null,
        profile,
        ingestionRecord: profile?.website_url ? { status: 'VERIFIED', websiteUrl: profile.website_url, updatedAt: profile.updated_at } : null,
        businessContext: { organization, workspaces, businessProfiles },
        wallet: walletRes.data || null,
        creditHistory: ledgerRes.data || [],
        subscription: subsRes.data || null,
        transactions: paymentsRes.data || [],
        assets,
        activityStream,
        mariKnowledge: knowledgeRes.data || [],
        operationalData: { tasks: tasksRes.data || [], deals: dealsRes.data || [], documents: docsRes.data || [], workflows: workflowsRes.data || [] },
        socialConnections,
        metaStatus: activeFacebookConnections.length ? 'CONNECTED' : 'DISCONNECTED',
        facebookStatus: activeFacebookConnections.length ? 'CONNECTED' : 'DISCONNECTED',
        facebookPage: preferredPage?.account_name || preferredPage?.metadata?.pageName || undefined,
        facebookFollowers: preferredPage ? Number(preferredPage.followers_count || preferredPage.metadata?.followers_count || 0) : undefined,
        auditHistory,
      },
    });
  } catch (error: any) {
    console.error('[Admin Organization Inspector] failed:', error?.message);
    return NextResponse.json({ success: false, error: `Failed to load durable tenant inspection: ${error?.message || 'unknown error'}` }, { status: 500 });
  }
}

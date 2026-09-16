import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { isActiveFacebookConnection } from '@/lib/services/social/socialConnectionStatus';

const PLACEHOLDER_ORG_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 403 });

  const queryText = (new URL(request.url).searchParams.get('q') || '').trim().toLowerCase();

  try {
    const supabase = getPrivilegedSupabase();
    const [orgsRes, workspacesRes, profilesRes, businessRes, statesRes, subsRes, walletsRes, socialRes, providerRes, reservationsRes, postsRes, auditsRes] = await Promise.all([
      supabase.from('organizations').select('id,name,slug,industry,company_size,country,owner_id,created_at,updated_at').neq('id', PLACEHOLDER_ORG_ID).order('created_at', { ascending: false }),
      supabase.from('workspaces').select('id,organization_id,name,owner_id,created_at'),
      supabase.from('profiles').select('id,full_name,email,created_at'),
      supabase.from('business_profiles').select('workspace_id,business_name,website_url,updated_at'),
      supabase.from('tenant_admin_state').select('organization_id,status,suspension_reason,suspended_at,updated_at'),
      supabase.from('subscriptions').select('id,organization_id,status,current_period_end,created_at,subscription_plans(name,slug,price,currency)').order('created_at', { ascending: false }),
      supabase.from('tenant_credit_wallets').select('organization_id,plan_id,monthly_quota,remaining_plan_credits,remaining_bonus_credits,reserved_credits,lifetime_credits_consumed'),
      supabase.from('social_connections').select('id,organization_id,workspace_id,provider,account_name,followers_count,connection_status,token_status,disconnected_at,metadata'),
      supabase.from('social_provider_profiles').select('organization_id,workspace_id,provider,status'),
      supabase.from('tenant_credit_reservations').select('organization_id,status,source_feature,created_at'),
      supabase.from('social_posts').select('id,organization_id,workspace_id,status,created_at'),
      supabase.from('audit_logs').select('organization_id,workspace_id,created_at').order('created_at', { ascending: false }).limit(2000),
    ]);

    for (const [name, result] of Object.entries({ organizations: orgsRes, workspaces: workspacesRes, profiles: profilesRes, businessProfiles: businessRes, adminState: statesRes, subscriptions: subsRes, wallets: walletsRes, social: socialRes, providerProfiles: providerRes, reservations: reservationsRes, posts: postsRes, audits: auditsRes })) {
      if ((result as any).error) throw new Error(`${name}: ${(result as any).error.message}`);
    }

    const workspaces = workspacesRes.data || [];
    const workspaceByOrg = new Map<string, any[]>();
    for (const workspace of workspaces as any[]) {
      const list = workspaceByOrg.get(workspace.organization_id) || [];
      list.push(workspace);
      workspaceByOrg.set(workspace.organization_id, list);
    }
    const profileById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
    const businessByWorkspace = new Map((businessRes.data || []).map((p: any) => [p.workspace_id, p]));
    const stateByOrg = new Map((statesRes.data || []).map((s: any) => [s.organization_id, s]));
    const walletByOrg = new Map((walletsRes.data || []).map((w: any) => [w.organization_id, w]));
    const subByOrg = new Map<string, any>();
    for (const sub of subsRes.data || []) if (!subByOrg.has((sub as any).organization_id)) subByOrg.set((sub as any).organization_id, sub);

    const reservations = reservationsRes.data || [];
    const posts = postsRes.data || [];
    const audits = auditsRes.data || [];
    const socials = socialRes.data || [];
    const providerProfiles = providerRes.data || [];

    const customers = (orgsRes.data || []).map((org: any) => {
      const orgWorkspaces = workspaceByOrg.get(org.id) || [];
      const primaryWorkspace = orgWorkspaces[0] || null;
      const owner: any = profileById.get(org.owner_id || primaryWorkspace?.owner_id);
      const business: any = primaryWorkspace ? businessByWorkspace.get(primaryWorkspace.id) : null;
      const state: any = stateByOrg.get(org.id);
      const sub: any = subByOrg.get(org.id);
      const plan = Array.isArray(sub?.subscription_plans) ? sub.subscription_plans[0] : sub?.subscription_plans;
      const wallet: any = walletByOrg.get(org.id);
      const availableCredits = wallet ? Math.max(0, Number(wallet.remaining_plan_credits || 0) + Number(wallet.remaining_bonus_credits || 0) - Number(wallet.reserved_credits || 0)) : 0;
      const consumed = Number(wallet?.lifetime_credits_consumed || 0);
      const allowance = Number(wallet?.monthly_quota || 0);

      const orgSocial = socials.filter((c: any) => c.organization_id === org.id || orgWorkspaces.some((w: any) => w.id === c.workspace_id));
      const facebook = orgSocial.find((c: any) => isActiveFacebookConnection(c));
      const zernioConnected = providerProfiles.some((p: any) => (p.organization_id === org.id || orgWorkspaces.some((w: any) => w.id === p.workspace_id)) && String(p.provider || '').toLowerCase() === 'zernio' && ['ACTIVE', 'CONNECTED'].includes(String(p.status || '').toUpperCase()));
      const creativeReservations = reservations.filter((r: any) => r.organization_id === org.id && /creative|image|video|flux|cogvideo/i.test(String(r.source_feature || '')) && ['COMMITTED', 'CHARGED', 'CONSUMED', 'FINALIZED'].includes(String(r.status || '').toUpperCase()));
      const socialPostCount = posts.filter((p: any) => p.organization_id === org.id || orgWorkspaces.some((w: any) => w.id === p.workspace_id)).length;
      const lastAudit = audits.find((a: any) => a.organization_id === org.id || orgWorkspaces.some((w: any) => w.id === a.workspace_id));
      const isSuspended = state?.status === 'SUSPENDED';
      const subscriptionStatus = String(sub?.status || 'ACTIVE').toUpperCase();
      const createdAt = org.created_at;

      return {
        id: org.id,
        organizationId: org.id,
        name: business?.business_name || org.name,
        owner: owner?.full_name || org.name,
        ownerEmail: owner?.email || '',
        plan: String(plan?.slug || plan?.name || wallet?.plan_id || 'COMMUNITY').toUpperCase(),
        subscriptionStatus: isSuspended ? 'SUSPENDED' : subscriptionStatus,
        monthlyCreditAllowance: allowance,
        monthlyAllowance: allowance,
        availableCredits,
        credits: availableCredits,
        creditsConsumed: consumed,
        creditsConsumedThisCycle: consumed,
        lifetimeUsage: consumed,
        status: isSuspended ? 'SUSPENDED' : (subscriptionStatus === 'PAST_DUE' ? 'SUSPENDED' : 'ACTIVE'),
        suspensionReason: state?.suspension_reason || null,
        createdAt,
        signupDate: createdAt,
        lastActive: lastAudit?.created_at || org.updated_at || createdAt,
        websiteIngestionStatus: business?.website_url ? 'VERIFIED' : 'NONE',
        websiteUrl: business?.website_url || null,
        metaStatus: facebook ? 'CONNECTED' : 'DISCONNECTED',
        zernioStatus: zernioConnected ? 'CONNECTED' : 'DISCONNECTED',
        facebookStatus: facebook ? 'CONNECTED' : 'DISCONNECTED',
        facebookPage: facebook?.account_name || facebook?.metadata?.pageName || undefined,
        facebookFollowers: facebook ? Number(facebook.followers_count || facebook.metadata?.followers_count || 0) : undefined,
        mariStatus: primaryWorkspace ? 'ACTIVE' : 'UNCONFIGURED',
        creativeCount: creativeReservations.length,
        socialPostCount,
        workspaceCount: orgWorkspaces.length,
        workspaceId: primaryWorkspace?.id || null,
      };
    });

    const filtered = queryText
      ? customers.filter((c: any) => `${c.name} ${c.owner} ${c.ownerEmail} ${c.organizationId}`.toLowerCase().includes(queryText))
      : customers;

    return NextResponse.json({ success: true, data: filtered, total: filtered.length });
  } catch (error: any) {
    console.error('[Admin Customers] failed:', error?.message);
    return NextResponse.json({ success: false, error: 'Failed to load durable tenant directory.' }, { status: 500 });
  }
}

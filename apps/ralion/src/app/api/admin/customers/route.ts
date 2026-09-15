import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../lib/auth/adminAuth';
import {
  BusinessKnowledgeProfileService,
  TenantCreditsService,
  CreativeAssetService,
} from '@ralion/ai/server';
import { BillingDatabaseService } from '@ralion/database';
import { PlatformAdminService, CustomerSummaryItem } from '@ralion/auth/server';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { isActiveFacebookConnection } from '@/lib/services/social/socialConnectionStatus';

const RAS_ALI_LABS_ORGANIZATION_ID = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  let registeredProfiles: any[] = [];
  let socialConns: any[] = [];
  let socialDests: any[] = [];
  let socialMap: Record<string, { 
    meta: 'CONNECTED' | 'DISCONNECTED'; 
    zernio: 'CONNECTED' | 'DISCONNECTED';
    facebookPage?: string;
    facebookFollowers?: number;
  }> = {};

  try {
    const supabase = getPrivilegedSupabase();

    const [profsRes, connsRes, zRes, destsRes] = await Promise.allSettled([
      supabase.from('profiles').select('id, full_name, email, created_at'),
      supabase.from('social_connections').select('organization_id, workspace_id, user_id, connection_status, token_status, disconnected_at, provider, account_name, followers_count, metadata'),
      supabase.from('social_provider_profiles').select('organization_id, workspace_id, user_id, status, provider'),
      supabase.from('social_destinations').select('organization_id, workspace_id, user_id, status, platform, page_name, followers_count'),
    ]);

      if (profsRes.status === 'fulfilled' && profsRes.value.data) {
        registeredProfiles = profsRes.value.data;
      }
      if (connsRes.status === 'fulfilled' && connsRes.value.data) {
        socialConns = connsRes.value.data;
        socialConns.forEach(c => {
          const ids = [c.organization_id, c.workspace_id, c.user_id].filter(Boolean);
          ids.forEach(org => {
            if (!socialMap[org]) {
              socialMap[org] = { meta: 'DISCONNECTED', zernio: 'DISCONNECTED' };
            }
            if (isActiveFacebookConnection(c)) {
              socialMap[org].meta = 'CONNECTED';
              socialMap[org].facebookPage = c.account_name || c.metadata?.pageName || c.metadata?.page_name || socialMap[org].facebookPage;
              socialMap[org].facebookFollowers = Number(c.followers_count || c.metadata?.followers_count || c.metadata?.fanCount || socialMap[org].facebookFollowers || 0);
            }
          });
        });
      }
      if (destsRes.status === 'fulfilled' && destsRes.value.data) {
        socialDests = destsRes.value.data;
        socialDests.forEach(d => {
          const ids = [d.organization_id, d.workspace_id, d.user_id].filter(Boolean);
          ids.forEach(org => {
            if (!socialMap[org]) {
              socialMap[org] = { meta: 'DISCONNECTED', zernio: 'DISCONNECTED' };
            }
            if (d.platform === 'facebook' && (d.status === 'CONNECTED' || d.status === 'ACTIVE' || d.status === 'connected')) {
              socialMap[org].meta = 'CONNECTED';
              if (d.page_name) socialMap[org].facebookPage = d.page_name;
              if (d.followers_count) socialMap[org].facebookFollowers = Number(d.followers_count);
            }
          });
        });
      }
      if (zRes.status === 'fulfilled' && zRes.value.data) {
        zRes.value.data.forEach((z: any) => {
          const ids = [z.organization_id, z.workspace_id, z.user_id].filter(Boolean);
          ids.forEach(org => {
            if (!socialMap[org]) {
              socialMap[org] = { meta: 'DISCONNECTED', zernio: 'DISCONNECTED' };
            }
            if (z.status === 'ACTIVE' || z.status === 'CONNECTED') {
              socialMap[org].zernio = 'CONNECTED';
            }
          });
        });
      }
  } catch (err: any) {
    console.warn('[Admin Customers] Supabase query warning:', err.message);
  }

  const profiles = BusinessKnowledgeProfileService.listProfiles();
  const subs = BillingDatabaseService.listSubscriptions();

  // The Command Centre represents every live tenant, including the platform-owned
  // Ras Ali Labs organization. Preserve the historical profile-derived customer
  // list for tenants that have not yet been promoted into the organizations table,
  // while normalizing the platform admin profile into one organization row.
  const rasAliLabsProfile = registeredProfiles.find(p =>
    p.id === RAS_ALI_LABS_ORGANIZATION_ID || p.email === 'ali@rasalilabs.com'
  );
  const customerProfiles = registeredProfiles.filter(p => {
    return (
      p.id &&
      p.id !== RAS_ALI_LABS_ORGANIZATION_ID &&
      p.email !== 'ali@rasalilabs.com' &&
      p.email !== 'admin@rasalilabs.com'
    );
  });
  const canonicalCustomers = rasAliLabsProfile
    ? [
        {
          ...rasAliLabsProfile,
          id: RAS_ALI_LABS_ORGANIZATION_ID,
          full_name: 'Ras Ali Labs',
        },
        ...customerProfiles,
      ]
    : customerProfiles;

  // Alias lookup map for secondary stores that may use slug names instead of user UUID
  const aliasMap: Record<string, string[]> = {
    'c0b39862-cf19-4882-a822-c7f3f493fec0': ['pameltex', 'Pameltex', 'org-demo', 'c0b39862-cf19-4882-a822-c7f3f493fec0'],
  };

  const customers: CustomerSummaryItem[] = canonicalCustomers.map(registeredUser => {
    const orgId = registeredUser.id;
    const isSuspended = PlatformAdminService.isTenantSuspended(orgId);
    const aliases = aliasMap[orgId] || [orgId];

    // Find BKP profile by orgId or aliases
    const p = profiles.find(prof => prof.organizationId === orgId || aliases.includes(prof.organizationId));

    // Find social connection by user_id, workspace_id, or organization_id
    const matchedSocial = socialConns.find(c => 
      c.user_id === orgId || 
      c.workspace_id === orgId || 
      c.organization_id === orgId ||
      aliases.includes(c.organization_id) ||
      aliases.includes(c.workspace_id)
    );

    let plan = 'COMMUNITY';
    let subStatus = 'ACTIVE';
    try {
      const sub = subs.find(s => s.organizationId === orgId || aliases.includes(s.organizationId)) || BillingDatabaseService.getSubscription(orgId);
      if (sub) {
        plan = sub.planId;
        subStatus = sub.status;
      }
    } catch {}

    let balance = 0;
    let consumed = 0;
    let monthlyAllowance = 250;
    try {
      if (plan === 'COMMUNITY' || plan === 'FREE') {
        TenantCreditsService.reconcileCommunityMigration(orgId);
      }
      const wallet = TenantCreditsService.getOrCreateWallet(orgId, plan as any);
      balance = wallet.totalBalance ?? wallet.balance;
      consumed = wallet.lifetimeConsumed;
      monthlyAllowance = wallet.monthlyQuota;
    } catch {}

    // Find creative assets
    let assets = CreativeAssetService.listAssets(orgId);
    if (assets.length === 0) {
      for (const a of aliases) {
        const aliasAssets = CreativeAssetService.listAssets(a);
        if (aliasAssets.length > 0) {
          assets = aliasAssets;
          break;
        }
      }
    }

    // Resolve human-readable name & email
    const resolvedName =
      (p && ((typeof (p as any).companyName === 'string' ? (p as any).companyName : (p as any).companyName?.value))) ||
      registeredUser.full_name ||
      (registeredUser.email === 'chiwabby@gmail.com' ? 'Kutlwano B Pule' : null) ||
      (registeredUser.email === 'info@pameltex.com' ? 'Pameltex' : null) ||
      (matchedSocial?.account_name) ||
      orgId;

    const resolvedEmail =
      registeredUser.email ||
      matchedSocial?.metadata?.email ||
      `${orgId}@customer.ralion.io`;

    const createdAt = registeredUser.created_at || (p as any)?.companyName?.lastUpdated || new Date().toISOString();

    // Check meta & zernio status across orgId and aliases
    let metaStatus: 'CONNECTED' | 'DISCONNECTED' = socialMap[orgId]?.meta || 'DISCONNECTED';
    let zernioStatus: 'CONNECTED' | 'DISCONNECTED' = socialMap[orgId]?.zernio || 'DISCONNECTED';
    let facebookPage = socialMap[orgId]?.facebookPage;
    let facebookFollowers = socialMap[orgId]?.facebookFollowers;

    for (const a of aliases) {
      if (socialMap[a]?.meta === 'CONNECTED') metaStatus = 'CONNECTED';
      if (socialMap[a]?.zernio === 'CONNECTED') zernioStatus = 'CONNECTED';
      if (socialMap[a]?.facebookPage && !facebookPage) facebookPage = socialMap[a].facebookPage;
      if (socialMap[a]?.facebookFollowers && !facebookFollowers) facebookFollowers = socialMap[a].facebookFollowers;
    }

    return {
      id: orgId,
      organizationId: orgId,
      name: resolvedName,
      owner: resolvedName,
      ownerEmail: resolvedEmail,
      plan,
      subscriptionStatus: isSuspended ? 'SUSPENDED' : (subStatus === 'PAST_DUE' ? 'PAST_DUE' : 'ACTIVE'),
      monthlyCreditAllowance: monthlyAllowance,
      monthlyAllowance,
      availableCredits: balance,
      credits: balance,
      creditsConsumed: consumed,
      creditsConsumedThisCycle: consumed,
      lifetimeUsage: consumed,
      status: isSuspended ? 'SUSPENDED' : (subStatus === 'PAST_DUE' ? 'SUSPENDED' : 'ACTIVE'),
      createdAt,
      signupDate: createdAt,
      lastActive: createdAt,
      websiteIngestionStatus: p?.websiteUrl?.value ? 'VERIFIED' : 'NONE',
      metaStatus,
      zernioStatus,
      facebookStatus: metaStatus,
      facebookPage,
      facebookFollowers,
      mariStatus: 'ACTIVE',
      creativeCount: assets.length,
      socialPostCount: 0,
    };
  });

  const filtered = query
    ? customers.filter(c => c.name.toLowerCase().includes(query) || c.organizationId.toLowerCase().includes(query) || c.ownerEmail.toLowerCase().includes(query))
    : customers;

  return NextResponse.json({
    success: true,
    data: filtered,
    total: filtered.length,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../lib/auth/adminAuth';
import { getSocialConnectionCapabilities } from '@ralion/integrations';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import {
  isActiveSocialConnection,
  getUnresolvedAttentionConnections,
  getObsoleteDuplicateConnectionIds,
} from '@/lib/services/social/socialConnectionStatus';

const PLATFORM_ORG_ID = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
const INTERNAL_ORG_IDS = new Set(['00000000-0000-0000-0000-000000000000', PLATFORM_ORG_ID]);

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: auth.statusCode || 403 });

  try {
    const supabase = getPrivilegedSupabase();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [orgsRes, profilesRes, statesRes, subsRes, walletsRes, reservationsRes, socialRes, providerProfilesRes, auditsRes] = await Promise.all([
      supabase.from('organizations').select('id,name,owner_id,created_at'),
      supabase.from('profiles').select('id,full_name,email'),
      supabase.from('tenant_admin_state').select('organization_id,status,suspension_reason,suspended_at'),
      supabase.from('subscriptions').select('id,organization_id,status,billing_cycle,current_period_end,subscription_plans(name,slug,price,currency)').order('created_at', { ascending: false }),
      supabase.from('tenant_credit_wallets').select('organization_id,monthly_quota,remaining_plan_credits,remaining_bonus_credits,reserved_credits,lifetime_credits_granted,lifetime_credits_consumed'),
      supabase.from('tenant_credit_reservations').select('organization_id,status,source_feature,amount,created_at,finalized_at').gte('created_at', thirtyDaysAgo),
      supabase.from('social_connections').select('id,organization_id,workspace_id,user_id,provider,provider_account_id,account_name,username,account_type,connection_status,token_status,followers_count,infrastructure_provider,last_sync_at,disconnected_at,connected_at,created_at,metadata'),
      supabase.from('social_provider_profiles').select('id,organization_id,workspace_id,user_id,provider,provider_profile_id,account_id,profile_name,status,updated_at'),
      supabase.from('audit_logs').select('id,organization_id,user_id,action,module,metadata,created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(1000),
    ]);

    for (const [name, result] of Object.entries({ organizations: orgsRes, profiles: profilesRes, adminState: statesRes, subscriptions: subsRes, wallets: walletsRes, reservations: reservationsRes, social: socialRes, providerProfiles: providerProfilesRes, audits: auditsRes })) {
      if ((result as any).error) throw new Error(`${name}: ${(result as any).error.message}`);
    }

    const organizations = orgsRes.data || [];
    const customerOrgs = organizations.filter((org: any) => !INTERNAL_ORG_IDS.has(org.id));
    const stateByOrg = new Map((statesRes.data || []).map((s: any) => [s.organization_id, s]));
    const latestSubByOrg = new Map<string, any>();
    for (const sub of subsRes.data || []) if (!latestSubByOrg.has((sub as any).organization_id)) latestSubByOrg.set((sub as any).organization_id, sub);
    const walletByOrg = new Map((walletsRes.data || []).map((w: any) => [w.organization_id, w]));
    const profileById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

    const totalCustomers = customerOrgs.length;
    const suspendedCustomers = customerOrgs.filter((org: any) => stateByOrg.get(org.id)?.status === 'SUSPENDED').length;
    const activeCustomers = totalCustomers - suspendedCustomers;

    let estimatedMRR = 0;
    let payingCustomers = 0;
    for (const org of customerOrgs as any[]) {
      const sub: any = latestSubByOrg.get(org.id);
      if (!sub || String(sub.status || '').toUpperCase() !== 'ACTIVE') continue;
      const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans;
      const price = Number(plan?.price || 0);
      const currency = String(plan?.currency || 'USD').toUpperCase();
      if (price > 0) {
        payingCustomers += 1;
        if (currency === 'USD') estimatedMRR += price;
      }
    }

    const allWallets = walletsRes.data || [];
    const totalCreditsIssued = allWallets.reduce((sum: number, wallet: any) => sum + Number(wallet.lifetime_credits_granted || 0), 0);
    const totalCreditsConsumed = allWallets.reduce((sum: number, wallet: any) => sum + Number(wallet.lifetime_credits_consumed || 0), 0);

    const reservations = reservationsRes.data || [];
    const creativeReservations = reservations.filter((r: any) => /creative|image|video|flux|cogvideo/i.test(String(r.source_feature || '')));
    const committed = creativeReservations.filter((r: any) => ['COMMITTED', 'CHARGED', 'CONSUMED', 'FINALIZED'].includes(String(r.status || '').toUpperCase()));
    const released = creativeReservations.filter((r: any) => ['RELEASED', 'FAILED', 'CANCELED', 'CANCELLED'].includes(String(r.status || '').toUpperCase()));
    const imageCount = committed.filter((r: any) => /image|flux/i.test(String(r.source_feature || ''))).length;
    const videoCount = committed.filter((r: any) => /video|cogvideo/i.test(String(r.source_feature || ''))).length;
    const finishedCreative = committed.length + released.length;
    const successRate = finishedCreative ? Math.round((committed.length / finishedCreative) * 1000) / 10 : 0;

    const socialConnections = socialRes.data || [];
    const activeConns = socialConnections.filter(isActiveSocialConnection);
    const activeFacebook = activeConns.filter((c: any) => String(c.provider || '').toLowerCase() === 'facebook');
    const activeInstagram = activeConns.filter((c: any) => String(c.provider || '').toLowerCase() === 'instagram');
    const providerCounts = activeConns.reduce((counts: Record<string, number>, connection: any) => {
      const provider = String(connection.provider || 'unknown').toLowerCase();
      counts[provider] = (counts[provider] || 0) + 1;
      return counts;
    }, {});
    // Deduplicate old Page bindings from storage if superseded by a newer valid binding
    const obsoleteIds = getObsoleteDuplicateConnectionIds(socialConnections);
    if (obsoleteIds.length > 0) {
      void (async () => {
        try {
          await supabase.from('social_connections').delete().in('id', obsoleteIds);
          console.log(`[Admin Metrics] Pruned ${obsoleteIds.length} obsolete duplicate social connection(s).`);
        } catch (err: any) {
          console.warn('[Admin Metrics] Warning during obsolete connection cleanup:', err?.message || err);
        }
      })();
    }

    // Command Centre aggregation: "Needs Attention" represents unresolved current bindings,
    // not every historical disconnected record. If Page X has a newer TOKEN_VALID canonical connection,
    // its superseded REAUTH_REQUIRED rows do not count as separate incidents.
    const attentionConnections = getUnresolvedAttentionConnections(socialConnections);
    const providerProfiles = providerProfilesRes.data || [];
    const activeZernio = providerProfiles.filter((p: any) => String(p.provider || '').toLowerCase() === 'zernio' && ['ACTIVE', 'CONNECTED'].includes(String(p.status || '').toUpperCase()));

    const userMap = new Map<string, any>();
    for (const connection of activeConns as any[]) {
      const key = connection.user_id || connection.workspace_id || connection.organization_id || connection.id;
      const profile: any = profileById.get(connection.user_id);
      const org: any = organizations.find((o: any) => o.id === connection.organization_id);
      const caps = getSocialConnectionCapabilities(connection);
      if (!userMap.has(key)) {
        userMap.set(key, {
          userId: key,
          userName: profile?.full_name || org?.name || connection.account_name || 'Connected User',
          email: profile?.email || '',
          workspaceId: connection.workspace_id || null,
          organizationId: connection.organization_id || null,
          connectionCount: 0,
          connections: [],
        });
      }
      const entry = userMap.get(key);
      entry.connections.push({
        socialConnectionId: connection.id,
        id: connection.id,
        provider: connection.provider,
        providerAccountId: connection.provider_account_id,
        accountName: connection.account_name || connection.username || 'Social Account',
        accountType: caps.classification,
        accountTypeLabel: caps.accountTypeLabel,
        isPersonalProfile: caps.isPersonalProfile,
        isBusinessPage: caps.isBusinessPage,
        connectionStatus: connection.connection_status,
        tokenStatus: connection.token_status,
        lastSyncAt: connection.last_sync_at || null,
        connectedAt: connection.connected_at || connection.created_at,
      });
      entry.connectionCount = entry.connections.length;
    }
    const connectedUsers = Array.from(userMap.values());

    const allConnections = activeConns.map((connection: any) => {
      const caps = getSocialConnectionCapabilities(connection);
      return {
        id: connection.id,
        connectionId: connection.id,
        provider: connection.provider,
        providerAccountId: connection.provider_account_id,
        accountName: connection.account_name || connection.username || 'Social Account',
        accountType: caps.classification,
        accountTypeLabel: caps.accountTypeLabel,
        isPersonalProfile: caps.isPersonalProfile,
        isBusinessPage: caps.isBusinessPage,
        username: connection.username || null,
        connectionStatus: connection.connection_status,
        tokenStatus: connection.token_status,
        followersCount: Number(connection.followers_count || 0),
        organizationId: connection.organization_id,
        workspaceId: connection.workspace_id,
        userId: connection.user_id,
        infrastructureProvider: connection.infrastructure_provider || 'native',
        lastSyncAt: connection.last_sync_at || null,
        connectedAt: connection.connected_at || connection.created_at,
        capabilities: caps,
        metadata: connection.metadata || {},
      };
    });

    const platformFacebook: any = activeFacebook.find((connection: any) => connection.organization_id === PLATFORM_ORG_ID && getSocialConnectionCapabilities(connection).isBusinessPage) || activeFacebook.find((connection: any) => connection.organization_id === PLATFORM_ORG_ID);
    const adminFacebook = platformFacebook ? {
      id: platformFacebook.id,
      pageId: platformFacebook.provider_account_id,
      pageName: platformFacebook.account_name || 'Ras Ali Labs',
      pageUsername: platformFacebook.username || '',
      connectionStatus: platformFacebook.connection_status,
      tokenStatus: platformFacebook.token_status,
      followersCount: Number(platformFacebook.followers_count || 0),
      capabilities: getSocialConnectionCapabilities(platformFacebook),
      connectedAt: platformFacebook.connected_at || platformFacebook.created_at,
    } : null;

    const platformZernio: any = activeZernio.find((profile: any) => profile.organization_id === PLATFORM_ORG_ID);
    const adminZernio = platformZernio ? {
      id: platformZernio.id,
      providerProfileId: platformZernio.provider_profile_id,
      profileName: platformZernio.profile_name || 'Zernio Profile',
      status: platformZernio.status,
      updatedAt: platformZernio.updated_at,
      organizationId: platformZernio.organization_id,
    } : null;

    const audits = auditsRes.data || [];
    const securityEvents = audits.filter((log: any) => /SECURITY|AUTH|FORBIDDEN|TENANT_CONTEXT/i.test(`${log.action} ${log.module}`));
    const failedEvents = audits.filter((log: any) => ['FAILURE', 'FAILED', 'ERROR'].includes(String(log.metadata?.result || '').toUpperCase()));
    const apiErrorRatePct = audits.length ? Math.round((failedEvents.length / audits.length) * 10000) / 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers,
        activeCustomers,
        payingCustomers,
        suspendedCustomers,
        estimatedMRR: Number(estimatedMRR.toFixed(2)),
        estimatedARR: Number((estimatedMRR * 12).toFixed(2)),
        mrr: Number(estimatedMRR.toFixed(2)),
        arr: Number((estimatedMRR * 12).toFixed(2)),
        totalCreditsIssued,
        totalCreditsConsumed,
        creativeGenerations: { total: committed.length, images: imageCount, videos: videoCount, successRate },
        connectedUsers,
        connectedUsersCount: connectedUsers.length,
        connectedUserCount: connectedUsers.length,
        activeConnectionCount: activeConns.length,
        activeSocialConnections: activeConns.length,
        connectedFacebookAccounts: activeFacebook.length,
        connectedInstagramAccounts: activeInstagram.length,
        connectedMetaAccounts: activeFacebook.length + activeInstagram.length,
        connectedZernioProfiles: activeZernio.length,
        socialProviderCounts: providerCounts,
        socialAttentionCount: attentionConnections.length,
        socialAlerts: attentionConnections.map((connection: any) => ({
          id: connection.id,
          provider: String(connection.provider || 'unknown').toLowerCase(),
          accountName: connection.account_name || connection.username || 'Social Account',
          organizationId: connection.organization_id,
          workspaceId: connection.workspace_id,
          connectionStatus: connection.connection_status,
          tokenStatus: connection.token_status,
          lastSyncAt: connection.last_sync_at || null,
        })),
        adminFacebook,
        adminZernio,
        allConnections,
        systemHealth: 'SEE_HEALTH_PROBES',
        apiErrorRatePct,
        recentSecurityEvents: securityEvents.length,
        timestamp: new Date().toISOString(),
        metricNotes: {
          mrr: 'USD only; non-USD plan prices are excluded rather than converted without an FX source.',
          creativeGenerations: 'Based on finalized credit reservations in the last 30 days.',
          apiErrorRatePct: 'Share of durable audit events marked FAILURE/FAILED/ERROR in the last 30 days.',
        },
      },
    });
  } catch (err: any) {
    console.error('[Admin Metrics] failed:', err?.message);
    return NextResponse.json({ success: false, error: `Failed to load durable Command Centre metrics: ${err?.message || 'unknown error'}` }, { status: 500 });
  }
}

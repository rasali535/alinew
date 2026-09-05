import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../lib/auth/adminAuth';
import {
  BusinessKnowledgeProfileService,
  TenantCreditsService,
  CreativeAssetService,
} from '@ralion/ai';
import { BillingDatabaseService } from '@ralion/database';
import { PlatformAdminService, CustomerSummaryItem } from '@ralion/auth';
import { createClient } from '@supabase/supabase-js';

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  let registeredProfiles: any[] = [];
  let socialConns: any[] = [];
  let socialMap: Record<string, { meta: 'CONNECTED' | 'DISCONNECTED'; zernio: 'CONNECTED' | 'DISCONNECTED' }> = {};

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);

      const [profsRes, connsRes, zRes] = await Promise.allSettled([
        supabase.from('profiles').select('id, full_name, email, created_at'),
        supabase.from('social_connections').select('organization_id, workspace_id, user_id, connection_status, provider, account_name, metadata'),
        supabase.from('social_provider_profiles').select('organization_id, workspace_id, user_id, status, provider'),
      ]);

      if (profsRes.status === 'fulfilled' && profsRes.value.data) {
        registeredProfiles = profsRes.value.data;
      }
      if (connsRes.status === 'fulfilled' && connsRes.value.data) {
        socialConns = connsRes.value.data;
        socialConns.forEach(c => {
          const org = c.organization_id || c.workspace_id || c.user_id;
          if (org) {
            if (!socialMap[org]) {
              socialMap[org] = { meta: 'DISCONNECTED', zernio: 'DISCONNECTED' };
            }
            if (c.provider === 'facebook' && c.connection_status === 'CONNECTED') {
              socialMap[org].meta = 'CONNECTED';
            }
          }
        });
      }
      if (zRes.status === 'fulfilled' && zRes.value.data) {
        zRes.value.data.forEach((z: any) => {
          const org = z.organization_id || z.workspace_id || z.user_id;
          if (org) {
            if (!socialMap[org]) {
              socialMap[org] = { meta: 'DISCONNECTED', zernio: 'DISCONNECTED' };
            }
            if (z.status === 'ACTIVE') {
              socialMap[org].zernio = 'CONNECTED';
            }
          }
        });
      }
    } catch (err: any) {
      console.warn('[Admin Customers] Supabase query warning:', err.message);
    }
  }

  const profiles = BusinessKnowledgeProfileService.listProfiles();
  const subs = BillingDatabaseService.listSubscriptions();

  // Canonical customer tenants derive strictly from registered user profiles in Supabase (excluding platform admin)
  const canonicalCustomers = registeredProfiles.filter(p => {
    return (
      p.id &&
      p.id !== '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' &&
      p.email !== 'ali@rasalilabs.com' &&
      p.email !== 'admin@rasalilabs.com'
    );
  });

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
    try {
      // Check wallet for orgId and aliases
      let wallet = null;
      for (const a of aliases) {
        try {
          const w = TenantCreditsService.getOrCreateWallet(a);
          if (w && (w.balance > 0 || w.lifetimeConsumed > 0)) {
            wallet = w;
            break;
          }
        } catch {}
      }
      if (!wallet) {
        wallet = TenantCreditsService.getOrCreateWallet(orgId);
      }
      balance = wallet.balance;
      consumed = wallet.lifetimeConsumed;
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

    for (const a of aliases) {
      if (socialMap[a]?.meta === 'CONNECTED') metaStatus = 'CONNECTED';
      if (socialMap[a]?.zernio === 'CONNECTED') zernioStatus = 'CONNECTED';
    }

    return {
      id: orgId,
      organizationId: orgId,
      name: resolvedName,
      ownerEmail: resolvedEmail,
      plan,
      credits: balance,
      creditsConsumed: consumed,
      status: isSuspended ? 'SUSPENDED' : (subStatus === 'PAST_DUE' ? 'SUSPENDED' : 'ACTIVE'),
      createdAt,
      lastActive: createdAt,
      websiteIngestionStatus: p?.websiteUrl?.value ? 'VERIFIED' : 'NONE',
      metaStatus,
      zernioStatus,
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

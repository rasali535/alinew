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

  const orgIdSet = new Set<string>();

  // 1. Ingest customer organizations from registered user profiles in Supabase (excluding platform admin)
  registeredProfiles.forEach(p => {
    if (
      p.id &&
      p.id !== '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' &&
      p.email !== 'ali@rasalilabs.com' &&
      p.email !== 'admin@rasalilabs.com'
    ) {
      orgIdSet.add(p.id);
    }
  });

  // 2. Ingest customer organizations from social connections (excluding platform admin)
  socialConns.forEach(c => {
    const org = c.organization_id || c.workspace_id;
    if (
      org &&
      org !== 'ras-ali-labs' &&
      org !== '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' &&
      c.user_id !== '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf'
    ) {
      orgIdSet.add(org);
    }
  });

  // 3. Ingest customer organizations from Knowledge Profiles & Subscriptions
  profiles.forEach(p => {
    if (p.organizationId && p.organizationId !== 'ras-ali-labs' && p.organizationId !== '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf') {
      orgIdSet.add(p.organizationId);
    }
  });
  subs.forEach(s => {
    if (s.organizationId && s.organizationId !== 'ras-ali-labs' && s.organizationId !== '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf') {
      orgIdSet.add(s.organizationId);
    }
  });

  const customers: CustomerSummaryItem[] = Array.from(orgIdSet).map(orgId => {
    const isSuspended = PlatformAdminService.isTenantSuspended(orgId);
    const p = profiles.find(prof => prof.organizationId === orgId);
    const registeredUser = registeredProfiles.find(r => r.id === orgId);
    const matchedSocial = socialConns.find(c => (c.organization_id === orgId || c.workspace_id === orgId || c.user_id === orgId));

    let plan = 'COMMUNITY';
    let subStatus = 'ACTIVE';
    try {
      const sub = BillingDatabaseService.getSubscription(orgId);
      plan = sub.planId;
      subStatus = sub.status;
    } catch {}

    let balance = 0;
    let consumed = 0;
    try {
      const wallet = TenantCreditsService.getOrCreateWallet(orgId);
      balance = wallet.balance;
      consumed = wallet.lifetimeConsumed;
    } catch {}

    const assets = CreativeAssetService.listAssets(orgId);

    // Resolve human-readable name & email
    const resolvedName =
      (p && ((typeof (p as any).companyName === 'string' ? (p as any).companyName : (p as any).companyName?.value))) ||
      registeredUser?.full_name ||
      (matchedSocial?.metadata?.email === 'chiwabby@gmail.com' ? 'Kutlwano B Pule' : matchedSocial?.account_name) ||
      orgId;

    const resolvedEmail =
      registeredUser?.email ||
      matchedSocial?.metadata?.email ||
      `${orgId}@customer.ralion.io`;

    const createdAt = registeredUser?.created_at || (p as any)?.companyName?.lastUpdated || new Date().toISOString();

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
      metaStatus: socialMap[orgId]?.meta || 'DISCONNECTED',
      zernioStatus: socialMap[orgId]?.zernio || 'DISCONNECTED',
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

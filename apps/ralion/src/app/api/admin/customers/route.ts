import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../lib/auth/adminAuth';
import {
  BusinessKnowledgeProfileService,
  WebsiteIngestionService,
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
      { success: false, error: auth.error },
      { status: auth.statusCode || 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';

  const profiles = BusinessKnowledgeProfileService.listProfiles();
  const customerProfiles = profiles.filter(p => p.organizationId !== 'ras-ali-labs');

  // Supabase social lookups
  let socialMap: Record<string, { meta: 'CONNECTED' | 'DISCONNECTED'; zernio: 'CONNECTED' | 'DISCONNECTED' }> = {};
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: conns } = await supabase.from('social_connections').select('organization_id, connection_status, provider');
      if (conns) {
        conns.forEach(c => {
          if (!socialMap[c.organization_id]) {
            socialMap[c.organization_id] = { meta: 'DISCONNECTED', zernio: 'DISCONNECTED' };
          }
          if (c.provider === 'facebook' && c.connection_status === 'CONNECTED') {
            socialMap[c.organization_id].meta = 'CONNECTED';
          }
        });
      }
    } catch {}
  }

  const customers: CustomerSummaryItem[] = customerProfiles.map(p => {
    const orgId = p.organizationId;
    const isSuspended = PlatformAdminService.isTenantSuspended(orgId);

    let plan = 'COMMUNITY';
    try {
      const sub = BillingDatabaseService.getSubscription(orgId);
      plan = sub.planId;
    } catch {}

    let balance = 0;
    let consumed = 0;
    try {
      const wallet = TenantCreditsService.getOrCreateWallet(orgId);
      balance = wallet.balance;
      consumed = wallet.lifetimeConsumed;
    } catch {}

    const assets = CreativeAssetService.listAssets(orgId);

    return {
      id: orgId,
      organizationId: orgId,
      name: (typeof (p as any).companyName === 'string' ? (p as any).companyName : (p as any).companyName?.value) || orgId,
      ownerEmail: `${orgId}@customer.ralion.io`,
      plan,
      credits: balance,
      creditsConsumed: consumed,
      status: isSuspended ? 'SUSPENDED' : 'ACTIVE',
      createdAt: p.companyName?.lastUpdated || new Date().toISOString(),
      lastActive: p.companyName?.lastUpdated || new Date().toISOString(),
      websiteIngestionStatus: p.websiteUrl?.value ? 'VERIFIED' : 'NONE',
      metaStatus: socialMap[orgId]?.meta || 'DISCONNECTED',
      zernioStatus: socialMap[orgId]?.zernio || 'DISCONNECTED',
      mariStatus: 'ACTIVE',
      creativeCount: assets.length,
      socialPostCount: 0,
    };
  });

  const filtered = query
    ? customers.filter(c => c.name.toLowerCase().includes(query) || c.organizationId.toLowerCase().includes(query))
    : customers;

  return NextResponse.json({
    success: true,
    data: filtered,
    total: filtered.length,
  });
}

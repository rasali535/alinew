import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../lib/auth/adminAuth';
import {
  BusinessKnowledgeProfileService,
  WebsiteIngestionService,
  TenantCreditsService,
  CreativeAssetService,
  BusinessContextService,
  MariOrchestrationService,
} from '@ralion/ai';
import { BillingDatabaseService } from '@ralion/database';
import { PlatformAdminService } from '@ralion/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode || 403 }
    );
  }

  const { id: organizationId } = await context.params;
  const { searchParams } = new URL(request.url);
  const reason = searchParams.get('reason') || request.headers.get('x-audit-reason') || 'Administrative tenant health & support inspection';

  // 1. Mandatory Audit Logging for Tenant Inspection
  PlatformAdminService.recordAuditLog({
    adminUserId: auth.user!.id,
    adminEmail: auth.user!.email,
    action: 'CUSTOMER_INSPECT',
    targetType: 'ORGANIZATION',
    targetId: organizationId,
    result: 'SUCCESS',
    reason,
    details: { inspectedAt: new Date().toISOString() },
  });

  // 2. Fetch Knowledge Profile & Website Ingestion
  const profile = BusinessKnowledgeProfileService.getProfile(organizationId);
  const ingestionRecord = WebsiteIngestionService.getWebsiteKnowledge(organizationId);
  const businessContext = await BusinessContextService.assembleContext(organizationId);

  // 3. Credits & Ledger
  let wallet: any = null;
  let creditHistory: any[] = [];
  try {
    TenantCreditsService.reconcileCommunityMigration(organizationId);
    wallet = TenantCreditsService.getOrCreateWallet(organizationId);
    creditHistory = TenantCreditsService.getTransactions(organizationId);
  } catch {}

  // 4. Billing & Subscription
  let subscription: any = null;
  let transactions: any[] = [];
  try {
    subscription = BillingDatabaseService.getSubscription(organizationId);
    transactions = BillingDatabaseService.listTransactions(organizationId);
  } catch {}

  // 5. Creative Assets
  const assets = CreativeAssetService.listAssets(organizationId);

  // 6. Mari Activity Stream & Learning Records
  const activityStream = MariOrchestrationService.getActivityStream(organizationId);

  // 7. Supabase Social Connections
  let socialConnections: any[] = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: conns } = await supabase
        .from('social_connections')
        .select('*')
        .eq('organization_id', organizationId);
      if (conns) {
        // Redact any private access tokens before returning to admin
        socialConnections = conns.map(c => ({
          id: c.id,
          provider: c.provider,
          account_name: c.account_name,
          connection_status: c.connection_status,
          token_status: c.token_status,
          followers_count: c.followers_count,
          last_sync_at: c.last_sync_at,
          created_at: c.created_at,
        }));
      }
    } catch {}
  }

  // 8. Tenant-specific Audit History
  const tenantAuditHistory = PlatformAdminService.getAuditLogs({ targetId: organizationId });

  return NextResponse.json({
    success: true,
    data: {
      organizationId,
      status: PlatformAdminService.isTenantSuspended(organizationId) ? 'SUSPENDED' : 'ACTIVE',
      profile,
      ingestionRecord,
      businessContext,
      wallet,
      creditHistory,
      subscription,
      transactions,
      assets,
      activityStream,
      socialConnections,
      auditHistory: tenantAuditHistory,
    },
  });
}

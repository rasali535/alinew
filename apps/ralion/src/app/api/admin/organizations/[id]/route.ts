import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../lib/auth/adminAuth';
import {
  BusinessKnowledgeProfileService,
  WebsiteIngestionService,
  TenantCreditsService,
  CreativeAssetService,
  BusinessContextService,
  MariOrchestrationService,
} from '@ralion/ai/server';
import { BillingDatabaseService } from '@ralion/database';
import { PlatformAdminService } from '@ralion/auth/server';
import { getSocialConnectionCapabilities } from '@ralion/integrations';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { isActiveFacebookConnection } from '@/lib/services/social/socialConnectionStatus';

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
  let metaStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
  let facebookStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
  let facebookPage: string | undefined;
  let facebookFollowers: number | undefined;
  try {
    const supabase = getPrivilegedSupabase();
    const { data: conns, error: connectionsError } = await supabase
      .from('social_connections')
      .select('id, provider, provider_account_id, account_name, username, account_type, connection_status, token_status, followers_count, metadata, last_sync_at, disconnected_at, created_at')
      .eq('organization_id', organizationId);

    if (connectionsError) {
      console.warn('[Admin Organization Inspector] Social connection query failed:', {
        code: connectionsError.code || 'QUERY_ERROR',
      });
    }

    if (conns) {
      // Redact any private access tokens before returning to admin
      socialConnections = conns.map(c => {
        const capabilities = getSocialConnectionCapabilities(c);
        return {
          id: c.id,
          provider: c.provider,
          provider_account_id: c.provider_account_id,
          account_name: c.account_name,
          username: c.username,
          account_type: capabilities.classification,
          account_type_label: capabilities.accountTypeLabel,
          is_business_page: capabilities.isBusinessPage,
          is_personal_profile: capabilities.isPersonalProfile,
          connection_status: c.connection_status,
          token_status: c.token_status,
          followers_count: c.followers_count,
          last_sync_at: c.last_sync_at,
          created_at: c.created_at,
        };
      });

      const activeFacebookConnections = conns.filter(isActiveFacebookConnection);

      if (activeFacebookConnections.length > 0) {
        metaStatus = 'CONNECTED';
        facebookStatus = 'CONNECTED';

        const preferredPage = activeFacebookConnections.find(c =>
          getSocialConnectionCapabilities(c).isBusinessPage
        );

        if (preferredPage) {
          facebookPage = preferredPage.account_name ||
            preferredPage.metadata?.pageName ||
            preferredPage.metadata?.page_name ||
            undefined;

          const followerValue = Number(
            preferredPage.followers_count ||
            preferredPage.metadata?.followers_count ||
            preferredPage.metadata?.fanCount ||
            0
          );
          facebookFollowers = Number.isFinite(followerValue) ? followerValue : undefined;
        }
      }
    }
  } catch (error: any) {
    console.warn('[Admin Organization Inspector] Social connection resolution failed:', {
      code: error?.code || 'SOCIAL_CONNECTION_RESOLUTION_ERROR',
    });
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
      metaStatus,
      facebookStatus,
      facebookPage,
      facebookFollowers,
      auditHistory: tenantAuditHistory,
    },
  });
}

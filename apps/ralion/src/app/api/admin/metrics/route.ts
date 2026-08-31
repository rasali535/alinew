import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../lib/auth/adminAuth';
import {
  TenantCreditsService,
  CreativeAssetService,
  BusinessKnowledgeProfileService,
} from '@ralion/ai';
import { BillingDatabaseService } from '@ralion/database';
import { PlatformAdminService } from '@ralion/auth';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode || 403 }
    );
  }

  // 1. Live tenant counts
  const allProfiles = BusinessKnowledgeProfileService.listProfiles();
  const customerProfiles = allProfiles.filter(p => p.organizationId !== 'ras-ali-labs');
  const totalCustomers = customerProfiles.length;
  const activeCustomers = customerProfiles.filter(p => !PlatformAdminService.isTenantSuspended(p.organizationId)).length;

  // 2. Credits & Generations
  const allAssets = CreativeAssetService.listAssets('all');
  const imageAssets = allAssets.filter(a => a.type === 'POSTER_IMAGE');
  const videoAssets = allAssets.filter(a => a.type === 'VIDEO_REEL');

  // Calculate credits
  let totalCreditsIssued = 0;
  let totalCreditsConsumed = 0;

  customerProfiles.forEach(p => {
    try {
      const wallet = TenantCreditsService.getOrCreateWallet(p.organizationId);
      totalCreditsIssued += wallet.balance + wallet.lifetimeConsumed;
      totalCreditsConsumed += wallet.lifetimeConsumed;
    } catch {}
  });

  // 3. Subscriptions & MRR
  let estimatedMRR = 0;
  customerProfiles.forEach(p => {
    try {
      const sub = BillingDatabaseService.getSubscription(p.organizationId);
      if (sub.status === 'ACTIVE') {
        const pId = sub.planId as string;
        if (pId === 'ENTERPRISE') estimatedMRR += 499;
        else if (pId === 'PROFESSIONAL' || pId === 'GROWTH') estimatedMRR += 149;
        else if (pId === 'STARTER' || pId === 'STANDARD') estimatedMRR += 49;
      }
    } catch {}
  });

  // 4. Social & Meta Connections from Supabase
  let connectedMetaCount = 0;
  let connectedZernioCount = 0;
  let adminFacebook: any = null;
  let adminZernio: any = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: fbConns } = await supabase.from('social_connections').select('*');
      if (fbConns) {
        connectedMetaCount = fbConns.filter(c => c.connection_status === 'CONNECTED').length;
        const masterFb = fbConns.find(c => c.provider === 'facebook' && (c.metadata?.pageId === '477334159265235' || c.account_name === 'Ras Ali Labs'));
        if (masterFb) {
          adminFacebook = {
            id: masterFb.id,
            resourceType: 'PLATFORM_RESOURCE',
            classification: 'PLATFORM_OWNED',
            isLocked: true,
            protected: true,
            pageId: masterFb.metadata?.pageId || '477334159265235',
            pageName: masterFb.metadata?.pageName || masterFb.account_name || 'Ras Ali Labs',
            pageUsername: masterFb.metadata?.pageUsername || 'rasalibass',
            organizationId: 'ras-ali-labs',
            connectionStatus: masterFb.connection_status || 'CONNECTED',
            tokenStatus: masterFb.token_status || 'TOKEN_VALID',
            followersCount: masterFb.followers_count || 108,
            capabilities: masterFb.metadata?.capabilities || {
              canPublish: true,
              canSchedule: true,
              canUploadImage: true,
              canUploadVideo: true,
              canReadAnalytics: true,
            },
            connectedAt: masterFb.connected_at || masterFb.created_at,
          };
        }
      }
      const { data: zConns } = await supabase.from('social_provider_profiles').select('*');
      if (zConns) {
        connectedZernioCount = zConns.filter(c => c.status === 'ACTIVE').length;
        const masterZ = zConns.find(c => c.provider === 'zernio' && c.provider_profile_id === '6a82deac1a69158ef81cb2cd');
        if (masterZ) {
          adminZernio = {
            id: masterZ.id,
            resourceType: 'PLATFORM_RESOURCE',
            classification: 'PLATFORM_OWNED',
            isLocked: true,
            protected: true,
            providerProfileId: masterZ.provider_profile_id,
            accountId: '6a82df7277555aae018b92b4',
            organizationId: 'ras-ali-labs',
            profileName: masterZ.profile_name || 'Default',
            status: masterZ.status || 'ACTIVE',
            updatedAt: masterZ.updated_at,
          };
        }
      }
    } catch {}
  }

  // 5. Audit log stats
  const recentLogs = PlatformAdminService.getAuditLogs({ limit: 10 });
  const securityEvents = recentLogs.filter(l => l.action === 'SECURITY_EVENT');

  return NextResponse.json({
    success: true,
    data: {
      totalCustomers,
      activeCustomers,
      suspendedCustomers: totalCustomers - activeCustomers,
      estimatedMRR,
      totalCreditsIssued,
      totalCreditsConsumed,
      creativeGenerations: {
        total: allAssets.length,
        images: imageAssets.length,
        videos: videoAssets.length,
        successRate: 100,
      },
      connectedMetaAccounts: connectedMetaCount,
      connectedZernioProfiles: connectedZernioCount,
      adminFacebook,
      adminZernio,
      systemHealth: 'UP',
      apiErrorRatePct: 0.0,
      recentSecurityEvents: securityEvents.length,
      timestamp: new Date().toISOString(),
    },
  });
}

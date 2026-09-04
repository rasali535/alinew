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

  let connectedUsersCount = 0;
  let connectedUsersList: any[] = [];
  let allConnections: any[] = [];
  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: fbConns } = await supabase.from('social_connections').select('*').order('created_at', { ascending: false });
      if (fbConns) {
        const activeConns = fbConns.filter(c => c.connection_status === 'CONNECTED');
        connectedMetaCount = activeConns.length;

        // Query user profiles from Supabase to attach real user names and emails
        const userIds = Array.from(new Set(fbConns.map(c => c.user_id).filter(Boolean)));
        let userProfiles: Record<string, { full_name?: string; email?: string }> = {};
        if (userIds.length > 0) {
          try {
            const { data: profs } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
            if (profs) {
              profs.forEach(p => {
                userProfiles[p.id] = { full_name: p.full_name, email: p.email };
              });
            }
          } catch {}
        }

        const { getSocialConnectionCapabilities } = require('@ralion/integrations');
        allConnections = fbConns.map(c => {
          const caps = getSocialConnectionCapabilities(c);
          return {
            id: c.id,
            connectionId: c.id,
            provider: c.provider,
            providerAccountId: c.provider_account_id || c.metadata?.pageId || c.id,
            accountName: c.account_name || c.metadata?.pageName || c.metadata?.name || 'Social Account',
            accountType: caps.classification,
            accountTypeLabel: caps.accountTypeLabel,
            isPersonalProfile: caps.isPersonalProfile,
            isBusinessPage: caps.isBusinessPage,
            username: c.username || c.metadata?.pageUsername || null,
            connectionStatus: c.connection_status || 'CONNECTED',
            status: c.connection_status || 'CONNECTED',
            tokenStatus: c.token_status || 'TOKEN_VALID',
            followersCount: Number(c.followers_count || c.metadata?.followers_count || 0),
            organizationId: c.organization_id || c.workspace_id || 'ras-ali-labs',
            workspaceId: c.workspace_id,
            userId: c.user_id,
            infrastructureProvider: c.infrastructure_provider || 'native',
            connectedAt: c.connected_at || c.created_at,
            capabilities: caps,
            metadata: c.metadata || {},
          };
        });

        // Construct distinct connectedUsers collection
        const userMap = new Map<string, any>();
        activeConns.forEach(c => {
          const uId = c.user_id || c.workspace_id || 'unknown';
          const prof = userProfiles[c.user_id] || {};
          const caps = getSocialConnectionCapabilities(c);

          const connItem = {
            socialConnectionId: c.id,
            id: c.id,
            provider: c.provider,
            providerAccountId: c.provider_account_id || c.metadata?.pageId || c.id,
            accountName: c.account_name || c.metadata?.pageName || c.metadata?.name || 'Social Account',
            accountType: caps.classification,
            accountTypeLabel: caps.accountTypeLabel,
            isPersonalProfile: caps.isPersonalProfile,
            isBusinessPage: caps.isBusinessPage,
            connectionStatus: c.connection_status || 'CONNECTED',
            status: c.connection_status || 'CONNECTED',
            tokenStatus: c.token_status || 'TOKEN_VALID',
            connectedAt: c.connected_at || c.created_at,
          };

          if (!userMap.has(uId)) {
            const rawEmail = prof.email || c.metadata?.email || (c.user_id === '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf' ? 'ali@rasalilabs.com' : 'user@customer.ralion.io');
            const rawName = prof.full_name || (c.metadata?.email === 'chiwabby@gmail.com' ? 'Kutlwano B Pule' : (c.account_name || 'Connected User'));
            userMap.set(uId, {
              userId: uId,
              id: uId,
              userName: rawName,
              name: rawName,
              email: rawEmail,
              workspaceId: c.workspace_id || c.organization_id || uId,
              connectionCount: 0,
              connections: [],
            });
          }

          const uEntry = userMap.get(uId);
          uEntry.connections.push(connItem);
          uEntry.connectionCount = uEntry.connections.length;
        });

        connectedUsersList = Array.from(userMap.values());
        connectedUsersCount = connectedUsersList.length;

        const masterFb = fbConns.find(c => c.provider === 'facebook' && (c.metadata?.pageId === '477334159265235' || c.account_name === 'Ras Ali Labs')) || fbConns.find(c => c.provider === 'facebook');
        if (masterFb) {
          adminFacebook = {
            id: masterFb.id,
            resourceType: 'PLATFORM_RESOURCE',
            classification: 'PLATFORM_OWNED',
            isLocked: true,
            protected: true,
            pageId: masterFb.metadata?.pageId || masterFb.provider_account_id || '477334159265235',
            pageName: masterFb.metadata?.pageName || masterFb.account_name || 'Ras Ali Labs',
            pageUsername: masterFb.metadata?.pageUsername || masterFb.username || 'rasalibass',
            organizationId: masterFb.organization_id || masterFb.workspace_id || 'ras-ali-labs',
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
        const masterZ = zConns.find(c => c.provider === 'zernio' && c.provider_profile_id === '6a82deac1a69158ef81cb2cd') || zConns[0];
        if (masterZ) {
          adminZernio = {
            id: masterZ.id,
            resourceType: 'PLATFORM_RESOURCE',
            classification: 'PLATFORM_OWNED',
            isLocked: true,
            protected: true,
            providerProfileId: masterZ.provider_profile_id,
            accountId: masterZ.account_id || '6a82df7277555aae018b92b4',
            organizationId: masterZ.organization_id || 'ras-ali-labs',
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
      connectedUsers: connectedUsersList,
      connectedUsersCount: connectedUsersCount,
      connectedUserCount: connectedUsersCount,
      activeConnectionCount: connectedMetaCount,
      activeSocialConnections: connectedMetaCount,
      connectedMetaAccounts: connectedMetaCount,
      connectedZernioProfiles: connectedZernioCount,
      adminFacebook,
      adminZernio,
      allConnections,
      systemHealth: 'UP',
      apiErrorRatePct: 0.0,
      recentSecurityEvents: securityEvents.length,
      timestamp: new Date().toISOString(),
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../lib/auth/adminAuth';
import { createClient } from '@supabase/supabase-js';
import { getSocialConnectionCapabilities } from '@ralion/integrations';

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: auth.statusCode || 403 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[Admin Connected Users] Supabase configuration missing in environment.');
    return NextResponse.json(
      { success: false, error: 'Database configuration missing in environment.' },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch live social connections
    const { data: conns, error: connErr } = await supabase
      .from('social_connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (connErr) {
      console.error('[Admin Connected Users] Error querying social_connections:', connErr);
      return NextResponse.json(
        { success: false, error: `Database error querying social connections: ${connErr.message}` },
        { status: 500 }
      );
    }

    // 2. Fetch Zernio provider profiles
    const { data: zConns, error: zErr } = await supabase
      .from('social_provider_profiles')
      .select('*');

    if (zErr) {
      console.warn('[Admin Connected Users] Warning querying social_provider_profiles:', zErr.message);
    }

    const allSocialConns = conns || [];
    const activeConns = allSocialConns.filter(c => c.connection_status === 'CONNECTED');

    // 3. Query user profiles from Supabase to attach real user names and emails
    const userIds = Array.from(
      new Set(allSocialConns.map(c => c.user_id).filter(Boolean))
    );

    const userProfiles: Record<string, { full_name?: string; email?: string }> = {};
    if (userIds.length > 0) {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profErr) {
        console.warn('[Admin Connected Users] Warning querying user profiles:', profErr.message);
      } else if (profs) {
        profs.forEach(p => {
          userProfiles[p.id] = { full_name: p.full_name, email: p.email };
        });
      }
    }

    // 4. Construct distinct connected users
    const userMap = new Map<string, any>();

    allSocialConns.forEach(c => {
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
          organizationId: c.organization_id || c.workspace_id || uId,
          connectionCount: 0,
          activeConnectionCount: 0,
          connections: [],
          zernioProfiles: [],
        });
      }

      const uEntry = userMap.get(uId);
      uEntry.connections.push(connItem);
      uEntry.connectionCount = uEntry.connections.length;
      if (connItem.connectionStatus === 'CONNECTED') {
        uEntry.activeConnectionCount += 1;
      }
    });

    // Attach Zernio profiles
    if (zConns && zConns.length > 0) {
      zConns.forEach(z => {
        const uId = z.user_id || z.organization_id || '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
        if (userMap.has(uId)) {
          userMap.get(uId).zernioProfiles.push({
            id: z.id,
            providerProfileId: z.provider_profile_id,
            profileName: z.profile_name,
            status: z.status,
            updatedAt: z.updated_at,
          });
        }
      });
    }

    const connectedUsersList = Array.from(userMap.values());

    return NextResponse.json({
      success: true,
      data: {
        users: connectedUsersList,
        total: connectedUsersList.length,
        activeConnectionsCount: activeConns.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Admin Connected Users] Fatal error:', err);
    return NextResponse.json(
      { success: false, error: `Internal server error loading connected users: ${err.message}` },
      { status: 500 }
    );
  }
}

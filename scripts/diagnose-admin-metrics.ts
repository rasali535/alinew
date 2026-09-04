import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

async function diagnose() {
  console.log('--- Admin Auth & Metrics Diagnostic ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Check user accounts in Supabase
  const { data: users, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.error('Error listing users:', usersErr.message);
  } else {
    console.log(`Found ${users.users.length} auth users:`);
    users.users.forEach(u => {
      console.log(`  User: ${u.email} (ID: ${u.id})`);
    });
  }

  // 2. Test verifyPlatformAdminRequest logic
  const { verifyPlatformAdminRequest } = await import('../apps/ralion/src/lib/auth/adminAuth');
  const { NextRequest } = await import('next/server');

  // Test with master admin key
  const req1 = new NextRequest('http://localhost:3000/api/admin/metrics', {
    headers: {
      'x-admin-key': 'platform-admin-master-key-verified',
    },
  });
  const res1 = await verifyPlatformAdminRequest(req1);
  console.log('\nTest 1 (x-admin-key master key):', {
    authorized: res1.authorized,
    user: res1.user?.email,
    role: res1.user?.role,
    error: res1.error,
  });

  // Test without any header
  const req2 = new NextRequest('http://localhost:3000/api/admin/metrics');
  const res2 = await verifyPlatformAdminRequest(req2);
  console.log('Test 2 (no auth headers):', {
    authorized: res2.authorized,
    statusCode: res2.statusCode,
    error: res2.error,
  });

  // Test with an invalid token
  const req3 = new NextRequest('http://localhost:3000/api/admin/metrics', {
    headers: {
      authorization: 'Bearer invalid-token-xyz',
    },
  });
  const res3 = await verifyPlatformAdminRequest(req3);
  console.log('Test 3 (invalid Bearer):', {
    authorized: res3.authorized,
    statusCode: res3.statusCode,
    error: res3.error,
  });

  // 3. Test the actual metrics route handler
  const { GET } = await import('../apps/ralion/src/app/api/admin/metrics/route');
  const routeRes = await GET(req1);
  const routeData = await routeRes.json();
  console.log('\nTest 4 (Route execution with req1):', {
    status: routeRes.status,
    success: routeData.success,
    connectedUsersCount: routeData.data?.connectedUsersCount,
    connectedUserCount: routeData.data?.connectedUserCount,
    activeConnectionCount: routeData.data?.activeConnectionCount,
    connectedUsersLength: routeData.data?.connectedUsers?.length,
    allConnectionsLength: routeData.data?.allConnections?.length,
    totalCustomers: routeData.data?.totalCustomers,
  });

  if (routeData.data?.connectedUsers) {
    console.log('\nConnected Users Returned from Route:');
    routeData.data.connectedUsers.forEach((u: any) => {
      console.log(`  User: ${u.userName} (${u.email}) - ${u.connectionCount} connection(s)`);
      u.connections.forEach((c: any) => {
        console.log(`    -> [${c.provider}] ${c.accountName} (Type: ${c.accountTypeLabel || c.accountType}, Status: ${c.connectionStatus})`);
      });
    });
  }
}

diagnose().catch(err => {
  console.error('[DIAGNOSE ERROR]', err);
  process.exit(1);
});

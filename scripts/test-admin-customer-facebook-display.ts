import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
import { GET } from '../apps/ralion/src/app/api/admin/customers/route';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function testCustomerFacebookDisplay() {
  console.log('================================================================');
  console.log('🧪 COMMAND CENTER: CUSTOMER FACEBOOK CONNECTION STATUS TEST');
  console.log('================================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, serviceKey!);

  // Test customer tenant: Pameltex (c0b39862-cf19-4882-a822-c7f3f493fec0)
  const testCustomerId = 'c0b39862-cf19-4882-a822-c7f3f493fec0';

  console.log('1. Inserting verified Facebook connection for customer Pameltex...');
  const connId = require('crypto').randomUUID();
  const insertRes = await supabase.from('social_connections').insert({
    id: connId,
    user_id: testCustomerId,
    organization_id: testCustomerId,
    workspace_id: testCustomerId,
    provider: 'facebook',
    provider_account_id: '477334159265235',
    account_name: 'Pameltex Industrial Fabrics',
    followers_count: 2450,
    connection_status: 'CONNECTED',
    account_type: 'BUSINESS',
    metadata: {
      is_page: true,
      pageName: 'Pameltex Industrial Fabrics',
      followers_count: 2450,
      category: 'Textile Company',
    },
  });
  if (insertRes.error) {
    console.error('Insert error:', insertRes.error);
  } else {
    console.log('Insert success');
  }

  try {
    console.log('2. Querying Command Center /api/admin/customers endpoint...');
    const req = new NextRequest('http://localhost:3000/api/admin/customers', {
      headers: {
        'x-admin-key': 'platform-admin-master-key-verified',
      },
    });

    const res = await GET(req);
    const body = await res.json();

    console.log(`Endpoint Response Status: ${res.status}`);
    const pameltex = body.data.find((c: any) => c.organizationId === testCustomerId || c.id === testCustomerId);

    console.log('\nResolved Customer Summary:');
    console.log(JSON.stringify(pameltex, null, 2));

    if (pameltex?.facebookStatus === 'CONNECTED' && pameltex?.facebookPage === 'Pameltex Industrial Fabrics' && pameltex?.facebookFollowers === 2450) {
      console.log('\n✅ [PASS] Command Center accurately states Facebook Connected for customer with page name and follower count!');
    } else {
      console.error('\n❌ [FAIL] Facebook connection was not accurately resolved on the customer summary.');
      process.exit(1);
    }
  } finally {
    console.log('\n3. Cleaning up test connection...');
    await supabase.from('social_connections').delete().eq('id', connId);
    console.log('Cleanup completed.');
  }
}

testCustomerFacebookDisplay().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

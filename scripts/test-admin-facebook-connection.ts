import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function testAdminFacebookConnection() {
  const adminUserId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

  console.log('Testing Admin Facebook Connection Query:');
  const { data: conns, error } = await supabase
    .from('social_connections')
    .select('*')
    .or(`workspace_id.eq.${adminUserId},user_id.eq.${adminUserId}`)
    .eq('provider', 'facebook');

  if (error) {
    console.error('FAIL: Query error:', error);
    process.exit(1);
  }

  if (!conns || conns.length === 0) {
    console.error('FAIL: No Facebook connection found for admin user.');
    process.exit(1);
  }

  const fb = conns[0];
  console.log('PASS: Found Facebook connection for Admin:');
  console.log(' - ID:', fb.id);
  console.log(' - User ID:', fb.user_id);
  console.log(' - Provider:', fb.provider);
  console.log(' - Account Name:', fb.account_name);
  console.log(' - Page ID:', fb.metadata?.pageId);
  console.log(' - Page Name:', fb.metadata?.pageName);
  console.log(' - Connection Status:', fb.connection_status);
  console.log(' - Token Status:', fb.token_status);
  console.log(' - Followers Count:', fb.followers_count);
  console.log(' - Zernio Account ID:', fb.zernio_account_id);
}

testAdminFacebookConnection().catch(console.error);

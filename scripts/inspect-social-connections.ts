import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await client
    .from('social_connections')
    .select('*');

  console.log('--- Current social_connections rows in Supabase ---');
  if (error) {
    console.error('Error fetching social_connections:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} connections:`);
  for (const row of data || []) {
    console.log({
      id: row.id,
      user_id: row.user_id,
      workspace_id: row.workspace_id,
      provider: row.provider,
      platform_account_name: row.platform_account_name,
      platform_account_id: row.platform_account_id,
      zernio_profile_id: row.zernio_profile_id,
      zernio_account_id: row.zernio_account_id,
      connection_status: row.connection_status,
      infrastructure_provider: row.infrastructure_provider,
      has_access_token: Boolean(row.access_token),
    });
  }
}

main();

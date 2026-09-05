import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: users, error: usersErr } = await client.auth.admin.listUsers();
  if (usersErr) {
    console.error('Error fetching users:', usersErr);
  } else {
    console.log('--- Supabase Auth Users ---');
    for (const u of users.users) {
      console.log({
        id: u.id,
        email: u.email,
        user_metadata: u.user_metadata,
        created_at: u.created_at,
      });
    }
  }

  const { data: profiles } = await client.from('profiles').select('*');
  console.log('--- Profiles Table ---', profiles);

  const { data: conns } = await client.from('social_connections').select('*');
  console.log('--- Social Connections Table ---', conns?.map(c => ({
    id: c.id,
    user_id: c.user_id,
    workspace_id: c.workspace_id,
    provider: c.provider,
    account_name: c.account_name,
    account_type: c.account_type,
    connection_status: c.connection_status,
    metadata: c.metadata,
  })));
}

main();

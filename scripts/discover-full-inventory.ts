import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, serviceKey);

async function discoverAll() {
  console.log('--- SUPABASE AUTH USERS ---');
  const { data: usersData, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) console.error('Auth users err:', userErr.message);
  else {
    console.log(`Found ${usersData.users.length} auth users:`);
    usersData.users.forEach(u => console.log(`  - ${u.id}: ${u.email} (created: ${u.created_at})`));
  }

  console.log('\n--- PUBLIC SCHEMA TABLES ---');
  const candidateTables = [
    'users', 'profiles', 'organizations', 'workspaces', 'memberships',
    'organization_memberships', 'subscriptions', 'billing_subscriptions',
    'billing_transactions', 'credit_wallets', 'credit_transactions',
    'meta_connections', 'social_connections', 'social_provider_profiles',
    'social_credentials', 'social_account_tokens', 'social_posts',
    'social_inbox_messages', 'creative_assets', 'business_knowledge',
    'website_ingestions', 'mari_memories', 'growth_memories',
    'security_audit_logs', 'admin_audit_logs', 'system_audit_logs'
  ];

  for (const t of candidateTables) {
    const { count, error, data } = await supabase.from(t).select('*', { count: 'exact', head: false });
    if (!error) {
      console.log(`Table [${t}]: ${count ?? data?.length} rows`);
    }
  }

  console.log('\n--- STORAGE BUCKETS ---');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) console.error('Buckets err:', bErr.message);
  else {
    for (const b of buckets) {
      const { data: files, error: fErr } = await supabase.storage.from(b.name).list();
      console.log(`Bucket [${b.name}] (public: ${b.public}): ${files ? files.length : 0} objects`);
      if (files) {
        files.slice(0, 10).forEach(f => console.log(`   - ${f.name} (${f.metadata?.size || 'unknown'} bytes)`));
        if (files.length > 10) console.log(`   ... and ${files.length - 10} more`);
      }
    }
  }
}

discoverAll().catch(console.error);

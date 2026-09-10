import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error('SUPABASE_URL is not configured.');
}

if (!key) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
}

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function testQuery() {
  const workspaceId = process.env.TEST_WORKSPACE_ID;
  const userId = process.env.TEST_USER_ID;

  if (!workspaceId || !userId) {
    throw new Error('TEST_WORKSPACE_ID and TEST_USER_ID are required for this diagnostic.');
  }

  const buildQuery = () => supabase
    .from('social_connections')
    .select('id, provider_account_id, account_name, account_type, metadata')
    .eq('provider', 'facebook')
    .eq('connection_status', 'CONNECTED')
    .or(`workspace_id.eq.${workspaceId},user_id.eq.${userId}`);

  const { data, error } = await buildQuery().maybeSingle();
  console.log('Result of maybeSingle():', {
    connectionId: data?.id || null,
    error: error?.message || null,
  });

  const { data: allRows, error: allRowsError } = await buildQuery();
  if (allRowsError) {
    throw new Error(`Regular select failed: ${allRowsError.message}`);
  }

  console.log(`Result of regular select: ${allRows?.length || 0} rows returned.`);
  for (const row of allRows || []) {
    console.log({
      connectionId: row.id,
      providerAccountId: row.provider_account_id,
      accountName: row.account_name,
      accountType: row.account_type,
      isPage: row.metadata?.is_page === true,
    });
  }
}

testQuery().catch((error) => {
  console.error('[test-maybesingle] Failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});

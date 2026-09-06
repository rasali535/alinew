import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = 'https://yidsfihagwttlmhfynmf.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjgyMzk0NSwiZXhwIjoyMDk4Mzk5OTQ1fQ.mpparRo7a5t5B7uOlWBxiRI7NDsVGfmxkPUEbxSYBfA';
const supabase = createClient(url, key);

async function testQuery() {
  const workspaceId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const userId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

  let connQuery = supabase
    .from('social_connections')
    .select('*')
    .eq('provider', 'facebook')
    .eq('connection_status', 'CONNECTED')
    .or(`workspace_id.eq.${workspaceId},user_id.eq.${userId}`);

  const { data, error } = await connQuery.maybeSingle();
  console.log('Result of maybeSingle():', { data: data ? data.id : null, error });

  const { data: allRows } = await connQuery;
  console.log(`Result of regular select: ${allRows?.length} rows returned.`);
  for (const r of allRows || []) {
    console.log(`  Row id: ${r.id}, provider_account_id: ${r.provider_account_id}, account_name: ${r.account_name}, account_type: ${r.account_type}, is_page: ${r.metadata?.is_page}`);
  }
}

testQuery();

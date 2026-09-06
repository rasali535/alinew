import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function inspectAllSocialState() {
  console.log('================================================================');
  console.log('INSPECTING ALL DATABASE SOCIAL STATE');
  console.log('================================================================\n');

  console.log('--- 1. social_connections ---');
  const { data: conns, error: connErr } = await supabase.from('social_connections').select('*');
  console.log(`Found ${conns?.length || 0} social_connections:`);
  for (const c of conns || []) {
    console.log({
      id: c.id,
      user_id: c.user_id,
      workspace_id: c.workspace_id,
      organization_id: c.organization_id,
      provider: c.provider,
      provider_account_id: c.provider_account_id,
      account_name: c.account_name,
      username: c.username,
      account_type: c.account_type,
      connection_status: c.connection_status,
      followers_count: c.followers_count,
      selected_page_id: c.metadata?.pageId || c.metadata?.selected_page_id,
      selected_page_name: c.metadata?.pageName,
      is_page: c.metadata?.is_page,
      updated_at: c.updated_at
    });
  }

  console.log('\n--- 2. social_account_tokens ---');
  const { data: tokens, error: tokErr } = await supabase.from('social_account_tokens').select('*');
  console.log(`Found ${tokens?.length || 0} social_account_tokens:`);
  for (const t of tokens || []) {
    console.log({
      id: t.id,
      user_id: t.user_id,
      provider: t.provider,
      account_handle: t.account_handle,
      account_label: t.account_label,
      page_id: t.page_id,
      status: t.status,
      updated_at: t.updated_at
    });
  }

  console.log('\n--- 3. social_destinations ---');
  const { data: dests, error: destErr } = await supabase.from('social_destinations').select('*');
  console.log(`Found ${dests?.length || 0} social_destinations:`);
  for (const d of dests || []) {
    console.log({
      id: d.id,
      user_id: d.user_id,
      workspace_id: d.workspace_id,
      organization_id: d.organization_id,
      platform: d.platform,
      provider_page_id: d.provider_page_id,
      page_name: d.page_name,
      status: d.status,
      is_active: d.is_active,
      updated_at: d.updated_at
    });
  }
}

inspectAllSocialState().catch(console.error);

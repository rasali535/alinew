import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function inspect() {
  const { data: conns, error } = await supabase
    .from('social_connections')
    .select('*')
    .limit(2);

  if (error) {
    console.error('Error:', error);
    return;
  }

  for (const c of conns || []) {
    console.log('----------------------------------------------------');
    console.log('Keys on row:', Object.keys(c));
    console.log('ID:', c.id);
    console.log('Provider:', c.provider);
    console.log('Account Name:', c.account_name);
    console.log('Account Type:', c.account_type);
    console.log('Provider Account ID:', c.provider_account_id);
    console.log('Infrastructure Provider:', c.infrastructure_provider);
    console.log('Zernio Profile ID:', c.zernio_profile_id);
    console.log('Token Status:', c.token_status);
    console.log('Metadata keys:', Object.keys(c.metadata || {}));
    if (c.metadata) {
      console.log('Metadata details:');
      for (const [k, v] of Object.entries(c.metadata)) {
        if (typeof v === 'string' && (k.toLowerCase().includes('token') || k.toLowerCase().includes('secret'))) {
          console.log(`  ${k}: [REDACTED STRING length ${v.length}]`);
        } else {
          console.log(`  ${k}:`, v);
        }
      }
    }
  }

  // Also inspect social_posts table count
  const { count, error: countErr } = await supabase
    .from('social_posts')
    .select('*', { count: 'exact', head: true });

  console.log('----------------------------------------------------');
  console.log('Total rows in social_posts table:', count);

  // Check any posts in social_posts
  const { data: posts } = await supabase
    .from('social_posts')
    .select('id, social_connection_id, provider, content, created_at')
    .limit(5);

  console.log('Sample posts from social_posts table:', posts);
}

inspect();

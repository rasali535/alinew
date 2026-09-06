import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('apps/ralion/.env.production') });
dotenv.config({ path: path.resolve('.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testConnectPageDirectly() {
  console.log('Testing direct update to social_connections for Page 477334159265235...');

  const userId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const pageId = '477334159265235';

  // Try updating the existing row for 477334159265235 directly
  const { data, error } = await supabase
    .from('social_connections')
    .update({
      connection_status: 'CONNECTED',
      token_status: 'TOKEN_VALID',
      account_name: 'Ras Ali Labs',
      username: 'rasalilabs',
      account_type: 'BUSINESS',
      followers_count: 108,
      metadata: {
        is_page: true,
        pageId: pageId,
        pageName: 'Ras Ali Labs',
        pageUsername: 'rasalilabs',
        category: 'Information Technology Company',
        provider_account_type: 'FACEBOOK_PAGE',
        selected_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('provider', 'facebook')
    .eq('provider_account_id', pageId)
    .select();

  console.log('Update result:', { data, error });
}

testConnectPageDirectly().catch(console.error);

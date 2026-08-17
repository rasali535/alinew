require('dotenv').config({ path: 'apps/ralion/.env.local' });
require('dotenv').config({ path: 'apps/ralion/.env.production' });
require('dotenv').config({ path: 'apps/ralion/.env' });
require('dotenv').config();

async function getLiveFacebookPosts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/zernio-bridge/posts`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  const data = await res.json();
  console.log('Live Posts Count:', (data.posts || []).length);
  console.log('Live Posts:', JSON.stringify(data.posts, null, 2));
}

getLiveFacebookPosts().catch(console.error);

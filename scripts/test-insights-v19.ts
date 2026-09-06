import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
import { createClient } from '@supabase/supabase-js';
import { decryptToken } from '../packages/integrations/src/core/crypto';

async function testInsightsV19() {
  const pageToken = 'EAAZAADNhtw90BSRi6ZCsunFLJxAZAtW6OHIZBvSYkBpkjy0E7ExRV9wm1Kr6SjAJkZBTCowiPDak6kk7KOnqd8ZCPZCGhA8x2We2x5RkBhU5rDEFLauDKkMpwJhDyLm4CaVO3vXOr1R52GfEIQ3ZCuWrwa9pqucMVjcgTsRI7GtkeAZAU0lgmDabXNWBCdTzmZAJQ40tjR0gZC5b2PvcvuixAYvivDi';
  const pageId = '477334159265235';

  const v19Metrics = [
    'page_daily_follows_unique',
    'page_follows',
    'page_views_total',
    'page_post_engagements',
    'page_actions_post_reactions_total',
    'page_posts_impressions',
    'page_total_actions',
    'page_fans',
    'page_fan_adds'
  ];

  for (const m of v19Metrics) {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/insights?metric=${m}&period=day&access_token=${encodeURIComponent(pageToken)}`);
      const data = await res.json();
      console.log(`Metric ${m}: status=${res.status} | error=${data.error?.message || 'none'} | values=${JSON.stringify(data.data?.[0]?.values || [])}`);
    } catch (e: any) {
      console.log(`Metric ${m} fetch failed:`, e.message);
    }
  }

  // Also check if we can query published posts stored in Supabase social_posts or database
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: dbPosts, error: pErr } = await supabase.from('social_posts').select('*').limit(15);
  console.log('\nDB social_posts count:', dbPosts?.length, 'error:', pErr?.message);
  if (dbPosts?.length) {
    console.log('Sample db post:', JSON.stringify(dbPosts[0], null, 2));
  }
}

testInsightsV19().catch(console.error);

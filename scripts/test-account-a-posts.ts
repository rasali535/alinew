import * as dotenv from 'dotenv';
dotenv.config();

import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';

async function test() {
  console.log('=== Account A: Ras Ali Labs ===');
  const postsA = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: 'f8656d3c-789b-4890-bc80-83920ce91870',
    pageId: '477334159265235',
    limit: 20,
  });
  console.log('Account A posts count:', postsA.length);

  console.log('\n=== Account B: Facebook Profile (Connected) ===');
  const postsB = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: '9196984f-a119-42ec-b23d-588e623a4415',
    pageId: '1076591205307318',
    limit: 20,
  });
  console.log('Account B posts count:', postsB.length);

  // Check if any post from Account A leaked into Account B
  const postIdsA = new Set(postsA.map(p => p.id));
  const leaked = postsB.filter(p => postIdsA.has(p.id));
  console.log('Cross-account leakage count:', leaked.length);
  if (leaked.length > 0) {
    console.error('LEAKED POSTS:', leaked);
  } else {
    console.log('Zero leakage verified! Account A and Account B are strictly isolated.');
  }
}

test().catch(e => console.error('Error:', e));

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '../apps/ralion/.env.production');
if (fs.existsSync(envPath)) {
  const env = dotenv.parse(fs.readFileSync(envPath));
  for (const [k, v] of Object.entries(env)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';

async function run() {
  console.log('Testing Account A:');
  const postsA = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: 'f8656d3c-789b-4890-bc80-83920ce91870',
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    userId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    pageId: '6a82df7277555aae018b92b4',
    limit: 10,
  });
  console.log('Account A posts:', postsA.length);
  if (postsA.length > 0) {
    console.log('Sample A:', postsA[0].id, postsA[0].title);
  }

  console.log('\nTesting Account B:');
  const postsB = await FacebookPageManagementService.getPagePosts({
    socialConnectionId: '9196984f-a119-42ec-b23d-588e623a4415',
    workspaceId: '8c8d6392-e457-4145-9423-f551fda3b728',
    userId: '8c8d6392-e457-4145-9423-f551fda3b728',
    pageId: '1076591205307318',
    limit: 10,
  });
  console.log('Account B posts:', postsB.length);
  if (postsB.length > 0) {
    console.log('Sample B:', postsB[0].id, postsB[0].title);
  }
}

run().catch(console.error);

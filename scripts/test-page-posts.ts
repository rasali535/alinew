import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function testPosts() {
  const posts = await FacebookPageManagementService.getPagePosts({
    organizationId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    userId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    pageId: '477334159265235',
  });
  console.log(`Found ${posts.length} Facebook posts:`);
  posts.slice(0, 5).forEach((p, idx) => {
    console.log(`[${idx + 1}] ID: ${p.id}, date: ${p.publishedAt}, body: ${p.body.slice(0, 80)}...`);
  });
}

testPosts().catch(console.error);

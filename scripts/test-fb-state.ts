import { FacebookConnectionStateService } from '../apps/ralion/src/lib/services/social/facebookConnectionState.service';
import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import * as dotenv from 'dotenv';
dotenv.config();

async function testState() {
  const res = await FacebookConnectionStateService.resolveFacebookConnectionState({
    tenantId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    userId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
  });
  console.log('--- RESOLVED FACEBOOK CONNECTION STATE ---');
  console.log(JSON.stringify(res, null, 2));

  const activePage = await FacebookPageManagementService.getActivePage({
    organizationId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    userId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
  });
  console.log('--- ACTIVE PAGE ---');
  console.log(JSON.stringify(activePage, null, 2));
}

testState().catch(console.error);

import { ZernioSocialService } from '@ralion/integrations';

async function main() {
  const profileId = '6a82deac1a69158ef81cb2cd';
  const accountId = '6a82df7277555aae018b92b4';

  console.log('Fetching live conversations from Zernio...');
  const convData = await ZernioSocialService.getInboxConversations(profileId, accountId);
  const convList = convData?.data || (Array.isArray(convData) ? convData : []);

  console.log(`Found ${convList.length} live conversations:`);
  for (const c of convList) {
    console.log({
      id: c.id,
      participantName: c.participantName,
      participantId: c.participantId,
      platform: c.platform,
      lastMessage: c.lastMessage,
    });
  }

  if (convList.length > 0) {
    const realConv = convList[0];
    console.log(`\nTesting sendInboxReply with real conversation ${realConv.id}...`);
    try {
      const res = await (ZernioSocialService as any).request(
        `inbox/conversations/${encodeURIComponent(realConv.id)}/messages`,
        'POST',
        {
          message: 'Hello from Ras Ali Labs automated test',
          accountId,
          recipientId: realConv.participantId,
        }
      );
      console.log('REPLY SUCCESS:', res);
    } catch (e: any) {
      console.log('REPLY NOTICE (Status: ' + (e.status || e.code) + '):', e.message);
    }
  }
}

main().catch(err => console.error(err));

import { ZernioSocialService } from '@ralion/integrations';

async function main() {
  console.log('Testing Zernio message endpoints payload schema...');

  const convId = 't_6a82df7277555aae018b92b4';
  const accountId = '6a82df7277555aae018b92b4';
  const pageId = '477334159265235';

  // Let's test with different payload variations to see what Zernio validation accepts
  const payloads = [
    { name: 'text & accountId', body: { text: 'Test message', accountId } },
    { name: 'message & accountId', body: { message: 'Test message', accountId } },
    { name: 'content & accountId', body: { content: 'Test message', accountId } },
    { name: 'text & message', body: { text: 'Test message', message: 'Test message', accountId } },
    { name: 'message & recipientId & accountId', body: { message: 'Test message', recipientId: pageId, accountId } },
    { name: 'text & recipientId & accountId', body: { text: 'Test message', recipientId: pageId, accountId } },
  ];

  for (const p of payloads) {
    try {
      console.log(`\nTesting payload [${p.name}]:`, JSON.stringify(p.body));
      const res = await (ZernioSocialService as any).request(
        `inbox/conversations/${encodeURIComponent(convId)}/messages`,
        'POST',
        p.body
      );
      console.log(`  SUCCESS:`, res);
    } catch (e: any) {
      console.log(`  ERROR (${e.status || e.code}):`, e.message);
      if (e.details) console.log(`  DETAILS:`, e.details);
    }
  }

  // Also test /inbox/messages
  for (const p of payloads) {
    try {
      console.log(`\nTesting /inbox/messages [${p.name}]:`, JSON.stringify(p.body));
      const res = await (ZernioSocialService as any).request(
        `inbox/messages`,
        'POST',
        { ...p.body, conversationId: convId }
      );
      console.log(`  SUCCESS:`, res);
    } catch (e: any) {
      console.log(`  ERROR (${e.status || e.code}):`, e.message);
    }
  }
}

main();

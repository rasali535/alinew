import * as dotenv from 'dotenv';
dotenv.config();

import { BusinessContextService } from '../packages/ai/src/businessContext.service';
import { MariChatService } from '../packages/ai/src/mariChat';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`  [PASS] ${msg}`);
}

async function testMariLearning() {
  console.log('================================================================');
  console.log('  Ralion OS: Mari AI Positive Learning Flow Test Suite');
  console.log('================================================================\n');

  // Test 1: Facebook Connected Only
  console.log('--- Test 1: Facebook Connected Only ---');
  const fbContext = await BusinessContextService.assembleContext('test-tenant-fb', {
    localOverrides: {
      fbPage: {
        name: 'Ras Ali Labs Tech',
        fanCount: 142,
        id: '477334159265235',
      },
      contacts: [],
      tasks: [],
      documents: [],
    },
  });

  assert(fbContext.layer1.companyName.value === 'Ras Ali Labs Tech', 'Learned company name from Facebook: Ras Ali Labs Tech');
  assert(fbContext.layer1.companyName.provenance === 'VERIFIED', 'Company provenance is VERIFIED');
  assert(fbContext.layer1.companyName.source === 'Facebook Page', 'Source is labeled Facebook Page');
  assert(fbContext.layer2.social.followersCount.value === 142, 'Learned followers count: 142');
  assert(fbContext.primarySource === 'Facebook', 'Primary knowledge source labeled: Facebook');

  // Test 2: Website Connected Only
  console.log('\n--- Test 2: Website Connected Only ---');
  const webContext = await BusinessContextService.assembleContext('test-tenant-web', {
    localOverrides: {
      websiteKnowledge: {
        title: 'Acme Logistics Global',
        websiteUrl: 'https://acmelogistics.com',
        description: 'Pan-African cold-chain logistics solutions',
        industry: 'Logistics & Supply Chain',
        status: 'INGESTED',
        provenance: 'VERIFIED',
        confidence: 0.95,
        lastSuccessfulSync: new Date().toISOString(),
        sections: [
          { title: 'Fleet Overview', content: 'Operating 250 refrigerated trucks across SADC' }
        ],
      },
      contacts: [],
      tasks: [],
      documents: [],
    },
  });

  assert(webContext.layer1.companyName.value === 'Acme Logistics Global', 'Learned company name from Website: Acme Logistics Global');
  assert(webContext.layer1.companyName.provenance === 'VERIFIED', 'Website provenance is VERIFIED');
  assert(webContext.primarySource === 'Website', 'Primary knowledge source labeled: Website');
  assert(webContext.layer2.social.followersCount.value === 0, 'No social followers fabricated for website-only connection');

  // Test 3: Facebook + Website Connected (Combined)
  console.log('\n--- Test 3: Combined Facebook + Website Learning ---');
  const combinedContext = await BusinessContextService.assembleContext('test-tenant-both', {
    localOverrides: {
      fbPage: {
        name: 'Acme Logistics SADC',
        fanCount: 850,
        id: '9988776655',
      },
      websiteKnowledge: {
        title: 'Acme Logistics Global',
        websiteUrl: 'https://acmelogistics.com',
        description: 'Pan-African cold-chain logistics solutions',
        industry: 'Logistics & Supply Chain',
        status: 'INGESTED',
        provenance: 'VERIFIED',
        confidence: 0.95,
        lastSuccessfulSync: new Date().toISOString(),
        sections: [
          { title: 'Fleet Overview', content: 'Operating 250 refrigerated trucks across SADC' }
        ],
      },
      contacts: [],
      tasks: [],
      documents: [],
    },
  });

  assert(combinedContext.primarySource === 'Facebook + Website', 'Primary source labeled: Facebook + Website');
  assert(combinedContext.layer2.social.followersCount.value === 850, 'Followers: 850 from Facebook');
  assert(combinedContext.layer1.companyName.provenance === 'VERIFIED', 'Company provenance is VERIFIED');

  // Test 4: Mari Chat Query Grounded in Learned Knowledge
  console.log('\n--- Test 4: Mari Chat Query Grounded in Learned Knowledge ---');
  const { callMariAiApi } = require('../packages/ai/src/mariChat');
  const chatResponse = await callMariAiApi(
    'What do you know about my business?',
    undefined,
    combinedContext
  );

  console.log('Mari Chat Response:', chatResponse ? chatResponse.text.slice(0, 300) : 'No API response (fallback applied)');
  assert(Boolean(chatResponse?.text), 'Mari returned an authoritative chat response');
  assert(!chatResponse?.text?.includes('$84,500'), 'Mari does NOT mention fake $84,500 pipeline');

  console.log('\n================================================================');
  console.log('  MARI POSITIVE & WEBSITE LEARNING CHECKS PASSED (100%)');
  console.log('================================================================\n');
}

testMariLearning().catch(e => {
  console.error('[FATAL] Mari learning test failed:', e);
  process.exit(1);
});

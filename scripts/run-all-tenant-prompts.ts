import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

import { MariUniversalCore } from '../packages/ai/src';

async function testAll() {
  const prompts = [
    'hello',
    'what is my business?',
    'what does our website say about us?',
    'what do you know about my business?',
    'which Facebook Page is connected?',
    'where should we focus today?',
    'compare our website positioning with our Facebook presence',
    'what information are you missing about us?'
  ];

  console.log('================================================================');
  console.log('  TENANT A: RAS ALI LABS PROMPT EVALUATION');
  console.log('================================================================');
  for (const p of prompts) {
    const r = await MariUniversalCore.processQuery({ prompt: p, organizationId: 'ras-ali-labs', forceLocalOnly: true });
    console.log(`\n👉 PROMPT: "${p}" | INTENT: ${r.detectedIntent}`);
    console.log(r.answer);
    console.log('----------------------------------------------------------------');
  }

  console.log('\n================================================================');
  console.log('  TENANT B: PAMELTEX PROMPT EVALUATION');
  console.log('================================================================');
  for (const p of prompts) {
    const r = await MariUniversalCore.processQuery({ prompt: p, organizationId: 'pameltex', forceLocalOnly: true });
    console.log(`\n👉 PROMPT: "${p}" | INTENT: ${r.detectedIntent}`);
    console.log(r.answer);
    console.log('----------------------------------------------------------------');
  }
}

testAll().catch(console.error);

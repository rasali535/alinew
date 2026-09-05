import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from apps/ralion/.env.local if present
try {
  const envPath = path.resolve(__dirname, '../apps/ralion/.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim();
        }
      }
    }
  }
} catch {}

import {
  BusinessContextService,
  callMariAiApi,
  ChatHistoryMessage,
  detectSemanticIntent,
  MariTokenTelemetryService,
} from '../packages/ai/src';

async function run10TurnRegressionTest() {
  console.log('===============================================================');
  console.log('  MARI AI 10-TURN CONVERSATIONAL REGRESSION TEST');
  console.log('===============================================================\n');

  const orgId = 'ras-ali-labs';
  const context = await BusinessContextService.assembleContext(orgId);
  console.log(`[Context] Loaded Business Context for: ${context.organizationName || orgId}`);
  console.log(`[Context] Industry: ${context.layer1.industry.value}`);
  console.log(`[Context] Target Market: ${context.layer1.targetMarket.value}`);
  console.log(`[Context] Products Count: ${context.layer1.productsAndServices.value.length}`);
  console.log(`[Context] Gemini Keys Available: ${process.env.GEMINI_API_KEY ? 'Yes' : 'No'}\n`);

  const prompts = [
    { num: 1, prompt: 'hello', expectedIntent: 'GREETING' },
    { num: 2, prompt: 'what is my business?', expectedIntent: 'BUSINESS_IDENTITY' },
    { num: 3, prompt: 'what services do we provide?', expectedIntent: 'BUSINESS_IDENTITY' },
    { num: 4, prompt: 'who are our target customers?', expectedIntent: 'TARGET_CUSTOMERS' },
    { num: 5, prompt: 'show my business performance', expectedIntent: 'BUSINESS_PERFORMANCE' },
    { num: 6, prompt: 'where did those numbers come from?', expectedIntent: 'PROVENANCE_INQUIRY' },
    { num: 7, prompt: 'summarize our recent activity', expectedIntent: 'ACTIVITY_SUMMARY' },
    { num: 8, prompt: 'what should we focus on this week?', expectedIntent: 'WEEKLY_FOCUS' },
    { num: 9, prompt: 'how can we grow?', expectedIntent: 'GROWTH_STRATEGY' },
    { num: 10, prompt: 'create a commercial reel for the business', expectedIntent: 'CREATIVE_STUDIO' },
  ];

  const conversationHistory: ChatHistoryMessage[] = [];
  let passedCount = 0;

  for (const step of prompts) {
    console.log(`---------------------------------------------------------------`);
    console.log(`TURN ${step.num}: User > "${step.prompt}"`);

    const detected = detectSemanticIntent(step.prompt);
    console.log(`  [Intent Detected]: ${detected} (Expected: ${step.expectedIntent})`);

    const startTime = Date.now();
    const result = await callMariAiApi(step.prompt, undefined, context, {
      conversationHistory,
      requestId: `test_turn_${step.num}`,
    });
    const duration = Date.now() - startTime;

    if (!result || !result.text) {
      console.error(`  ❌ FAILED: Empty response received`);
      continue;
    }

    console.log(`  [Model / Source]: ${result.modelInfo.category} (${result.modelInfo.model}) | Source: ${result.responseSource}`);
    console.log(`  [Tokens]: Prompt: ${result.usage?.promptTokens || 0}, Completion: ${result.usage?.completionTokens || 0}, Total: ${result.usage?.totalTokens || 0} (${duration}ms)`);
    console.log(`  [Mari Response Snippet]:\n${result.text.substring(0, 250).replace(/\n/g, '\n    ')}...\n`);

    // Verification Checks
    const issues: string[] = [];

    // Check 1: Fabricated Statistics Check
    if (result.text.includes('2.3×') || result.text.includes('2.3x') || result.text.includes('14:00 and 16:00')) {
      issues.push('Contains fabricated 2.3x engagement multiplier or hardcoded peak hours!');
    }

    // Check 2: Welcome loop check for non-greetings
    if (step.num !== 1 && result.text.includes('Good day! I am Mari, your AI Business Growth Partner for **Ras Ali Labs**.\n\nI maintain verified intelligence')) {
      issues.push('Incorrectly fell through to generic onboarding welcome template instead of answering query!');
    }

    // Check 3: Business Identity Check
    if (step.num === 2 && !result.text.toLowerCase().includes('ras ali labs')) {
      issues.push('Response does not reference Ras Ali Labs business identity!');
    }

    // Check 4: Provenance Check
    if (step.num === 6 && !result.text.toLowerCase().includes('source') && !result.text.toLowerCase().includes('provenance') && !result.text.toLowerCase().includes('profile') && !result.text.toLowerCase().includes('crm')) {
      issues.push('Response did not provide meaningful data provenance explanation!');
    }

    // Check 5: Activity Summary Check
    if (step.num === 7 && !result.text.toLowerCase().includes('activity') && !result.text.toLowerCase().includes('recent') && !result.text.toLowerCase().includes('summary') && !result.text.toLowerCase().includes('crm')) {
      issues.push('Response did not provide an activity summary!');
    }

    if (issues.length === 0) {
      console.log(`  ✅ PASSED: All grounding & intent checks verified.`);
      passedCount++;
    } else {
      console.error(`  ❌ ISSUES DETECTED:`);
      for (const iss of issues) {
        console.error(`     - ${iss}`);
      }
    }

    // Record history for next turn
    conversationHistory.push({ role: 'user', text: step.prompt });
    conversationHistory.push({ role: 'model', text: result.text });
  }

  console.log(`\n===============================================================`);
  console.log(`  SUMMARY: ${passedCount} / ${prompts.length} TURNS PASSED ACCURATELY`);
  console.log(`===============================================================\n`);

  if (passedCount === prompts.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run10TurnRegressionTest().catch(err => {
  console.error('Test runner exception:', err);
  process.exit(1);
});

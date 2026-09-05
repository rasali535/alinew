import dotenv from 'dotenv';
dotenv.config({ path: 'apps/ralion/.env.local' });

import { MariUniversalCore } from '../packages/ai/src/mariUniversalCore';
import { BusinessKnowledgeProfileService } from '../packages/ai/src/businessKnowledgeProfile.service';

async function runUniversalIntelligenceSuite() {
  console.log('================================================================');
  console.log('  MARI AI: UNIVERSAL INTELLIGENCE ARCHITECTURE REGRESSION SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;
  const failedList: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}: ${detail || 'Assertion failed'}`);
      failedList.push(testName);
    }
  }

  const forceLocalOnly = process.argv.includes('--local');
  if (forceLocalOnly) {
    console.log('⚡ Running with --local (Local Strategic Core Mode)\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: GENERAL KNOWLEDGE (Zero Business Context Required)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: GENERAL KNOWLEDGE (EBITDA) ---');
  const t1 = await MariUniversalCore.processQuery({
    prompt: 'Explain EBITDA and why it is used in corporate valuation.',
    organizationId: 'unconfigured-tenant',
    forceLocalOnly,
  });
  console.log(`Capability Mode: ${t1.capabilityMode} | Intent: ${t1.detectedIntent}`);
  console.log(`Preview: ${t1.answer.substring(0, 150).replace(/\n/g, ' ')}...`);
  assert(t1.answer.toLowerCase().includes('ebitda') && t1.answer.toLowerCase().includes('interest'), 'T1: Explains EBITDA correctly');
  assert(!t1.answer.includes('Default'), 'T1: Never mentions "Default"');
  assert(!t1.answer.includes('\\*\\*'), 'T1: No escaped markdown backslashes');
  console.log('');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: GENERAL WRITING & DRAFTING (No Business Context Barrier)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 2: GENERAL WRITING (Partnership Email) ---');
  const t2 = await MariUniversalCore.processQuery({
    prompt: 'Write a professional partnership email to a corporate client.',
    organizationId: 'unconfigured-tenant',
    forceLocalOnly,
  });
  console.log(`Capability Mode: ${t2.capabilityMode} | Intent: ${t2.detectedIntent}`);
  console.log(`Preview: ${t2.answer.substring(0, 150).replace(/\n/g, ' ')}...`);
  assert((t2.answer.toLowerCase().includes('subject:') || t2.answer.toLowerCase().includes('subject')) && t2.answer.toLowerCase().includes('partnership'), 'T2: Drafts structured email');
  assert(!t2.answer.includes('Default'), 'T2: Never mentions "Default"');
  console.log('');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: BUSINESS KNOWLEDGE (Ras Ali Labs)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 3: BUSINESS KNOWLEDGE (Ras Ali Labs Identity) ---');
  const t3 = await MariUniversalCore.processQuery({
    prompt: 'What is my business and what products do we sell?',
    organizationId: 'ras-ali-labs',
    companyName: 'Ras Ali Labs',
    forceLocalOnly,
  });
  console.log(`Capability Mode: ${t3.capabilityMode} | Company: ${t3.companyName}`);
  console.log(`Preview: ${t3.answer.substring(0, 150).replace(/\n/g, ' ')}...`);
  assert(t3.answer.includes('Ras Ali Labs'), 'T3: Resolves Ras Ali Labs');
  assert(t3.answer.includes('Ralion OS') || t3.answer.includes('Enterprise') || t3.answer.includes('Sovereign'), 'T3: Details sovereign enterprise products');
  assert(!t3.answer.includes('Default'), 'T3: Never mentions "Default"');
  console.log('');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4: BUSINESS ANALYSIS & TELEMETRY (Live Performance)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 4: BUSINESS PERFORMANCE (Live Verified Telemetry) ---');
  const t4 = await MariUniversalCore.processQuery({
    prompt: 'How is my business performing?',
    organizationId: 'ras-ali-labs',
    companyName: 'Ras Ali Labs',
    forceLocalOnly,
  });
  console.log(`Capability Mode: ${t4.capabilityMode} | Intent: ${t4.detectedIntent}`);
  console.log(`Preview: ${t4.answer.substring(0, 150).replace(/\n/g, ' ')}...`);
  assert(t4.answer.includes('CRM Pipeline') || t4.answer.includes('Performance') || t4.answer.includes('CRM'), 'T4: Evaluates CRM/Pipeline status');
  assert(!t4.answer.includes('Default'), 'T4: Never mentions "Default"');
  console.log('');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5: OPEN-ENDED STRATEGIC REASONING
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 5: OPEN-ENDED STRATEGY AUDIT ---');
  const t5 = await MariUniversalCore.processQuery({
    prompt: 'What assumptions are we making about our market that could be wrong?',
    organizationId: 'ras-ali-labs',
    companyName: 'Ras Ali Labs',
    forceLocalOnly,
  });
  console.log(`Capability Mode: ${t5.capabilityMode} | Intent: ${t5.detectedIntent}`);
  console.log(`Preview: ${t5.answer.substring(0, 150).replace(/\n/g, ' ')}...`);
  assert(t5.answer.length > 200, 'T5: Provides comprehensive strategic analysis');
  assert(!t5.answer.includes('Default'), 'T5: Never mentions "Default"');
  console.log('');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 6: EXACT PRODUCTION FAILURE PROMPT (4-Part Compound Reasoning)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 6: EXACT 4-PART PRODUCTION COMPOUND PROMPT ---');
  const exactPrompt = `Compare our current growth position with where we were last month. What would happen if we focused on enterprise clients instead? Why do you think Facebook isn't growing? Look at everything you know about Ras Ali Labs and tell me what I'm overlooking.`;
  const t6 = await MariUniversalCore.processQuery({
    prompt: exactPrompt,
    organizationId: 'ras-ali-labs',
    companyName: 'Ras Ali Labs',
    forceLocalOnly,
  });
  console.log(`Capability Mode: ${t6.capabilityMode} | Intent: ${t6.detectedIntent}`);
  console.log(`Preview: ${t6.answer.substring(0, 150).replace(/\n/g, ' ')}...`);
  assert(t6.answer.includes('Ras Ali Labs'), 'T6: Correctly addresses Ras Ali Labs');
  assert(t6.answer.includes('Historical Comparison') || t6.answer.includes('Month-over-Month') || t6.answer.includes('baseline') || t6.answer.includes('historical'), 'T6: Addresses Section 1 (Historical Baseline truthfulness)');
  assert(t6.answer.toLowerCase().includes('enterprise'), 'T6: Addresses Section 2 (Enterprise pivot scenario)');
  assert(t6.answer.toLowerCase().includes('facebook') || t6.answer.toLowerCase().includes('channel'), 'T6: Addresses Section 3 (Facebook channel diagnosis)');
  assert(t6.answer.includes('Overlooked') || t6.answer.includes('Blindspot') || t6.answer.includes('Lead Qualification') || t6.answer.toLowerCase().includes('overlooking'), 'T6: Addresses Section 4 (Strategic blindspots)');
  assert(!t6.answer.includes('Default'), 'T6: Never mentions "Default"');
  assert(!t6.answer.includes('\\*\\*'), 'T6: No escaped asterisks');
  assert(!t6.answer.includes('svgSend'), 'T6: No raw svg text leakage');
  console.log('');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 7: RALION ACTION INTELLIGENCE
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 7: ACTION INTELLIGENCE (Campaign Creation) ---');
  const t7 = await MariUniversalCore.processQuery({
    prompt: 'Create a Facebook campaign for Ralion OS.',
    organizationId: 'ras-ali-labs',
    companyName: 'Ras Ali Labs',
    forceLocalOnly,
  });
  console.log(`Capability Mode: ${t7.capabilityMode} | Intent: ${t7.detectedIntent}`);
  console.log(`Actions Generated: ${t7.suggestedActions.map(a => a.label).join(', ')}`);
  assert(t7.suggestedActions.length > 0 || t7.answer.includes('Studio') || t7.answer.includes('Campaign'), 'T7: Suggests structured Ralion actions');
  assert(!t7.answer.includes('Default'), 'T7: Never mentions "Default"');
  console.log('');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 8: MULTI-TURN CONVERSATIONAL CONTEXT PRESERVATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 8: MULTI-TURN CONVERSATIONAL MEMORY ---');
  const t8 = await MariUniversalCore.processQuery({
    prompt: 'Turn that recommendation into a 3-step action plan.',
    organizationId: 'ras-ali-labs',
    companyName: 'Ras Ali Labs',
    conversationHistory: [
      { role: 'user', text: 'How should we accelerate our sales pipeline this quarter?' },
      { role: 'model', text: 'Focus on enterprise executive follow-ups and weekly high-resolution video reels in Growth Studio.' },
    ],
    forceLocalOnly,
  });
  console.log(`Preview: ${t8.answer.substring(0, 150).replace(/\n/g, ' ')}...`);
  assert(t8.answer.includes('1.') || t8.answer.includes('Step') || t8.answer.includes('•') || t8.answer.includes('1'), 'T8: Synthesizes structured action steps from history');
  assert(!t8.answer.includes('Default'), 'T8: Never mentions "Default"');
  console.log('');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 9: UNCONFIGURED TENANT (Graceful Business Degradation)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 9: UNCONFIGURED TENANT HANDLING ---');
  const t9 = await MariUniversalCore.processQuery({
    prompt: 'What is our corporate revenue and pipeline?',
    organizationId: 'unconfigured-tenant-xyz',
    forceLocalOnly,
  });
  console.log(`Preview: ${t9.answer.substring(0, 150).replace(/\n/g, ' ')}...`);
  assert(!t9.answer.includes('Default'), 'T9: Does NOT manufacture "Default" for unconfigured tenant');
  assert(t9.companyName === 'Unconfigured Workspace' || t9.companyName.includes('Unconfigured'), 'T9: Honestly identifies unconfigured status');
  console.log('');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 10: MULTI-TENANT ISOLATION (Tenant A vs Tenant B)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 10: STRICT MULTI-TENANT ISOLATION ---');
  const tenantB = await MariUniversalCore.processQuery({
    prompt: 'What products and services do we offer?',
    organizationId: 'pameltex',
    companyName: 'Pameltex',
    forceLocalOnly,
  });
  console.log(`Tenant B Output: ${tenantB.answer.substring(0, 150).replace(/\n/g, ' ')}...`);
  assert(tenantB.answer.includes('Pameltex'), 'T10: Tenant B resolves Pameltex');
  assert(tenantB.answer.includes('Uniforms') || tenantB.answer.includes('Workwear') || tenantB.answer.includes('Conti Suits'), 'T10: Tenant B returns Pameltex workwear catalog');
  assert(!tenantB.answer.includes('Ras Ali Labs'), 'T10: STRICT ISOLATION: Zero Ras Ali Labs data leaked to Tenant B');
  assert(!tenantB.answer.includes('Ralion OS'), 'T10: STRICT ISOLATION: Zero Ralion OS data leaked to Tenant B');
  console.log('');

  console.log('================================================================');
  console.log(`  REGRESSION SUITE SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  if (failedList.length > 0) {
    console.log(`  FAILED ASSERTIONS:`);
    failedList.forEach(f => console.log(`    - ${f}`));
  }
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 MARI AI UNIVERSAL INTELLIGENCE ARCHITECTURE VERIFIED 100%!');
  } else {
    process.exit(1);
  }
}

runUniversalIntelligenceSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

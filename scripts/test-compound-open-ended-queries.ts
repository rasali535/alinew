import { callMariAiApi } from '../packages/ai/src/mariChat';
import { BusinessContextService } from '../packages/ai/src/businessContext.service';

async function runOpenEndedReasoningTests() {
  console.log('=== MARI AI: OPEN-ENDED & COMPOUND REASONING TEST SUITE ===\n');

  // Register Ras Ali Labs tenant profile
  BusinessContextService.registerTenantProfile('org_rasalilabs', {
    companyName: 'Ras Ali Labs',
    industry: 'Enterprise Software & AI Automation',
    targetMarket: 'Botswana & SADC Medium-to-Large Enterprises',
    valueProposition: 'Autonomous AI Business Growth & Operating System (Ralion OS)',
    productsAndServices: ['Ralion OS', 'AI Growth Studio', 'CRM & Pipeline Automation', 'Enterprise Advisory'],
  });

  const context = await BusinessContextService.assembleContext('org_rasalilabs');
  console.log(`[Context] Loaded verified tenant context for: ${context.layer1.companyName.value}`);
  console.log(`[Context] Active Products: ${context.layer1.productsAndServices.value.join(', ')}`);
  console.log(`[Context] Target Market: ${context.layer1.targetMarket.value}`);
  console.log(`[Context] Connected Facebook Page: ${context.layer2.social.connectedPageName?.value || 'None'}\n`);

  const testCases = [
    {
      name: 'EXACT PRODUCTION FAILURE QUERY (COMPOUND 4-PART)',
      prompt: `Compare our current growth position with where we were last month. What would happen if we focused on enterprise clients instead? Why do you think Facebook isn't growing? Look at everything you know about Ras Ali Labs and tell me what I'm overlooking.`,
      mustContain: [
        'Month-over-Month',
        'Enterprise',
        'Facebook',
        'Overlooked',
      ],
      mustNotContain: [
        'Good day! I am Mari, your AI Business Growth Partner. What would you like to accomplish today?',
        '\\*\\*',
        'svgSend',
      ]
    },
    {
      name: 'STRATEGY WORRIES & BLIND SPOTS',
      prompt: `What worries you most about our current business strategy?`,
      mustContain: ['Strategy', 'Risk'],
      mustNotContain: ['Good day! I am Mari', '\\*\\*']
    },
    {
      name: 'FIRST CHANGE RECOMMENDATION',
      prompt: `If you were running Ras Ali Labs, what would you change first?`,
      mustContain: ['Priority', 'First'],
      mustNotContain: ['Good day! I am Mari', '\\*\\*']
    },
    {
      name: 'GROWTH DIAGNOSIS',
      prompt: `Why aren't we growing faster?`,
      mustContain: ['Growth', 'Analysis'],
      mustNotContain: ['Good day! I am Mari', '\\*\\*']
    },
    {
      name: 'ASSUMPTION AUDIT',
      prompt: `What assumptions are we making that could be wrong?`,
      mustContain: ['Assumption', 'Risk'],
      mustNotContain: ['Good day! I am Mari', '\\*\\*']
    },
    {
      name: 'BUDGET ALLOCATION (P5,000 BOTSWANA)',
      prompt: `We have P5,000 to spend on growth this month. Where would you put it?`,
      mustContain: ['Allocation', 'P5,000'],
      mustNotContain: ['Good day! I am Mari', '\\*\\*']
    },
    {
      name: 'ENTERPRISE OBJECTION AUDIT',
      prompt: `What would make a potential enterprise buyer reject Ralion?`,
      mustContain: ['Enterprise', 'Objection'],
      mustNotContain: ['Good day! I am Mari', '\\*\\*']
    }
  ];

  let passedCount = 0;

  for (const [idx, tc] of testCases.entries()) {
    console.log(`--- Test ${idx + 1}/${testCases.length}: ${tc.name} ---`);
    console.log(`Prompt: "${tc.prompt}"`);

    const start = Date.now();
    const result = await callMariAiApi(tc.prompt, undefined, context);
    const duration = Date.now() - start;

    const responseText = typeof result === 'string' ? result : (result?.text || '');
    console.log(`Duration: ${duration}ms | Intent: ${result?.metadata?.detectedIntent} | Model: ${result?.metadata?.modelSelected}`);
    console.log(`Preview: ${responseText.substring(0, 180).replace(/\n/g, ' ')}...`);

    let isSuccess = true;
    for (const phrase of tc.mustNotContain) {
      if (responseText.includes(phrase)) {
        console.error(`❌ FAILED: Response contains forbidden phrase: "${phrase}"`);
        isSuccess = false;
      }
    }

    if (isSuccess) {
      console.log(`✅ PASSED\n`);
      passedCount++;
    } else {
      console.log(`❌ FAILED\n`);
    }
  }

  console.log(`=== SUMMARY: ${passedCount}/${testCases.length} Tests Passed ===`);
  if (passedCount === testCases.length) {
    console.log('🎉 ALL OPEN-ENDED AND COMPOUND REASONING TESTS PASSED PERFECTLY!');
  } else {
    process.exit(1);
  }
}

runOpenEndedReasoningTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

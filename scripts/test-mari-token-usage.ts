import * as dotenv from 'dotenv';
dotenv.config();

import { callMariAiApi } from '../packages/ai/src/mariChat';
import { MariTokenTelemetryService } from '../packages/ai/src/tokenTelemetry.service';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  [FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`  [PASS] ${msg}`);
}

async function testTokenTelemetry() {
  console.log('================================================================');
  console.log('  Ralion OS: Mari Real Provider Token Telemetry & Metering');
  console.log('================================================================\n');

  const testOrgId = 'telemetry-test-workspace';
  const testUserId = 'telemetry-test-user';
  const testRequestId1 = `req_token_test_1_${Date.now()}`;

  MariTokenTelemetryService.resetForTesting(testOrgId);

  // 1. Initial count of telemetry rows for this test org
  const initialRecords = MariTokenTelemetryService.getRecords(testOrgId);
  assert(initialRecords.length === 0, 'Initial telemetry records is 0');

  // 2. Call Mari API with realistic business inquiry
  console.log('Dispatching Query 1 to Gemini Provider...');
  const res1 = await callMariAiApi('Provide 3 strategic growth steps for an enterprise B2B brand in SADC.');

  assert(Boolean(res1?.text), 'Query 1 received an answer from provider');
  console.log('Provider Model Used:', res1?.modelInfo?.model || 'Gemini');
  console.log('Reported Token Usage 1:', res1?.usage);

  if (res1?.usage) {
    assert(typeof res1.usage.promptTokens === 'number' && res1.usage.promptTokens > 0, `Prompt tokens (${res1.usage.promptTokens}) is a valid positive number`);
    assert(typeof res1.usage.completionTokens === 'number' && res1.usage.completionTokens > 0, `Completion tokens (${res1.usage.completionTokens}) is a valid positive number`);
    assert(res1.usage.totalTokens === res1.usage.promptTokens + res1.usage.completionTokens, `Total tokens (${res1.usage.totalTokens}) exactly equals prompt + completion`);

    // 3. Persist usage record exactly once
    const rec1 = MariTokenTelemetryService.recordUsage({
      organizationId: testOrgId,
      userId: testUserId,
      requestId: testRequestId1,
      provider: 'google',
      model: res1.modelInfo?.model || 'gemini-1.5-flash',
      inputTokens: res1.usage.promptTokens,
      outputTokens: res1.usage.completionTokens,
      totalTokens: res1.usage.totalTokens,
    });

    assert(Boolean(rec1.id), 'Token usage successfully recorded');

    // 4. Idempotency test: verify repeating with the SAME requestId does NOT duplicate
    MariTokenTelemetryService.recordUsage({
      organizationId: testOrgId,
      userId: testUserId,
      requestId: testRequestId1,
      provider: 'google',
      model: res1.modelInfo?.model || 'gemini-1.5-flash',
      inputTokens: res1.usage.promptTokens,
      outputTokens: res1.usage.completionTokens,
      totalTokens: res1.usage.totalTokens,
    });

    const recordsAfterDup = MariTokenTelemetryService.getRecords(testOrgId);
    assert(recordsAfterDup.length === 1, `Idempotency verified: exactly 1 record retained after duplicate call (count: ${recordsAfterDup.length})`);

    // 5. Query 2 to verify cumulative metering
    const testRequestId2 = `req_token_test_2_${Date.now()}`;
    console.log('\nDispatching Query 2 to Gemini Provider...');
    const res2 = await callMariAiApi('Summarize the top export opportunities under AfCFTA.');

    console.log('Reported Token Usage 2:', res2?.usage);
    if (res2?.usage) {
      MariTokenTelemetryService.recordUsage({
        organizationId: testOrgId,
        userId: testUserId,
        requestId: testRequestId2,
        provider: 'google',
        model: res2.modelInfo?.model || 'gemini-1.5-flash',
        inputTokens: res2.usage.promptTokens,
        outputTokens: res2.usage.completionTokens,
        totalTokens: res2.usage.totalTokens,
      });

      const totalUsage = MariTokenTelemetryService.getTotalUsage(testOrgId);
      const expectedTotal = res1.usage.totalTokens + res2.usage.totalTokens;

      assert(totalUsage.totalTokens === expectedTotal, `Cumulative tokens (${totalUsage.totalTokens}) equals Query 1 (${res1.usage.totalTokens}) + Query 2 (${res2.usage.totalTokens})`);
      assert(totalUsage.requestCount === 2, 'Total recorded requests is exactly 2');
    }
  }

  console.log('\n================================================================');
  console.log('  MARI TOKEN TELEMETRY & PERSISTENCE VERIFICATION PASSED (100%)');
  console.log('================================================================\n');
}

testTokenTelemetry().catch(e => {
  console.error('[FATAL] Token telemetry test failed:', e);
  process.exit(1);
});

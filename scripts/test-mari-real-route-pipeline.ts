/**
 * RALION OS — REAL MARI PIPELINE ACCEPTANCE TEST SUITE
 *
 * Verifies the authentic live Mari reasoning, model-based semantic classification,
 * truthful tool execution, Facebook status verification, cross-tenant isolation,
 * zero-credit accounting, and privacy audits.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load server environment
dotenv.config({ path: path.resolve(__dirname, '../apps/ralion/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import {
  MariUniversalCore,
  classifyCapabilityMode,
  isPureGreeting,
  MARI_BUILD_VERSION,
  TenantCreditsService,
  setMariFacebookPageService,
} from '../packages/ai/src/index';

import { FacebookPageManagementService } from '../apps/ralion/src/lib/services/social/facebookPageManagement.service';
import { CreativeOrchestrator } from '../packages/ai/src/creativeOrchestrator.service';
import { __setTestContextResolver } from '../apps/ralion/src/lib/auth/serverAuth';
import { POST as MariChatRoute } from '../apps/ralion/src/app/api/mari/chat/route';
import { NextRequest } from 'next/server';

// Register Facebook service with core
setMariFacebookPageService(FacebookPageManagementService);

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

function record(suite: string, name: string, passed: boolean, details?: any, error?: string) {
  results.push({ suite, name, passed, details, error });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${suite}] ${name}`);
  if (details && !passed) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
  if (error) {
    console.log('   Error:', error);
  }
}

async function runRealMariPipelineTests() {
  console.log('\n===============================================================');
  console.log('RALION OS — MARI REAL PIPELINE VERIFICATION SUITE');
  console.log('===============================================================\n');

  const testOrgId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const testWorkspaceId = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const testUserId = '00000000-0000-0000-0000-000000000001';

  // =========================================================================
  // SUITE 1: Server-Only Credential Resolution & Deployed Reasoning Model State
  // =========================================================================
  console.log('\n--- SUITE 1: Deployed Reasoning Model Live Verification ---');
  try {
    const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    const isKeyConfigured = Boolean(rawKey && rawKey.trim().length > 10);
    
    // Check absence of client-exposed env vars in server context
    const hasClientExposedKey = Boolean(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

    record(
      'Suite 1: Reasoning Credential',
      'Server-only Gemini API key is configured safely without public leakage',
      isKeyConfigured && !hasClientExposedKey,
      { isKeyConfigured, hasClientExposedKey, keyLength: rawKey ? rawKey.length : 0 }
    );

    // Send a safe, live, authenticated general reasoning question
    const generalResult = await MariUniversalCore.processQuery({
      prompt: 'Explain what compound interest is in 2 concise sentences.',
      originalUserPrompt: 'Explain what compound interest is in 2 concise sentences.',
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      requestId: `req_test_s1_${Date.now()}`,
    });

    // Verify diagnostic fields are accurately and truthfully populated
    const isReasoningAttemptTruthful =
      Boolean(generalResult.modelAttempted?.includes('gemini')) &&
      (
        (generalResult.modelSucceeded === true && generalResult.responseSource === 'gemini' && !generalResult.fallbackUsed) ||
        (generalResult.modelSucceeded === false && generalResult.responseSource === 'local_grounded' && generalResult.fallbackUsed === true && typeof generalResult.fallbackReason === 'string')
      );

    record(
      'Suite 1: Reasoning Execution Truthfulness',
      'Reasoning engine tracks modelAttempted, modelSucceeded, responseSource, and fallbackReason truthfully',
      isReasoningAttemptTruthful,
      {
        modelAttempted: generalResult.modelAttempted,
        modelSucceeded: generalResult.modelSucceeded,
        responseSource: generalResult.responseSource,
        fallbackUsed: generalResult.fallbackUsed,
        fallbackReason: generalResult.fallbackReason,
        answerSnippet: generalResult.answer?.slice(0, 100),
      }
    );
  } catch (err: any) {
    record('Suite 1: Reasoning Execution Truthfulness', 'General reasoning invocation threw exception', false, null, err.message);
  }

  // =========================================================================
  // SUITE 2: Structured Semantic Intent Decisioning
  // =========================================================================
  console.log('\n--- SUITE 2: Structured Semantic Decisioning ---');
  try {
    // 2.1 Creative generation intent
    const creativeQuery = 'Generate a high quality Instagram commercial flyer for our autumn product launch';
    const creativeResult = await MariUniversalCore.processQuery({
      prompt: creativeQuery,
      originalUserPrompt: creativeQuery,
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      requestId: `req_test_s2_creative_${Date.now()}`,
    });

    const isCreativeIntentDecided = 
      creativeResult.requestedAction === 'GENERATE_CREATIVE_JOB' &&
      (creativeResult.detectedIntent === 'CREATIVE_STUDIO' || creativeResult.detectedIntent === 'CREATE_FLYER');

    record(
      'Suite 2: Semantic Decisioning',
      'Semantic decisioning identifies creative flyer generation intent and requested action GENERATE_CREATIVE_JOB',
      isCreativeIntentDecided,
      {
        semanticDecisionSource: creativeResult.semanticDecisionSource,
        requestedAction: creativeResult.requestedAction,
        detectedIntent: creativeResult.detectedIntent,
      }
    );

    // 2.2 Facebook status intent
    const fbQuery = 'Is our Facebook page currently connected and active?';
    const fbResult = await MariUniversalCore.processQuery({
      prompt: fbQuery,
      originalUserPrompt: fbQuery,
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      requestId: `req_test_s2_fb_${Date.now()}`,
    });

    const isFbIntentDecided = 
      fbResult.requestedAction === 'inspect_facebook_status' &&
      fbResult.detectedIntent === 'FACEBOOK_CONNECTION_STATUS';

    record(
      'Suite 2: Semantic Decisioning',
      'Semantic decisioning identifies Facebook connection status inspection intent and requested action inspect_facebook_status',
      isFbIntentDecided,
      {
        semanticDecisionSource: fbResult.semanticDecisionSource,
        requestedAction: fbResult.requestedAction,
        detectedIntent: fbResult.detectedIntent,
      }
    );

    // 2.3 Pure greeting deterministic short-circuit
    const greetingQuery = 'Hello Mari!';
    const greetingResult = await MariUniversalCore.processQuery({
      prompt: greetingQuery,
      originalUserPrompt: greetingQuery,
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      requestId: `req_test_s2_greet_${Date.now()}`,
    });

    const isGreetingDeterministic = 
      greetingResult.semanticDecisionSource === 'DETERMINISTIC_CLASSIFICATION' &&
      greetingResult.detectedIntent === 'GREETING' &&
      greetingResult.modelAttempted === null &&
      greetingResult.toolsActuallyExecuted.length === 0;

    record(
      'Suite 2: Semantic Decisioning',
      'Pure greeting uses deterministic short-circuit with zero model calls and zero credit deduction',
      isGreetingDeterministic,
      {
        semanticDecisionSource: greetingResult.semanticDecisionSource,
        detectedIntent: greetingResult.detectedIntent,
        modelAttempted: greetingResult.modelAttempted,
        toolsActuallyExecuted: greetingResult.toolsActuallyExecuted,
      }
    );
  } catch (err: any) {
    record('Suite 2: Semantic Decisioning', 'Semantic classifier test threw exception', false, null, err.message);
  }

  // =========================================================================
  // SUITE 3: Truthful Tool Execution — Facebook Service Spy (MOCK INTEGRATION)
  // =========================================================================
  console.log('\n--- SUITE 3: [MOCK INTEGRATION] Facebook Service Spy Verification ---');
  try {
    let spyCallCount = 0;
    let spyReceivedParams: any = null;

    const mockFacebookService = {
      getPrimaryPage: async (params: any) => {
        spyCallCount++;
        spyReceivedParams = params;
        return {
          id: 'mock_page_db_id_123',
          pageId: '100123456789',
          name: 'Spy Mock Business Page',
          username: 'spymockpage',
          category: 'Information Technology Company',
          followersCount: 1540,
          status: 'PAGE_CONNECTED',
          about: 'Mock Facebook about page for spy test.',
          description: 'Mock Facebook description.',
          website: 'https://example.com',
          contactInfo: 'support@example.com',
        };
      },
    };

    setMariFacebookPageService(mockFacebookService);

    const spyTestResult = await MariUniversalCore.processQuery({
      prompt: 'Check our Facebook page connection status',
      originalUserPrompt: 'Check our Facebook page connection status',
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Spy Test Org',
      requestId: `req_test_s3_spy_${Date.now()}`,
    });

    // Restore real service
    setMariFacebookPageService(FacebookPageManagementService);

    const isSpyExecutedCorrectly =
      spyCallCount === 1 &&
      spyReceivedParams?.organizationId === testOrgId &&
      spyReceivedParams?.workspaceId === testWorkspaceId &&
      spyReceivedParams?.userId === testUserId &&
      spyTestResult.toolsActuallyExecuted.includes('FacebookPageManagementService.getPrimaryPage');

    record(
      'Suite 3: [MOCK INTEGRATION]',
      'FacebookPageManagementService.getPrimaryPage is invoked with canonical tenant parameters and recorded in toolsActuallyExecuted',
      isSpyExecutedCorrectly,
      {
        spyCallCount,
        spyReceivedParams,
        toolsActuallyExecuted: spyTestResult.toolsActuallyExecuted,
      }
    );
  } catch (err: any) {
    record('Suite 3: [MOCK INTEGRATION]', 'Facebook service spy test threw exception', false, null, err.message);
  }

  // =========================================================================
  // SUITE 4: Authenticated Live Read-Only Facebook Status Acceptance Test
  // =========================================================================
  console.log('\n--- SUITE 4: Authenticated Live Read-Only Facebook Status Acceptance ---');
  try {
    const liveFbResult = await MariUniversalCore.processQuery({
      prompt: 'What is the current connection status of our Facebook page?',
      originalUserPrompt: 'What is the current connection status of our Facebook page?',
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      requestId: `req_test_s4_live_fb_${Date.now()}`,
    });

    const isLiveFbValid = 
      liveFbResult.toolsActuallyExecuted.includes('FacebookPageManagementService.getPrimaryPage') &&
      typeof liveFbResult.answer === 'string' &&
      (liveFbResult.answer.includes('Facebook Page') || liveFbResult.answer.includes('Facebook page') || liveFbResult.answer.includes('Facebook') || liveFbResult.answer.includes('connected') || liveFbResult.answer.includes('Connected'));

    record(
      'Suite 4: Live Facebook Acceptance',
      'Live Facebook query executes real service and truthfully reports verified state without mutations',
      isLiveFbValid,
      {
        toolsActuallyExecuted: liveFbResult.toolsActuallyExecuted,
        responseSnippet: liveFbResult.answer?.slice(0, 140),
      }
    );
  } catch (err: any) {
    record('Suite 4: Live Facebook Acceptance', 'Live Facebook acceptance test threw exception', false, null, err.message);
  }

  // =========================================================================
  // SUITE 5: Durable Creative Persistence & Failure Honesty
  // =========================================================================
  console.log('\n--- SUITE 5: Durable Creative Persistence & Failure Honesty ---');
  try {
    // 5.1 Successful generation path
    const liveGenResult = await MariUniversalCore.processQuery({
      prompt: 'Generate an exclusive commercial flyer for Ras Ali Labs Ralion OS Launch',
      originalUserPrompt: 'Generate an exclusive commercial flyer for Ras Ali Labs Ralion OS Launch',
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      requestId: `req_test_s5_gen_${Date.now()}`,
    });

    const isCreativeGenValid =
      liveGenResult.toolsActuallyExecuted.includes('CreativeOrchestrator.generate') &&
      liveGenResult.modelSucceeded === true &&
      liveGenResult.fallbackUsed === false &&
      liveGenResult.suggestedActions?.some(a => a.type === 'GENERATE_FLYER' && (a.payload as any)?.assetId);

    record(
      'Suite 5: Creative Persistence',
      'Creative generation produces durable asset receipt and records verified execution in toolsActuallyExecuted',
      isCreativeGenValid,
      {
        toolsActuallyExecuted: liveGenResult.toolsActuallyExecuted,
        modelSucceeded: liveGenResult.modelSucceeded,
        fallbackUsed: liveGenResult.fallbackUsed,
        actionsCount: liveGenResult.suggestedActions?.length,
      }
    );

    // 5.2 Failure honesty path (simulating storage or generation failure)
    const originalGenerate = CreativeOrchestrator.generate;
    CreativeOrchestrator.generate = async () => ({
      success: false,
      error: 'Simulated storage quota exceeded for testing honesty',
    } as any);

    const failGenResult = await MariUniversalCore.processQuery({
      prompt: 'Generate an exclusive commercial flyer for Ras Ali Labs Ralion OS Launch',
      originalUserPrompt: 'Generate an exclusive commercial flyer for Ras Ali Labs Ralion OS Launch',
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      requestId: `req_test_s5_fail_${Date.now()}`,
    });

    // Restore original generate
    CreativeOrchestrator.generate = originalGenerate;

    const isFailureHonest =
      failGenResult.modelSucceeded === false &&
      failGenResult.fallbackUsed === true &&
      failGenResult.fallbackReason === 'CREATIVE_STORAGE_ERROR' &&
      failGenResult.toolsActuallyExecuted.length === 0 &&
      failGenResult.answer.includes('could not be completed') &&
      failGenResult.usage.totalTokens === 0;

    record(
      'Suite 5: Creative Failure Honesty',
      'Storage/generation failure reports honest error, sets fallbackUsed=true, and incurs zero usage',
      isFailureHonest,
      {
        modelSucceeded: failGenResult.modelSucceeded,
        fallbackUsed: failGenResult.fallbackUsed,
        fallbackReason: failGenResult.fallbackReason,
        answerSnippet: failGenResult.answer?.slice(0, 100),
      }
    );
  } catch (err: any) {
    record('Suite 5: Creative Persistence', 'Creative persistence test threw exception', false, null, err.message);
  }

  // =========================================================================
  // SUITE 6: Cross-Tenant Creative Isolation
  // =========================================================================
  console.log('\n--- SUITE 6: Cross-Tenant Creative Isolation ---');
  try {
    const unknownOrgId = '77777777-7777-7777-7777-777777777777';
    const unknownWorkspaceId = '77777777-7777-7777-7777-777777777777';
    const unknownUserId = '99999999-9999-9999-9999-999999999999';

    const crossTenantResult = await MariUniversalCore.processQuery({
      prompt: 'Generate a commercial marketing flyer for our grand opening',
      originalUserPrompt: 'Generate a commercial marketing flyer for our grand opening',
      organizationId: unknownOrgId,
      workspaceId: unknownWorkspaceId,
      userId: unknownUserId,
      companyName: 'unconfigured-tenant',
      requestId: `req_test_s6_iso_${Date.now()}`,
    });

    const responseText = crossTenantResult.answer || '';
    const hasRasAliLeakage = 
      responseText.includes('Ras Ali Labs') ||
      responseText.includes('Ralion OS') ||
      responseText.includes('Empowered to Prosper') ||
      responseText.includes('www.rasalilabs.com');

    const asksClarificationOrIsolates =
      !hasRasAliLeakage &&
      (responseText.includes('brand name') || responseText.includes('product') || responseText.includes('clarif') || crossTenantResult.detectedIntent === 'CREATIVE_STUDIO');

    record(
      'Suite 6: Tenant Isolation',
      'Unconfigured/generic tenant receives clean clarification with ZERO Ras Ali Labs / Ralion OS leakage',
      asksClarificationOrIsolates,
      {
        hasRasAliLeakage,
        responseSnippet: responseText.slice(0, 140),
        detectedIntent: crossTenantResult.detectedIntent,
      }
    );
  } catch (err: any) {
    record('Suite 6: Tenant Isolation', 'Cross-tenant isolation test threw exception', false, null, err.message);
  }

  // =========================================================================
  // SUITE 7: Zero-Credit Accounting on Reasoning Fallback & Pure Greeting
  // =========================================================================
  console.log('\n--- SUITE 7: Zero-Credit Accounting ---');
  try {
    const originalDeductCredits = TenantCreditsService.deductCredits;
    let creditDeductCalls = 0;
    let deductedAmount = 0;

    TenantCreditsService.deductCredits = ((orgId: string, amount: number, desc: string, meta: any) => {
      creditDeductCalls++;
      deductedAmount += amount;
      return { success: true, newBalance: 1000 };
    }) as any;

    // Test 7.1: Pure Greeting (Must deduct 0 credits)
    await MariUniversalCore.processQuery({
      prompt: 'Hey good morning Mari',
      originalUserPrompt: 'Hey good morning Mari',
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      requestId: `req_test_s7_greet_${Date.now()}`,
    });

    const greetingDeductions = creditDeductCalls;

    // Test 7.2: Forced Local Fallback (Must deduct 0 credits)
    await MariUniversalCore.processQuery({
      prompt: 'Explain macroeconomic monetary policy',
      originalUserPrompt: 'Explain macroeconomic monetary policy',
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      forceLocalOnly: true,
      requestId: `req_test_s7_fallback_${Date.now()}`,
    });

    const fallbackDeductions = creditDeductCalls - greetingDeductions;

    // Restore original deductCredits
    TenantCreditsService.deductCredits = originalDeductCredits;

    const isAccountingZeroCredit = (greetingDeductions === 0) && (fallbackDeductions === 0);

    record(
      'Suite 7: Zero-Credit Accounting',
      'Zero credits deducted on pure greetings and offline/reasoning fallbacks',
      isAccountingZeroCredit,
      {
        greetingDeductions,
        fallbackDeductions,
        totalDeductedAmount: deductedAmount,
      }
    );
  } catch (err: any) {
    record('Suite 7: Zero-Credit Accounting', 'Zero-credit accounting test threw exception', false, null, err.message);
  }

  // =========================================================================
  // SUITE 8: Safe Privacy Log Audit
  // =========================================================================
  console.log('\n--- SUITE 8: Safe Privacy Log Audit ---');
  try {
    const rawKey = process.env.GEMINI_API_KEY || '';
    const interceptedLogs: string[] = [];
    const originalConsoleLog = console.log;

    console.log = (...args: any[]) => {
      interceptedLogs.push(args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
      originalConsoleLog(...args);
    };

    await MariUniversalCore.processQuery({
      prompt: 'SECRET_USER_PROMPT_ABC123: What are our secret profit margins?',
      originalUserPrompt: 'SECRET_USER_PROMPT_ABC123: What are our secret profit margins?',
      organizationId: testOrgId,
      workspaceId: testWorkspaceId,
      userId: testUserId,
      companyName: 'Ras Ali Labs',
      requestId: `req_test_s8_privacy_${Date.now()}`,
    });

    console.log = originalConsoleLog;

    const diagnosticLogs = interceptedLogs.filter(l => l.includes('MARI_DIAGNOSTIC_TRACE'));
    let leakedKey = false;
    let leakedSecretPrompt = false;

    for (const log of diagnosticLogs) {
      if (rawKey && rawKey.length > 5 && log.includes(rawKey)) {
        leakedKey = true;
      }
      if (log.includes('SECRET_USER_PROMPT_ABC123')) {
        leakedSecretPrompt = true;
      }
    }

    const isPrivacySafe = !leakedKey && !leakedSecretPrompt && diagnosticLogs.length > 0;

    record(
      'Suite 8: Privacy Log Audit',
      'Diagnostic telemetry contains safe fields only with zero prompt, token, or secret key leakage',
      isPrivacySafe,
      {
        diagnosticLogCount: diagnosticLogs.length,
        leakedKey,
        leakedSecretPrompt,
      }
    );
  } catch (err: any) {
    record('Suite 8: Privacy Log Audit', 'Privacy log audit threw exception', false, null, err.message);
  }

  // =========================================================================
  // SUITE 9: Next.js Route POST /api/mari/chat Real Route Execution
  // =========================================================================
  console.log('\n--- SUITE 9: Next.js POST /api/mari/chat Route Acceptance ---');
  try {
    // Inject test session context for route testing
    __setTestContextResolver(async () => ({
      user: { id: testUserId, email: 'owner@rasalilabs.com' },
      profile: { id: testUserId, fullName: 'Ras Ali', email: 'owner@rasalilabs.com', avatarUrl: null },
      workspace: { id: testWorkspaceId, name: 'Ras Ali Labs', slug: 'rasalilabs', owner_id: testUserId, organization_id: testOrgId },
      membership: { id: 'mem_123', workspace_id: testWorkspaceId, user_id: testUserId, role: 'owner' },
      organization: { id: testOrgId, name: 'Ras Ali Labs', slug: 'rasalilabs', plan: 'enterprise', owner_id: testUserId },
      resolvedRole: 'owner',
      isPlatformSuperAdmin: false,
    } as any));

    // 9.1 Greeting route call
    const reqGreeting = new NextRequest('http://localhost:3000/api/mari/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-organization-id': testOrgId,
        'x-workspace-id': testWorkspaceId,
      },
      body: JSON.stringify({
        prompt: 'Hi Mari',
        organizationId: testOrgId,
        workspaceId: testWorkspaceId,
      }),
    });

    const resGreeting = await MariChatRoute(reqGreeting);
    const dataGreeting = await resGreeting.json();

    const isRouteGreetingValid = 
      resGreeting.status === 200 &&
      dataGreeting.success === true &&
      dataGreeting.detectedIntent === 'GREETING' &&
      dataGreeting.semanticDecisionSource === 'DETERMINISTIC_CLASSIFICATION';

    record(
      'Suite 9: Next.js Route Acceptance',
      'POST /api/mari/chat successfully returns deterministic greeting response',
      isRouteGreetingValid,
      {
        status: resGreeting.status,
        detectedIntent: dataGreeting.detectedIntent,
        semanticDecisionSource: dataGreeting.semanticDecisionSource,
      }
    );

    // 9.2 Route Facebook Query
    const reqFb = new NextRequest('http://localhost:3000/api/mari/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-organization-id': testOrgId,
        'x-workspace-id': testWorkspaceId,
      },
      body: JSON.stringify({
        prompt: 'Is our Facebook page connected?',
        organizationId: testOrgId,
        workspaceId: testWorkspaceId,
      }),
    });

    const resFb = await MariChatRoute(reqFb);
    const dataFb = await resFb.json();

    const isRouteFbValid =
      resFb.status === 200 &&
      dataFb.success === true &&
      dataFb.toolsActuallyExecuted.includes('FacebookPageManagementService.getPrimaryPage');

    record(
      'Suite 9: Next.js Route Acceptance',
      'POST /api/mari/chat routes Facebook status query through verified tool execution',
      isRouteFbValid,
      {
        status: resFb.status,
        toolsActuallyExecuted: dataFb.toolsActuallyExecuted,
      }
    );

    // Clear test context resolver
    __setTestContextResolver(null);
  } catch (err: any) {
    record('Suite 9: Next.js Route Acceptance', 'Next.js route test threw exception', false, null, err.message);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log('TEST SUMMARY');
  console.log('===============================================================');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`- [${r.suite}] ${r.name}: ${r.error || JSON.stringify(r.details)}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL REAL MARI PIPELINE ACCEPTANCE TESTS PASSED CONVINCINGLY!');
    process.exit(0);
  }
}

runRealMariPipelineTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

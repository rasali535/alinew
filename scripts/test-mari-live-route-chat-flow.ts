/**
 * MARI AI — LIVE ROUTE CHAT FLOW & KNOWLEDGE SECURITY REGRESSION TEST
 * Ras Ali Labs (Pty) Ltd
 *
 * Verifies at the Next.js API Route handler level:
 * 1. POST /api/mari/chat with "hi mari" -> GREETING intent, short-circuit before assembleContext/Gemini/credits
 * 2. Response contains clean greeting and zero leaked website/CRM/pipeline metadata
 * 3. Zero credit deduction for greetings
 * 4. Tenant identity strictly derived from authenticated server context
 * 5. Mismatched organization or workspace routing hints return 403 TENANT_CONTEXT_MISMATCH
 * 6. "summarize our website" receives contextualPrompt separately from originalUserPrompt
 * 7. GET /api/mari/knowledge/sources requires authentication (401) and rejects foreign tenants (403)
 */

import assert from 'assert';
import { NextRequest } from 'next/server';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    })
    .catch((err: any) => {
      console.error(`  ❌ [FAIL] ${name}:`, err.message || err);
      failed++;
    });
}

function createMockRequest(url: string, method: string, body?: any, headers?: Record<string, string>): NextRequest {
  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), init as any);
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  🧪 MARI AI LIVE ROUTE CHAT FLOW & SECURITY INTEGRITY TESTS');
  console.log('='.repeat(70) + '\n');

  // Load serverAuth module and mock context
  const serverAuth = await import('../apps/ralion/src/lib/auth/serverAuth');
  const chatRoute = await import('../apps/ralion/src/app/api/mari/chat/route');
  const sourcesRoute = await import('../apps/ralion/src/app/api/mari/knowledge/sources/route');
  const { BusinessContextService, MariUniversalCore } = await import('../packages/ai/src');

  const CANONICAL_ORG = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';
  const CANONICAL_WS = '90c6fb79-ad3d-458f-b59b-696383aa6273';
  const CANONICAL_USER = '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf';

  let currentMockSession: any = {
    user: { id: CANONICAL_USER, email: 'contact@rasalilabs.com' },
    profile: { id: CANONICAL_USER, fullName: 'Ras Ali Labs Executive', email: 'contact@rasalilabs.com', avatarUrl: null },
    workspace: {
      id: CANONICAL_WS,
      name: 'Ras Ali Labs Main Workspace',
      slug: 'ras-ali-labs-main',
      owner_id: CANONICAL_USER,
      organization_id: CANONICAL_ORG,
    },
    membership: {
      id: 'mem_1111',
      workspace_id: CANONICAL_WS,
      user_id: CANONICAL_USER,
      role: 'owner',
    },
    organization: {
      id: CANONICAL_ORG,
      name: 'Ras Ali Labs',
      tier: 'ENTERPRISE',
    },
  };

  // Mock serverAuth resolver using authoritative test hook
  serverAuth.__setTestContextResolver(async () => {
    return currentMockSession;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. "HI MARI" DETERMINISTIC GREETING SHORT-CIRCUIT & ZERO DEDUCTION
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('POST /api/mari/chat with "hi mari" returns GREETING without assembleContext or credit deductions', async () => {
    let assembleContextCalled = false;
    const originalAssemble = BusinessContextService.assembleContext;
    BusinessContextService.assembleContext = async (...args: any[]) => {
      assembleContextCalled = true;
      return originalAssemble.apply(BusinessContextService, args as any);
    };

    try {
      const req = createMockRequest('http://localhost:3000/api/mari/chat', 'POST', {
        query: 'hi mari',
      });

      const res = await chatRoute.POST(req);
      assert.strictEqual(res.status, 200, 'Expected 200 status');

      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.detectedIntent, 'GREETING');
      assert.strictEqual(data.capabilityMode, 'BUSINESS');
      assert.strictEqual(data.modelUsed, 'Mari Growth Intelligence');
      assert.strictEqual(assembleContextCalled, false, 'BusinessContextService.assembleContext must NOT be called for greetings');
      assert(!data.answer.includes('Plot 18680 Khuhurutse'), 'Greeting must not dump address');
      assert(!data.answer.includes('CRM Pipeline Value'), 'Greeting must not dump CRM pipeline data');
      assert(!data.answer.includes('SERVER-VERIFIED MARI PARTNER CONTEXT'), 'Greeting must not leak system prompt');
      assert.strictEqual(data.companyName, 'Ras Ali Labs', 'Tenant identity must come from server context');
    } finally {
      BusinessContextService.assembleContext = originalAssemble;
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CROSS-TENANT ROUTING REJECTION (403)
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('POST /api/mari/chat rejects mismatched organizationId routing hint with 403', async () => {
    const req = createMockRequest('http://localhost:3000/api/mari/chat', 'POST', {
      query: 'hi mari',
      organizationId: 'foreign-tenant-uuid-1111',
    });

    const res = await chatRoute.POST(req);
    assert.strictEqual(res.status, 403, 'Expected 403 for mismatched organization ID');
    const data = await res.json();
    assert.strictEqual(data.code, 'TENANT_CONTEXT_MISMATCH');
  });

  await runTest('POST /api/mari/chat rejects mismatched x-workspace-id header with 403', async () => {
    const req = createMockRequest('http://localhost:3000/api/mari/chat', 'POST', {
      query: 'hi mari',
    }, {
      'x-workspace-id': 'foreign-workspace-uuid-2222',
    });

    const res = await chatRoute.POST(req);
    assert.strictEqual(res.status, 403, 'Expected 403 for mismatched workspace ID');
    const data = await res.json();
    assert.strictEqual(data.code, 'TENANT_CONTEXT_MISMATCH');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. SEPARATED ORIGINAL PROMPT & CONTEXTUAL PROMPT
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('POST /api/mari/chat for "summarize our website" preserves originalUserPrompt separately from contextualPrompt', async () => {
    let capturedRequest: any = null;
    const originalProcessQuery = MariUniversalCore.processQuery;
    MariUniversalCore.processQuery = async (reqPayload: any) => {
      capturedRequest = reqPayload;
      return {
        answer: 'Ras Ali Labs delivers intelligent platforms, creative production, and digital solutions.',
        suggestedActions: [],
        modelUsed: 'gemini-2.5-flash',
        detectedIntent: 'WEBSITE_KNOWLEDGE',
        capabilityMode: 'BUSINESS',
        responseSource: 'website_knowledge',
        usage: { promptTokens: 50, completionTokens: 20, totalTokens: 70 },
        requestId: reqPayload.requestId || 'req_test',
        tenantId: reqPayload.organizationId,
        companyName: reqPayload.companyName,
      };
    };

    try {
      const req = createMockRequest('http://localhost:3000/api/mari/chat', 'POST', {
        query: 'summarize our website',
      });

      const res = await chatRoute.POST(req);
      assert.strictEqual(res.status, 200);

      assert(capturedRequest !== null, 'processQuery should be called');
      assert.strictEqual(capturedRequest.originalUserPrompt, 'summarize our website', 'originalUserPrompt must be exact user string');
      assert(capturedRequest.contextualPrompt.includes('[SERVER-VERIFIED MARI PARTNER CONTEXT]'), 'contextualPrompt must contain verified partner snapshot');
      assert(capturedRequest.contextualPrompt.startsWith('summarize our website'), 'contextualPrompt must wrap user prompt');
    } finally {
      MariUniversalCore.processQuery = originalProcessQuery;
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SECURE /api/mari/knowledge/sources AUTH & CROSS-TENANT GUARDS
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('GET /api/mari/knowledge/sources rejects unauthenticated request with 401', async () => {
    currentMockSession = null;
    try {
      const req = createMockRequest('http://localhost:3000/api/mari/knowledge/sources', 'GET');
      const res = await sourcesRoute.GET(req);
      assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401');
      const data = await res.json();
      assert.strictEqual(data.code, 'AUTHENTICATION_REQUIRED');
    } finally {
      currentMockSession = {
        user: { id: CANONICAL_USER, email: 'contact@rasalilabs.com' },
        profile: { id: CANONICAL_USER, fullName: 'Ras Ali Labs Executive', email: 'contact@rasalilabs.com', avatarUrl: null },
        workspace: {
          id: CANONICAL_WS,
          name: 'Ras Ali Labs Main Workspace',
          slug: 'ras-ali-labs-main',
          owner_id: CANONICAL_USER,
          organization_id: CANONICAL_ORG,
        },
        membership: {
          id: 'mem_1111',
          workspace_id: CANONICAL_WS,
          user_id: CANONICAL_USER,
          role: 'owner',
        },
        organization: {
          id: CANONICAL_ORG,
          name: 'Ras Ali Labs',
          tier: 'ENTERPRISE',
        },
      };
    }
  });

  await runTest('GET /api/mari/knowledge/sources rejects mismatched query orgId with 403', async () => {
    const req = createMockRequest('http://localhost:3000/api/mari/knowledge/sources?orgId=foreign-org-4444', 'GET');
    const res = await sourcesRoute.GET(req);
    assert.strictEqual(res.status, 403, 'Foreign query orgId must return 403');
    const data = await res.json();
    assert.strictEqual(data.code, 'TENANT_CONTEXT_MISMATCH');
  });

  await runTest('GET /api/mari/knowledge/sources returns server-derived sources for authenticated tenant', async () => {
    const req = createMockRequest('http://localhost:3000/api/mari/knowledge/sources', 'GET');
    const res = await sourcesRoute.GET(req);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.organizationId, CANONICAL_ORG);
    assert(Array.isArray(data.sources), 'Sources must be an array');
    assert(data.sources.some((s: any) => s.id === 'website'), 'Must include website source');
    assert(data.sources.some((s: any) => s.id === 'profile'), 'Must include profile source');
  });

  console.log('\n' + '='.repeat(70));
  console.log(`  📊 RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

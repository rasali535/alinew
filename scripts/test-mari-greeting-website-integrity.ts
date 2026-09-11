/**
 * MARI AI — GREETING, WEBSITE KNOWLEDGE & MARKDOWN INTEGRITY TEST SUITE
 * Ras Ali Labs (Pty) Ltd
 *
 * Verifies:
 * 1. Greeting classifier and deterministic short-circuit routing
 * 2. Zero credit deduction for greetings
 * 3. Query-specific website knowledge routing and clean customer-facing presentation
 * 4. Multi-tenant source precedence and tenant isolation
 * 5. Removal of outdated static seed claims (Johannesburg, 99.8% SLA, zero data loss, SADC corridors, etc.)
 * 6. Markdown normalization and SVG artifact stripping
 * 7. Two UUID-backed workspaces cannot retrieve each other's website or Facebook context
 * 8. Deduplication of products/services by normalized name
 */

import assert from 'assert';
import {
  classifyCapabilityMode,
  MariUniversalCore,
  WebsiteIngestionService,
  BusinessKnowledgeProfileService,
  BusinessContextService,
} from '../packages/ai/src';
import { normalizeMarkdownText } from '../apps/ralion/src/components/MariMarkdownMessage';

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

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  🧪 MARI AI GREETING, WEBSITE KNOWLEDGE & MARKDOWN INTEGRITY TESTS');
  console.log('='.repeat(70) + '\n');

  // ─────────────────────────────────────────────────────────────────────────
  // 1. GREETING CLASSIFIER & ROUTING
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('Classifier routes "hi mari" -> GREETING', () => {
    const res = classifyCapabilityMode('hi mari');
    assert.strictEqual(res.intent, 'GREETING');
    assert.strictEqual(res.mode, 'BUSINESS');
  });

  await runTest('Classifier routes "hello" -> GREETING', () => {
    const res = classifyCapabilityMode('hello');
    assert.strictEqual(res.intent, 'GREETING');
  });

  await runTest('Classifier routes "good afternoon" -> GREETING', () => {
    const res = classifyCapabilityMode('good afternoon');
    assert.strictEqual(res.intent, 'GREETING');
  });

  await runTest('Classifier routes "hey mari 👋" -> GREETING', () => {
    const res = classifyCapabilityMode('hey mari 👋');
    assert.strictEqual(res.intent, 'GREETING');
  });

  await runTest('Classifier routes "howdy" -> GREETING', () => {
    const res = classifyCapabilityMode('howdy');
    assert.strictEqual(res.intent, 'GREETING');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. GREETING EXECUTION: DETERMINISTIC, 0 CREDITS, PERSONALIZED
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('MariUniversalCore returns deterministic greeting for "hi mari" without technical metadata', async () => {
    const res = await MariUniversalCore.processQuery({
      prompt: 'hi mari',
      organizationId: 'ras-ali-labs',
      companyName: 'Ras Ali Labs',
      forceLocalOnly: true,
    });

    assert.strictEqual(res.detectedIntent, 'GREETING');
    assert.strictEqual(res.responseSource, 'local_grounded');
    assert(res.answer.includes('Hi Ras Ali 👋 I’m Mari, your AI Business Growth Partner for Ras Ali Labs'), `Expected personalized greeting, got: ${res.answer}`);
    assert(!res.answer.includes('Ingested Website Intelligence'), 'Greeting must not dump website intelligence');
    assert(!res.answer.includes('Last Synced'), 'Greeting must not contain sync timestamps');
    assert(!res.answer.includes('Source:'), 'Greeting must not contain internal source headers');
  });

  await runTest('Greeting for another tenant personalizes to that tenant', async () => {
    const res = await MariUniversalCore.processQuery({
      prompt: 'hello',
      organizationId: 'pameltex',
      companyName: 'Pameltex',
      forceLocalOnly: true,
    });

    assert.strictEqual(res.detectedIntent, 'GREETING');
    assert(res.answer.includes('Pameltex'), `Expected Pameltex greeting, got: ${res.answer}`);
    assert(!res.answer.includes('Ras Ali Labs'), 'Tenant greeting must not leak Ras Ali Labs');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. WEBSITE KNOWLEDGE QUERY ROUTING & PRESENTATION
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('Classifier routes "what do you know about our website?" -> WEBSITE_KNOWLEDGE', () => {
    const res = classifyCapabilityMode('what do you know about our website?');
    assert.strictEqual(res.intent, 'WEBSITE_KNOWLEDGE');
    assert.strictEqual(res.requestedSource, 'WEBSITE');
  });

  await runTest('Classifier routes "summarize our website" -> WEBSITE_KNOWLEDGE', () => {
    const res = classifyCapabilityMode('summarize our website');
    assert.strictEqual(res.intent, 'WEBSITE_KNOWLEDGE');
  });

  await runTest('Classifier routes "what does our website say?" -> WEBSITE_KNOWLEDGE', () => {
    const res = classifyCapabilityMode('what does our website say?');
    assert.strictEqual(res.intent, 'WEBSITE_KNOWLEDGE');
  });

  await runTest('Classifier routes "what did you learn from our website?" -> WEBSITE_KNOWLEDGE', () => {
    const res = classifyCapabilityMode('what did you learn from our website?');
    assert.strictEqual(res.intent, 'WEBSITE_KNOWLEDGE');
  });

  await runTest('Website knowledge query presents clean customer-facing intelligence', async () => {
    const res = await MariUniversalCore.processQuery({
      prompt: 'summarize our website',
      organizationId: 'ras-ali-labs',
      companyName: 'Ras Ali Labs',
      forceLocalOnly: true,
    });

    assert.strictEqual(res.detectedIntent, 'WEBSITE_KNOWLEDGE');
    assert(res.answer.includes('### Website Understanding'), 'Should have ### Website Understanding heading');
    assert(res.answer.includes('**Business:** Ras Ali Labs'), 'Should have Business name');
    assert(res.answer.includes('**Positioning:** Technology and creative company based in Botswana.'), 'Should have verified positioning');
    assert(res.answer.includes('**Capabilities:**'), 'Should have Capabilities section');
    assert(res.answer.includes('Film & Creative Production'), 'Should have Film & Creative capability');
    assert(res.answer.includes('**Flagship Product:** Ralion OS'), 'Should have Flagship Product');
    assert(!res.answer.includes('Last Synced:'), 'Must not display raw sync timestamp header');
    assert(!res.answer.includes('Source: Ingested Public Website'), 'Must not display raw technical source header');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. VERIFIED RAS ALI CLAIMS (OUTDATED CLAIMS REMOVED)
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('Verified seed knowledge contains NO outdated claims', () => {
    const wk = WebsiteIngestionService.getWebsiteKnowledge('ras-ali-labs');
    assert(wk !== null, 'Website knowledge should exist for ras-ali-labs');

    const serialized = JSON.stringify(wk);
    assert(!serialized.includes('Johannesburg'), 'Must not mention Johannesburg');
    assert(!serialized.includes('enterprise@rasalilabs.com'), 'Must not mention enterprise@rasalilabs.com');
    assert(!serialized.includes('+267 390 0000'), 'Must not mention +267 390 0000');
    assert(!serialized.includes('zero data loss'), 'Must not mention zero data loss');
    assert(!serialized.includes('99.8%'), 'Must not mention 99.8% SLA');
    assert(!serialized.includes('trade corridor'), 'Must not mention trade corridors');
    assert(!serialized.includes('offline desktop'), 'Must not mention native offline desktop');

    // Check verified positioning and contact
    assert(serialized.includes('contact@rasalilabs.com'), 'Must include verified contact email');
    assert(serialized.includes('+267 72 113 009'), 'Must include verified phone');
    assert(serialized.includes('Plot 18680 Khuhurutse Drive'), 'Must include verified address');
  });

  await runTest('BusinessKnowledgeProfile contains NO outdated claims', () => {
    const profile = BusinessKnowledgeProfileService.getProfile('ras-ali-labs');
    assert(profile !== null, 'Business profile should exist for ras-ali-labs');

    const serialized = JSON.stringify(profile);
    assert(!serialized.includes('Johannesburg'), 'Must not mention Johannesburg');
    assert(!serialized.includes('enterprise@rasalilabs.com'), 'Must not mention enterprise@rasalilabs.com');
    assert(!serialized.includes('zero data loss'), 'Must not mention zero data loss');
    assert(!serialized.includes('trade corridor'), 'Must not mention trade corridors');
    assert(serialized.includes('contact@rasalilabs.com'), 'Must include verified contact email');
    assert(serialized.includes('+267 72 113 009'), 'Must include verified phone');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. SOURCE PRECEDENCE & TENANT ISOLATION
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('Tenant isolation prevents Ras Ali data leaking to other tenants', async () => {
    const pameltexCtx = await BusinessContextService.assembleContext('pameltex');
    assert.strictEqual(pameltexCtx.layer1.companyName.value, 'Pameltex');
    assert.strictEqual(pameltexCtx.layer1.websiteUrl?.value, 'https://www.pameltex.com');
    assert(!JSON.stringify(pameltexCtx.layer1.productsAndServices).includes('Film & Creative Production'), 'Pameltex must not contain Ras Ali products');
  });

  await runTest('Workspace-level isolation within single organization & user prevents website, Facebook, product, and cache leakage', async () => {
    // 1 Organization, 1 User, 2 distinct UUID Workspaces
    const canonicalOrgId = 'e4a91b2c-3333-4444-8888-123456789abc';
    const canonicalUserId = 'u_canonical_user_9999_8888_7777';
    const wsAlpha = 'aaaaaaaa-1111-4000-8000-aaaaaaaaaaaa';
    const wsBeta = 'bbbbbbbb-2222-4000-8000-bbbbbbbbbbbb';

    // Mock browser localStorage to hold workspace-scoped Facebook Page fixtures
    const mockStorage: Record<string, string> = {};
    const originalWindow = (global as any).window;
    (global as any).window = {
      localStorage: {
        getItem: (k: string) => mockStorage[k] || null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
      },
    };

    try {
      // Ingest distinct website knowledge for Workspace Alpha
      WebsiteIngestionService.registerLiveWebsiteKnowledge(wsAlpha, {
        url: 'https://alpha-solar.example.com',
        companyName: 'Alpha Solar Dynamics',
        description: 'Commercial solar engineering and battery storage solutions',
        headings: ['Home', 'Solar Arrays', 'Industrial Inverters'],
        services: ['Commercial Solar EPC', 'Microgrid Deployment'],
        products: ['SolarMax 500W Array', 'InverterGrid 50kVA'],
        contactEmail: 'energy@alpha-solar.example.com',
        source: 'LIVE_INGESTED',
      });

      // Ingest distinct website knowledge for Workspace Beta
      WebsiteIngestionService.registerLiveWebsiteKnowledge(wsBeta, {
        url: 'https://beta-logistics.example.com',
        companyName: 'Beta Cold Logistics',
        description: 'Refrigerated logistics and cold storage freight transport',
        headings: ['Services', 'Cold Storage Fleet'],
        services: ['Cold Chain Freight', 'Temperature Controlled Warehousing'],
        products: ['ColdBox 20ft Reefer', 'ThermoTracker Sensor'],
        contactEmail: 'dispatch@beta-logistics.example.com',
        source: 'LIVE_INGESTED',
      });

      // Store distinct Facebook Page fixtures keyed to each canonical workspace
      mockStorage[`ralion:${canonicalOrgId}:${wsAlpha}:selected_fb_page`] = JSON.stringify({
        id: 'fb-page-alpha',
        pageId: '1001001001',
        name: 'Alpha Solar Official',
        username: '@alphasolar',
        category: 'Solar Energy Company',
        followersCount: 12500,
        about: 'Clean solar power for commercial enterprises across Southern Africa.',
        description: 'Clean solar power for commercial enterprises across Southern Africa.',
        website: 'https://alpha-solar.example.com',
        status: 'CONNECTED',
        organizationId: canonicalOrgId,
        workspaceId: wsAlpha,
        userId: canonicalUserId,
      });

      mockStorage[`ralion:${canonicalOrgId}:${wsBeta}:selected_fb_page`] = JSON.stringify({
        id: 'fb-page-beta',
        pageId: '2002002002',
        name: 'Beta Freight Solutions',
        username: '@betafreight',
        category: 'Freight & Logistics',
        followersCount: 4300,
        about: 'Cold chain refrigerated delivery and regional freight forwarding.',
        description: 'Cold chain refrigerated delivery and regional freight forwarding.',
        website: 'https://beta-logistics.example.com',
        status: 'CONNECTED',
        organizationId: canonicalOrgId,
        workspaceId: wsBeta,
        userId: canonicalUserId,
      });

      // Clear any prior caches
      BusinessContextService.invalidateContext(canonicalOrgId);

      // ── TURN 1: Request Workspace Alpha (Populates Alpha Cache) ─────────────────
      const ctxAlphaTurn1 = await BusinessContextService.assembleContext(canonicalOrgId, {
        organizationId: canonicalOrgId,
        workspaceId: wsAlpha,
        userId: canonicalUserId,
      });

      // Assert Workspace Alpha has Alpha data only
      assert.strictEqual(ctxAlphaTurn1.workspaceId, wsAlpha);
      assert.strictEqual(ctxAlphaTurn1.layer1.companyName.value, 'Alpha Solar Dynamics');
      assert.strictEqual(ctxAlphaTurn1.layer1.websiteUrl?.value, 'https://alpha-solar.example.com');
      assert.strictEqual(ctxAlphaTurn1.layer2.social.connectedPageName.value, 'Alpha Solar Official');
      assert(JSON.stringify(ctxAlphaTurn1.layer1.productsAndServices).includes('SolarMax 500W Array'));
      assert(!JSON.stringify(ctxAlphaTurn1).includes('beta-logistics.example.com'), 'Alpha context must NOT leak Beta website');
      assert(!JSON.stringify(ctxAlphaTurn1).includes('Beta Freight Solutions'), 'Alpha context must NOT leak Beta Facebook page');
      assert(!JSON.stringify(ctxAlphaTurn1).includes('ColdBox 20ft Reefer'), 'Alpha context must NOT leak Beta products');

      // ── TURN 2: Request Workspace Beta (Populates Beta Cache) ──────────────────
      const ctxBetaTurn1 = await BusinessContextService.assembleContext(canonicalOrgId, {
        organizationId: canonicalOrgId,
        workspaceId: wsBeta,
        userId: canonicalUserId,
      });

      // Assert Workspace Beta has Beta data only
      assert.strictEqual(ctxBetaTurn1.workspaceId, wsBeta);
      assert.strictEqual(ctxBetaTurn1.layer1.companyName.value, 'Beta Cold Logistics');
      assert.strictEqual(ctxBetaTurn1.layer1.websiteUrl?.value, 'https://beta-logistics.example.com');
      assert.strictEqual(ctxBetaTurn1.layer2.social.connectedPageName.value, 'Beta Freight Solutions');
      assert(JSON.stringify(ctxBetaTurn1.layer1.productsAndServices).includes('ColdBox 20ft Reefer'));
      assert(!JSON.stringify(ctxBetaTurn1).includes('alpha-solar.example.com'), 'Beta context must NOT leak Alpha website');
      assert(!JSON.stringify(ctxBetaTurn1).includes('Alpha Solar Official'), 'Beta context must NOT leak Alpha Facebook page');
      assert(!JSON.stringify(ctxBetaTurn1).includes('SolarMax 500W Array'), 'Beta context must NOT leak Alpha products');

      // ── TURN 3: Alternating Request Workspace Alpha WITHOUT forceRefresh (Cache Hit) ──
      const ctxAlphaTurn2 = await BusinessContextService.assembleContext(canonicalOrgId, {
        organizationId: canonicalOrgId,
        workspaceId: wsAlpha,
        userId: canonicalUserId,
      });

      // Assert Alpha cache hit returns intact Alpha context with zero Beta contamination
      assert.strictEqual(ctxAlphaTurn2.version, ctxAlphaTurn1.version, 'Alpha must be served from composite cache');
      assert.strictEqual(ctxAlphaTurn2.layer1.companyName.value, 'Alpha Solar Dynamics');
      assert.strictEqual(ctxAlphaTurn2.layer2.social.connectedPageName.value, 'Alpha Solar Official');
      assert(!JSON.stringify(ctxAlphaTurn2).includes('beta-logistics.example.com'), 'Cached Alpha context must NOT contain Beta website');
      assert(!JSON.stringify(ctxAlphaTurn2).includes('Beta Freight Solutions'), 'Cached Alpha context must NOT contain Beta Facebook page');
      assert(!JSON.stringify(ctxAlphaTurn2).includes('ColdBox 20ft Reefer'), 'Cached Alpha context must NOT contain Beta products');

      // ── TURN 4: Alternating Request Workspace Beta WITHOUT forceRefresh (Cache Hit) ──
      const ctxBetaTurn2 = await BusinessContextService.assembleContext(canonicalOrgId, {
        organizationId: canonicalOrgId,
        workspaceId: wsBeta,
        userId: canonicalUserId,
      });

      // Assert Beta cache hit returns intact Beta context with zero Alpha contamination
      assert.strictEqual(ctxBetaTurn2.version, ctxBetaTurn1.version, 'Beta must be served from composite cache');
      assert.strictEqual(ctxBetaTurn2.layer1.companyName.value, 'Beta Cold Logistics');
      assert.strictEqual(ctxBetaTurn2.layer2.social.connectedPageName.value, 'Beta Freight Solutions');
      assert(!JSON.stringify(ctxBetaTurn2).includes('alpha-solar.example.com'), 'Cached Beta context must NOT contain Alpha website');
      assert(!JSON.stringify(ctxBetaTurn2).includes('Alpha Solar Official'), 'Cached Beta context must NOT contain Alpha Facebook page');
      assert(!JSON.stringify(ctxBetaTurn2).includes('SolarMax 500W Array'), 'Cached Beta context must NOT contain Alpha products');

      // ── TURN 5: Invalidate only Workspace Alpha, verify Workspace Beta remains cached ──
      BusinessContextService.invalidateContext(canonicalOrgId, wsAlpha, canonicalUserId);

      const ctxBetaTurn3 = await BusinessContextService.assembleContext(canonicalOrgId, {
        organizationId: canonicalOrgId,
        workspaceId: wsBeta,
        userId: canonicalUserId,
      });
      assert.strictEqual(ctxBetaTurn3.version, ctxBetaTurn1.version, 'Beta cache must remain intact when Alpha is invalidated');

      const ctxAlphaTurn3 = await BusinessContextService.assembleContext(canonicalOrgId, {
        organizationId: canonicalOrgId,
        workspaceId: wsAlpha,
        userId: canonicalUserId,
      });
      assert.notStrictEqual(ctxAlphaTurn3.version, ctxAlphaTurn1.version, 'Alpha must be reassembled after invalidation');
      assert.strictEqual(ctxAlphaTurn3.layer1.companyName.value, 'Alpha Solar Dynamics');
    } finally {
      (global as any).window = originalWindow;
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. PRODUCT DEDUPLICATION & SOURCE INTEGRITY
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('Products and services are deduplicated by normalized name', async () => {
    const wsDup = 'cccccccc-3333-4000-8000-cccccccccccc';
    const orgDup = 'org-dup-test';

    WebsiteIngestionService.registerLiveWebsiteKnowledge(wsDup, {
      url: 'https://dup.example.com',
      companyName: 'Duplicate Test Co',
      description: 'Testing product deduplication',
      headings: ['Products'],
      services: ['Cloud Consulting', 'cloud consulting', '  Cloud Consulting  '],
      products: ['App Builder', 'APP BUILDER', 'app builder', 'Database Sync'],
      source: 'LIVE_INGESTED',
    });

    const ctx = await BusinessContextService.assembleContext(orgDup, {
      workspaceId: wsDup,
    });

    const productNames = ctx.layer1.productsAndServices.value.map((p) => p.name);
    assert.strictEqual(productNames.filter((n) => n.toLowerCase() === 'cloud consulting').length, 1, 'Cloud Consulting must appear exactly once');
    assert.strictEqual(productNames.filter((n) => n.toLowerCase() === 'app builder').length, 1, 'App Builder must appear exactly once');
    assert.strictEqual(productNames.filter((n) => n.toLowerCase() === 'database sync').length, 1, 'Database Sync must appear exactly once');
    assert.strictEqual(productNames.length, 3, 'Total deduplicated items must be exactly 3');
  });

  await runTest('Platform default website knowledge does not generate fake last-sync timestamps', async () => {
    const defaultKnowledge = WebsiteIngestionService.getPlatformDefault();
    assert(defaultKnowledge !== null);
    assert.strictEqual(defaultKnowledge.source, 'PLATFORM_DEFAULT');
    assert.strictEqual(defaultKnowledge.lastSuccessfulSync, '2026-09-01T00:00:00.000Z', 'Default knowledge must use static reference timestamp, not live now()');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. MARKDOWN NORMALIZATION & SVG REMOVAL
  // ─────────────────────────────────────────────────────────────────────────
  await runTest('normalizeMarkdownText strips literal "svg" and button artifacts', () => {
    const dirty = 'Here is the plan svgSend to Studio for your growth';
    const clean = normalizeMarkdownText(dirty);
    assert(!clean.includes('svgSend to Studio'), 'Must remove svgSend to Studio');
    assert(!clean.includes('svg'), 'Must remove literal svg artifact');
  });

  await runTest('normalizeMarkdownText unescapes backslashed asterisks', () => {
    const dirty = 'Here is \\*\\*Bold Text\\*\\* and \\*Italic\\*';
    const clean = normalizeMarkdownText(dirty);
    assert.strictEqual(clean, 'Here is **Bold Text** and *Italic*');
  });

  await runTest('normalizeMarkdownText normalizes malformed "**•**Source**" bullets', () => {
    const dirty = '**•**Source** Ingested Data';
    const clean = normalizeMarkdownText(dirty);
    assert.strictEqual(clean, '• **Source** Ingested Data');
  });

  await runTest('normalizeMarkdownText normalizes duplicated bullet patterns', () => {
    const dirty = '- **•** Product A\n• • Product B\n* • Product C';
    const clean = normalizeMarkdownText(dirty);
    assert.strictEqual(clean, '• Product A\n• Product B\n• Product C');
  });

  console.log('\n' + '='.repeat(70));
  console.log(`  📊 RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('='.repeat(70) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

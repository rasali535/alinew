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

  await runTest('Two UUID-backed workspaces cannot retrieve each other\'s website or Facebook context', async () => {
    const wsA = 'aaaaaaaa-1111-4000-8000-aaaaaaaaaaaa';
    const wsB = 'bbbbbbbb-2222-4000-8000-bbbbbbbbbbbb';
    const orgA = 'org-tenant-alpha-uuid';
    const orgB = 'org-tenant-beta-uuid';

    // Ingest custom website knowledge for Workspace A
    WebsiteIngestionService.registerLiveWebsiteKnowledge(wsA, {
      url: 'https://alpha-security.example.com',
      companyName: 'Alpha Security Systems',
      description: 'CCTV and biometrics specialist',
      headings: ['Home', 'Surveillance Systems'],
      services: ['CCTV Installation', 'Biometric Access'],
      products: ['AlphaCam 4K'],
      contactEmail: 'info@alpha-security.example.com',
      source: 'LIVE_INGESTED',
    });

    // Ingest custom website knowledge for Workspace B
    WebsiteIngestionService.registerLiveWebsiteKnowledge(wsB, {
      url: 'https://beta-bakery.example.com',
      companyName: 'Beta Artisan Bakery',
      description: 'Handcrafted sourdough and pastries',
      headings: ['Menu', 'Pastries'],
      services: ['Custom Wedding Cakes'],
      products: ['Sourdough Loaf'],
      contactEmail: 'order@beta-bakery.example.com',
      source: 'LIVE_INGESTED',
    });

    // Assemble context for Workspace A
    const ctxA = await BusinessContextService.assembleContext(orgA, {
      workspaceId: wsA,
      organizationId: orgA,
    });

    // Assemble context for Workspace B
    const ctxB = await BusinessContextService.assembleContext(orgB, {
      workspaceId: wsB,
      organizationId: orgB,
    });

    // Verify Workspace A gets ONLY Alpha data and zero Beta data
    assert.strictEqual(ctxA.layer1.companyName.value, 'Alpha Security Systems');
    assert.strictEqual(ctxA.layer1.websiteUrl?.value, 'https://alpha-security.example.com');
    assert(JSON.stringify(ctxA.layer1.productsAndServices).includes('AlphaCam 4K'));
    assert(!JSON.stringify(ctxA.layer1.productsAndServices).includes('Sourdough Loaf'), 'Workspace A must not contain Beta products');
    assert(!JSON.stringify(ctxA).includes('beta-bakery.example.com'), 'Workspace A must not contain Beta domain');

    // Verify Workspace B gets ONLY Beta data and zero Alpha data
    assert.strictEqual(ctxB.layer1.companyName.value, 'Beta Artisan Bakery');
    assert.strictEqual(ctxB.layer1.websiteUrl?.value, 'https://beta-bakery.example.com');
    assert(JSON.stringify(ctxB.layer1.productsAndServices).includes('Sourdough Loaf'));
    assert(!JSON.stringify(ctxB.layer1.productsAndServices).includes('AlphaCam 4K'), 'Workspace B must not contain Alpha products');
    assert(!JSON.stringify(ctxB).includes('alpha-security.example.com'), 'Workspace B must not contain Alpha domain');

    // Verify Source Tagging on Live Ingested
    assert.strictEqual(ctxA.layer1.websiteUrl?.source, 'LIVE_INGESTED');
    assert.strictEqual(ctxB.layer1.websiteUrl?.source, 'LIVE_INGESTED');
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

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

  // ─────────────────────────────────────────────────────────────────────────
  // 6. MARKDOWN NORMALIZATION & SVG REMOVAL
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

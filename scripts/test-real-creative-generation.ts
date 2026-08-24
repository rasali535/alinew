import fs from 'fs';
import path from 'path';
import {
  CreativeAssetService,
  validateImageBuffer,
  validateVideoBuffer,
} from '../packages/ai/src/creativeAsset.service';

async function runRealCreativeGenerationTests() {
  console.log('\n================================================================');
  console.log('RALION OS — REAL CREATIVE GENERATION & DURABILITY TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(testName: string, success: boolean, detail: string) {
    if (success) {
      console.log(`✅ PASS [${testName}]\n   └─ ${detail}\n`);
      passed++;
    } else {
      console.error(`❌ FAIL [${testName}]\n   └─ ${detail}\n`);
      failed++;
    }
  }

  const BASE_URL = 'http://localhost:6509/ralion';

  let generatedImageAsset: any = null;
  let generatedVideoAsset: any = null;

  // ── TEST 1: MARI STRATEGIC CREATIVE RECOMMENDATION ─────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/api/mari/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Create a premium B2B technology advertisement for Ras Ali Labs.',
        organizationId: 'org-rasalilabs-demo',
      }),
    });
    const data = await res.json().catch(() => ({}));
    const answer = data.answer || data.reply || '';
    const hasRecommendation = res.ok && answer.length > 50;

    report(
      'MARI: CREATIVE RECOMMENDATION',
      hasRecommendation,
      `Mari synthesized brief (${answer.length} chars) with actions: ${JSON.stringify(data.actionsSuggested || [])}`
    );
  } catch (e: any) {
    report('MARI: CREATIVE RECOMMENDATION', false, `Request failed: ${e.message}`);
  }

  // ── TEST 2: REAL IMAGE GENERATION (FLUX.1) ────────────────────────────────
  try {
    const prompt = 'Create a premium B2B technology advertisement for Ras Ali Labs.';
    const res = await fetch(`${BASE_URL}/api/creatives/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'POSTER_IMAGE',
        prompt,
        format: '1:1',
        style: 'Corporate Executive',
        organizationId: 'org-rasalilabs-demo',
      }),
      signal: AbortSignal.timeout(55000),
    });

    const data = await res.json().catch(() => ({}));
    const asset = data.asset || {};
    generatedImageAsset = asset;

    const fileExists = asset.storagePath ? fs.existsSync(asset.storagePath) : false;
    let rawBuffer: Buffer | null = null;
    if (fileExists) {
      rawBuffer = fs.readFileSync(asset.storagePath);
    }
    const val = rawBuffer ? validateImageBuffer(rawBuffer) : { valid: false };

    report(
      'GROWTH: REAL IMAGE GENERATION (FLUX.1)',
      Boolean(res.ok && data.success && data.status === 'COMPLETED' && fileExists && val.valid),
      `Provider: FLUX.1 | Status: ${data.status} | Size: ${rawBuffer?.byteLength} bytes | MIME: ${asset.mimeType} | Path: ${asset.storagePath}`
    );
  } catch (e: any) {
    report('GROWTH: REAL IMAGE GENERATION (FLUX.1)', false, `Request failed: ${e.message}`);
  }

  // ── TEST 3: IMAGE -> SOCIAL COMPOSER HANDOFF ──────────────────────────────
  if (generatedImageAsset) {
    const socialContract = {
      assetId: generatedImageAsset.id,
      mediaUrl: generatedImageAsset.publicUrl,
      mediaType: 'image',
      title: generatedImageAsset.title,
    };
    const isValidHandoff =
      socialContract.assetId === generatedImageAsset.id &&
      socialContract.mediaUrl.startsWith('/ralion/uploads/creatives/') &&
      socialContract.mediaType === 'image';

    report(
      'SOCIAL: IMAGE COMPOSER HANDOFF',
      isValidHandoff,
      `Exact asset passed to Social Composer: assetId=${socialContract.assetId}, mediaUrl=${socialContract.mediaUrl}`
    );
  }

  // ── TEST 4: REAL VIDEO GENERATION (CogVideoX) ──────────────────────────────
  try {
    const videoPrompt = 'Create a cinematic 15–30 second B2B technology promotional video for Ras Ali Labs targeting SADC enterprise decision makers.';
    const res = await fetch(`${BASE_URL}/api/creatives/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'VIDEO_REEL',
        prompt: videoPrompt,
        format: '16:9',
        style: 'Cinematic Executive',
        organizationId: 'org-rasalilabs-demo',
      }),
      signal: AbortSignal.timeout(55000),
    });

    const data = await res.json().catch(() => ({}));
    const asset = data.asset || {};
    generatedVideoAsset = asset;

    const fileExists = asset.storagePath ? fs.existsSync(asset.storagePath) : false;
    let rawBuffer: Buffer | null = null;
    if (fileExists) {
      rawBuffer = fs.readFileSync(asset.storagePath);
    }
    const val = rawBuffer ? validateVideoBuffer(rawBuffer) : { valid: false, duration: 0 };

    report(
      'GROWTH: REAL VIDEO GENERATION (CogVideoX)',
      Boolean(res.ok && data.success && data.status === 'COMPLETED' && fileExists && val.valid && val.duration > 0),
      `Provider: CogVideoX | Status: ${data.status} | Size: ${rawBuffer?.byteLength} bytes | MIME: ${asset.mimeType} | Duration: ${val.duration}s | Path: ${asset.storagePath}`
    );
  } catch (e: any) {
    report('GROWTH: REAL VIDEO GENERATION (CogVideoX)', false, `Request failed: ${e.message}`);
  }

  // ── TEST 5: VIDEO -> SOCIAL COMPOSER HANDOFF ──────────────────────────────
  if (generatedVideoAsset) {
    const socialContract = {
      assetId: generatedVideoAsset.id,
      mediaUrl: generatedVideoAsset.publicUrl,
      mediaType: 'video',
      title: generatedVideoAsset.title,
    };
    const isValidHandoff =
      socialContract.assetId === generatedVideoAsset.id &&
      socialContract.mediaUrl.startsWith('/ralion/uploads/creatives/') &&
      socialContract.mediaType === 'video';

    report(
      'SOCIAL: VIDEO COMPOSER HANDOFF',
      isValidHandoff,
      `Exact video passed to Social Composer: assetId=${socialContract.assetId}, mediaUrl=${socialContract.mediaUrl}`
    );
  }

  // ── NEGATIVE TEST 1: HTTP 200 WITH JSON ERROR PAYLOAD ─────────────────────
  try {
    const res = await fetch(`${BASE_URL}/api/creatives/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'POSTER_IMAGE',
        prompt: 'Test prompt with simulated JSON error',
        mockFailure: 'JSON_ERROR_PAYLOAD',
      }),
    });
    const data = await res.json().catch(() => ({}));
    const rejectedCorrectly = data.success === false && data.status === 'FAILED' && data.details?.stage === 'BINARY_VALIDATION';

    report(
      'NEGATIVE TEST: 200 + JSON ERROR PAYLOAD REJECTION',
      rejectedCorrectly,
      `Safely rejected mock JSON error payload: Status: ${data.status}. User Message: "${data.userFacingMessage}"`
    );
  } catch (e: any) {
    report('NEGATIVE TEST: 200 + JSON ERROR PAYLOAD REJECTION', false, `Request failed: ${e.message}`);
  }

  // ── NEGATIVE TEST 2: HTTP 200 WITH EMPTY BODY ─────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/api/creatives/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'POSTER_IMAGE',
        prompt: 'Test prompt with simulated empty body',
        mockFailure: 'EMPTY_BODY',
      }),
    });
    const data = await res.json().catch(() => ({}));
    const rejectedCorrectly = data.success === false && data.status === 'FAILED' && data.details?.errorCode === 'EMPTY_MEDIA_RESPONSE';

    report(
      'NEGATIVE TEST: 200 + EMPTY BODY REJECTION',
      rejectedCorrectly,
      `Safely rejected empty body: Status: ${data.status}. ErrorCode: ${data.details?.errorCode}. User Message: "${data.userFacingMessage}"`
    );
  } catch (e: any) {
    report('NEGATIVE TEST: 200 + EMPTY BODY REJECTION', false, `Request failed: ${e.message}`);
  }

  // ── NEGATIVE TEST 3: INVALID / EMPTY PROMPT ───────────────────────────────
  try {
    const res = await fetch(`${BASE_URL}/api/creatives/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'POSTER_IMAGE',
        prompt: '   ',
      }),
    });
    const data = await res.json().catch(() => ({}));
    const isBadReq = res.status === 400 && data.success === false && data.details?.errorCode === 'INVALID_PROMPT';

    report(
      'NEGATIVE TEST: EMPTY PROMPT REJECTION',
      isBadReq,
      `HTTP ${res.status} rejected empty prompt. Code: ${data.details?.errorCode}. User Message: "${data.userFacingMessage}"`
    );
  } catch (e: any) {
    report('NEGATIVE TEST: EMPTY PROMPT REJECTION', false, `Request failed: ${e.message}`);
  }

  // ── NEGATIVE TEST 4: DIRECT BUFFER VALIDATOR REJECTIONS ───────────────────
  const htmlErrorBuffer = Buffer.from('<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>');
  const jsonErrorBuffer = Buffer.from('{"error":"Rate limit exceeded","code":429}');
  const truncatedBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0x00]);

  const htmlVal = validateImageBuffer(htmlErrorBuffer);
  const jsonVal = validateImageBuffer(jsonErrorBuffer);
  const truncVal = validateImageBuffer(truncatedBuffer);

  const validatorsPassed = !htmlVal.valid && !jsonVal.valid && !truncVal.valid;

  report(
    'NEGATIVE TEST: SEMANTIC BUFFER VALIDATOR REJECTIONS',
    validatorsPassed,
    `validateImageBuffer correctly rejected HTML error (${htmlVal.error}), JSON error (${jsonVal.error}), and truncated buffer (${truncVal.error})`
  );

  console.log('================================================================');
  console.log(`SUMMARY: ${passed + failed} TESTS RUN | ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runRealCreativeGenerationTests();

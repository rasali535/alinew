/**
 * Ralion OS — Mari Growth Live Multi-Tenant Business & Facebook State Verification Suite
 * Tests live across Ras Ali Labs, Pameltex, and Grape.
 */

const dotenv = require('dotenv');
dotenv.config({ path: 'apps/ralion/.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

const assert = require('assert');
const { MariUniversalCore } = require('../packages/ai/dist/mariUniversalCore');
const { BusinessIdentityResolver } = require('../packages/ai/dist/businessIdentityResolver');

async function runLiveMultiTenantTests() {
  console.log('================================================================');
  console.log('MARI GROWTH LIVE MULTI-TENANT TEST SUITE');
  console.log('================================================================\n');

  const forbiddenLabels = ['Active Workspace', 'Your Business', 'Default', '@facebook', '<svg'];

  function checkClean(text, label) {
    for (const bad of forbiddenLabels) {
      assert(!text.includes(bad), `FAIL [${label}]: Output must not contain forbidden label "${bad}". Text snippet: ${text.slice(0, 120)}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TENANT 1: RAS ALI LABS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: RAS ALI LABS (Canonical Profile + Active Connected Page) ---');
  const rasAliIdentity = BusinessIdentityResolver.resolveIdentity('22e61ff6-16fe-44c7-9d67-38e2a2e91ccf', {
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    sessionCompanyName: 'Ras Ali Labs',
  });
  console.log('Resolved Identity:', { companyName: rasAliIdentity.companyName, isVerified: rasAliIdentity.isVerified });
  assert.strictEqual(rasAliIdentity.companyName, 'Ras Ali Labs');
  assert.strictEqual(rasAliIdentity.isVerified, true);

  const rasAliFbQuery = await MariUniversalCore.processQuery({
    prompt: 'what does our facebook say about us',
    organizationId: 'ras-ali-labs',
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    userId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    companyName: 'Ras Ali Labs',
    localOverrides: {
      fbPage: {
        id: 'd937656d-3586-4d00-801b-67109a896bf3',
        pageId: '477334159265235',
        name: 'Ras Ali Labs',
        category: 'Information technology company',
        fanCount: 15,
        accountType: 'BUSINESS',
      }
    }
  });

  console.log('Ras Ali Labs Facebook query response:\n', rasAliFbQuery.answer);
  checkClean(rasAliFbQuery.answer, 'Ras Ali Labs FB query');
  assert(
    rasAliFbQuery.answer.includes('Ras Ali Labs'),
    'Ras Ali Labs response must reference Ras Ali Labs'
  );

  const rasAliPageQuery = await MariUniversalCore.processQuery({
    prompt: 'which facebook page is connected?',
    organizationId: 'ras-ali-labs',
    workspaceId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    userId: '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf',
    companyName: 'Ras Ali Labs',
    localOverrides: {
      fbPage: {
        id: 'd937656d-3586-4d00-801b-67109a896bf3',
        pageId: '477334159265235',
        name: 'Ras Ali Labs',
        category: 'Information technology company',
        fanCount: 15,
        accountType: 'BUSINESS',
      }
    }
  });
  console.log('Ras Ali Labs Page query response:\n', rasAliPageQuery.answer);
  checkClean(rasAliPageQuery.answer, 'Ras Ali Labs Page query');
  assert(rasAliPageQuery.answer.includes('Ras Ali Labs'), 'Must identify Ras Ali Labs page');

  console.log('✅ Ras Ali Labs verification PASSED\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // TENANT 2: PAMELTEX
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 2: PAMELTEX (Canonical Verified Profile, No Facebook Connected) ---');
  const pameltexIdentity = BusinessIdentityResolver.resolveIdentity('c0b39862-cf19-4882-a822-c7f3f493fec0', {
    workspaceId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    sessionCompanyName: 'Pameltex',
  });
  console.log('Resolved Identity:', { companyName: pameltexIdentity.companyName, isVerified: pameltexIdentity.isVerified, industry: pameltexIdentity.industry });
  assert.strictEqual(pameltexIdentity.companyName, 'Pameltex');
  assert.strictEqual(pameltexIdentity.isVerified, true);
  assert(pameltexIdentity.industry.includes('Uniforms') || pameltexIdentity.industry.includes('Workwear'));

  const pameltexFbQuery = await MariUniversalCore.processQuery({
    prompt: 'what does our facebook say about us',
    organizationId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    workspaceId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    userId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    companyName: 'Pameltex',
  });
  console.log('Pameltex Facebook query response:\n', pameltexFbQuery.answer);
  checkClean(pameltexFbQuery.answer, 'Pameltex FB query');
  assert(!pameltexFbQuery.answer.includes('Ras Ali Labs'), 'Pameltex MUST NOT receive Ras Ali Labs context');
  assert(
    pameltexFbQuery.answer.includes('Facebook is not currently connected') ||
    pameltexFbQuery.answer.includes('not currently connected'),
    'Pameltex must show Facebook not currently connected'
  );

  const pameltexIdentityQuery = await MariUniversalCore.processQuery({
    prompt: 'what is our business and industry?',
    organizationId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    workspaceId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    userId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    companyName: 'Pameltex',
  });
  console.log('Pameltex Business query response:\n', pameltexIdentityQuery.answer);
  checkClean(pameltexIdentityQuery.answer, 'Pameltex Business query');
  assert(pameltexIdentityQuery.answer.includes('Pameltex'), 'Must identify Pameltex');
  assert(!pameltexIdentityQuery.answer.includes('Ras Ali Labs'), 'Must not leak Ras Ali Labs');

  console.log('✅ Pameltex verification PASSED\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // TENANT 3: GRAPE (chiwabby@gmail.com / 8c8d6392-e457-4145-9423-f551fda3b728)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 3: GRAPE (Clean Tenant, No Facebook Connected) ---');
  const grapeIdentity = BusinessIdentityResolver.resolveIdentity('8c8d6392-e457-4145-9423-f551fda3b728', {
    workspaceId: '8c8d6392-e457-4145-9423-f551fda3b728',
    sessionCompanyName: "grape's Workspace",
  });
  console.log('Resolved Identity:', { companyName: grapeIdentity.companyName, isVerified: grapeIdentity.isVerified });
  assert.strictEqual(grapeIdentity.companyName, 'grape');

  const grapeFbQuery = await MariUniversalCore.processQuery({
    prompt: 'what does our facebook say about us',
    organizationId: '8c8d6392-e457-4145-9423-f551fda3b728',
    workspaceId: '8c8d6392-e457-4145-9423-f551fda3b728',
    userId: '8c8d6392-e457-4145-9423-f551fda3b728',
    companyName: 'grape',
  });
  console.log('Grape Facebook query response:\n', grapeFbQuery.answer);
  checkClean(grapeFbQuery.answer, 'Grape FB query');
  assert(!grapeFbQuery.answer.includes('Ras Ali Labs'), 'Grape MUST NOT receive Ras Ali Labs context');
  assert(!grapeFbQuery.answer.includes('Pameltex'), 'Grape MUST NOT receive Pameltex context');
  assert(
    grapeFbQuery.answer.includes('Facebook is not currently connected') ||
    grapeFbQuery.answer.includes('not currently connected'),
    'Grape must report Facebook not currently connected'
  );

  console.log('✅ Grape verification PASSED\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: STATE 2 (Profile Connected, but NO Business Page Selected Yet)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 4: FACEBOOK STATE 2 (Profile connected, Page not selected) ---');
  const state2Query = await MariUniversalCore.processQuery({
    prompt: 'what does our facebook say about us',
    organizationId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    workspaceId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    userId: 'c0b39862-cf19-4882-a822-c7f3f493fec0',
    companyName: 'Pameltex',
    localOverrides: {
      fbPage: {
        accountType: 'FACEBOOK_PERSONAL_PROFILE',
        isPersonalProfile: true,
        name: 'Personal Facebook Profile',
        fanCount: 0,
      }
    }
  });
  console.log('State 2 Response:\n', state2Query.answer);
  checkClean(state2Query.answer, 'State 2 query');
  assert(
    state2Query.answer.includes('Facebook is connected, but no business Page is selected yet') ||
    state2Query.answer.includes('connected, but no business Page is selected yet') ||
    state2Query.answer.includes("haven't selected a business Page yet"),
    'State 2 must report that Facebook is connected but no business Page is selected yet'
  );

  console.log('✅ Facebook State 2 verification PASSED\n');

  console.log('================================================================');
  console.log('ALL MARI GROWTH LIVE TENANT & FACEBOOK STATE TESTS PASSED 100%');
  console.log('================================================================');
}

runLiveMultiTenantTests().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});

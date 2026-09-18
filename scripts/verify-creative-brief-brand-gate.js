const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const route = read('apps/ralion/src/app/api/creatives/generate/route.ts');
const growth = read('apps/ralion/src/app/(dashboard)/growth/page.tsx');
const orchestrator = read('packages/ai/src/creativeOrchestrator.service.ts');
const evaluator = read('packages/ai/src/visualSemanticEvaluator.service.ts');
const mari = read('packages/ai/src/mariCreativeIntelligence.service.ts');
const providers = read('packages/ai/src/promptFaithfulCreativeProviders.ts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  mari.includes('extractHardVisualRequirements'),
  'Mari must extract hard visual requirements from the brief.'
);
assert(
  mari.includes('two distinct monitors') && mari.includes('recognizable Gaborone context or skyline view'),
  'Mari hard requirements must preserve explicit object counts and named location context.'
);
assert(
  route.includes('MariCreativeIntelligenceService.extractHardVisualRequirements(prompt)'),
  'Creative API must derive requirements from Mari creative intelligence.'
);
assert(
  route.includes('requiredVisualElements,'),
  'Creative API must pass hard requirements into the orchestrator.'
);
assert(
  orchestrator.includes('requiredVisualElements?: string[]'),
  'Creative orchestrator options must accept structured visual requirements.'
);
assert(
  orchestrator.includes('expectedConcepts: requiredVisualElements.length > 0 ? requiredVisualElements : undefined'),
  'Orchestrator must forward requirements into semantic QA.'
);
assert(
  orchestrator.includes("errorCode: 'THIRD_PARTY_BRANDING_REJECTED'"),
  'Provider watermark/third-party branding must be a hard rejection.'
);
assert(
  evaluator.includes('prohibitedBrandingDetected') && evaluator.includes('detectedBranding'),
  'Visual QA must report prohibited provider branding.'
);
assert(
  evaluator.includes('provider watermark, provider URL, stock watermark, or third-party branding'),
  'Visual QA prompt must explicitly reject external provider branding.'
);
assert(
  evaluator.includes('two distinct monitors') && evaluator.includes('glass-like monitor styling'),
  'Visual QA requirement extraction must preserve the sample brief constraints.'
);
assert(
  growth.includes("const effectiveCreativeLogo = creativeLogo || '/ralion-logo.png'"),
  'Growth preview/download must use Ralion OS fallback branding when tenant logo is absent.'
);
assert(
  growth.includes("data.errorCode === 'THIRD_PARTY_BRANDING_REJECTED'"),
  'Growth UI must distinguish provider-branding rejection from storage failure.'
);
assert(
  !growth.includes('Brand Logo &amp; Watermark'),
  'UI must not describe tenant/Ralion branding as a provider-style watermark.'
);

assert(
  providers.includes("DEFAULT_GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image'") &&
    providers.includes("responseModalities: ['IMAGE']"),
  'Creative images must prefer the configured Gemini native image provider.'
);
assert(
  providers.includes('const pollinationsCandidates = pollinationsToken ? [') &&
    !providers.includes('Legacy anonymous route kept only as a compatibility fallback.'),
  'Anonymous Pollinations image generation must never be a customer-facing fallback.'
);
assert(
  providers.includes('attemptedGemini: Boolean(geminiApiKey)') &&
    providers.includes('attemptedPollinations: pollinationsCandidates.length > 0'),
  'Provider diagnostics must accurately report clean image provider attempts.'
);

console.log('Creative brief requirement and brand-gate invariants verified.');

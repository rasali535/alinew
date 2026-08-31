import { VisualSemanticEvaluatorService } from '../packages/ai/src/visualSemanticEvaluator.service';

async function testGemini() {
  const k = 'AQ.Ab8RN6LHIgVR8Zti6ifRmdpEKXKguMi1mbTZ951Mdn0mFzBhxA';
  console.log('1. Fetching real truck image...');
  const res = await fetch('https://image.pollinations.ai/prompt/refrigerated%20freight%20truck%20at%20sunset?model=flux&width=512&height=512&nologo=true', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  console.log('Image fetched! Bytes:', buf.byteLength, 'Magic:', buf.subarray(0, 4).toString('hex'));

  console.log('\n2. Calling VisualSemanticEvaluatorService.evaluateVisual...');
  const evalRes = await VisualSemanticEvaluatorService.evaluateVisual(buf, 'image/jpeg', {
    userPrompt: 'Create a commercial advertisement showing a refrigerated pharmaceutical logistics truck transporting temperature-sensitive cargo at a Southern African border facility.',
    targetIndustry: 'Freight Logistics',
  });
  console.log('Result from evaluateVisual:\n', JSON.stringify(evalRes, null, 2));
}

testGemini().catch(console.error);

import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });
dotenv.config({ path: 'apps/ralion/.env' });
dotenv.config();

const key = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
console.log('Key present:', Boolean(key), 'Prefix:', key ? key.substring(0, 8) : 'none');

async function testPrompt(prompt: string, sysPrompt?: string) {
  const fullPrompt = sysPrompt ? `${sysPrompt}\n\nUser Request: ${prompt}` : prompt;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
    }),
    signal: AbortSignal.timeout(15000),
  });

  console.log('Status:', res.status);
  const data = await res.json();
  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.log('\n--- MARI RESPONSE ---');
    console.log(data.candidates[0].content.parts[0].text.substring(0, 300) + '...\n');
    console.log('Usage metadata:', data.usageMetadata);
  } else {
    console.log('Error/No text:', JSON.stringify(data));
  }
}

async function run() {
  console.log('Testing prompt 1: Growth priority');
  await testPrompt('What is the current growth priority for my business?', 'You are Mari AI, Executive Growth Partner for Ralion OS.');
  
  console.log('\nTesting prompt 2: Three practical actions');
  await testPrompt('Give me three practical actions I should take this week.');
}

run();

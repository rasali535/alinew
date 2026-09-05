async function testGemini() {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ].filter(Boolean) as string[];

  console.log(`Testing Gemini API with ${keys.length} keys...`);

  for (const key of keys) {
    console.log(`Trying key starting with: ${key.substring(0, 8)}...`);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: "You are Mari AI, Executive Growth Partner for Ras Ali Labs." }]
            },
            contents: [
              { role: 'user', parts: [{ text: "what is my business?" }] }
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
          }),
        }
      );

      console.log(`Status: ${res.status}`);
      const data = await res.json();
      if (!res.ok) {
        console.error(`Error:`, data);
      } else {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`Gemini Text:`, text);
      }
    } catch (e: any) {
      console.error(`Fetch error:`, e.message);
    }
  }
}

testGemini();

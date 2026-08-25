async function test() {
  const prompt = 'Create a premium cinematic B2B enterprise technology advertisement for Ras Ali Labs targeting SADC business decision makers.';
  const enc = encodeURIComponent(prompt);
  const urls = [
    `https://image.pollinations.ai/prompt/${enc}?nologo=true&seed=12345&width=1024&height=1024`,
    `https://image.pollinations.ai/prompt/${enc}?model=flux&nologo=true&seed=12345&width=1024&height=1024`,
    `https://image.pollinations.ai/prompt/${enc}?model=turbo&nologo=true&seed=12345&width=1024&height=1024`,
    `https://image.pollinations.ai/prompt/${enc}?seed=12345&width=768&height=768&nologo=true`
  ];
  for (const u of urls) {
    const t0 = Date.now();
    try {
      const res = await fetch(u, { 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(20000) 
      });
      const ab = await res.arrayBuffer();
      console.log(u.slice(0, 65), 'Status:', res.status, 'Size:', ab.byteLength, 'Time:', (Date.now() - t0) + 'ms');
    } catch (e: any) {
      console.log(u.slice(0, 65), 'Error:', e.message, 'Time:', (Date.now() - t0) + 'ms');
    }
  }
}
test();

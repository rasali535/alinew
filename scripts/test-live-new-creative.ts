import axios from 'axios';

async function testNewCreative() {
  console.log('--- Generating NEW Creative via Live Backend ---');
  
  const generateRes = await axios.post<any>('https://rasalilabs.com/ralion/api/mari/generate', {
    prompt: 'Create a sleek high-tech promotional poster for Ralion OS showing quantum neural network visualization with deep sapphire and gold highlights, hyper-detailed, 8k resolution',
    type: 'POSTER_IMAGE',
    organizationId: 'default-org',
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
    validateStatus: () => true,
  });

  console.log('Generate HTTP Status:', generateRes.status);
  console.log('Generate Response Data:', JSON.stringify(generateRes.data, null, 2));

  const data: any = generateRes.data;
  if (!data?.asset && !data?.data?.asset && !data?.id) {
    console.error('Failed to get asset from response');
    return;
  }

  const asset: any = data.asset || data.data?.asset || data;
  console.log('\n--- NEW ASSET DETAILS ---');
  console.log('assetId:', asset.id);
  console.log('publicUrl:', asset.publicUrl);
  console.log('storageProvider:', asset.storageProvider);
  console.log('bucket:', asset.bucket);
  console.log('objectPath:', asset.storagePath);

  const fullUrl = asset.publicUrl.startsWith('http')
    ? asset.publicUrl
    : `https://rasalilabs.com${asset.publicUrl}`;

  console.log(`\n--- Requesting NEW Asset URL: ${fullUrl} ---`);
  const assetRes = await axios.get(fullUrl, {
    responseType: 'arraybuffer',
    validateStatus: () => true,
  });

  const buf = Buffer.from(assetRes.data as any);
  console.log('Asset HTTP Status:', assetRes.status);
  console.log('Asset Content-Type:', assetRes.headers['content-type']);
  console.log('Asset Content-Length:', assetRes.headers['content-length'] || buf.length);
  console.log('Asset First 4 Bytes (Magic):', buf.subarray(0, 4).toString('hex'));

  if (assetRes.status === 200 && assetRes.headers['content-type']?.includes('image/')) {
    console.log('\n🎉 NEW ASSET TEST PASSED: HTTP 200 image/jpeg non-zero bytes!');
  } else {
    console.error('\n❌ NEW ASSET TEST FAILED');
  }
}

testNewCreative().catch(console.error);

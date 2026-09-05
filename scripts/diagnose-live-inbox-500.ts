async function main() {
  const url = 'https://ralion-dynamic-backend.onrender.com/api/social/inbox';
  console.log(`[Diagnostic] Triggering GET ${url}...`);

  // 1. Without auth
  try {
    const resNoAuth = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    console.log(`[Without Auth] Status: ${resNoAuth.status}, Content-Type: ${resNoAuth.headers.get('content-type')}`);
    const bodyNoAuth = await resNoAuth.text();
    console.log(`[Without Auth] Body:`, bodyNoAuth);
  } catch (err: any) {
    console.error(`[Without Auth] Fetch failed:`, err.message);
  }

  // 2. With dummy auth / org headers
  try {
    const resWithOrg = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'x-organization-id': 'ras-ali-labs',
        'x-workspace-id': 'ras-ali-labs',
      }
    });
    console.log(`\n[With Org Headers] Status: ${resWithOrg.status}, Content-Type: ${resWithOrg.headers.get('content-type')}`);
    const bodyWithOrg = await resWithOrg.text();
    console.log(`[With Org Headers] Body:`, bodyWithOrg);
  } catch (err: any) {
    console.error(`[With Org Headers] Fetch failed:`, err.message);
  }

  // 3. With Bearer token simulation / dev bypass
  try {
    const resWithToken = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer test-token-diagnostic',
        'x-organization-id': 'ras-ali-labs',
      }
    });
    console.log(`\n[With Bearer Token] Status: ${resWithToken.status}, Content-Type: ${resWithToken.headers.get('content-type')}`);
    const bodyWithToken = await resWithToken.text();
    console.log(`[With Bearer Token] Body:`, bodyWithToken);
  } catch (err: any) {
    console.error(`[With Bearer Token] Fetch failed:`, err.message);
  }
}

main();

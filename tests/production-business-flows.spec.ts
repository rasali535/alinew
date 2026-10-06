import { test, expect, Page, APIResponse } from '@playwright/test';

const baseURL = process.env.RALION_E2E_BASE_URL;
const email = process.env.RALION_E2E_EMAIL;
const password = process.env.RALION_E2E_PASSWORD;
const forged = '00000000-0000-0000-0000-000000000001';

async function login(page: Page) {
  await page.goto(new URL('/login', baseURL!).toString());
  await page.locator('input[type="email"]').fill(email!);
  await page.locator('input[type="password"]').fill(password!);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL(/\/ralion\/(dashboard|mari-ai|growth|social)/, { timeout: 30_000 });
  const token = await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem('ralion-app-auth-token') || 'null');
    return value?.access_token || value?.currentSession?.access_token;
  });
  expect(token).toBeTruthy();
  const headers = { Authorization: `Bearer ${token}` };
  const response = await page.request.get(new URL('/api/auth/context', baseURL!).toString(), { headers, timeout: 45_000 });
  const context = await successfulJson(response);
  expect(context.organization.id).toBeTruthy();
  expect(context.workspace.id).toBeTruthy();
  expect(context.organization.id).not.toBe(forged);
  return { headers, context };
}

async function successfulJson(response: APIResponse) {
  expect(response.status(), 'Authenticated API must succeed').toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  const body = await response.json();
  expect(body.success).toBe(true);
  return body;
}

test.describe('Authenticated business data and mutation boundaries', () => {
  test.skip(!baseURL || !email || !password, 'Authenticated production E2E secrets are required.');
  test.setTimeout(180_000);

  test('billing, credits, assets and social history belong to the canonical tenant', async ({ page }) => {
    const { headers, context } = await login(page);
    const org = context.organization.id;
    const workspace = context.workspace.id;
    const get = async (path: string) => successfulJson(await page.request.get(new URL(path, baseURL!).toString(), { headers, timeout: 30_000 }));
    const billing = await get('/api/billing/subscription');
    expect(billing.subscription.organizationId).toBe(org);
    for (const field of ['balance', 'monthlyQuota', 'reserved', 'used']) {
      expect(Number.isFinite(billing.credits[field]), field).toBe(true);
      expect(billing.credits[field], field).toBeGreaterThanOrEqual(0);
    }
    // This endpoint intentionally ignores legacy tenant hints. Verify the
    // returned identity, rather than accepting success alone.
    const hintedBilling = await get(`/api/billing/subscription?organizationId=${forged}`);
    expect(hintedBilling.subscription.organizationId).toBe(org);
    const history = await get('/api/billing/history');
    expect(Array.isArray(history.transactions)).toBe(true);
    expect(Array.isArray(history.creditHistory)).toBe(true);
    for (const row of [...history.transactions, ...history.creditHistory]) expect(row.organizationId).toBe(org);
    const usage = await get('/api/mari/usage');
    expect(usage.data.organizationId).toBe(org);
    expect(usage.data.credits.organizationId).toBe(org);
    const assets = await get('/api/creatives/list?limit=5');
    expect(Array.isArray(assets.assets)).toBe(true);
    for (const asset of assets.assets) {
      expect(asset.organizationId).toBe(org);
      if (asset.workspaceId) expect(asset.workspaceId).toBe(workspace);
    }
    const connections = await get('/api/social/connections');
    expect(connections.organizationId).toBe(org);
    expect(connections.workspaceId).toBe(workspace);
    expect(Array.isArray(connections.connections)).toBe(true);
    for (const connection of connections.connections) {
      expect(connection.organization_id).toBe(org);
      expect(connection.workspace_id).toBe(workspace);
      expect(connection).not.toHaveProperty('access_token');
      expect(connection).not.toHaveProperty('refresh_token');
      expect(connection).not.toHaveProperty('zernio_profile_id');
    }
    const posts = await get('/api/social/posts?limit=5');
    expect(Array.isArray(posts.posts)).toBe(true);
    for (const post of posts.posts) {
      expect(post.organization_id).toBe(org);
      expect(post.workspace_id).toBe(workspace);
    }
  });

  test('forged tenant access and invalid mutations fail before provider work', async ({ page }) => {
    const { headers } = await login(page);
    const cases = [
      { method: 'GET', path: `/api/billing/history?organizationId=${forged}`, status: 403 },
      { method: 'GET', path: `/api/creatives/list?organizationId=${forged}`, status: 403 },
      { method: 'GET', path: `/api/creatives/${forged}/delivery?workspaceId=${forged}`, status: 403 },
      { method: 'DELETE', path: `/api/creatives/${forged}?organizationId=${forged}`, status: 403 },
      { method: 'GET', path: `/api/social/posts/by-connection?socialConnectionId=${forged}`, status: 403 },
      { method: 'POST', path: '/api/mari/context', data: { organizationId: forged }, status: 403 },
      { method: 'POST', path: '/api/mari/voice/usage', data: { sessionId: 'security-denied-probe' }, tenantHeaders: true, status: 403 },
      { method: 'POST', path: '/api/billing/subscription', data: { planId: 'ENTERPRISE', status: 'ACTIVE' }, status: 405 },
      { method: 'POST', path: '/api/social/posts', data: { content: '' }, status: 400 },
      { method: 'POST', path: '/api/social/posts', data: { content: 'Validation probe', platforms: ['unsupported'] }, status: 400 },
      { method: 'POST', path: '/api/social/posts', data: { content: 'Validation probe', mediaUrls: ['https://127.0.0.1/private'] }, status: 400 },
      { method: 'POST', path: '/api/mari/voice/usage', data: {}, status: 400 },
      { method: 'GET', path: '/api/social/posts?limit=-1', status: 400 },
    ];
    for (const probe of cases) {
      const response = await page.request.fetch(new URL(probe.path, baseURL!).toString(), {
        method: probe.method,
        headers: { ...headers, ...(probe.tenantHeaders ? { 'x-organization-id': forged, 'x-workspace-id': forged } : {}) },
        data: probe.data, timeout: 20_000,
      });
      expect(response.status(), `${probe.method} ${probe.path}`).toBe(probe.status);
      expect(response.headers()['content-type']).toContain('application/json');
      expect((await response.json()).success).toBe(false);
    }
  });
});

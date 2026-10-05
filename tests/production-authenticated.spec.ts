import { test, expect } from '@playwright/test';

const baseURL = process.env.RALION_E2E_BASE_URL;
const email = process.env.RALION_E2E_EMAIL;
const password = process.env.RALION_E2E_PASSWORD;

test.describe('Ralion authenticated production gauntlet', () => {
  test.skip(!baseURL || !email || !password, 'Authenticated production E2E secrets are required.');

  test('login resolves canonical tenant and rejects forged tenant authority', async ({ page }) => {
    await page.goto(new URL('/login', baseURL!).toString());
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/ralion\/(dashboard|mari-ai|growth|social)/, { timeout: 30_000 });

    const token = await page.evaluate(() => {
      const raw = localStorage.getItem('ralion-app-auth-token');
      if (!raw) return null;
      try {
        const value = JSON.parse(raw);
        return value?.access_token || value?.currentSession?.access_token || null;
      } catch {
        return null;
      }
    });
    expect(token, 'Canonical Ralion Supabase access token should exist after login').toBeTruthy();

    const headers = { Authorization: `Bearer ${token}` };
    const ctx = await page.request.get(new URL('/api/auth/context', baseURL!).toString(), { headers });
    expect(ctx.status()).toBe(200);
    const canonical = await ctx.json();
    expect(canonical?.organization?.id).toBeTruthy();
    expect(canonical?.workspace?.id).toBeTruthy();

    const forged = '00000000-0000-0000-0000-000000000001';
    expect(forged).not.toBe(canonical.organization.id);
    expect(forged).not.toBe(canonical.workspace.id);

    const mari = await page.request.post(new URL('/api/mari/chat', baseURL!).toString(), {
      headers: { ...headers, 'Content-Type': 'application/json', 'x-organization-id': forged },
      data: { query: 'hello', organizationId: forged },
    });
    expect(mari.status()).toBe(403);

    const assets = await page.request.get(new URL('/api/creatives/list', baseURL!).toString(), {
      headers: { ...headers, 'x-organization-id': forged, 'x-workspace-id': forged },
    });
    expect([200, 403]).toContain(assets.status());
    if (assets.status() === 200) {
      const body = await assets.json();
      const rows = body.assets || body.data || [];
      for (const asset of rows) {
        if (asset.organizationId) expect(asset.organizationId).toBe(canonical.organization.id);
      }
    }

    const billing = await page.request.get(
      new URL(`/api/billing/subscription?organizationId=${forged}`, baseURL!).toString(),
      { headers: { ...headers, 'x-organization-id': forged } },
    );
    expect([200, 403]).toContain(billing.status());
    if (billing.status() === 200) expect((await billing.json()).success).toBe(true);
  });

  test('session survives reload and logout clears authenticated access', async ({ page }) => {
    await page.goto(new URL('/login', baseURL!).toString());
    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/ralion\//, { timeout: 30_000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    expect(page.url()).toContain('/ralion/');

    // The app authenticates API calls with a Supabase bearer token, not browser
    // cookies. Read the persisted canonical session after reload and prove that
    // the token still authorizes the server-side canonical context.
    const token = await page.evaluate(() => {
      const raw = localStorage.getItem('ralion-app-auth-token');
      if (!raw) return null;
      try {
        const value = JSON.parse(raw);
        return value?.access_token || value?.currentSession?.access_token || null;
      } catch {
        return null;
      }
    });
    expect(token, 'Persisted Ralion access token should survive reload').toBeTruthy();

    const before = await page.request.get(new URL('/api/auth/context', baseURL!).toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(before.status(), 'Persisted token should authorize canonical context after reload').toBe(200);

    const logout = page.getByRole('button', { name: /logout|sign out/i }).first();
    await expect(logout, 'A visible logout control is required for this gauntlet').toBeVisible();
    await logout.click();

    await expect
      .poll(async () => page.evaluate(() => Boolean(localStorage.getItem('ralion-app-auth-token'))), { timeout: 10_000 })
      .toBe(false);
  });
});

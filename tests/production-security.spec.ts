import { test, expect } from '@playwright/test';

const baseURL = process.env.RALION_E2E_BASE_URL;

test.describe('Ralion production security boundary', () => {
  test.skip(!baseURL, 'RALION_E2E_BASE_URL is required for live production E2E.');

  test('anonymous APIs fail closed even with forged tenant headers', async ({ request }) => {
    const headers = {
      'x-organization-id': '00000000-0000-0000-0000-000000000001',
      'x-workspace-id': '00000000-0000-0000-0000-000000000002',
      'x-user-id': '00000000-0000-0000-0000-000000000003',
    };
    const cases = [
      ['GET', '/api/auth/context'], ['POST', '/api/mari/actions'],
      ['GET', '/api/oauth/facebook/status'], ['POST', '/api/oauth/facebook/refresh'],
      ['DELETE', '/api/oauth/facebook/disconnect'], ['GET', '/api/creatives/list'],
      ['GET', '/api/social/posts/by-connection?socialConnectionId=00000000-0000-0000-0000-000000000004'],
    ] as const;
    for (const [method, path] of cases) {
      const response = await request.fetch(new URL(path, baseURL!).toString(), {
        method, headers,
        data: method === 'POST' ? { action: { type: 'NAVIGATE', payload: { route: '/growth' } }, refreshToken: 'forged' } : undefined,
      });
      expect([401, 403], `${method} ${path} must fail closed`).toContain(response.status());
    }
  });

  test('platform admin rejects anonymous forged-tenant request', async ({ request }) => {
    const response = await request.get(new URL('/api/admin/metrics', baseURL!).toString(), {
      headers: { 'x-organization-id': '00000000-0000-0000-0000-000000000001' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('guessed raw creative filename is not publicly readable', async ({ request }) => {
    const response = await request.get(new URL('/api/creatives/file/guessed-private-asset.png', baseURL!).toString());
    expect([401, 403, 404]).toContain(response.status());
  });
});

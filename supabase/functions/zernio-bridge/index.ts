import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Read secret securely from Supabase Secrets
    const apiKey = Deno.env.get('ZERNIO_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'ZERNIO_NOT_CONFIGURED',
          error: 'ZERNIO_API_KEY is not configured in Supabase Secrets',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 503,
        }
      );
    }

    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/zernio-bridge/, '');

    // Health check endpoint
    if (pathname === '/health' || pathname === '' || pathname === '/') {
      const startTime = Date.now();
      const zRes = await fetch('https://zernio.com/api/v1/profiles', {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          Accept: 'application/json',
          'User-Agent': 'Ralion-Supabase-Edge-Bridge/1.0.0',
        },
      });

      const latencyMs = Date.now() - startTime;
      const reachable = zRes.ok;

      return new Response(
        JSON.stringify({
          success: true,
          status: reachable ? 'ZERNIO_CONNECTED' : 'ZERNIO_CONNECTION_FAILED',
          configured: true,
          reachable,
          latencyMs,
          statusCode: zRes.status,
          checkedAt: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Proxy request to official Zernio API
    const targetUrl = `https://zernio.com/api/v1${pathname}${url.search}`;
    const headers = new Headers();
    headers.set('Authorization', `Bearer ${apiKey.trim()}`);
    headers.set('Accept', 'application/json');
    headers.set('User-Agent', 'Ralion-Supabase-Edge-Bridge/1.0.0');

    const idempotencyKey = req.headers.get('idempotency-key');
    if (idempotencyKey) {
      headers.set('Idempotency-Key', idempotencyKey);
    }

    const contentType = req.headers.get('content-type');
    if (contentType) {
      headers.set('Content-Type', contentType);
    }

    const zernioResponse = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    });

    const responseData = await zernioResponse.text();

    return new Response(responseData, {
      status: zernioResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': zernioResponse.headers.get('content-Type') || 'application/json',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        status: 'ZERNIO_CONNECTION_FAILED',
        error: 'Edge Function proxy error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

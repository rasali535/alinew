import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';

type HealthStatus = 'UP' | 'DEGRADED' | 'DOWN';
interface HealthMetric {
  service: string;
  status: HealthStatus;
  latencyMs: number;
  lastChecked: string;
  lastError?: string;
  failureCount: number;
  verification?: 'PROBED' | 'CONFIG_ONLY';
}

function configMetric(service: string, configured: boolean, detail: string, now: string): HealthMetric {
  return {
    service,
    status: configured ? 'UP' : 'DEGRADED',
    latencyMs: 0,
    lastChecked: now,
    lastError: configured ? `Configuration present; external provider was not called by this health check (${detail}).` : `Required configuration missing (${detail}).`,
    failureCount: configured ? 0 : 1,
    verification: 'CONFIG_ONLY',
  };
}

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformAdminRequest(request);
  if (!auth.authorized) return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode || 403 });

  const metrics: HealthMetric[] = [];
  const now = new Date().toISOString();
  let supabase: ReturnType<typeof getPrivilegedSupabase> | null = null;

  const startDb = Date.now();
  try {
    supabase = getPrivilegedSupabase();
    const { error } = await supabase.from('organizations').select('id', { head: true, count: 'exact' });
    metrics.push({
      service: 'Supabase Database (PostgreSQL)',
      status: error ? 'DEGRADED' : 'UP',
      latencyMs: Date.now() - startDb,
      lastChecked: now,
      lastError: error?.message,
      failureCount: error ? 1 : 0,
      verification: 'PROBED',
    });
  } catch (error: any) {
    metrics.push({ service: 'Supabase Database (PostgreSQL)', status: 'DOWN', latencyMs: Date.now() - startDb, lastChecked: now, lastError: error?.message || String(error), failureCount: 1, verification: 'PROBED' });
  }

  const startStorage = Date.now();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      const hasDocuments = Boolean(data?.some(bucket => bucket.id === 'ralion-documents'));
      const hasCreatives = Boolean(data?.some(bucket => bucket.id === 'creatives'));
      const storageError = error?.message || (!hasCreatives ? 'Creatives bucket not found.' : undefined);
      metrics.push({
        service: 'Supabase Storage',
        status: error || !hasCreatives ? 'DEGRADED' : 'UP',
        latencyMs: Date.now() - startStorage,
        lastChecked: now,
        lastError: storageError || (!hasDocuments ? 'Operational documents bucket is pending deployment migration.' : undefined),
        failureCount: error || !hasCreatives ? 1 : 0,
        verification: 'PROBED',
      });
    } catch (error: any) {
      metrics.push({ service: 'Supabase Storage', status: 'DOWN', latencyMs: Date.now() - startStorage, lastChecked: now, lastError: error?.message || String(error), failureCount: 1, verification: 'PROBED' });
    }
  } else {
    metrics.push({ service: 'Supabase Storage', status: 'DOWN', latencyMs: 0, lastChecked: now, lastError: 'Database client unavailable, so Storage could not be probed.', failureCount: 1, verification: 'PROBED' });
  }

  const renderUrl = process.env.NEXT_PUBLIC_RALION_API_URL || 'https://ralion-dynamic-backend.onrender.com';
  const startRender = Date.now();
  try {
    const renderRes = await fetch(`${renderUrl.replace(/\/+$/, '')}/api/health`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    let validPayload = false;
    if (renderRes.ok) {
      const payload = await renderRes.json().catch(() => null);
      validPayload = payload?.ok === true && payload?.service === 'ralion-dynamic-backend';
    }
    metrics.push({
      service: 'Ralion Dynamic Backend (Render)',
      status: renderRes.ok && validPayload ? 'UP' : 'DEGRADED',
      latencyMs: Date.now() - startRender,
      lastChecked: now,
      lastError: renderRes.ok && validPayload ? undefined : `Unexpected health response (HTTP ${renderRes.status}).`,
      failureCount: renderRes.ok && validPayload ? 0 : 1,
      verification: 'PROBED',
    });
  } catch (error: any) {
    metrics.push({ service: 'Ralion Dynamic Backend (Render)', status: 'DEGRADED', latencyMs: Date.now() - startRender, lastChecked: now, lastError: error?.message || String(error), failureCount: 1, verification: 'PROBED' });
  }

  metrics.push(configMetric('Meta Graph API / OAuth Gateway', Boolean(process.env.FACEBOOK_APP_ID || process.env.META_APP_ID), 'FACEBOOK_APP_ID or META_APP_ID', now));
  metrics.push(configMetric('Zernio Social Publishing Bridge', Boolean(process.env.ZERNIO_API_KEY), 'ZERNIO_API_KEY', now));
  metrics.push(configMetric('PayPal Commercial Gateway', Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET), 'PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET', now));
  metrics.push(configMetric('PayPal Webhook Verification', Boolean(process.env.PAYPAL_WEBHOOK_ID), 'PAYPAL_WEBHOOK_ID', now));
  metrics.push(configMetric('Mari AI Reasoning Provider', Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY), 'AI provider API key', now));
  metrics.push(configMetric('Creative Image Provider', Boolean(process.env.REPLICATE_API_TOKEN || process.env.HUGGINGFACE_API_KEY || process.env.FAL_KEY), 'creative image provider credential', now));

  const overallStatus: HealthStatus = metrics.some(m => m.status === 'DOWN') ? 'DOWN' : metrics.some(m => m.status === 'DEGRADED') ? 'DEGRADED' : 'UP';

  return NextResponse.json({ success: true, data: { overallStatus, timestamp: now, services: metrics } });
}

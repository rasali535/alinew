import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdminRequest } from '../../../../../lib/auth/adminAuth';
import { getPrivilegedSupabase } from '@/lib/supabase/server';
import { R2StorageProvider, getProductionStorageProvider } from '@ralion/ai/server';
import { SocialPublishingService } from '@/lib/services/social/socialPublishing.service';

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

  const r2Configured = Boolean(
    process.env.R2_ENDPOINT &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
  const startR2 = Date.now();
  if (!r2Configured) {
    metrics.push(configMetric('Cloudflare R2 Media Storage', false, 'R2_ENDPOINT + R2_BUCKET_NAME + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY', now));
  } else {
    try {
      const r2 = new R2StorageProvider({
        endpoint: process.env.R2_ENDPOINT!,
        bucketName: process.env.R2_BUCKET_NAME!,
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        region: process.env.R2_REGION || 'auto',
      });
      await r2.list(undefined, { limit: 1 });

      // Exercise the real write path without touching creative generation or
      // credits. The canary is tiny, private, verified, and deleted immediately.
      let canaryPath: string | null = `_health/ralion-r2-${Date.now()}.txt`;
      try {
        const canary = Buffer.from('ralion-r2-health', 'utf8');
        await r2.upload(canaryPath, canary, { contentType: 'text/plain' });

        const roundTrip = await r2.download(canaryPath);
        if (!roundTrip || !roundTrip.buffer.equals(canary)) {
          throw new Error('R2 health canary round-trip verification failed.');
        }

        const deleted = await r2.delete(canaryPath);
        if (!deleted) {
          throw new Error('R2 health canary cleanup failed.');
        }
        canaryPath = null;
      } finally {
        if (canaryPath) {
          await r2.delete(canaryPath).catch(() => false);
        }
      }

      metrics.push({
        service: 'Cloudflare R2 Media Storage',
        status: 'UP',
        latencyMs: Date.now() - startR2,
        lastChecked: now,
        failureCount: 0,
        verification: 'PROBED',
      });
    } catch (error: any) {
      metrics.push({
        service: 'Cloudflare R2 Media Storage',
        status: 'DOWN',
        latencyMs: Date.now() - startR2,
        lastChecked: now,
        lastError: String(error?.message || error || 'R2 probe failed').slice(0, 500),
        failureCount: 1,
        verification: 'PROBED',
      });
    }
  }

  const legacyFallbackPath = process.env.RALION_LEGACY_STORAGE_CANARY_PATH?.trim();
  if (legacyFallbackPath) {
    const startLegacyFallback = Date.now();
    try {
      const storage = getProductionStorageProvider();
      if (!storage.createSignedUrl) {
        throw new Error('Active storage provider cannot create signed URLs.');
      }

      const signed = await storage.createSignedUrl(legacyFallbackPath, 120);
      if (!signed?.signedUrl) {
        throw new Error('Hybrid storage did not resolve the configured legacy asset.');
      }

      const signedUrl = new URL(signed.signedUrl);
      const isSupabaseFallback =
        signedUrl.hostname.endsWith('.supabase.co') &&
        signedUrl.pathname.includes('/storage/v1/object/sign/');

      if (!isSupabaseFallback) {
        throw new Error('Configured legacy canary did not resolve through Supabase fallback.');
      }

      const probe = await fetch(signed.signedUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(7000),
      });

      if (!probe.ok) {
        throw new Error(`Legacy fallback signed delivery failed (HTTP ${probe.status}).`);
      }

      const contentType = probe.headers.get('content-type') || '';
      const body = Buffer.from(await probe.arrayBuffer());
      if (!contentType.startsWith('image/') || body.byteLength < 1000) {
        throw new Error('Legacy fallback returned an invalid or unexpectedly small media object.');
      }

      metrics.push({
        service: 'Legacy Supabase Creative Fallback',
        status: 'UP',
        latencyMs: Date.now() - startLegacyFallback,
        lastChecked: now,
        failureCount: 0,
        verification: 'PROBED',
      });
    } catch (error: any) {
      metrics.push({
        service: 'Legacy Supabase Creative Fallback',
        status: 'DOWN',
        latencyMs: Date.now() - startLegacyFallback,
        lastChecked: now,
        lastError: String(error?.message || error || 'Legacy fallback probe failed').slice(0, 500),
        failureCount: 1,
        verification: 'PROBED',
      });
    }
  } else {
    metrics.push(configMetric(
      'Legacy Supabase Creative Fallback',
      false,
      'RALION_LEGACY_STORAGE_CANARY_PATH',
      now
    ));
  }

  const socialCanaryAssetId = process.env.RALION_SOCIAL_MEDIA_CANARY_ASSET_ID?.trim();
  const socialCanaryOrgId = process.env.RALION_SOCIAL_MEDIA_CANARY_ORG_ID?.trim();
  const socialCanaryWorkspaceId = process.env.RALION_SOCIAL_MEDIA_CANARY_WORKSPACE_ID?.trim();
  if (socialCanaryAssetId && socialCanaryOrgId && socialCanaryWorkspaceId) {
    const startSocialMedia = Date.now();
    try {
      const result = await SocialPublishingService.probeCreativeMediaForPublish({
        mediaUrl: socialCanaryAssetId,
        organizationId: socialCanaryOrgId,
        workspaceId: socialCanaryWorkspaceId,
        mediaType: 'image',
      });

      if (!result.ok || !result.providerHost.endsWith('.r2.cloudflarestorage.com')) {
        throw new Error('Social media canary did not resolve through Cloudflare R2.');
      }

      metrics.push({
        service: 'R2 → Social Media Handoff',
        status: 'UP',
        latencyMs: Date.now() - startSocialMedia,
        lastChecked: now,
        failureCount: 0,
        verification: 'PROBED',
      });
    } catch (error: any) {
      metrics.push({
        service: 'R2 → Social Media Handoff',
        status: 'DOWN',
        latencyMs: Date.now() - startSocialMedia,
        lastChecked: now,
        lastError: String(error?.message || error || 'Social media handoff probe failed').slice(0, 500),
        failureCount: 1,
        verification: 'PROBED',
      });
    }
  } else {
    metrics.push(configMetric(
      'R2 → Social Media Handoff',
      false,
      'RALION_SOCIAL_MEDIA_CANARY_ASSET_ID + RALION_SOCIAL_MEDIA_CANARY_ORG_ID + RALION_SOCIAL_MEDIA_CANARY_WORKSPACE_ID',
      now
    ));
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

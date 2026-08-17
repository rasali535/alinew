# Ralion OS — Supabase Secret Configuration & Zernio Bridge Guide

**Document Version:** 1.0.0  
**Date:** August 17, 2026  
**Author:** Ras Ali Labs (Pty) Ltd Architecture Team  

---

## 1. Overview

The `ZERNIO_API_KEY` has been saved in Supabase under **Secrets**.

Because Supabase Secrets are encrypted at rest and accessible to **Supabase Edge Functions** via `Deno.env.get('ZERNIO_API_KEY')`, this guide explains how Ralion OS utilizes the secret without exposing it to client browsers or repositories.

---

## 2. Architectural Paths

```text
┌────────────────────────────────────────────────────────────┐
│                  RALION OS USER INTERFACE                  │
│       Social Hub • Admin Observability • Composer          │
└─────────────────────────────┬──────────────────────────────┘
                              │ Standard Ralion API Request
                              ▼
┌────────────────────────────────────────────────────────────┐
│                    RALION NODE/NEXT SERVER                 │
│                 (Hostinger VPS / Local Server)             │
└──────────────┬──────────────────────────────┬──────────────┘
               │                              │
     Option A: │ Direct Server Environment    │ Option B: Supabase Edge Bridge
               │ `process.env.ZERNIO_API_KEY` │ (Consumes Supabase Secret)
               ▼                              ▼
┌─────────────────────────────┐┌─────────────────────────────┐
│     ZernioSocialService     ││   Supabase Edge Function    │
│  Direct Node.js API client  ││      (`zernio-bridge`)      │
│                             ││   `Deno.env.get('KEY')`     │
└──────────────┬──────────────┘└──────────────┬──────────────┘
               │                              │
               ▼                              ▼
┌────────────────────────────────────────────────────────────┐
│                     ZERNIO OFFICIAL API                    │
│                  https://zernio.com/api/v1                 │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Option A: Server Runtime Environment Variable (Recommended for VPS / Hostinger)

If running the Next.js application on Hostinger VPS or local environment:
1. Add `ZERNIO_API_KEY` to the server environment:
   * **Local:** Add to `apps/ralion/.env.local` (git-ignored).
   * **Hostinger VPS:** In your VPS Docker or PM2 environment configuration, set `ZERNIO_API_KEY`.
2. Run `node scripts/verify-zernio-secret.js`.
3. The state will transition from `ZERNIO_NOT_CONFIGURED` $\longrightarrow$ `ZERNIO_CONNECTED`.

---

## 4. Option B: Supabase Edge Function Deployment

The Supabase Edge Function has been generated at:
`supabase/functions/zernio-bridge/index.ts`

To deploy it to your Supabase project (`yidsfihagwttlmhfynmf`):
```bash
npx supabase functions deploy zernio-bridge --project-ref yidsfihagwttlmhfynmf
```

Once deployed:
* The Edge Function automatically accesses `Deno.env.get('ZERNIO_API_KEY')` stored in Supabase Secrets.
* Ralion API routes can proxy requests through `https://yidsfihagwttlmhfynmf.supabase.co/functions/v1/zernio-bridge`.

---

## 5. Security & Zero-Leakage Guarantee

* The API key is **never** sent to browser components, network responses, or client storage.
* Responses from `/api/social/zernio/status` return only the sanitized state:
  * `ZERNIO_NOT_CONFIGURED`
  * `ZERNIO_CONFIGURED`
  * `ZERNIO_CONNECTED`
  * `ZERNIO_CONNECTION_FAILED`

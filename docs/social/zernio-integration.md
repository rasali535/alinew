# Ralion OS — Zernio Social Infrastructure Integration Guide

**Document Version:** 1.0.0  
**Date:** August 17, 2026  
**Author:** Ras Ali Labs (Pty) Ltd Architecture Team  

---

## 1. Overview

This document details the architecture and operational implementation of **Zernio** as a unified social infrastructure layer in **Ralion OS**.

Zernio operates as an infrastructure provider behind Ralion's `SocialProvider` abstraction. All client-facing applications (Social Hub, Content Composer, Scheduler, Analytics, Inbox) interact strictly with Ralion services without direct coupling to Zernio. Existing native integrations (Meta, LinkedIn, X, TikTok, WhatsApp) continue to operate in parallel.

---

## 2. Architectural Blueprint

```text
┌────────────────────────────────────────────────────────────┐
│                    RALION OS CLIENT UI                     │
│    Social Hub • Content Composer • Analytics • Inbox       │
└─────────────────────────────┬──────────────────────────────┘
                              │ Standard Ralion API
                              ▼
┌────────────────────────────────────────────────────────────┐
│                RALION API / SERVER BOUNDARY                │
│    Authentication • Workspace Isolation • Audit Logging    │
└─────────────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│               SocialPublishingService / Router              │
│       Selects ZernioProvider or Native Adapters            │
└──────────────┬──────────────────────────────┬──────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────┐┌─────────────────────────────┐
│       ZernioProvider        ││      Native Providers       │
│    (ZernioSocialService)    ││   (Meta, LinkedIn, X, etc.) │
└──────────────┬──────────────┘└──────────────┬──────────────┘
               │ [ZERNIO_API_KEY]             │ [Platform OAuth Vault]
               ▼                              ▼
┌─────────────────────────────┐┌─────────────────────────────┐
│          Zernio API         ││       Direct Platform       │
│   (https://zernio.com/api)  ││       REST & Graph APIs     │
└──────────────┬──────────────┘└──────────────┬──────────────┘
               │                              │
               ▼                              ▼
┌────────────────────────────────────────────────────────────┐
│                     SOCIAL PLATFORMS                       │
│    Instagram • Facebook • LinkedIn • X • TikTok • WhatsApp │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Core Components

1. **`ZernioSocialService`** (`packages/integrations/src/social/services/ZernioSocialService.ts`):
   * Authenticates requests strictly server-side using Bearer token (`ZERNIO_API_KEY`).
   * Handles tenant profile creation, account queries, post creation with idempotency keys, analytics retrieval, inbox replies, and webhook HMAC-SHA256 signature verification.
   * Manages rate limits with exponential backoff on HTTP 429 responses.
2. **`ZernioProvider`** (`packages/integrations/src/social/adapters/ZernioProvider.ts`):
   * Adapter implementing Ralion's base `SocialProvider` class.
   * Normalizes Zernio responses into standard Ralion models (`PublishResponse`, `SocialAnalyticsResult`, `ConnectionHealthResult`).
3. **`SocialProviderRouter`** (`apps/ralion/src/lib/services/social/socialProviderRouter.service.ts`):
   * Evaluates feature flags and workspace routing configurations to dispatch requests to either `ZernioProvider` or native providers.
   * Resolves or provisions Zernio tenant profiles 1:1 with Ralion organizations/workspaces.
4. **`SocialPublishingService`** (`apps/ralion/src/lib/services/social/socialPublishing.service.ts`):
   * Orchestrates parallel multi-platform publishing.
   * Generates operation idempotency keys to eliminate double-posting risks.

---

## 4. Configuration & Environment Variables

The following secrets and flags must be configured server-side:

```env
# ----- Zernio Social Infrastructure (Server-Side Only) -----
ZERNIO_API_KEY=your_zernio_api_key_here
ZERNIO_WEBHOOK_SECRET=your_zernio_webhook_secret_here
ZERNIO_API_BASE_URL=https://zernio.com/api/v1

# ----- Feature Flags (Optional, defaults to true) -----
ZERNIO_SOCIAL_ENABLED=true
ZERNIO_INSTAGRAM_ENABLED=true
ZERNIO_FACEBOOK_ENABLED=true
ZERNIO_TIKTOK_ENABLED=true
ZERNIO_LINKEDIN_ENABLED=true
ZERNIO_X_ENABLED=true
ZERNIO_WHATSAPP_ENABLED=true
```

---

## 5. Security Principles

* **No Client Exposure:** `ZERNIO_API_KEY` is never sent to browser bundles, React components, or client storage.
* **Tenant Isolation:** Every Ralion workspace maps to a dedicated Zernio profile container.
* **RLS Protection:** All database records (`social_provider_profiles`, `social_connections`, `social_posts`) enforce Row Level Security.

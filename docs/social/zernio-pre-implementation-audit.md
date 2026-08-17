# Ralion OS — Zernio Social Infrastructure Pre-Implementation Audit

**Document Version:** 1.0.0  
**Audit Date:** August 17, 2026  
**Auditor:** Ralion Engineering & Security Architecture  
**Target:** Unified Social Media Architecture (`@ralion/integrations`, Supabase backend, Ralion OS Growth UI, Next.js API Routes, Server Services)

---

## 1. Executive Summary

Ralion OS is an enterprise AI-powered Operating System and SaaS platform with multi-tenant workspace isolation, role-based access control (RBAC), an existing Social Hub, a multi-platform content composer, scheduled publishing pipelines, unified inbox aggregation, security audit logging, and native direct OAuth integrations for Meta (Facebook, Instagram, WhatsApp), LinkedIn, X (Twitter), TikTok, and Google/YouTube.

This audit evaluates the feasibility, integration points, security posture, and migration risks of integrating **Zernio** (`https://zernio.com/api/v1`) as a secondary, abstracted social infrastructure provider behind Ralion's existing `SocialProvider` interface, while strictly preserving native integrations and maintaining client-side zero-trust security.

---

## 2. Existing System Architecture

### 2.1 Monorepo Structure & Workspaces
* **Monorepo Manager:** npm workspaces
* **Workspaces:**
  * `apps/ralion`: Next.js 15+ Enterprise SaaS Application (App Router, Tailwind CSS, Lucide icons, Supabase Auth & DB client)
  * `apps/admin`: Next.js Admin & Operational Control Center
  * `apps/website`: React/Vite Customer-facing marketing & documentation portal
  * `apps/desktop`: Electron / Desktop packaged client
  * `packages/integrations`: Core TypeScript provider registry, base `SocialProvider` class, crypto gateway (AES-256-GCM), native adapters (`MetaProvider`, `InstagramProvider`, `WhatsAppProvider`, `LinkedInProvider`, `TikTokProvider`, `XProvider`), and memory engine
  * `packages/database`: Supabase SQL migrations, schema types, and client configuration
  * `packages/modules`: Enterprise module registry and permission matrix
  * `packages/auth`: Authentication helpers and session utilities
  * `server`: Express backend services for AI orchestration, database queries, and background workers

### 2.2 Existing Social Providers
The existing social architecture is modularized in `packages/integrations/src/social/`:
* **`SocialProvider` Abstract Base Class:** Standardizes `getCapabilities()`, `getAuthorizationUrl()`, `handleCallback()`, `refreshToken()`, `getProfile()`, `publish()`, `deletePost()`, `getAnalytics()`, `sendMessage()`, `revokeAccess()`, and `healthCheck()`.
* **`SocialProviderRegistry`:** Dynamic registry and factory that resolves providers by key (`facebook`, `instagram`, `whatsapp`, `tiktok`, `linkedin`, `x`).
* **Active Native Adapters:**
  1. `MetaProvider` (`/adapters/MetaProvider.ts`): Facebook Graph API v20.0
  2. `InstagramProvider` (`/adapters/InstagramProvider.ts`): Instagram Graph API via Facebook Business Login
  3. `WhatsAppProvider` (`/adapters/WhatsAppProvider.ts`): WhatsApp Cloud API (v20.0)
  4. `LinkedInProvider` (`/adapters/LinkedInProvider.ts`): LinkedIn REST v2 / Community Management API
  5. `TikTokProvider` (`/adapters/TikTokProvider.ts`): TikTok Display & Content Posting API v2 (PKCE)
  6. `XProvider` (`/adapters/XProvider.ts`): X (Twitter) API v2 (OAuth 2.0 PKCE)

---

## 3. Database Schema & Multi-Tenant Model

### 3.1 Tenancy & Organization Mapping
* **Authentication:** Supabase Auth (`auth.users`), JWT sessions, and server-side service role execution.
* **Tenant Isolation:**
  * `public.organizations`: Multi-tenant organization records (`id`, `name`, `slug`, `plan`).
  * `public.workspaces`: Scoped workspaces under an organization (`organization_id`, `owner_id`).
  * `public.workspace_members`: User-workspace mappings with roles (`OWNER`, `ADMINISTRATOR`, `MARKETING_MANAGER`, `SALES`, `VIEWER`).

### 3.2 Existing Social Tables
1. **`public.social_connections`**:
   * Stores connection metadata, status (`CONNECTED`, `NEEDS_ATTENTION`, `RECONNECT_REQUIRED`, `DISCONNECTED`, `REVOKED`), token status (`TOKEN_VALID`, `TOKEN_EXPIRING`, `TOKEN_EXPIRED`, `TOKEN_REVOKED`, `REAUTH_REQUIRED`), scopes, dynamic capabilities, follower counts, and sync timestamps.
   * Scoped to `user_id` and optional `organization_id` / `workspace_id`.
   * Uniqueness constraint: `UNIQUE(user_id, provider, provider_account_id)`.
2. **`public.social_credentials`**:
   * Isolated server-side credential vault storing `encrypted_access_token` and `encrypted_refresh_token` encrypted via AES-256-GCM.
   * **RLS:** Strict service-role only (`auth.role() = 'service_role'`). Clients cannot query this table.
3. **`public.social_posts`**:
   * Publishing queue, scheduled jobs, and multi-platform publishing records.
   * Tracks atomic per-platform results in `platform_results` JSONB and remote post IDs in `platform_post_ids` JSONB.
4. **`public.social_inbox_messages`**:
   * Aggregated inbound and outbound direct messages across WhatsApp, Instagram, Facebook Messenger, LinkedIn, and X.
5. **`public.social_webhooks_log`**:
   * Append-only immutable log for all incoming webhook payloads, signature validation results, and event processing outcomes.
6. **`public.security_audit_logs`**:
   * Immutable compliance audit trail logging event category, actor user ID, success status, resource ID, and sanitized metadata (automatic secret redaction).

### 3.3 Safe Views
* **`public.social_connections_safe`**: Exposes connection metadata while completely omitting access and refresh tokens from authenticated client queries.

---

## 4. Current Workflows & Lifecycles

### 4.1 OAuth Authorization Flow
1. User initiates connection from Ralion Growth UI (`/ralion/growth`).
2. Client requests `/api/oauth/[provider]/connect`.
3. Server generates CSRF state token with 15-minute expiration (`generateOAuthState(userId, provider)`) and sets PKCE code verifier in secure HTTP-only cookies if needed.
4. User authorizes with platform; platform redirects to `/api/oauth/[provider]/callback?code=...&state=...`.
5. Server verifies CSRF token, exchanges code for access/refresh tokens, queries profile metadata, encrypts tokens via `SocialTokenManager`, saves connection metadata, and redirects back to UI.

### 4.2 Publishing Flow
1. User creates or AI adapts content in Ralion Content Composer.
2. Client calls `/api/social/publish`.
3. `SocialContentValidator` validates body length, platform-specific character limits, media format, and scheduled date.
4. If scheduled, records post as `QUEUED` in `social_posts`.
5. If immediate, queries active connections from `social_connections`, retrieves decrypted tokens from `SocialTokenManager`, dispatches parallel publish requests to `SocialProviderRegistry.getProvider(platform).publish()`, records platform post IDs, and writes immutable audit log.

### 4.3 Webhook Handling Flow
1. Webhook hits `/api/webhooks/[provider]`.
2. GET request handles verification challenges (Meta hub.challenge, X CRC token).
3. POST request verifies HMAC-SHA256 signature against platform secrets using `crypto.timingSafeEqual`.
4. Ingests events (messages, status updates) and logs entry into `social_webhooks_log`.

---

## 5. Recommended Integration Points for Zernio

To integrate Zernio non-destructively without altering user experience or breaking existing native integrations:

1. **Provider Router & Strategy Pattern:**
   * Introduce a unified provider routing engine (`SocialProviderRouter` / `SocialProviderRoutingService`) that selects between `ZernioProvider` and native adapters (`MetaProvider`, `LinkedInProvider`, etc.) based on platform, organization configuration, and feature flags.
2. **Database Extension (Non-Destructive):**
   * Introduce `social_provider_profiles` table to map Ralion organizations/workspaces 1:1 with Zernio Profiles (`zernio_profile_id`).
   * Extend `social_connections` with `infrastructure_provider` (`'native' | 'zernio'`), `zernio_account_id`, and `zernio_profile_id` columns.
   * Create `social_provider_routing` table for granular routing control (platform, provider, priority, fallback).
3. **Zernio Service Layer (`ZernioSocialService`):**
   * Server-side service encapsulating all Zernio REST API calls (`https://zernio.com/api/v1`), authenticated exclusively with the server-side `ZERNIO_API_KEY` secret.
4. **ZernioProvider Adapter:**
   * Implement `ZernioProvider` implementing Ralion's `SocialProvider` interface so all downstream services (`SocialPublishingService`, `SocialAnalyticsService`, `SocialInboxService`, `SocialConnectionHealthService`) interact seamlessly without knowing whether Zernio or native is executing.
5. **Dedicated Webhook Handler (`/api/webhooks/zernio`):**
   * Validate `X-Zernio-Signature` with `ZERNIO_WEBHOOK_SECRET`.
   * Resolve `zernio_profile_id` to Ralion `organization_id` / `workspace_id`.
   * Ingest events into `social_inbox_messages`, update connection health, and log in `social_webhooks_log`.
6. **Admin Observability & Feature Flags:**
   * Extend Admin settings (`/admin/integrations/social`) with Zernio infrastructure status, reachability health check, connected account counts, and feature flag controls (`ZERNIO_SOCIAL_ENABLED`, `ZERNIO_INSTAGRAM_ENABLED`, etc.).

---

## 6. Potential Conflicts & Mitigation

| Conflict / Risk | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **Credential Leakage** | Zernio API key exposed to frontend client or committed to Git | Store `ZERNIO_API_KEY` in Supabase Secrets / Server `.env.local` only. No `NEXT_PUBLIC_*` or client-accessible variables. |
| **Duplicate Publishing** | Automatic retry on fallback publishing could duplicate posts | Idempotency keys enforced on all post operations. Fallbacks require deterministic confirmation that post was NOT created before attempting alternative route. |
| **Cross-Tenant Data Leak** | Zernio profile shared across multiple Ralion organizations | Enforce strict 1:1 mapping: each Ralion organization receives its own Zernio profile. Determine tenant strictly from authenticated session. |
| **Native Integration Degradation** | Introducing Zernio breaking existing Meta, LinkedIn, or X tokens | Keep native adapters fully functional. Allow coexistence; accounts connected natively continue using native OAuth and credential vault. |
| **Webhook Spoofing** | Forged webhook requests creating fake inbox messages | Verify HMAC-SHA256 signature (`X-Zernio-Signature`) using timing-safe buffer comparison. Resolve tenant only from database mapping. |

---

## 7. Audit Conclusion & Next Steps

The Ralion codebase has an established, clean abstraction layer (`SocialProvider`, `SocialProviderRegistry`, `SocialPublishingService`, `SocialTokenManager`, `SocialWebhookService`) and a database schema (`social_connections`, `social_credentials`, `social_posts`, `social_webhooks_log`, `security_audit_logs`). 

Zernio can be integrated cleanly as an infrastructure provider alongside native adapters by extending the registry and introducing the Zernio service layer, tenant mapping, and webhook endpoint.

**Next Immediate Step:** Produce verified Zernio API documentation (`/docs/social/zernio-api-verification.md`) and submit formal Implementation Plan.

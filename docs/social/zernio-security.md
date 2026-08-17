# Ralion OS — Zernio Security & Credential Management Policy

**Document Version:** 1.0.0  
**Date:** August 17, 2026  
**Author:** Ras Ali Labs (Pty) Ltd Security Architecture Team  

---

## 1. Overview

This document specifies the security controls, secret protection mechanisms, tenant isolation safeguards, and cryptographic standards governing the Zernio social infrastructure integration in Ralion OS.

---

## 2. Server-Side Secret Management

### 2.1 API Key Storage & Access
* The master `ZERNIO_API_KEY` is classified as **Critical Infrastructure Secret**.
* The key is stored strictly in server environment secrets (`process.env.ZERNIO_API_KEY`) and Supabase Secret Management Vault.
* The key is never persisted in database tables, client bundles, `NEXT_PUBLIC_*` or `VITE_*` environment variables, `localStorage`, `sessionStorage`, or logs.

### 2.2 Client-Side Zero-Trust Boundary
* Client applications (browsers, Electron desktop app) communicate exclusively with authenticated Ralion API endpoints (`/api/social/*`, `/api/oauth/*`, `/api/webhooks/*`).
* The client never receives the raw Zernio API key or platform OAuth tokens.

---

## 3. Cryptographic Controls

### 3.1 Token Encryption at Rest
* Where native platform tokens are stored in `public.social_credentials`, they are encrypted using **AES-256-GCM** with 96-bit random IVs and 128-bit authentication tags.
* When using Zernio, platform tokens are managed within Zernio's certified vault, and Ralion stores only metadata and opaque identifiers.

### 3.2 Webhook Signature Verification
* Inbound webhooks to `/api/webhooks/zernio` are verified via **HMAC-SHA256** using `ZERNIO_WEBHOOK_SECRET`.
* Header comparison uses `crypto.timingSafeEqual` to eliminate timing attack vulnerabilities.

---

## 4. Row Level Security (RLS) & Multi-Tenant Boundaries

All database tables supporting social infrastructure have Row Level Security enabled:

1. **`public.social_provider_profiles`**:
   * Scoped to `user_id` and `workspace_id`. Authenticated users can only query profiles mapped to their authorized workspaces.
2. **`public.social_connections`**:
   * Multi-tenant RLS prevents Organization A from viewing or modifying Organization B's connected accounts.
3. **`public.social_credentials`**:
   * **Strict Service Role Only:** Client users cannot query or select from this table under any circumstances.
4. **`public.social_posts`**:
   * Posts, draft queues, and publishing histories are isolated by workspace membership.
5. **`public.social_webhook_events`**:
   * Append-only immutable log accessible only to administrators and service role.

---

## 5. Audit Logging & Secret Sanitization

All social lifecycle events are logged to `public.security_audit_logs`:
* `ZERNIO_PROFILE_CREATED`
* `SOCIAL_ACCOUNT_CONNECT_STARTED`
* `SOCIAL_ACCOUNT_CONNECTED`
* `SOCIAL_ACCOUNT_DISCONNECTED`
* `SOCIAL_POST_SCHEDULED`
* `SOCIAL_POST_PUBLISHED`
* `SOCIAL_POST_FAILED`
* `SOCIAL_WEBHOOK_RECEIVED`

**Sanitization Filter:** `AuditLoggerService.sanitizeMetadata()` automatically redacts access tokens, client secrets, API keys, passwords, and authorization codes before writing audit entries.

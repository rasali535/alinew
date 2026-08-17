# Ralion OS — Zernio Data Flow & Lifecycle Specifications

**Document Version:** 1.0.0  
**Date:** August 17, 2026  
**Author:** Ras Ali Labs (Pty) Ltd Architecture Team  

---

## 1. Overview

This document specifies the end-to-end data flows for account connection, publishing, scheduling, analytics aggregation, and webhook event ingestion between Ralion OS, Zernio, and destination social platforms.

---

## 2. Account Connection Flow (OAuth)

```text
User UI (Ralion Social Hub)
        │
        │ 1. Click "Connect Instagram"
        ▼
Ralion API Server (`/api/social/zernio/connect`)
        │
        │ 2. Authenticate user & resolve Workspace Profile
        │ 3. Call Zernio GET /v1/connect/{platform}?profileId={id}
        ▼
Zernio API Engine
        │
        │ 4. Generate hosted OAuth authorization URL
        ▼
Ralion API Server
        │
        │ 5. Return authUrl to Client
        ▼
User Browser
        │
        │ 6. Redirect to official platform authorization (Meta / LinkedIn / X)
        ▼
Social Platform Authorization Page
        │
        │ 7. User grants permissions
        ▼
Zernio Server Callback Handler
        │
        │ 8. Exchange code for long-lived access token
        │ 9. Save encrypted token in Zernio Vault
        ▼
Ralion Webhook / Redirect Handler
        │
        │ 10. Webhook received: `account.connected`
        │ 11. Upsert connection in `public.social_connections`
        ▼
Ralion Social Hub (UI)
        │
        │ 12. Displays "Connected" badge with live capabilities
```

---

## 3. Unified Content Publishing Flow

```text
Ralion Content Composer
        │
        │ 1. User submits post with title, text, media, platforms
        ▼
`SocialPublishingService.publish()`
        │
        │ 2. Pre-publish validation (`SocialContentValidator`)
        │ 3. Generate Operation Idempotency Key (`pub_<uuid>`)
        │ 4. If scheduled, save in `social_posts` as `QUEUED` and exit
        ▼
`SocialProviderRouter.resolveRouting()`
        │
        │ 5. Resolve ZernioProvider or Native Adapter per platform
        ▼
Parallel Platform Dispatch:
   ├── Platform A (Instagram via ZernioProvider)
   │     │
   │     └── POST /v1/posts [Idempotency-Key: pub_<uuid>_instagram]
   │
   └── Platform B (LinkedIn via Native Provider)
         │
         └── LinkedIn REST API [Using AES-256 decrypted token]
        │
        ▼
Response Aggregation & Post Recording
        │
        │ 6. Collect atomic platform results
        │ 7. Update `public.social_posts` (status, platform_post_ids)
        │ 8. Write immutable audit log (`public.security_audit_logs`)
        ▼
Ralion UI Confirmation
```

---

## 4. Webhook Ingestion & Processing Flow

```text
Social Platform Event (e.g. Inbound Direct Message)
        │
        ▼
Zernio Infrastructure
        │
        │ POST /api/webhooks/zernio
        │ Header: `X-Zernio-Signature: sha256=<hmac>`
        ▼
Ralion Webhook Handler (`/api/webhooks/zernio`)
        │
        │ 1. Verify HMAC-SHA256 signature using `ZERNIO_WEBHOOK_SECRET`
        │ 2. Log raw payload into `social_webhook_events`
        │ 3. Resolve `profileId` -> `organization_id` & `workspace_id`
        ▼
Event Ingestion Engine:
   ├── `message.received` -> Insert into `social_inbox_messages`
   ├── `account.disconnected` -> Mark connection `RECONNECT_REQUIRED`
   ├── `post.published` -> Update post status in `social_posts`
   └── `webhook.test` -> Health acknowledgement
        │
        ▼
Audit Logging & WebSocket Notification to Social Hub
```

# Ralion OS — Zernio Official API & SDK Verification

**Document Version:** 1.0.0  
**Verification Date:** August 17, 2026  
**Auditor:** Ralion Engineering & Security Architecture  
**Reference API:** Zernio REST API v1 (`https://zernio.com/api/v1` / `https://api.zernio.com/v1`) & `@zernio/node` SDK

---

## 1. Verified API & SDK Overview

Zernio is an enterprise unified social media and messaging infrastructure API. It abstracts individual platform OAuth flows, token refresh lifecycles, and rate-limiting across 15+ social and messaging channels through a single RESTful interface and SDK.

* **API Base URL:** `https://zernio.com/api/v1` (fallback: `https://api.zernio.com/v1`)
* **SDK:** `@zernio/node` (Node.js / TypeScript compatible)
* **Hosted MCP Server:** `https://mcp.zernio.com/sse` (Model Context Protocol)

---

## 2. Authentication Method

All requests to the Zernio API must be authenticated server-side using a single master API key passed as a standard HTTP Bearer token:

```http
Authorization: Bearer <ZERNIO_API_KEY>
Content-Type: application/json
```

### Security Constraints:
* The `ZERNIO_API_KEY` is strictly server-side and must never be exposed to browser clients, frontend bundles, mobile apps, or client-side storage (`localStorage`/`sessionStorage`).
* Stored in server environment secrets (`process.env.ZERNIO_API_KEY`) and Supabase Secret Management.

---

## 3. Profiles & Accounts Multi-Tenant Model

Zernio organizes social media connections into a two-level hierarchy designed for multi-tenant SaaS applications:

### 3.1 Profiles (`/v1/profiles`)
A **Profile** represents an isolated customer organization, tenant, or business workspace.
* **`POST /v1/profiles`**: Create a new profile container.
  * *Request:* `{ "name": "Ras Ali Labs Workspace", "description": "Tenant A" }`
  * *Response:* `{ "id": "prof_abc123", "name": "...", "createdAt": "..." }`
* **`GET /v1/profiles`**: List all profiles created under the master API key.
* **`GET /v1/profiles/{id}`**: Retrieve specific profile details.
* **`DELETE /v1/profiles/{id}`**: Delete a profile and all its attached social accounts.

### 3.2 Accounts (`/v1/accounts`)
An **Account** represents an authorized social channel (e.g. an Instagram Professional account, Facebook Page, LinkedIn Organization, or X handle) belonging to a specific profile.
* **`GET /v1/accounts?profileId={profileId}`**: List all connected social accounts for a profile.
* **`GET /v1/accounts/{accountId}`**: Retrieve detailed metadata, follower count, and health status for a single account.
* **`DELETE /v1/accounts/{accountId}`**: Disconnect the account and revoke tokens at the platform level.

---

## 4. OAuth & Connection Flow

Zernio handles the heavy lifting of platform-specific OAuth 2.0 / PKCE, long-lived token exchanges, and token refreshes:

```text
Ralion Client UI
      │ 1. Initiate Connect (e.g. Instagram)
      ▼
Ralion Backend Server
      │ 2. GET /v1/connect/instagram?profileId={profileId}&redirectUri={callbackUrl}
      ▼
Zernio API
      │ 3. Returns { "authUrl": "https://zernio.com/oauth/authorize?..." }
      ▼
Ralion Backend Server
      │ 4. Returns authUrl to Client
      ▼
User's Browser
      │ 5. Redirects to official platform authorization (Meta / LinkedIn / X / etc.)
      ▼
Social Platform Authorization
      │ 6. User approves permissions
      ▼
Zernio Server Callback & Token Exchange
      │ 7. Exchanging code for long-lived tokens & saving into Zernio Vault
      ▼
Ralion Redirect Callback (`/ralion/growth?connected=instagram&profileId=...`)
      │ 8. Ralion backend queries GET /v1/accounts?profileId={profileId} & updates Ralion DB
      ▼
Ralion Social Hub Connected State
```

---

## 5. Supported Platforms & Capabilities

| Platform | Key | Publishing | Scheduling | Images | Videos | Reels / Shorts | Analytics | DMs / Inbox | Comments |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Instagram** | `instagram` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Facebook** | `facebook` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **LinkedIn** | `linkedin` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ⚠️ (Org DMs) | ✅ |
| **X (Twitter)** | `x` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **TikTok** | `tiktok` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **WhatsApp** | `whatsapp` | ❌ (Broadcast) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **YouTube** | `youtube` | ✅ | ✅ | ❌ | ✅ | ✅ (Shorts) | ✅ | ❌ | ✅ |
| **Threads** | `threads` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Pinterest** | `pinterest` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Reddit** | `reddit` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **Bluesky** | `bluesky` | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |

*Note: Capability availability is verified dynamically per connected account via Zernio account metadata.*

---

## 6. Content Publishing & Scheduling

* **Endpoint:** `POST /v1/posts`
* **Idempotency:** Supports `Idempotency-Key` header to prevent duplicate posts during retries or network failures.
* **Payload Structure:**
```json
{
  "profileId": "prof_abc123",
  "accountIds": ["acc_ig_123", "acc_li_456", "acc_x_789"],
  "content": "Ralion AI 2.4 is officially live across all channels! #RalionOS #AI",
  "mediaUrls": [
    "https://cdn.ralion.ai/media/launch-banner.png"
  ],
  "scheduledFor": "2026-08-20T14:00:00.000Z",
  "options": {
    "instagram": { "contentType": "REELS", "caption": "..." },
    "x": { "thread": false }
  }
}
```
* **Response Structure:**
```json
{
  "id": "post_zernio_999",
  "status": "SCHEDULED",
  "scheduledFor": "2026-08-20T14:00:00.000Z",
  "platformResults": [
    { "accountId": "acc_ig_123", "platform": "instagram", "status": "QUEUED" },
    { "accountId": "acc_li_456", "platform": "linkedin", "status": "QUEUED" }
  ]
}
```

---

## 7. Analytics & Insights

* **Workspace Summary:** `GET /v1/analytics/summary?profileId={profileId}&period={7d|30d|90d}`
* **Account Performance:** `GET /v1/analytics/accounts/{accountId}`
* **Post Performance Timeline:** `GET /v1/analytics/posts/{postId}`
* **Metric Normalization:**
  * `impressions`: Total content views
  * `reach`: Unique viewers
  * `engagement`: Total interactions (likes, shares, comments, clicks)
  * `followers`: Current audience size and historical delta
  * `videoViews`: 3-second or full video plays

---

## 8. Webhooks & Real-Time Events

* **Webhook Registration:** `POST /v1/webhooks/settings`
* **Signature Header:** `X-Zernio-Signature`
* **Signature Algorithm:** HMAC-SHA256 of raw request body signed with `ZERNIO_WEBHOOK_SECRET`.
* **Standard Events:**
  * `post.published`: Content successfully published to platform.
  * `post.failed`: Publishing rejected by social platform (includes failure reason code).
  * `account.connected`: New social channel successfully authorized.
  * `account.disconnected`: User or admin disconnected the account.
  * `account.reauth_required`: Platform revoked tokens or session expired.
  * `message.received`: Direct message received (WhatsApp, Messenger, IG, X).
  * `comment.received`: Public comment received on a post.
  * `webhook.test`: Health verification ping.

---

## 9. Rate Limits & Error Handling

### 9.1 Rate Limits
* Standard rate limits: 100 requests per 15 minutes per API key (with higher limits for enterprise plans).
* Standard HTTP 429 response when rate limit is exceeded with `Retry-After` header.

### 9.2 Standardized Error Model
Zernio returns standardized JSON error payloads:
```json
{
  "error": {
    "code": "rate_limit_error",
    "message": "Too many requests to platform API. Please back off.",
    "param": null,
    "type": "RateLimitError"
  }
}
```

### Verified Error Codes:
* `authentication_error`: Invalid or missing `ZERNIO_API_KEY`.
* `invalid_request_error`: Missing required parameters or invalid media URL.
* `rate_limit_error`: Platform or Zernio rate limit reached.
* `platform_error`: Social platform returned an error (e.g. Meta Graph API error).
* `account_disconnected`: Target account is no longer connected.
* `not_found_error`: Profile or account ID not found.

---

## 10. Known Limitations & Clean Fallbacks

1. **WhatsApp Broadcast Publishing:** WhatsApp Business API only allows pre-approved template messages or 24-hour customer service window replies; broad social post broadcasting is not supported by WhatsApp API. Ralion UI handles this cleanly.
2. **TikTok Image Posts:** TikTok Posting API prioritizes video; single static images are not supported for standard TikTok feed posts.
3. **LinkedIn Personal DMs:** LinkedIn API restricts direct messaging to Organization Member InMail / Sponsored messaging or authorized Partner API tiers.
4. **Platform-Specific Character Limits:** X (280 chars), LinkedIn (3,000 chars), Instagram (2,200 chars). Pre-validation is enforced in Ralion's `SocialContentValidator`.

---

## 11. Verification Conclusion

The Zernio API contract and `@zernio/node` SDK structure are verified and directly align with Ralion's multi-tenant architecture:
* Ralion `Organization` / `Workspace` $\longleftrightarrow$ Zernio `Profile`
* Ralion `SocialConnection` $\longleftrightarrow$ Zernio `Account`
* Ralion `SocialPost` $\longleftrightarrow$ Zernio `Post`
* Ralion Webhook Engine $\longleftrightarrow$ Zernio Webhook with `X-Zernio-Signature`

All requirements can be satisfied safely and non-destructively.

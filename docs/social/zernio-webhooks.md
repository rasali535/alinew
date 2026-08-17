# Ralion OS — Zernio Webhook Architecture & Security Specification

**Document Version:** 1.0.0  
**Date:** August 17, 2026  
**Author:** Ras Ali Labs (Pty) Ltd Architecture Team  

---

## 1. Overview

Ralion OS implements a dedicated, secure webhook receiver at:
`POST /api/webhooks/zernio`

This endpoint receives real-time event updates from Zernio, including post completion notifications, account authorization state changes, and inbound social messages.

---

## 2. Webhook Authentication & Signature Verification

### 2.1 Header Specification
Zernio includes an HMAC-SHA256 signature in the HTTP request headers:
* **Header:** `X-Zernio-Signature` (or `x-signature-sha256`)
* **Format:** `sha256=<hex_digest>`

### 2.2 Verification Algorithm
```typescript
import * as crypto from 'crypto';

export function verifyWebhookSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  if (!secret || !signatureHeader) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const cleanHeader = signatureHeader.replace(/^sha256=/, '').trim();
    return crypto.timingSafeEqual(Buffer.from(cleanHeader, 'utf-8'), Buffer.from(expected, 'utf-8'));
  } catch {
    return false;
  }
}
```

---

## 3. Supported Webhook Events

| Event Type | Trigger | Ralion Action |
| :--- | :--- | :--- |
| `account.connected` | User completed OAuth handshake | Updates `connection_status = 'CONNECTED'`, `token_status = 'TOKEN_VALID'` |
| `account.disconnected` | User revoked access at platform | Updates `connection_status = 'DISCONNECTED'` |
| `account.reauth_required` | Token expired or permissions changed | Updates `connection_status = 'RECONNECT_REQUIRED'`, `token_status = 'REAUTH_REQUIRED'` |
| `post.published` | Remote platform published content | Updates `social_posts` status to `PUBLISHED` |
| `post.failed` | Remote platform rejected content | Updates `social_posts` status to `FAILED` and records error reason |
| `message.received` | Direct message received (WhatsApp, IG, FB, X) | Ingests message into `social_inbox_messages` |
| `comment.received` | Public comment received on a post | Ingests comment into `social_inbox_messages` |
| `webhook.test` | Admin diagnostic ping | Responds with 200 OK |

---

## 4. Webhook Audit Log (`public.social_webhook_events`)

All incoming webhook requests are recorded in `public.social_webhook_events` with signature validity status, payload metadata, and processing timestamps for compliance.

# RALION — Social Webhook System & Verification

**Reference:** WH-SOC-001  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Date:** August 2026  

---

## 1. Webhook Signature Verification

All inbound webhook notifications from social networks must verify cryptographic signatures before processing:

1. **Meta (Facebook, Instagram, WhatsApp):**
   * Signature Header: `X-Hub-Signature-256`
   * Algorithm: `HMAC-SHA256(payload, FACEBOOK_APP_SECRET)`
2. **X (Twitter):**
   * Signature Header: `x-twitter-webhooks-signature`
   * Algorithm: `HMAC-SHA256(payload, TWITTER_CONSUMER_SECRET)`
   * Challenge Handshake: CRC token verification response.

---

## 2. Inbound Message Pipeline

When an inbound customer message is received via WhatsApp, Instagram Direct, or Facebook Messenger:
1. Signature is verified.
2. Webhook is logged in `social_webhooks_log`.
3. Message is parsed and stored in `social_inbox_messages`.
4. Social Inbox UI updates in real time.

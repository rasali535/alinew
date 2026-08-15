# RALION — Social API Rate Limiting & Backoff Strategy

**Reference:** RATE-SOC-001  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Date:** August 2026  

---

## 1. Provider Quotas & Sliding Windows

| Provider | Rate Limit Standard | Window Duration | Handling Strategy |
| :--- | :--- | :--- | :--- |
| **Facebook** | 200 calls / user / hour | 60 Minutes | Client throttling & request batching |
| **Instagram** | 200 calls / user / hour | 60 Minutes | Media container polling with 5s delay |
| **WhatsApp** | 80 messages / second | Real-time | Token bucket queueing |
| **TikTok** | 50 requests / minute | 60 Seconds | Asynchronous publish polling |
| **LinkedIn** | 100 requests / minute | 60 Seconds | Organization throttling |
| **X (Twitter)** | 50 requests / 15 minutes | 15 Minutes | Exponential backoff on HTTP 429 |

---

## 2. Exponential Backoff & Jitter

When an external platform returns HTTP `429 Too Many Requests`:
```typescript
const delay = Math.min(30000, 1000 * Math.pow(2, attempt)) + Math.random() * 200;
```
Requests are never retried aggressively without backoff.

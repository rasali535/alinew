# RALION — Unified Social OAuth & Authentication Guide

**Reference:** OAUTH-SOC-001  
**Entity:** Ras Ali Labs (Pty) Ltd  
**Date:** August 2026  

---

## 1. Overview

Ralion enforces official OAuth 2.0 authorization code flows with PKCE and state-based CSRF protection across all connected social media networks.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant App as Ralion Social Hub
    participant Server as Ralion Backend API
    participant OAuth as Social Platform OAuth (Meta / X / LinkedIn / TikTok)
    participant DB as Supabase Vault

    User->>App: Clicks "Connect Platform"
    App->>Server: GET /api/oauth/{provider}/connect
    Server->>Server: Generate cryptographically random state nonce
    Server-->>App: Return authorization URL
    App->>OAuth: Redirect to official Provider OAuth dialog
    User->>OAuth: Grants requested permissions
    OAuth-->>Server: Redirect to /api/oauth/{provider}/callback?code=...&state=...
    Server->>Server: Verify state nonce integrity & expiration (< 15 min)
    Server->>OAuth: POST token exchange endpoint with client_secret
    OAuth-->>Server: Return access_token & refresh_token
    Server->>Server: Encrypt tokens via AES-256-GCM
    Server->>DB: Upsert into social_connections & social_credentials
    Server-->>App: Redirect back to Social Hub with success notification
```

---

## 2. CSRF State Protection

State tokens are generated using cryptographically random 16-byte nonces encoded with timestamp and workspace ID:
```typescript
export function generateOAuthState(workspaceId: string, provider: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = JSON.stringify({ workspaceId, provider, nonce, ts: Date.now() });
  return Buffer.from(payload).toString('base64url');
}
```
State tokens expire after **15 minutes**.

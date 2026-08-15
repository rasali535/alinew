# Ralion Meta App Secret Protection Technical Evidence Package

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform (Enterprise OS / Growth OS)  
**Evidence Date:** 15 August 2026 (`2026-08-15`)  
**Evidence Type:** Technical Security Control Evidence  
**Meta Assessment Requirement:** App Secret Protection  
**Report Classification:** Confidential — Meta Compliance Technical Evidence  
**Git Commit Hash:** `4aea422`  
**Repository Identifier:** `rasalilabs/alinew`  

---

## 1. Evidence Objective

This technical evidence package demonstrates HOW the Meta App Secret (`FACEBOOK_APP_SECRET`) is protected from unauthorized use and disclosure within the Ralion platform while remaining strictly isolated in a secured backend/server-side environment.

---

## 2. Primary Evidence: Server-Side Secret Configuration

The Meta App Secret is loaded dynamically from protected server-side environment variables (`process.env.FACEBOOK_APP_SECRET`) within the Node.js / Edge backend execution runtime.

### 2.1 Backend Environment Configuration Pattern

```text
# Server-Side Protected Environment (Loaded at runtime only on backend servers)
FACEBOOK_APP_ID=1364275985909476
FACEBOOK_APP_SECRET=[REDACTED_SERVER_SIDE_SECRET]
WEBHOOK_VERIFICATION_SECRET=[REDACTED_SECRET]
OAUTH_ENCRYPTION_KEY=[REDACTED_32_BYTE_KEY]
```

### 2.2 Server-Side Code Access Excerpt (`packages/integrations/src/social/adapters/MetaProvider.ts`)

```typescript
// Location: packages/integrations/src/social/adapters/MetaProvider.ts
export class MetaProvider extends SocialProvider {
  readonly platform: SocialPlatformType = 'facebook';
  readonly displayName = 'Facebook';

  // Access ID for public OAuth dialog
  private getAppId(): string {
    return process.env.FACEBOOK_APP_ID || '';
  }

  // App Secret is accessed ONLY via private server-side method for token exchange
  private getAppSecret(): string {
    return process.env.FACEBOOK_APP_SECRET || '';
  }

  async handleCallback(code: string, redirectUri: string): Promise<SocialAuthResult> {
    // Secret is sent directly from backend server to graph.facebook.com via TLS 1.2+
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` + new URLSearchParams({
      client_id: this.getAppId(),
      client_secret: this.getAppSecret(), // Handled strictly server-side
      redirect_uri: redirectUri,
      code
    }).toString();

    const res = await fetch(tokenUrl);
    const data = await res.json();
    if (data.error) {
      throw new Error(`[MetaProvider] Token exchange failed: ${data.error.message}`);
    }
    // ...
  }
}
```

### 2.3 Server-Side Signed Request Signature Verification (`apps/ralion/src/app/api/meta/data-deletion/route.ts`)

```typescript
// Location: apps/ralion/src/app/api/meta/data-deletion/route.ts
import * as crypto from 'crypto';

function parseSignedRequest(signedRequest: string, appSecret: string): { user_id?: string } | null {
  try {
    const [encodedSig, payload] = signedRequest.split('.');
    if (!encodedSig || !payload) return null;

    const sig = Buffer.from(encodedSig, 'base64url').toString('hex');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));

    // Verify HMAC-SHA256 signature server-side using Meta App Secret
    const expectedSig = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison prevents timing side-channel attacks
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
```

---

## 3. Client Exposure Prevention

Ralion guarantees that the Meta App Secret is never exposed to browser clients, frontend bundles, or native client applications:

1. **No Frontend Prefixing:** Next.js and Vite bundlers only expose environment variables prefixed with `NEXT_PUBLIC_` or `VITE_` to client-side bundles. The secret is named `FACEBOOK_APP_SECRET` without prefix, ensuring bundlers omit it completely from client JavaScript.
2. **Client Secret Leak Scanning:** Automated code scanning across all frontend directories (`apps/website`, `apps/ralion`, `apps/admin`, `packages/ui`) validates that zero hardcoded secrets exist in client-side code:
   ```text
   [PASS] Client Secret Leak Scan: Zero hardcoded secrets detected in frontend client components
   ```
3. **No API Response Exposure:** API routes never return the App Secret in JSON responses or error objects.

---

## 4. Backend Access Control

Access to the Meta App Secret is strictly limited to authorized backend operations:

* **OAuth 2.0 Code Exchange:** Executed in server API routes upon receiving the authorization code from Meta.
* **Webhook Signature Verification:** Executed in backend webhook handlers (`SocialWebhookService`) to validate incoming payloads.
* **User Data Deletion Callback:** Executed in `/api/meta/data-deletion` to authenticate signed deletion requests from Meta.
* **Least-Privilege Infrastructure Access:** Access to runtime environment variables is restricted to system administrators with multi-factor authentication (MFA).

---

## 5. Logging Protection & Secret Redaction

**The Meta App Secret is never written to application, audit, error, or debugging logs in cleartext.**

### 5.1 Redaction Implementation (`apps/ralion/src/lib/services/auditLogger.service.ts`)

```typescript
// Location: apps/ralion/src/lib/services/auditLogger.service.ts

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,         // Catches client_secret, app_secret, secret
  /authorization/i,
  /cookie/i,
  /key/i,
  /credential/i,
  /hash/i,
  /signature/i
];

export function sanitizeMetadata(data: any, depth = 0): any {
  if (depth > 5) return '[TRUNCATED_DEPTH]';
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeMetadata(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED_SENSITIVE_DATA]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
```

When logging security audit events (e.g., `META_AUTHORIZATION`, `META_API_REQUEST`), any metadata containing `client_secret` or `secret` is replaced with `[REDACTED_SENSITIVE_DATA]`.

---

## 6. Source Code Protection

* **No Source Code Hardcoding:** The Meta App Secret is not hardcoded anywhere in the codebase.
* **`.gitignore` Enforced:** All local configuration files (`.env`, `.env.local`, `.env.production`) are excluded from Git commits.
* **Continuous Static Scanning:** Automated CI/CD security audits (`npm run security:audit`) verify that no secrets or API keys are committed.

---

## 7. Evidence Summary

| Protection Control | Repository Evidence | Result |
| :--- | :--- | :---: |
| **Server-Side Secret Storage** | Server runtime environment configuration (`FACEBOOK_APP_SECRET`) | **PASS** |
| **App Secret Value Protected / Redacted** | Redacted configuration and code references | **PASS** |
| **No Frontend Exposure** | Next.js non-public variable isolation & Client Secret Leak Scan | **PASS** |
| **No Hardcoded Secret** | Automated static security scanner (`scripts/security-audit.js`) | **PASS** |
| **Backend-Only Access** | `MetaProvider.ts`, `SocialWebhookService.ts`, `data-deletion/route.ts` | **PASS** |
| **Cleartext Log Protection** | `AuditLoggerService.sanitizeMetadata()` regex redaction filter | **PASS** |

---

## 8. Screenshot Guidance for Assessment Submission

When submitting visual evidence for the Meta Data Protection Assessment:

1. **Primary Screenshot (Server Environment Configuration):**
   * **Subject:** Backend server environment variable configuration screen (e.g., Hostinger / Cloud / Supabase Dashboard environment settings).
   * **Required Content:** Show variable name `FACEBOOK_APP_SECRET` and surrounding server configuration context (e.g., Server Project name, Node.js runtime).
   * **Required Redaction:** The actual App Secret value MUST be completely redacted (showing `••••••••••••••••` or `[REDACTED]`).
2. **Supporting Screenshot (Client Code Scan Output):**
   * **Subject:** Execution of `npm run security:audit` in the terminal.
   * **Required Content:** Terminal showing `[PASS] Client Secret Leak Scan: Zero hardcoded secrets detected in frontend client components`.
3. **Supporting Screenshot (Log Redaction Verification):**
   * **Subject:** Admin Security Center Audit Log tab (`/enterprise/security`) displaying a `META_API_REQUEST` event with all parameters sanitized.

---

## 9. Mandatory Evidence Statement

> **Ralion protects the Meta App Secret by keeping it within the secured backend/server environment and restricting its use to authorized server-side operations. The secret is not exposed to browser, mobile, desktop, or other client applications, is not hardcoded into distributed source code, and is protected from cleartext disclosure in application and audit logs.**

> **No actual Meta access token value, encryption key, App Secret, password, or other sensitive credential is included in this evidence package.**

---

## 10. Document Integrity & Sign-off

* **Document Owner:** Ras Ali Labs (Pty) Ltd — Security Architecture Team
* **System Verified:** Ralion Platform
* **Evidence Date:** 15 August 2026 (`2026-08-15`)
* **Git Commit Hash:** `4aea422`
* **Status:** Verified, tested, and approved for submission to the Meta Data Protection Assessment.

# Ralion Meta App Secret Protection Policy

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform (Enterprise OS / Growth OS)  
**Effective Date:** 15 August 2026 (`2026-08-15`)  
**Policy Classification:** Confidential — Security Policy / Meta Platform Protection  
**Standard Alignment:** Meta Data Protection Assessment (Protection of the Meta App Secret)  

---

## 1. Purpose

Ras Ali Labs (Pty) Ltd requires the Meta App Secret used by Ralion to be protected against unauthorized access, disclosure, modification, and misuse.

The Meta App Secret is treated as a highly sensitive security credential and must remain strictly under server-side control throughout its lifecycle.

---

## 2. App Secret Classification

The Meta App Secret is classified as:

**Security Classification: Confidential / Restricted Security Credential**

The App Secret must be handled using the strongest applicable credential-protection controls available within the Ralion backend environment.

---

## 3. Protection Against Unauthorized Read Access

The Meta App Secret must remain exclusively within a secured backend/server environment.

The App Secret must never:

* be exposed to browser/client applications;
* be returned in client-facing API responses;
* be embedded in frontend JavaScript;
* be embedded in distributed desktop or mobile application code;
* be committed to source control;
* be included in publicly accessible configuration;
* be exposed through application error responses.

Access to the App Secret must be restricted to authorized backend processes and personnel with a legitimate operational requirement.

The Ralion application must follow least-privilege access principles when handling the App Secret.

---

## 4. Storage Protection

The Meta App Secret must not be intentionally stored in plaintext in databases, files, object storage, logs, or other persistent backend storage.

The App Secret is configured exclusively via protected server-side environment variables (`FACEBOOK_APP_SECRET`) within the secured Node.js backend execution runtime.

The implementation is consistent with the actual Ralion credential-management architecture and does not expose secrets through public code or storage volumes.

---

## 5. Server-Side Enforcement

Ralion performs all Meta API operations requiring the App Secret exclusively from protected server-side components:

1. **OAuth 2.0 Token Exchange & Refresh:** Handled server-side in `MetaProvider.handleCallback()` and `MetaProvider.refreshToken()`.
2. **Webhook Cryptographic Verification:** Inbound Meta webhooks verify HMAC-SHA256 signatures server-side in `SocialWebhookService.verifySignature()`.
3. **Data Deletion Callback Handshake:** Meta user data deletion signed requests verify HMAC-SHA256 signatures server-side in `/api/meta/data-deletion`.

The App Secret is never transmitted to frontend/client applications, and desktop/native application bundles never contain the App Secret.

---

## 6. Logging and Redaction

**The Meta App Secret must NEVER be written to application logs, audit logs, error logs, debugging output, analytics records, or any other logging system in cleartext (unencrypted) form.**

Logging and audit mechanisms must automatically redact or suppress the App Secret and other sensitive credentials before log persistence.

In Ralion, the `AuditLoggerService.sanitizeMetadata()` deep traversal engine automatically detects and redacts any field matching `/secret/i`, `/key/i`, `/token/i`, `/credential/i`, or `/password/i` before writing records to `security_audit_logs`.

Security and application logs may contain non-sensitive event metadata needed for auditing, but must never contain the actual App Secret value.

---

## 7. Source Code and Configuration Protection

The Meta App Secret must not be hardcoded into source code.

The secret must be supplied through approved protected server-side configuration or secret-management mechanisms (such as server-side environment variables and CI/CD secret vaults).

The App Secret must not be committed to Git repositories or included in generated frontend/client bundles.

---

## 8. Access Control and Operational Security

Access to systems capable of retrieving or using the App Secret must be restricted to authorized administrators and backend service components.

Ras Ali Labs applies appropriate authentication, authorization, least-privilege access, and administrative security controls to systems containing or using the App Secret.

---

## 9. Monitoring and Incident Response

Attempts to access, expose, misuse, or disclose the Meta App Secret must be treated as security events.

Where such an event occurs, Ras Ali Labs shall investigate it in accordance with the **Ralion Incident Response Policy** ([`docs/security/incident-response-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/incident-response-policy.md)) and take appropriate containment and remediation actions.

If the App Secret is suspected to have been compromised, immediate credential rotation via the Meta Developer Console and server-side secret replacement procedures must be initiated.

---

## 10. Mandatory Meta App Secret Controls

The following controls are mandatory across the Ralion ecosystem:

> ### 🔒 Mandatory Control 1: Protection Against Unauthorized Read Access
> **The Meta App Secret must be protected from unauthorized read access and must remain exclusively within a secured server-side/backend environment.**

> ### 🚫 Mandatory Control 2: Cleartext Logging Prohibition
> **The Meta App Secret must NEVER be written to log files, audit logs, error logs, or other persistent logging systems in cleartext (unencrypted) form.**

> ### 🛡️ Mandatory Control 3: Client Exposure Prohibition
> **The Meta App Secret must never be returned to browser, mobile, desktop, or other client applications.**

> ### 🛑 Mandatory Control 4: Source Code Hardcoding Prohibition
> **The Meta App Secret must never be hardcoded into source code or distributed client software.**

---

## 11. Evidence and Verification

The implementation of this policy is directly supported and verified by the following Ralion repository components:

| Control Area | Implementation File | Verification Evidence |
| :--- | :--- | :--- |
| **Server-Side App Secret Handling** | `packages/integrations/src/social/adapters/MetaProvider.ts`<br>`apps/ralion/src/app/api/meta/data-deletion/route.ts` | The App Secret is accessed strictly server-side via `process.env.FACEBOOK_APP_SECRET` for OAuth exchange and HMAC-SHA256 signature verification. |
| **Client Secret Leak Scanning** | `scripts/security-audit.js` | Automated scanner systematically checks frontend components, static assets, and client builds to verify zero hardcoded secrets. |
| **Secret Redaction in Logging** | `apps/ralion/src/lib/services/auditLogger.service.ts` | `sanitizeMetadata()` deep regex engine automatically redacts `client_secret`, `app_secret`, `secret`, and `key` before log storage. |
| **Webhook Signature Verification** | `apps/ralion/src/lib/services/social/socialWebhook.service.ts` | Constant-time HMAC-SHA256 verification using server-side secret without logging secret values. |
| **Full E2E Chain Verification** | `scripts/production-e2e-readiness.js` | 12-stage automated runner verifying server-side token exchange, webhooks, audit logging, and data deletion. |

*No actual Meta App Secret value, encryption key, access token, password, or other sensitive credential is included in this document.*

---

## 12. Compliance

Ras Ali Labs periodically reviews the protection of Meta credentials through automated security testing, vulnerability management, security audits, and application security reviews.

Any detected exposure of the Meta App Secret must be treated as a critical security issue and investigated promptly.

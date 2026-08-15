# Ralion Meta API Access Token Protection Policy

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform  
**Effective Date:** 15 August 2026  
**Policy Classification:** Confidential — Security Policy / Meta Platform Data Protection  
**Standard Alignment:** Meta Data Protection Assessment (Protection of Meta API User Access Tokens)  

---

## 1. Purpose

Ras Ali Labs (Pty) Ltd requires Meta API user access tokens handled by Ralion to be protected against unauthorized access, disclosure, modification, and misuse.

This policy applies to all Meta API user access tokens received, processed, stored, transmitted, or deleted by Ralion.

---

## 2. Access Token Classification

Meta API user access tokens are classified as:

**Confidential / Restricted Security Credentials**

Access tokens are treated as security-sensitive credentials and are subject to the strongest applicable credential-protection controls within Ralion.

---

## 3. Protection Against Unauthorized Read Access

Ralion protects Meta API user access tokens from unauthorized read access through a combination of application-level encryption, server-side credential management, access controls, and data minimization.

Sensitive Meta API user access tokens are encrypted using **AES-256-GCM authenticated encryption** before persistent storage.

The encryption implementation uses randomly generated initialization vectors and authentication tags.

Plaintext Meta API user access tokens must not be persisted in backend databases or other persistent storage.

The Ralion frontend/client application must not receive plaintext Meta API user access tokens.

Access to token-handling operations is restricted to the server-side components responsible for the required Meta API operations.

Database access is further protected through Supabase PostgreSQL Row Level Security and controlled backend/service-role access.

---

## 4. Token Storage

Meta API user access tokens must never be intentionally stored in plaintext.

Where persistent storage is required, tokens must be stored only in their protected encrypted representation (`enc_gcm_v2_{iv}_{tag}_{ciphertext}`).

Encryption keys and application secrets must be kept separate from encrypted token data and must not be committed to source control or exposed in frontend code.

---

## 5. Logging and Secret Redaction

**Meta API user access tokens must NEVER be written to application logs, audit logs, error logs, analytics records, or other logging systems in cleartext (unencrypted) form.**

Ralion's logging and audit mechanisms must redact or suppress access tokens and other sensitive credentials before log persistence.

Logs may contain non-sensitive identifiers or security-event metadata necessary for auditing, but must not contain plaintext access-token values.

---

## 6. Client and API Response Protection

Meta API user access tokens must not be returned to browser/client applications unless explicitly required by the architecture and permitted by applicable Meta requirements.

Ralion server-side services should perform Meta API operations using protected server-side credentials and return only the minimum information required by the client (such as connection status, public handle, avatar URL, and expiration timestamps).

---

## 7. Access Control

Access to Meta API user access tokens is restricted according to least-privilege principles.

Only authorized backend components and personnel with a legitimate operational requirement may access token-management functionality.

Row Level Security (RLS) and backend access controls must prevent unauthorized tenants or application users from retrieving another user's protected credentials.

---

## 8. Token Lifecycle

Ralion must support secure token lifecycle handling, including:

* **Secure Storage:** Immediate authenticated AES-256-GCM encryption before database persistence.
* **Controlled Use:** Decryption strictly in server memory for the duration of the external API request.
* **Token Refresh or Replacement:** Secure long-lived token exchange and automated refresh without plaintext exposure.
* **Revocation:** Programmatic revocation at the Meta Graph API endpoint (`DELETE /me/permissions`) upon disconnect.
* **Deletion Following Disconnect:** Immediate purging of encrypted credentials from `meta_connections` and `social_credentials` tables.
* **Secure Purge Following Data Deletion:** Automatic user Platform Data removal upon receipt of signed Meta user data deletion callback requests (`POST /api/meta/data-deletion`).

When a social connection is disconnected, the corresponding token must be securely removed from persistent storage and the appropriate security/audit event recorded (`META_TOKEN_REVOKED`).

---

## 9. Security Monitoring

Token-related security events must be captured in the Ralion audit/security logging pipeline without exposing token values.

Security events captured include:
* `META_CONNECT` / `META_DISCONNECT`
* `META_AUTHORIZATION`
* `META_TOKEN_CREATED`
* `META_TOKEN_REFRESHED`
* `META_TOKEN_REVOKED`
* `META_API_REQUEST` / `META_API_FAILURE`

Sensitive credentials and token parameters are automatically redacted from audit records prior to storage in `security_audit_logs`.

---

## 10. Prohibited Practices

The following practices are strictly prohibited:

* Storing Meta API user access tokens in plaintext in databases
* Writing access tokens in cleartext to log files or debugging output
* Returning plaintext tokens to unauthorized client applications or public API responses
* Embedding tokens in frontend source code
* Committing access tokens to source control
* Sharing access tokens through ordinary communication channels
* Including access tokens in screenshots, tickets, or documentation

---

## 11. Mandatory Meta Access Token Controls

The following requirements are mandatory across the Ralion ecosystem:

> ### 🔒 Mandatory Control 1: Protection Against Unauthorized Read Access
> **Meta API user access tokens must be protected from unauthorized read access through application-level encryption and server-side access controls.**

> ### 🚫 Mandatory Control 2: Cleartext Logging Prohibition
> **Meta API user access tokens must never be written to log files, audit logs, error logs, or any other persistent logging system in cleartext (unencrypted) form.**

> ### 🛑 Mandatory Control 3: Plaintext Storage Prohibition
> **Plaintext Meta API user access tokens must never be intentionally persisted in the Ralion backend environment.**

---

## 12. Evidence and Verification

The implementation of this policy is directly supported and verified by the following Ralion repository components:

| Control Area | Implementation File | Verification Evidence |
| :--- | :--- | :--- |
| **Server-Side Token Manager** | `apps/ralion/src/lib/services/metaCredential.service.ts`<br>`apps/ralion/src/lib/services/social/socialTokenManager.service.ts` | Handles token lifecycle, long-lived token exchange, in-memory decryption, and remote Graph API revocation. |
| **AES-256-GCM Token Encryption** | `packages/integrations/src/core/crypto.ts` | Authenticated encryption utilizing 96-bit random IVs (`crypto.randomBytes(12)`) and 128-bit authentication tags. |
| **Supabase Row Level Security (RLS)** | `packages/database/migrations/20260815_meta_security_hardening.sql`<br>`packages/database/migrations/20260815_social_connections_unified.sql` | `social_credentials` restricted strictly to `auth.role() = 'service_role'`; `social_connections_safe` view omits credential fields. |
| **Secret Redaction in Logging** | `apps/ralion/src/lib/services/auditLogger.service.ts` | `sanitizeMetadata()` deep traversal engine redacts all tokens, secrets, keys, and authorization headers before log storage. |
| **Automated Token Cryptography Tests** | `scripts/test-social.js` | Unit tests verifying AES-256-GCM encryption, ciphertext format, authentication tags, and tamper detection. |
| **Client Secret Leak Scanning** | `scripts/security-audit.js` | Automated scanner verifying zero exposed secrets or tokens across frontend components and assets. |
| **Full E2E Chain Verification** | `scripts/production-e2e-readiness.js` | 12-stage automated runner verifying token storage, publishing, webhooks, audit logging, disconnect, and data deletion. |

---

## 13. Compliance

Ras Ali Labs periodically reviews the implementation of these controls through automated security testing, vulnerability management, application security testing, and security audits.

Any detected plaintext token exposure or unauthorized credential access must be treated as a security issue and investigated under the **Ralion Incident Response Policy** ([`docs/security/incident-response-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/incident-response-policy.md)).

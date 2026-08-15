# Ralion Platform Data Encryption-at-Rest Policy

**Document Owner:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform  
**Effective Date:** 15 August 2026  
**Policy Classification:** Security Policy — Platform Data Protection  
**Compliance Standard:** Meta Data Protection Assessment (`backendencryption-9.b.i`)  

---

## 1. Purpose

Ras Ali Labs (Pty) Ltd requires all Meta Platform Data received, processed, or stored by the Ralion platform to be protected against unauthorized access through encryption at rest.

This policy applies to Platform Data stored in databases, persistent storage, application storage, logs, backups, or any other backend environment used by Ralion.

---

## 2. Platform Data Classification

For purposes of this policy, all data received from Meta that meets the definition of Platform Data under the Meta Platform Terms is classified as:

**Security Classification: Confidential / Restricted Platform Data**

This includes, where applicable:

* Meta user IDs or hashed user IDs
* Meta API user access tokens
* Meta-related credentials
* Other Platform Data received from Meta and retained by Ralion

Platform Data must be treated as confidential and must not be stored in plaintext where persistent backend storage is used.

---

## 3. Encryption-at-Rest Requirement

**ALL META PLATFORM DATA STORED IN THE RALION BACKEND ENVIRONMENT MUST BE PROTECTED WITH ENCRYPTION AT REST.**

Ralion applies encryption controls to Platform Data before persistent storage where applicable.

Sensitive Meta access credentials and tokens are encrypted using **AES-256-GCM authenticated encryption**, using randomly generated initialization vectors and authentication tags.

Plaintext Meta access tokens and other sensitive Meta credentials must not be persisted in the Ralion database or returned through client-facing application responses.

---

## 4. Backend Storage Controls

Ralion uses a managed Supabase backend environment with PostgreSQL and Row Level Security controls.

Platform Data stored within Ralion's backend environment is subject to:

* Encryption at rest (managed database tablespace & storage volume level AES-256)
* Application-level encryption for sensitive credentials (AES-256-GCM)
* Strict Row Level Security policies (`auth.role() = 'service_role'` isolation for credentials)
* Server-side credential handling
* Least-privilege access controls
* Secret and credential redaction in audit logs
* Controlled administrative access
* Secure deletion and credential revocation procedures

---

## 5. Key and Credential Protection

Encryption keys and encryption secrets must be kept separate from encrypted Platform Data and must not be embedded in frontend application code.

Encryption credentials must be stored using protected server-side configuration mechanisms and must not be committed to source control.

---

## 6. Logging and Monitoring

Platform Data must not be written to application logs in plaintext.

Where Platform Data is referenced in security or application audit logs, sensitive values must be redacted or represented using non-sensitive identifiers.

---

## 7. Scope

This policy applies to all Ralion backend environments, databases, persistent storage systems, backups, and services that store Meta Platform Data.

Employees, contractors, developers, administrators, and service accounts with access to Ralion infrastructure must comply with this requirement.

---

## 8. Compliance

Failure to comply with this policy may result in access restriction, credential revocation, remediation activities, or disciplinary action as applicable.

Ras Ali Labs periodically reviews the effectiveness of these controls through security testing, vulnerability management, audit logging, and security architecture reviews.

---

## Mandatory Control Statement

> **All Meta Platform Data retained in the Ralion backend environment must be protected by encryption at rest. Plaintext storage of Meta access tokens or other sensitive Meta credentials is prohibited.**

---

## 9. Technical Evidence & Implementation Mapping

The following technical controls directly enforce and support this policy in Ralion:

| Control Area | Implementation Reference | Technical Verification Evidence |
| :--- | :--- | :--- |
| **AES-256-GCM Token Encryption** | `packages/integrations/src/core/crypto.ts` | Authenticated cipher with 96-bit random IVs (`crypto.randomBytes(12)`) and 128-bit authentication tags. Ciphertext format: `enc_gcm_v2_{iv}_{tag}_{data}`. |
| **Supabase Backend Storage** | `packages/database/migrations/20260815_meta_security_hardening.sql`<br>`packages/database/migrations/20260815_social_connections_unified.sql` | Managed PostgreSQL database volumes with AES-256 block-level disk encryption at rest; dedicated `social_credentials` and `meta_connections` tables. |
| **Row Level Security (RLS) Protection** | `packages/database/migrations/20260815_social_connections_unified.sql` | `social_credentials` table has RLS policy enforcing access strictly to `auth.role() = 'service_role'`. Public views (`social_connections_safe`) omit token fields entirely. |
| **Server-Side Credential Management** | `apps/ralion/src/lib/services/metaCredential.service.ts`<br>`apps/ralion/src/lib/services/social/socialTokenManager.service.ts` | Server-side lifecycle manager with automatic token decryption in memory only for authorized API calls, remote revocation on disconnect, and database shredding. |
| **Plaintext Token Protection / Redaction** | `apps/ralion/src/lib/services/auditLogger.service.ts` | `sanitizeMetadata()` deep traversal filter automatically redacts `access_token`, `refresh_token`, `client_secret`, `secret`, `password` prior to audit log insertion in `security_audit_logs`. |
| **Data Deletion Protocol** | `apps/ralion/src/app/api/meta/data-deletion/route.ts` | Automated callback endpoint verifying HMAC-SHA256 signatures, purging all user Platform Data, and returning confirmation codes per Meta Platform Term 4.a. |

### Data Classification & Storage Matrix

| Data Element | Classification | Storage Location | Encryption Method | Access Constraint |
| :--- | :--- | :--- | :--- | :--- |
| **Meta Access Tokens** | Confidential / Restricted | `social_credentials.encrypted_access_token`<br>`meta_connections.encrypted_access_token` | **AES-256-GCM** (Application layer) + **AES-256** (Disk layer) | Server Service Role only |
| **Meta Refresh Tokens** | Confidential / Restricted | `social_credentials.encrypted_refresh_token`<br>`meta_connections.encrypted_refresh_token` | **AES-256-GCM** (Application layer) + **AES-256** (Disk layer) | Server Service Role only |
| **Meta User IDs & Profile Metadata** | Confidential / Restricted | `social_connections`<br>`meta_connections` | **AES-256** (Managed Database Encryption at Rest) | Tenant RLS (`auth.uid() = user_id`) |
| **Security Audit Logs** | Confidential / Internal | `security_audit_logs` | **AES-256** (Managed Database Encryption at Rest) | Tenant / Admin RLS (Secrets sanitized) |
| **Database Backups** | Confidential / Internal | Cloud Object Cold Store | **AES-256** (Server-Side Storage Encryption SSE-KMS) | Restricted Cloud Infrastructure IAM |

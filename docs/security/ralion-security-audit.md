# RALION — Enterprise Security Audit & Meta Platform Data Protection Review

**Document Version:** 2.0.0  
**Company:** Ras Ali Labs (Pty) Ltd  
**Product:** Ralion Enterprise OS / Growth OS / Mari AI  
**Assessment Target:** Meta Data Protection Assessment & Supabase Cloud Security Hardening  
**Audit Date:** August 2026  

---

## 1. Executive Summary

This security audit inspects the complete codebase and deployment architecture of **Ralion (Ras Ali Labs (Pty) Ltd)** to verify compliance with the **Meta Platform Data Protection Assessment** and to harden the underlying **Supabase Cloud** infrastructure.

Ralion utilizes **Supabase Cloud (PostgreSQL 15+)** for its identity, authorization, database storage, and Row Level Security (RLS). Privileged server-side operations are decoupled from client bundles, and all OAuth credentials/tokens are protected by authenticated **AES-256-GCM** encryption at rest.

---

## 2. Codebase Architecture & Landscape

| Component | Framework / Technology | Role & Security Boundary |
| :--- | :--- | :--- |
| **Ralion App** | Next.js 14 / React / TypeScript | Enterprise workspace frontend; authenticated via Supabase JWT |
| **Marketing Website** | Vite / React / TailwindCSS | Public portal; non-privileged Supabase client |
| **Admin Portal** | Next.js 14 / React / TailwindCSS | Administrative dashboard; RBAC protected |
| **Backend & Database** | Supabase Cloud (PostgreSQL 15+) | Multi-tenant schema with Row Level Security (RLS) |
| **Token Cryptography** | Node.js `crypto` (AES-256-GCM) | 96-bit IV, 128-bit authentication tags, SHA-256 key derivation |
| **Audit Log Engine** | `security_audit_logs` (PostgreSQL) | Immutable, append-only security logs (>= 90-day retention) |
| **Meta Integration** | Meta Graph API v19.0+ / OAuth 2.0 | Explicit scope minimization (`public_profile, email`) |

---

## 3. Detailed Audit Findings

### 3.1 Secrets Management & Frontend Bundle Inspection (PASS)
* **Finding:** Exhaustive repository search confirmed that `SUPABASE_SERVICE_ROLE_KEY`, `FACEBOOK_APP_SECRET`, and other private API keys are strictly loaded in server-side API routes and server services (`social.service.ts`, `metaCredential.service.ts`).
* **Client Isolation:** The browser and client packages only have access to `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_URL`.
* **Zero Secret Leakage:** No private secrets or passwords exist in frontend bundles, public assets, or version control test fixtures.

### 3.2 Token Storage & Cryptographic Hardening (PASS — Upgraded to AES-256-GCM)
* **Status:** Fully Hardened.
* **Mechanism:** Token storage upgraded in `packages/integrations/src/core/crypto.ts` and `apps/ralion/src/lib/services/metaCredential.service.ts` to utilize authenticated **AES-256-GCM** with 96-bit random IVs and 128-bit authentication tags (`enc_gcm_v2_...`).
* **Zero Logging:** Audit logs and application telemetry explicitly sanitize all token, secret, and authorization headers before persistence.

### 3.3 Database & Row Level Security (RLS) (PASS)
* **Status:** Verified and enforced across all tables:
  * `meta_connections`: Dedicated Meta Platform Data store with strict RLS (users can only view own connection status; raw token access is denied).
  * `security_audit_logs`: Immutable append-only log table. UPDATE and DELETE operations are denied by policy; SELECT is restricted to platform administrators.
  * `social_accounts` / `social_account_tokens`: Workspace-isolated RLS.
  * `customers`, `workspaces`, `organizations`: Multi-workspace tenant isolation via `auth.uid()`.

### 3.4 Data Minimization (PASS)
* **Status:** Strict minimization enforced.
* **Fields Stored:** Internal `user_id`, `meta_user_id`, `provider`, `account_handle`, `account_name`, `scopes`, `connection_status`, encrypted tokens, and sync timestamps.
* **Raw Payloads:** Unprocessed Meta Graph API response payloads are discarded immediately after field extraction and never stored permanently.

### 3.5 Meta User Data Deletion Callback (PASS)
* **Status:** Implemented at `/api/meta/data-deletion`.
* **Mechanism:** Validates signed requests using HMAC-SHA256, purges all stored tokens and connection records for the requested Meta User ID, generates a confirmation code, and logs an immutable audit event.

### 3.6 Security Audit Logging (PASS)
* **Status:** Implemented via `AuditLoggerService`.
* **Supported Events (24 types):**
  * Authentication: `AUTH_LOGIN`, `AUTH_LOGIN_FAILED`, `AUTH_LOGOUT`, `MFA_ENABLED`, `MFA_DISABLED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`
  * Meta Platform: `META_CONNECT`, `META_DISCONNECT`, `META_AUTHORIZATION`, `META_TOKEN_CREATED`, `META_TOKEN_REFRESHED`, `META_TOKEN_REVOKED`, `META_PROFILE_SYNC`, `META_API_REQUEST`, `META_API_FAILURE`
  * Governance & RBAC: `PERMISSION_GRANTED`, `PERMISSION_REVOKED`, `ROLE_CHANGED`, `ADMIN_LOGIN`, `ADMIN_ACTION`, `SECURITY_ALERT`, `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`
* **Mandatory Meta Fields Recorded:** Event type, timestamp, success/failure boolean, user identity, Meta user ID.

### 3.7 Weekly Security Review Cadence (PASS)
* **Status:** Implemented via `security_review_records` and `SecurityCenterPage`.
* **Cadence:** 7-day recurring review schedule tracked dynamically, allowing compliance officers to record findings and monitor open threat alerts.

---

## 4. Summary of Controls & Verification Matrix

| Assessment Domain | Code / Infra Control | Verification Status |
| :--- | :--- | :--- |
| **Backend Storage** | Supabase Cloud PostgreSQL 15+ | **VERIFIED** |
| **Data Minimization** | `meta_connections` schema with zero raw dumps | **VERIFIED** |
| **Encryption at Rest** | AES-256 (PostgreSQL) + AES-256-GCM (Application) | **VERIFIED** |
| **Encryption in Transit** | TLS 1.2 / 1.3 + Strict HSTS (2-year preload) | **VERIFIED** |
| **Endpoint Restrictions** | Prohibited via Device Storage Policy | **VERIFIED** |
| **Vulnerability Mgmt** | `npm run security:audit` + Weekly Patch SLA | **VERIFIED** |
| **Multi-Factor Auth** | Supabase TOTP MFA + Provider MFA | **VERIFIED** |
| **Audit Logging** | `security_audit_logs` (24 events, >= 90d retention) | **VERIFIED** |
| **Weekly Review** | 7-day review registry in Security Center | **VERIFIED** |
| **Incident Response** | Documented IR workflow with Meta notification SLA | **VERIFIED** |

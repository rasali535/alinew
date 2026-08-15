# Ralion Application Event Audit Logging Policy

**Organization:** Ras Ali Labs (Pty) Ltd  
**System:** Ralion Platform / Backend Environment  
**Policy Owner:** Ras Ali Labs (Pty) Ltd — Security Architecture Team  
**Effective Date:** 15 August 2026 (`2026-08-15`)  
**Policy Classification:** Security Policy — Application Event Logging  
**Compliance Standard:** Meta Data Protection Assessment (`auditlog-22.b.iv` — Application Event Audit Logging & Mandatory Fields)  

---

## 1. Purpose

Ras Ali Labs (Pty) Ltd maintains application event audit logging across all backend services, API handlers, and integration gateways where Meta Platform Data is processed, transmitted, or stored.

The purpose of application event audit logging is to provide a reliable, queryable, and immutable record of security-relevant application activity, support the rapid detection and forensic investigation of unauthorized access or data exposure, maintain non-repudiation, and ensure full compliance with Meta Platform Data Protection Assessment requirements.

---

## 2. Scope

This policy applies to all Ralion backend application modules and services that interact with Meta Platform Data, including:

* **Meta & Social Platform Integrations:** OAuth 2.0 connection handlers, token exchange brokers, and Graph API request clients (`packages/integrations/src/social/adapters/MetaProvider.ts`).
* **Credential Lifecycle Management:** Server-side token generation, long-lived token refresh, permission revocation, and token shredding (`MetaCredentialService` and `SocialTokenManager`).
* **Unified Social Publishing & Scheduling:** Content validation, publishing dispatches, and status updates.
* **Inbound Webhook Ingestion:** Webhook signature verification, payload ingestion, and error handling (`SocialWebhookService`).
* **Authentication & Authorization Events:** User login, multi-factor authentication (MFA) factor enrollment, role changes, and session management.
* **Meta Data Deletion Execution:** Processing and tracking signed data deletion callback requests (`POST /api/meta/data-deletion`) per Meta Platform Term 4.a.
* **Security & Threat Detection:** Input boundary validation failures, rate limit trips, CSRF nonce validation failures, and suspicious access attempts.

---

## 3. Mandatory Application Event Audit Log Fields

> ### 📋 MANDATORY AUDIT LOG SCHEMA REQUIREMENTS (META PLATFORM DATA)
> **Every applicable application event audit log entry involving Meta Platform Data must capture the four mandatory fields:**
> 1. **Meta User ID** (when shared by Meta)
> 2. **Event Type**
> 3. **Date and Time**
> 4. **Success or Failure Indicator**

### 3.1 Meta User ID (`meta_user_id`)
* **Requirement:** The unique Meta User ID must be recorded whenever Meta has shared the identifier with Ralion during authentication, Graph API requests, webhook deliveries, or data deletion callbacks.
* **Representation:** Stored as `meta_user_id VARCHAR(128)`. If no Meta User ID was shared or applicable to the specific event (e.g. system startup or general configuration change), this field is explicitly set to `NULL`.

### 3.2 Event Type (`event_type`)
* **Requirement:** Every audit log record must include a standardized, machine-readable event type identifying the exact operation or security event that occurred.
* **Supported Meta Event Types in Ralion:**
  * `META_CONNECT`: Social account connection initiated.
  * `META_DISCONNECT`: Social account disconnected by user.
  * `META_AUTHORIZATION`: OAuth 2.0 authorization code received and validated.
  * `META_TOKEN_CREATED`: Encrypted token generated and stored in vault.
  * `META_TOKEN_REFRESHED`: Long-lived token refreshed.
  * `META_TOKEN_REVOKED`: Permissions revoked via Graph API (`DELETE /me/permissions`).
  * `META_PROFILE_SYNC`: Account metadata/profile synchronization.
  * `META_API_REQUEST`: Outbound Graph API operational request.
  * `META_API_FAILURE`: Graph API request error or network rejection.
  * `AUTH_LOGIN` / `AUTH_LOGIN_FAILED`: User session authentication outcome.
  * `MFA_ENABLED` / `MFA_DISABLED`: Multi-factor factor status modification.
  * `PASSWORD_CHANGED` / `PASSWORD_RESET`: User credential modifications.
  * `SECURITY_ALERT`: Security tripwire or brute-force threshold trigger.

### 3.3 Date and Time (`created_at`)
* **Requirement:** Every audit record must capture the high-precision timestamp at which the event occurred.
* **Representation:** Stored in ISO 8601 / UTC format (`TIMESTAMPTZ NOT NULL DEFAULT NOW()`) with microsecond resolution for accurate cross-system correlation.

### 3.4 Success or Failure Indicator (`success`)
* **Requirement:** Every audit record must clearly indicate whether the action completed successfully or failed.
* **Representation:** Stored as a boolean flag (`success BOOLEAN NOT NULL DEFAULT TRUE`), allowing immediate filtering for security anomalies and failed authentication or signature attempts.

---

## 4. Database Schema: `public.security_audit_logs`

The Ralion application audit logging engine persists events directly into the PostgreSQL database using the following verified schema ([`packages/database/migrations/20260815_meta_security_hardening.sql`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/packages/database/migrations/20260815_meta_security_hardening.sql)):

```sql
-- Schema Definition: Application Event Audit Trail
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,            -- MANDATORY FIELD 2: Event Type
    event_category VARCHAR(32) NOT NULL,        -- 'META', 'AUTH', 'ADMIN', 'SECURITY'
    user_id UUID REFERENCES auth.users(id),
    actor_user_id UUID REFERENCES auth.users(id),
    meta_user_id VARCHAR(128),                  -- MANDATORY FIELD 1: Meta User ID (when shared)
    resource_type VARCHAR(64),                  -- e.g. 'meta_connections', 'social_credentials'
    resource_id VARCHAR(128),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,       -- MANDATORY FIELD 4: Success/Failure
    metadata JSONB DEFAULT '{}'::jsonb,         -- Redacted operational context
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- MANDATORY FIELD 3: Date & Time
);
```

---

## 5. Meta Platform Data Protection & Automatic Secret Redaction

**Meta API user access tokens, App Secrets, passwords, encryption keys, and session cookies must NEVER appear in cleartext in application logs or audit logs.**

### Redaction Engine (`AuditLoggerService.sanitizeMetadata`):
All metadata passed to the logging service undergoes automated deep recursive filtering against sensitive key patterns (`/token/i`, `/secret/i`, `/key/i`, `/password/i`, `/authorization/i`):

```typescript
// Sample Redacted Log Metadata Saved to Database
{
  "provider": "facebook",
  "scopes": ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
  "access_token": "[REDACTED_SENSITIVE_DATA]",
  "refresh_token": "[REDACTED_SENSITIVE_DATA]"
}
```

---

## 6. Log Integrity, Access Controls & Immutability

1. **Append-Only Immutability:** Row Level Security (RLS) policies prohibit `UPDATE` operations on `security_audit_logs`.
2. **Access Isolation:** Only authorized security administrators and backend server workers (`service_role`) can query audit records.
3. **Multi-Tenant Segregation:** Regular tenant users cannot view audit logs belonging to other organizations.

---

## 7. Retention Period

Application event audit logs are retained in accordance with the **Ralion Log Retention Policy** ([`docs/security/log-retention-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/log-retention-policy.md)):
* **Active Security & Meta Logs:** Retained in online queryable storage for a minimum of **90 days**.
* **Compliance Archives:** Retained in immutable backup storage for **1 year (365 days)**.

---

## 8. Monitoring and Security Review

Application event audit logs are actively monitored:
* **Automated Anomaly Detection:** `SecurityMonitorService` inspects logs for repeated failed logins ($\ge 5$ failures) and unauthorized API calls.
* **Weekly Review Tracker:** Weekly administrative security audits are recorded in `security_review_records`.
* **Incident Escalation:** Suspicious events trigger procedures defined in the **Incident Response Policy** ([`docs/security/incident-response-policy.md`](file:///c:/Users/Ras%20Ali%20Labs/Desktop/rasalilabs/alinew/docs/security/incident-response-policy.md)).

---

## 9. Mandatory Meta Compliance Controls Summary

The following statements are mandatory policy requirements across all Ralion application services:

> ### 👤 Mandatory Field 1: Meta User ID Recording
> **Application event audit logs must include the Meta user ID when shared with Ralion.**

> ### 🏷️ Mandatory Field 2: Standardized Event Type
> **Application event audit logs must include the event type.**

> ### 🕒 Mandatory Field 3: Precise Date and Time
> **Application event audit logs must include the date and time of the event.**

> ### ✅ Mandatory Field 4: Outcome Status Indicator
> **Application event audit logs must include a success or failure indicator.**

> ### 🔒 Mandatory Enforcement Standard
> **These four fields are mandatory for applicable application event audit logs involving Meta Platform Data.**

---

## 10. Evidence and Verification

Implementation of this policy is verified by:
* Service implementation: `apps/ralion/src/lib/services/auditLogger.service.ts`.
* Schema migration: `packages/database/migrations/20260815_meta_security_hardening.sql`.
* Automated test suite: `scripts/test-social.js` and `scripts/production-e2e-readiness.js` (Stage 10 — Security Audit Logging & Secret Redaction).
* Static audit scanner: `scripts/security-audit.js` (`[PASS] AuditLoggerService: All required Meta application events supported`).

---

## 11. Document Integrity & Sign-off

* **Document Owner:** Ras Ali Labs (Pty) Ltd — Security Architecture Team
* **System Governed:** Ralion Platform / Backend Environment
* **Effective Date:** 15 August 2026 (`2026-08-15`)
* **Compliance Standard:** Meta Data Protection Assessment — `auditlog-22.b.iv`
* **Status:** Verified and approved for Meta compliance submission.
